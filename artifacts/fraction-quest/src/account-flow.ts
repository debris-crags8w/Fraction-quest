import type { FunState } from './lib/fun';
import type { Progress } from './game';
import { mergeBundle } from './progress-merge';

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

/** `busy`: the server is reachable, but another device kept saving first; the save is tried again shortly. */
export type SaveStatus = 'saved' | 'saving' | 'offline' | 'busy';
/** How long a save that met newer copies three times waits before it is tried again. */
export const BUSY_RETRY_MS = 15_000;

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
          (error: unknown) => {
            if (pending === null) {
              pending = next;
              persistence?.store(next);
            }
            const busy = error instanceof ProgressConflictError;
            reportStatus(busy ? 'busy' : 'offline');
            if (busy && timer === null) {
              timer = setTimeout(() => { timer = null; void flush(); }, BUSY_RETRY_MS);
              (timer as { unref?: () => void }).unref?.();
            }
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

/** The server's copy of one learner's progress, and its version (it goes up with every save or clear). */
export type ServerProgressCopy = { progress: unknown; fun: unknown; version: number };
export type VersionedProgressApi = {
  load: () => Promise<ServerProgressCopy>;
  save: (copy: { progress: Record<string, unknown>; fun: Record<string, unknown>; version?: number }) => Promise<{ version: number }>;
};
/** The version this device last loaded or saved (null: not known, for example a copy saved before versions). */
export type ProgressVersionStore = { read: () => number | null; write: (version: number | null) => void };
/** The saved copy a refused save brought back, for the app to merge into what is on screen. `cleared`: a grown-up cleared
    this learner's progress since this device's version, so the saved copy replaces this device's copy instead. */
export type SavedCopyNotice = AccountBundle & { cleared: boolean };

const MAX_SAVE_TRIES = 3;

function conflictCopy(error: unknown): (ServerProgressCopy & { clearedSince: boolean }) | null {
  const failure = error as { status?: number; data?: { version?: unknown; clearedSince?: unknown; progress?: unknown; fun?: unknown } } | null;
  if (failure?.status !== 409 || typeof failure.data?.version !== 'number') return null;
  return { progress: failure.data.progress ?? null, fun: failure.data.fun ?? null, version: failure.data.version, clearedSince: failure.data.clearedSince === true };
}

/** Saves one learner's progress without overwriting work saved from another device. Each save sends the version this
    device has; a refused save (409) brings back the saved copy, which is merged with this device's copy (every finished
    lesson, best scores, latest dates: see progress-merge.ts) and saved again on the new version. `clean` makes the
    server's copy well formed; `onSavedCopy` lets the app merge it into the progress on screen too. */
export function versionedProgressSave(
  api: VersionedProgressApi,
  versions: ProgressVersionStore,
  clean: (copy: { progress: unknown; fun: unknown }) => AccountBundle,
  onSavedCopy: (notice: SavedCopyNotice) => void,
) {
  const adopt = (saved: ServerProgressCopy, mine: AccountBundle, cleared: boolean): AccountBundle => {
    const copy = clean(saved);
    onSavedCopy({ ...copy, cleared });
    return cleared ? copy : mergeBundle(copy, mine);
  };
  return async (next: AccountBundle): Promise<void> => {
    let bundle = next;
    // The saved copy's version is kept only once the merged copy is saved. Kept earlier, a save that then failed would
    // leave the unmerged copy in the queue tagged with the new version, and its retry would erase the other device's work.
    let version = versions.read();
    for (let attempt = 0; attempt < MAX_SAVE_TRIES; attempt += 1) {
      if (version === null) {
        // This device does not know which copy it has: load the saved one and merge it in first.
        const saved = await api.load();
        bundle = adopt(saved, bundle, false);
        version = saved.version;
      }
      try {
        const result = await api.save({
          progress: bundle.progress as unknown as Record<string, unknown>,
          fun: bundle.fun as unknown as Record<string, unknown>,
          version,
        });
        versions.write(result.version);
        return;
      } catch (error) {
        const saved = conflictCopy(error);
        if (!saved) throw error;
        bundle = adopt(saved, bundle, saved.clearedSince);
        version = saved.version;
      }
    }
    throw new ProgressConflictError();
  };
}

/** A save that met a newer copy on every try: it stays queued and is merged again on the next try (not "offline"). */
export class ProgressConflictError extends Error {
  constructor() { super('Progress kept changing on another device; this save will be tried again.'); }
}
