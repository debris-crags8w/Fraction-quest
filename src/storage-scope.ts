const LEGACY_PROGRESS_KEY = 'fraction-quest-progress-v1';
const LEGACY_FUN_KEY = 'fraction-quest-fun-v1';
let currentScope = 'legacy';

export function scopedStorageKey(baseKey: string) {
  return currentScope === 'legacy' ? baseKey : `${baseKey}:${currentScope}`;
}

/** Guest data can migrate from the pre-profile device store exactly once; account scopes never read it. */
export function setLearnerStorageScope(scope: string) {
  currentScope = scope;
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

export function clearScopedLearnerStorage(scope: string) {
  try {
    window.localStorage.removeItem(`${LEGACY_PROGRESS_KEY}:${scope}`);
    window.localStorage.removeItem(`${LEGACY_FUN_KEY}:${scope}`);
    window.localStorage.removeItem(`fraction-quest-save-queue:${scope}`);
  } catch {
    // Keep the explicit account-side delete even if device storage is unavailable.
  }
}
