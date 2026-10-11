import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getCurrentUser, getProgress, logout as apiLogout, saveProgress as apiSaveProgress, type User } from '@workspace/api-client-react';
import { loadProgress, resetProgress, saveProgress, type Progress } from './game';
import { loadFun, replaceFun, resetFun, type FunState } from './lib/fun';

/* Accounts: who is signed in, loading their saved progress onto this device, and saving changes back. */

const GUEST_KEY = 'fraction-quest-guest';

export type SyncStatus = 'saved' | 'saving' | 'offline';
type AccountValue = {
  user: User | null;
  syncStatus: SyncStatus;
  signOut: () => Promise<void>;
  goToSignIn: () => void;
};
export const AccountContext = createContext<AccountValue>({ user: null, syncStatus: 'saved', signOut: async () => {}, goToSignIn: () => {} });
export const useAccount = () => useContext(AccountContext);

export function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === 'string' ? data.error : fallback;
}
const statusOf = (error: unknown) => (error as { status?: number } | null)?.status;

const isGuest = () => { try { return window.localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; } };
const setGuest = (on: boolean) => { try { if (on) window.localStorage.setItem(GUEST_KEY, '1'); else window.localStorage.removeItem(GUEST_KEY); } catch { /* storage blocked */ } };

/** Put the account's saved progress on this device. A brand-new account keeps whatever was played here as a guest. */
async function loadAccountProgress(): Promise<void> {
  const saved = await getProgress();
  if (saved.progress) {
    saveProgress(saved.progress as unknown as Progress);
    replaceFun((saved.fun ?? {}) as Partial<FunState>);
  } else {
    await apiSaveProgress({ progress: loadProgress() as unknown as Record<string, unknown>, fun: loadFun() as unknown as Record<string, unknown> });
  }
}

type GateState = { kind: 'loading' } | { kind: 'signed-out'; notice?: string } | { kind: 'guest' } | { kind: 'ready'; user: User };

export function AccountGate({ renderLogin, renderLoading, children }: {
  renderLogin: (props: { notice?: string; onSignedIn: (user: User) => Promise<void>; onGuest: () => void }) => ReactNode;
  renderLoading: () => ReactNode;
  children: (key: string) => ReactNode;
}) {
  const [state, setState] = useState<GateState>({ kind: 'loading' });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');

  const enter = useCallback(async (user: User) => {
    setState({ kind: 'loading' });
    try {
      await loadAccountProgress();
      setGuest(false);
      setState({ kind: 'ready', user });
    } catch {
      setState({ kind: 'signed-out', notice: 'Signed in, but your saved progress could not be loaded. Please try again.' });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => (cancelled ? undefined : enter(user)))
      .catch((error) => {
        if (cancelled) return;
        if (isGuest()) setState({ kind: 'guest' });
        else setState({ kind: 'signed-out', notice: statusOf(error) === 401 ? undefined : "Can't reach the Fraction Quest server right now. You can still play as a guest." });
      });
    return () => { cancelled = true; };
  }, [enter]);

  const signOut = useCallback(async () => {
    await flushPendingSave();
    try { await apiLogout(); } catch { /* the cookie is cleared server-side when reachable */ }
    // Clear this device so the next student starts fresh.
    resetProgress();
    resetFun();
    setState({ kind: 'signed-out' });
  }, []);

  const goToSignIn = useCallback(() => { setGuest(false); setState({ kind: 'signed-out' }); }, []);

  if (state.kind === 'loading') return <>{renderLoading()}</>;
  if (state.kind === 'signed-out') {
    return <>{renderLogin({ notice: state.notice, onSignedIn: enter, onGuest: () => { setGuest(true); setState({ kind: 'guest' }); } })}</>;
  }
  const user = state.kind === 'ready' ? state.user : null;
  return (
    <AccountContext.Provider value={{ user, syncStatus, signOut, goToSignIn }}>
      <SyncStatusBridge onStatus={setSyncStatus} />
      {children(user ? `user-${user.id}` : 'guest')}
    </AccountContext.Provider>
  );
}

/* ---------- saving progress back to the account ---------- */

let pending: { progress: Progress; fun: FunState } | null = null;
let timer: number | null = null;
let statusListener: ((status: SyncStatus) => void) | null = null;

async function sendPending(): Promise<void> {
  if (timer !== null) { window.clearTimeout(timer); timer = null; }
  const next = pending;
  if (!next) return;
  pending = null;
  statusListener?.('saving');
  try {
    await apiSaveProgress({ progress: next.progress as unknown as Record<string, unknown>, fun: next.fun as unknown as Record<string, unknown> });
    statusListener?.(pending ? 'saving' : 'saved');
  } catch {
    pending ??= next; // keep the latest unsent copy and try again on the next change
    statusListener?.('offline');
  }
}

export function flushPendingSave(): Promise<void> {
  return sendPending();
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
    pending = { progress, fun };
    statusListener?.('saving');
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => { void sendPending(); }, 800);
  }, [user, progress, fun]);

  useEffect(() => {
    if (!user) return;
    // Last-chance save when the tab is hidden or closed.
    const onHide = () => {
      if (!pending) return;
      const body = JSON.stringify(pending);
      pending = null;
      void fetch('/api/progress', { method: 'PUT', body, keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' } }).catch(() => {});
    };
    window.addEventListener('pagehide', onHide);
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('pagehide', onHide); document.removeEventListener('visibilitychange', onVisibility); };
  }, [user]);
}
