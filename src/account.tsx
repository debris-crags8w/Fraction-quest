import { isNativeApp } from './lib/native';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getCurrentUser, getProgress, logout as apiLogout, saveProgress as apiSaveProgress, type User } from '@workspace/api-client-react';
import { loadProgress, resetProgress, saveProgress, type Progress } from './game';
import { loadFun, replaceFun, resetFun, type FunState } from './lib/fun';
import { createProgressSaveQueue, hydrateAccountProgress, signOutSafely, type AccountBundle, type SaveStatus } from './account-flow';

/* Accounts: who is signed in, loading their saved progress onto this device, and saving changes back. */

const GUEST_KEY = 'fraction-quest-guest';

export type SyncStatus = 'saved' | 'saving' | 'offline';
type AccountValue = {
  user: User | null;
  syncStatus: SyncStatus;
  accountError: string | null;
  initialProgress: Progress | null;
  initialFun: FunState | null;
  signOut: () => Promise<void>;
  goToSignIn: () => void;
};
export const AccountContext = createContext<AccountValue>({
  user: null, syncStatus: 'saved', accountError: null, initialProgress: null, initialFun: null,
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

/** Put the account's saved progress on this device. A brand-new account keeps whatever was played here as a guest. */
async function loadAccountProgress(): Promise<AccountBundle> {
  return hydrateAccountProgress({
    getProgress,
    saveProgress: apiSaveProgress,
  }, {
    read: () => ({ progress: loadProgress(), fun: loadFun() }),
    write: (bundle) => {
      saveProgress(bundle.progress);
      const fun = replaceFun(bundle.fun);
      return { ...bundle, fun };
    },
  });
}

type GateState = { kind: 'loading' } | { kind: 'signed-out'; notice?: string } | { kind: 'guest' } | { kind: 'ready'; user: User; bundle: AccountBundle };

export function AccountGate({ renderLogin, renderLoading, children }: {
  renderLogin: (props: { notice?: string; onSignedIn: (user: User) => Promise<void>; onGuest: () => void }) => ReactNode;
  renderLoading: () => ReactNode;
  children: (key: string) => ReactNode;
}) {
  const [state, setState] = useState<GateState>({ kind: 'loading' });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');
  const [accountError, setAccountError] = useState<string | null>(null);

  const enter = useCallback(async (user: User) => {
    setState({ kind: 'loading' });
    setAccountError(null);
    try {
      const bundle = await loadAccountProgress();
      setGuest(false);
      setState({ kind: 'ready', user, bundle });
    } catch {
      const message = 'Signed in, but your saved progress could not be loaded. Your work on this device is unchanged; please try again.';
      setState({ kind: 'signed-out', notice: message });
      throw new Error(message);
    }
  }, []);

  useEffect(() => {
    // The iOS app has no accounts: play on this device, with optional iCloud sync (lib/native.ts).
    if (isNativeApp()) { setGuest(true); setState({ kind: 'guest' }); return; }
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        // Anything but a real user (e.g. an HTML page from a misrouted /api) counts as signed out.
        if (!user || typeof user !== 'object' || typeof user.id !== 'number') throw new Error('Not a user');
        if (!cancelled) void enter(user).catch(() => {});
      })
      .catch((error) => {
        if (cancelled) return;
        if (isGuest()) setState({ kind: 'guest' });
        else setState({ kind: 'signed-out', notice: statusOf(error) === 401 ? undefined : "Can't reach the Fraction Quest server right now. You can still play as a guest." });
      });
    return () => { cancelled = true; };
  }, [enter]);

  const signOut = useCallback(async () => {
    setAccountError(null);
    try {
      await signOutSafely(flushPendingSave, apiLogout, () => {
        resetProgress();
        resetFun();
        setGuest(false);
      });
      setState({ kind: 'signed-out' });
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Your work is still here, but you couldn't be signed out. Please try again.");
    }
  }, []);

  const goToSignIn = useCallback(() => { setGuest(false); setAccountError(null); setState({ kind: 'signed-out' }); }, []);

  if (state.kind === 'loading') return <>{renderLoading()}</>;
  if (state.kind === 'signed-out') {
    return <>{renderLogin({ notice: state.notice, onSignedIn: enter, onGuest: () => { setGuest(true); setAccountError(null); setState({ kind: 'guest' }); } })}</>;
  }
  const user = state.kind === 'ready' ? state.user : null;
  const bundle = state.kind === 'ready' ? state.bundle : null;
  return (
    <AccountContext.Provider value={{
      user, syncStatus, accountError,
      initialProgress: bundle?.progress ?? null,
      initialFun: bundle?.fun ?? null,
      signOut, goToSignIn,
    }}>
      <SyncStatusBridge onStatus={setSyncStatus} />
      {children(user ? `user-${user.id}` : 'guest')}
    </AccountContext.Provider>
  );
}

/* ---------- saving progress back to the account ---------- */

let statusListener: ((status: SyncStatus) => void) | null = null;

const saveQueue = createProgressSaveQueue<{ progress: Progress; fun: FunState }>(
  (next) => apiSaveProgress({
    progress: next.progress as unknown as Record<string, unknown>,
    fun: next.fun as unknown as Record<string, unknown>,
  }),
  (status: SaveStatus) => statusListener?.(status),
);

export function flushPendingSave(): Promise<boolean> {
  return saveQueue.flush();
}

function SyncStatusBridge({ onStatus }: { onStatus: (status: SyncStatus) => void }) {
  useEffect(() => { statusListener = onStatus; return () => { statusListener = null; }; }, [onStatus]);
  return null;
}

/** Debounced save of progress + fun to the signed-in account. Does nothing for guests. */
export function useAccountSync(progress: Progress, fun: FunState) {
  const { user } = useAccount();
  const first = useRef(true);
  useEffect(() => {
    if (!user) return;
    if (first.current) { first.current = false; return; } // just loaded from the account
    saveQueue.enqueue({ progress, fun });
  }, [user, progress, fun]);

  useEffect(() => {
    if (!user) return;
    // Last-chance save when the tab is hidden or closed.
    const onHide = () => {
      const next = saveQueue.peekPending();
      if (!next) return;
      const body = JSON.stringify(next);
      void fetch('/api/progress', { method: 'PUT', body, keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' } })
        .then((response) => { if (response.ok) saveQueue.acknowledge(next); })
        .catch(() => { statusListener?.('offline'); });
    };
    window.addEventListener('pagehide', onHide);
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('pagehide', onHide); document.removeEventListener('visibilitychange', onVisibility); };
  }, [user]);
}
