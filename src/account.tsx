import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  acceptPrivacyConsent,
  deleteAccount as apiDeleteAccount,
  deleteLearnerProgress,
  getCurrentUser,
  getLearnerProgress,
  listLearnerProfiles,
  logout as apiLogout,
  saveLearnerProgress,
  type LearnerProfile,
  type User,
} from '@workspace/api-client-react';
import { EMPTY_PROGRESS, loadProgress, resetProgress, saveProgress, type Progress } from './game';
import { loadFun, replaceFun, resetFun, type FunState } from './lib/fun';
import { clearScopedLearnerStorage, setLearnerStorageScope } from './storage-scope';
import { createProgressSaveQueue, signOutSafely, type AccountBundle, type SaveStatus } from './account-flow';

const GUEST_KEY = 'fraction-quest-guest';
const activeProfileKey = (userId: number) => `fraction-quest-active-profile:${userId}`;
const accountScope = (userId: number, profileId: number) => `account-${userId}-profile-${profileId}`;

export type SyncStatus = 'saved' | 'saving' | 'offline';
type AccountValue = {
  user: User | null;
  profiles: LearnerProfile[];
  activeProfile: LearnerProfile | null;
  activeProfileId: number | null;
  syncStatus: SyncStatus;
  accountError: string | null;
  initialProgress: Progress | null;
  initialFun: FunState | null;
  selectProfile: (profileId: number) => Promise<void>;
  refreshProfiles: (preferProfileId?: number) => Promise<void>;
  clearActiveProfileProgress: () => Promise<void>;
  /** Permanently delete the account and everything saved with it (asks for the password again). */
  deleteAccount: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  goToSignIn: () => void;
};

export const AccountContext = createContext<AccountValue>({
  user: null, profiles: [], activeProfile: null, activeProfileId: null,
  syncStatus: 'saved', accountError: null, initialProgress: null, initialFun: null,
  selectProfile: async () => {}, refreshProfiles: async () => {}, clearActiveProfileProgress: async () => {}, deleteAccount: async () => {},
  signOut: async () => {}, goToSignIn: () => {},
});
export const useAccount = () => useContext(AccountContext);

export function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === 'string' ? data.error : fallback;
}
const statusOf = (error: unknown) => (error as { status?: number } | null)?.status;

const isGuest = () => { try { return window.localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; } };
const setGuest = (on: boolean) => { try { if (on) window.localStorage.setItem(GUEST_KEY, '1'); else window.localStorage.removeItem(GUEST_KEY); } catch { /* storage blocked */ } };
const currentBundle = (): AccountBundle => ({ progress: loadProgress(), fun: loadFun() });

let statusListener: ((status: SyncStatus) => void) | null = null;
type SavePayload = { progress: Progress; fun: FunState };
const queues = new Map<string, ReturnType<typeof createProgressSaveQueue<SavePayload>>>();
let activeQueue: ReturnType<typeof createProgressSaveQueue<SavePayload>> | null = null;
let activeScope: string | null = null;

function queueFor(userId: number, profileId: number) {
  const scope = accountScope(userId, profileId);
  const existing = queues.get(scope);
  if (existing) return existing;
  const storageKey = `fraction-quest-save-queue:${scope}`;
  const queue = createProgressSaveQueue<SavePayload>(
    (next) => saveLearnerProgress(profileId, {
      progress: next.progress as unknown as Record<string, unknown>,
      fun: next.fun as unknown as Record<string, unknown>,
    }),
    (status: SaveStatus) => statusListener?.(status),
    {
      load: () => {
        try {
          const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null');
          if (!value || typeof value !== 'object' || !('progress' in value) || !('fun' in value)) return null;
          return value as SavePayload;
        } catch { return null; }
      },
      store: (value) => {
        try {
          if (value) window.localStorage.setItem(storageKey, JSON.stringify(value));
          else window.localStorage.removeItem(storageKey);
        } catch { /* retries remain in memory until the tab closes */ }
      },
    },
  );
  queues.set(scope, queue);
  return queue;
}

function readPreferredProfileId(userId: number) {
  try {
    const value = Number(window.localStorage.getItem(activeProfileKey(userId)));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch { return null; }
}
function writePreferredProfileId(userId: number, profileId: number) {
  try { window.localStorage.setItem(activeProfileKey(userId), String(profileId)); } catch { /* the server remains authoritative */ }
}

async function loadProfileBundle(user: User, profiles: LearnerProfile[], requestedId?: number) {
  if (!profiles.length) throw new Error('No learner profiles were returned. Please refresh the account.');
  const preferred = requestedId ?? readPreferredProfileId(user.id);
  const profile = profiles.find((item) => item.id === preferred) ?? profiles[0];
  const scope = accountScope(user.id, profile.id);
  activeScope = scope;
  activeQueue = queueFor(user.id, profile.id);
  setLearnerStorageScope(scope);
  writePreferredProfileId(user.id, profile.id);

  // A failed prior save stays bound to this profile and is retried before server data is loaded.
  const flushed = await activeQueue.flush();
  if (!flushed) return { profile, bundle: currentBundle() };
  try {
    const saved = await getLearnerProgress(profile.id);
    if (saved.progress !== null) saveProgress(saved.progress as Progress);
    const progress = loadProgress();
    const fun = saved.fun !== null ? replaceFun(saved.fun as Partial<FunState>) : loadFun();
    return { profile, bundle: { progress, fun } };
  } catch {
    // Keep the cached profile-specific copy available if a temporary network failure occurs.
    return { profile, bundle: currentBundle() };
  }
}

type GateState =
  | { kind: 'loading' }
  | { kind: 'signed-out'; notice?: string }
  | { kind: 'consent'; user: User; notice?: string }
  | { kind: 'profile-error'; user: User; notice: string }
  | { kind: 'guest' }
  | { kind: 'ready'; user: User; profiles: LearnerProfile[]; profileId: number; bundle: AccountBundle };

function ConsentScreen({ notice, onAccept, onSignOut }: { notice?: string; onAccept: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!accepted || busy) return;
    setBusy(true);
    setError('');
    try { await onAccept(); }
    catch (err) { setError(errorMessage(err, 'The privacy notice could not be saved. Please try again.')); setBusy(false); }
  };
  return (
    <div className="fq-app fq-login-app">
      <main className="fq-login fq-consent-screen">
        <h1>Parent or caregiver review</h1>
        <p>Fraction Quest saves an account username and display name, learner nicknames, lesson answers and progress, and app preferences. This lets a learner continue on another device.</p>
        <p>If a learner joins a class, the educator sees a random learner code and progress, not the learner’s nickname. No email address is requested, and the app does not record audio.</p>
        <p>Guest play stays on this device. You can export account data or clear a learner’s saved progress from the grown-up area. This screen asks an adult to review the notice; it does not verify identity.</p>
        {notice && <p role="status" className="fq-login-notice">{notice}</p>}
        <label className="fq-privacy-consent-check">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>I am a parent or caregiver. I reviewed this notice and agree to save this account’s learning data online.</span>
        </label>
        {error && <p role="alert" className="fq-login-error">{error}</p>}
        <button type="button" className="fq-button fq-login-submit" disabled={!accepted || busy} onClick={() => void submit()}>{busy ? 'Saving…' : 'Accept and continue'}</button>
        <button type="button" className="fq-hint-button" onClick={() => void onSignOut()}>Sign out</button>
      </main>
    </div>
  );
}

export function AccountGate({ renderLogin, renderLoading, children }: {
  renderLogin: (props: { notice?: string; onSignedIn: (user: User) => Promise<void>; onGuest: () => void }) => ReactNode;
  renderLoading: () => ReactNode;
  children: (key: string) => ReactNode;
}) {
  const [state, setState] = useState<GateState>({ kind: 'loading' });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [activeViewRevision, setActiveViewRevision] = useState(0);

  const enter = useCallback(async (user: User, preferProfileId?: number) => {
    setAccountError(null);
    setGuest(false);
    if (!user.parentConsentAt || !user.privacyNoticeVersion) {
      setState({ kind: 'consent', user });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const profiles = await listLearnerProfiles();
      const loaded = await loadProfileBundle(user, profiles, preferProfileId);
      setState({ kind: 'ready', user, profiles, profileId: loaded.profile.id, bundle: loaded.bundle });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signed in, but learner profiles could not be loaded. Please try again.';
      setState({ kind: 'profile-error', user, notice: message });
      throw new Error(message);
    }
  }, []);

  const acceptConsent = useCallback(async () => {
    if (state.kind !== 'consent') return;
    const user = await acceptPrivacyConsent({ accepted: true });
    await enter(user);
  }, [enter, state]);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!user || typeof user !== 'object' || typeof user.id !== 'number') throw new Error('Not a user');
        if (!cancelled) void enter(user).catch(() => {});
      })
      .catch((error) => {
        if (cancelled) return;
        if (isGuest()) {
          setLearnerStorageScope('guest');
          setState({ kind: 'guest' });
        } else {
          setState({ kind: 'signed-out', notice: statusOf(error) === 401 ? undefined : "Can't reach the Fraction Quest server right now. You can still play as a guest." });
        }
      });
    return () => { cancelled = true; };
  }, [enter]);

  const signOut = useCallback(async () => {
    setAccountError(null);
    const scope = activeScope;
    const userId = state.kind === 'ready' || state.kind === 'consent' || state.kind === 'profile-error' ? state.user.id : null;
    const profileScopes = state.kind === 'ready'
      ? state.profiles.map((profile) => accountScope(state.user.id, profile.id))
      : scope ? [scope] : [];
    try {
      await signOutSafely(
        () => userId ? flushUserPendingSaves(userId) : flushPendingSave(),
        apiLogout,
        () => {
        for (const profileScope of profileScopes) {
          clearScopedLearnerStorage(profileScope);
          queues.delete(profileScope);
        }
        activeScope = null;
        activeQueue = null;
        setGuest(false);
        setState({ kind: 'signed-out' });
      });
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Your work is still here, but you couldn't be signed out. Please try again.");
    }
  }, [state]);

  const deleteAccount = useCallback(async (password: string) => {
    if (state.kind !== 'ready' && state.kind !== 'consent' && state.kind !== 'profile-error') return;
    const profileScopes = state.kind === 'ready'
      ? state.profiles.map((profile) => accountScope(state.user.id, profile.id))
      : activeScope ? [activeScope] : [];
    // Throws on a wrong password (403); nothing is deleted then.
    await apiDeleteAccount({ password });
    for (const profileScope of profileScopes) {
      clearScopedLearnerStorage(profileScope);
      queues.delete(profileScope);
    }
    activeScope = null;
    activeQueue = null;
    setGuest(false);
    setAccountError(null);
    setState({ kind: 'signed-out', notice: 'The account and everything saved with it were deleted.' });
  }, [state]);

  const goToSignIn = useCallback(() => { setGuest(false); setAccountError(null); setState({ kind: 'signed-out' }); }, []);

  const selectProfile = useCallback(async (profileId: number) => {
    if (state.kind !== 'ready' || !state.profiles.some((profile) => profile.id === profileId)) return;
    setState({ kind: 'loading' });
    try {
      const loaded = await loadProfileBundle(state.user, state.profiles, profileId);
      setState({ ...state, profileId, bundle: loaded.bundle });
    } catch (err) {
      setState({ ...state, bundle: currentBundle() });
      setAccountError(err instanceof Error ? err.message : 'That learner profile could not be loaded.');
    }
  }, [state]);

  const refreshProfiles = useCallback(async (preferProfileId?: number) => {
    if (state.kind !== 'ready') return;
    const profiles = await listLearnerProfiles();
    if (!profiles.length) throw new Error('The account needs at least one learner profile.');
    const target = profiles.some((profile) => profile.id === (preferProfileId ?? state.profileId))
      ? (preferProfileId ?? state.profileId)
      : profiles[0].id;
    if (target !== state.profileId) {
      setState({ kind: 'loading' });
      const loaded = await loadProfileBundle(state.user, profiles, target);
      setState({ kind: 'ready', user: state.user, profiles, profileId: target, bundle: loaded.bundle });
    } else {
      setState({ ...state, profiles });
    }
  }, [state]);

  const clearActiveProfileProgress = useCallback(async () => {
    if (state.kind !== 'ready') return;
    await deleteLearnerProgress(state.profileId);
    const scope = accountScope(state.user.id, state.profileId);
    clearScopedLearnerStorage(scope);
    setLearnerStorageScope(scope);
    saveProgress(EMPTY_PROGRESS);
    const fun = resetFun();
    const bundle = { progress: resetProgress(), fun };
    // Persist an empty snapshot as well, so clearing is stable across another device.
    const queue = queueFor(state.user.id, state.profileId);
    queue.enqueue(bundle, 0);
    await queue.flush();
    setActiveViewRevision((revision) => revision + 1);
    setState({ ...state, bundle });
  }, [state]);

  if (state.kind === 'loading') return <>{renderLoading()}</>;
  if (state.kind === 'signed-out') {
    return <>{renderLogin({ notice: state.notice, onSignedIn: enter, onGuest: () => {
      setLearnerStorageScope('guest');
      setGuest(true);
      setAccountError(null);
      setState({ kind: 'guest' });
    } })}</>;
  }
  if (state.kind === 'profile-error') return (
    <div className="fq-app fq-login-app">
      <main className="fq-login fq-consent-screen" role="alert">
        <h1>Your account is signed in</h1>
        <p>{state.notice}</p>
        <button className="fq-button fq-login-submit" onClick={() => void enter(state.user).catch(() => {})}>Try again</button>
        <button type="button" className="fq-hint-button" onClick={() => void signOut()}>Sign out</button>
      </main>
    </div>
  );
  if (state.kind === 'consent') return <ConsentScreen notice={state.notice} onAccept={acceptConsent} onSignOut={signOut} />;
  const ready = state.kind === 'ready' ? state : null;
  const user = ready?.user ?? null;
  const bundle = ready?.bundle ?? null;
  const activeProfile = ready?.profiles.find((profile) => profile.id === ready.profileId) ?? null;

  return (
    <AccountContext.Provider value={{
      user, profiles: ready?.profiles ?? [], activeProfile, activeProfileId: ready?.profileId ?? null,
      syncStatus, accountError,
      initialProgress: bundle?.progress ?? null,
      initialFun: bundle?.fun ?? null,
      selectProfile, refreshProfiles, clearActiveProfileProgress, deleteAccount, signOut, goToSignIn,
    }}>
      <SyncStatusBridge onStatus={setSyncStatus} />
      {children(user && ready ? `user-${user.id}-profile-${ready.profileId}-view-${activeViewRevision}` : 'guest')}
    </AccountContext.Provider>
  );
}

export function flushPendingSave(): Promise<boolean> {
  return activeQueue?.flush() ?? Promise.resolve(true);
}

function flushUserPendingSaves(userId: number): Promise<boolean> {
  const prefix = `account-${userId}-profile-`;
  const pendingQueues = [...queues.entries()]
    .filter(([scope]) => scope.startsWith(prefix))
    .map(([, queue]) => queue.flush());
  return Promise.all(pendingQueues).then((results) => results.every(Boolean));
}

function SyncStatusBridge({ onStatus }: { onStatus: (status: SyncStatus) => void }) {
  useEffect(() => { statusListener = onStatus; return () => { statusListener = null; }; }, [onStatus]);
  return null;
}

/** Debounced online save plus a per-profile local retry queue for offline edits. */
export function useAccountSync(progress: Progress, fun: FunState) {
  const { user, activeProfileId } = useAccount();
  const firstScope = useRef<string | null>(null);
  const scope = user && activeProfileId ? accountScope(user.id, activeProfileId) : null;
  useEffect(() => {
    if (!user || !activeProfileId || !scope) return;
    if (firstScope.current !== scope) {
      firstScope.current = scope;
      return;
    }
    queueFor(user.id, activeProfileId).enqueue({ progress, fun });
  }, [user, activeProfileId, scope, progress, fun]);

  useEffect(() => {
    if (!user || !activeProfileId) return;
    const queue = queueFor(user.id, activeProfileId);
    const retry = () => { void queue.flush(); };
    const onHide = () => {
      const next = queue.peekPending();
      if (!next) return;
      void fetch(`/api/family/profiles/${activeProfileId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({
          progress: next.progress,
          fun: next.fun,
        }),
        keepalive: true,
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
      }).then((response) => { if (response.ok) queue.acknowledge(next); })
        .catch(() => statusListener?.('offline'));
    };
    window.addEventListener('online', retry);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [user, activeProfileId]);
}
