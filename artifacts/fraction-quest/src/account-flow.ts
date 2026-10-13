import type { FunState } from './lib/fun';
import type { Progress } from './game';

export type AccountBundle = { progress: Progress; fun: FunState };

export type AccountProgressApi = {
  getProgress: () => Promise<{ progress: unknown | null; fun: unknown | null }>;
  saveProgress: (bundle: { progress: Record<string, unknown>; fun: Record<string, unknown> }) => Promise<unknown>;
};

export type AccountDeviceStore = {
  read: () => AccountBundle;
  write: (bundle: AccountBundle) => AccountBundle | void;
};

export type AuthMode = 'sign-in' | 'create';
export type AuthCredentials = { username: string; displayName?: string; password: string; parentConsent?: boolean };
export type AccountAuthApi<User> = {
  login: (credentials: { username: string; password: string }) => Promise<User>;
  signup: (credentials: { username: string; displayName: string; password: string; parentConsent: boolean }) => Promise<User>;
};

export function authenticateAccount<User>(
  mode: AuthMode,
  credentials: AuthCredentials,
  api: AccountAuthApi<User>,
): Promise<User> {
  if (mode === 'create') {
    return api.signup({
      username: credentials.username,
      displayName: credentials.displayName || credentials.username,
      password: credentials.password,
      parentConsent: credentials.parentConsent === true,
    });
  }
  return api.login({ username: credentials.username, password: credentials.password });
}

/** Load an account snapshot before changing the device copy. New accounts inherit this device's guest work. */
export async function hydrateAccountProgress(
  api: AccountProgressApi,
  device: AccountDeviceStore,
): Promise<AccountBundle> {
  const saved = await api.getProgress();
  if (saved.progress !== null) {
    const bundle = {
      progress: saved.progress as Progress,
      fun: (saved.fun ?? {}) as FunState,
    };
    return device.write(bundle) ?? bundle;
  }

  const guestBundle = device.read();
  await api.saveProgress({
    progress: guestBundle.progress as unknown as Record<string, unknown>,
    fun: guestBundle.fun as unknown as Record<string, unknown>,
  });
  return guestBundle;
}

export function accountEntryAfterSessionFailure(hasGuestMarker: boolean): 'guest' | 'signed-out' {
  return hasGuestMarker ? 'guest' : 'signed-out';
}

export type AccountEntryFailure =
  | { kind: 'signed-out'; notice: string }
  | { kind: 'profile-error'; notice: string };

export function accountEntryFailure(status: number | undefined, fallback: string): AccountEntryFailure {
  if (status === 401) {
    return {
      kind: 'signed-out',
      notice: "Your sign-in was accepted, but this browser couldn't keep the session. Check that cookies are allowed for Fraction Quest, then sign in again.",
    };
  }
  return { kind: 'profile-error', notice: fallback };
}

export async function signOutSafely(
  flush: () => Promise<boolean>,
  logout: () => Promise<unknown>,
  clearDevice: () => void,
): Promise<void> {
  if (!(await flush())) {
    throw new Error("Your latest work couldn't be saved. You're still signed in; check your connection and try again.");
  }
  try {
    await logout();
  } catch {
    throw new Error("You couldn't be signed out because the server couldn't be reached. Your work is still here; try again.");
  }
  clearDevice();
}

export type SaveStatus = 'saved' | 'saving' | 'offline';

/** Coalesces rapid edits, but keeps a failed payload available for retry. */
export function createProgressSaveQueue<T>(
  save: (value: T) => Promise<unknown>,
  reportStatus: (status: SaveStatus) => void = () => {},
  persistence?: { load: () => T | null; store: (value: T | null) => void },
) {
  let pending: T | null = persistence?.load() ?? null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<boolean> | null = null;

  const flush = async (): Promise<boolean> => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    while (true) {
      if (inFlight) {
        if (!(await inFlight)) return false;
        continue;
      }
      const next = pending;
      if (next === null) {
        reportStatus('saved');
        return true;
      }
      pending = null;
      reportStatus('saving');
      const request = Promise.resolve()
        .then(() => save(next))
        .then(
          () => {
            if (pending === null) persistence?.store(null);
            reportStatus(pending ? 'saving' : 'saved');
            return true;
          },
          () => {
            if (pending === null) {
              pending = next;
              persistence?.store(next);
            }
            reportStatus('offline');
            return false;
          },
        )
        .finally(() => {
          if (inFlight === request) inFlight = null;
        });
      inFlight = request;
      if (!(await request)) return false;
    }
  };

  return {
    enqueue(value: T, delayMs = 800) {
      pending = value;
      persistence?.store(value);
      reportStatus('saving');
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void flush();
      }, delayMs);
    },
    flush,
    peekPending: () => pending,
    acknowledge(value: T) {
      if (pending === value) {
        pending = null;
        persistence?.store(null);
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        reportStatus('saved');
      }
    },
  };
}
