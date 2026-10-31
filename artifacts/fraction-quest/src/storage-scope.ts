const LEGACY_PROGRESS_KEY = 'fraction-quest-progress-v1';
const LEGACY_FUN_KEY = 'fraction-quest-fun-v1';
/** The code that tells this learner's devices apart (lib/fun.ts deviceId), kept per learner scope like their progress. */
export const DEVICE_KEY = 'fraction-quest-device';
let currentScope = 'legacy';

export function scopedStorageKey(baseKey: string) {
  return currentScope === 'legacy' ? baseKey : `${baseKey}:${currentScope}`;
}

/** Guest data can migrate from the pre-profile device store exactly once; account scopes never read it. */
/** Makes this learner's device code as soon as their storage is chosen, so later play only reads it (a code written in
    the middle of a lesson would count as saved learner data). lib/fun.ts deviceId() reads and checks it. */
function ensureDeviceCode(scope: string) {
  try {
    const key = `${DEVICE_KEY}:${scope}`;
    if (!/^[a-z0-9-]{1,40}$/.test(window.localStorage.getItem(key) ?? '')) {
      window.localStorage.setItem(key, `d-${Math.random().toString(36).slice(2, 12) || 'here'}`);
    }
    // The code from before it was kept per learner was shared by every account on the device.
    window.localStorage.removeItem(DEVICE_KEY);
  } catch {
    // No storage: deviceId() keeps a code for this tab only.
  }
}

export function setLearnerStorageScope(scope: string) {
  currentScope = scope;
  if (scope !== 'legacy') ensureDeviceCode(scope);
  if (scope !== 'guest') return;
  try {
    for (const key of [LEGACY_PROGRESS_KEY, LEGACY_FUN_KEY]) {
      const scoped = `${key}:guest`;
      if (window.localStorage.getItem(scoped) === null) {
        const legacy = window.localStorage.getItem(key);
        if (legacy !== null) window.localStorage.setItem(scoped, legacy);
      }
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage may be disabled; guest state remains usable in memory for this tab.
  }
}

/** Where the version of a learner's saved copy this device last loaded or saved is kept (account.tsx). */
export const progressVersionKey = (scope: string) => `fraction-quest-progress-version:${scope}`;

export function clearScopedLearnerStorage(scope: string) {
  try {
    window.localStorage.removeItem(progressVersionKey(scope));
    window.localStorage.removeItem(`${LEGACY_PROGRESS_KEY}:${scope}`);
    window.localStorage.removeItem(`${LEGACY_FUN_KEY}:${scope}`);
    window.localStorage.removeItem(`fraction-quest-save-queue:${scope}`);
    window.localStorage.removeItem(`${DEVICE_KEY}:${scope}`);
  } catch {
    // Keep the explicit account-side delete even if device storage is unavailable.
  }
}
