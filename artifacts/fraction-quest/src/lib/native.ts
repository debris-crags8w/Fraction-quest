/* Saving on the iPhone/iPad app: the device's own storage plus the family's iCloud.

   The app keeps using localStorage while it runs (fast, synchronous). On iOS that storage can be cleared by the
   system, so every Fraction Quest key is also copied to Capacitor Preferences (the app's own storage), and the whole
   family's record (see profiles.ts) is saved to iCloud key-value storage. On launch: Preferences → localStorage,
   then iCloud is merged in, before the app renders. On the web none of this runs. */

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { makeSyncRecord, mergeSyncRecord, readSyncRecord, type Store } from './profiles';

const PREFIX = 'fraction-quest';
export const ICLOUD_KEY = 'fraction-quest-family-v1';
const ICLOUD_MAX_BYTES = 1_000_000;
const SAVE_DELAY_MS = 1500;

type ICloudSyncPlugin = {
  isAvailable(): Promise<{ available: boolean }>;
  get(options: { key: string }): Promise<{ value?: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  addListener(event: 'changed' | 'quotaExceeded', handler: (data: { keys?: string[] }) => void): Promise<PluginListenerHandle>;
};
const ICloudSync = registerPlugin<ICloudSyncPlugin>('ICloudSync');

export const isNativeApp = () => Capacitor.isNativePlatform();

/** What the grown-ups' page shows about saving. */
export type SyncStatus = { native: boolean; icloud: 'on' | 'off' | 'full' | 'error'; lastSaved: number | null };
let status: SyncStatus = { native: false, icloud: 'off', lastSaved: null };
const listeners = new Set<(s: SyncStatus) => void>();
const setStatus = (next: Partial<SyncStatus>) => { status = { ...status, ...next }; listeners.forEach((fn) => fn(status)); };
export const getSyncStatus = () => status;
export const onSyncStatus = (fn: (s: SyncStatus) => void) => { listeners.add(fn); return () => listeners.delete(fn); };

const local: Store = {
  getItem: (k) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* full or blocked */ } },
  removeItem: (k) => { try { window.localStorage.removeItem(k); } catch { /* blocked */ } },
};
const ourKeys = () => Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX));

/** Copy every Fraction Quest key to the app's own storage (and remove ones that are gone). */
async function mirrorToDevice() {
  const keep = new Set(ourKeys());
  for (const key of keep) { const value = local.getItem(key); if (value !== null) await Preferences.set({ key, value }); }
  const { keys } = await Preferences.keys();
  for (const key of keys) if (key.startsWith(PREFIX) && !keep.has(key)) await Preferences.remove({ key });
}

/** Merge iCloud's copy into this device. Returns true if this device's data changed. */
async function pullFromICloud(): Promise<boolean> {
  if (status.icloud === 'off') return false;
  const { value } = await ICloudSync.get({ key: ICLOUD_KEY });
  if (!value) return false;
  let parsed: unknown; try { parsed = JSON.parse(value); } catch { return false; }
  const record = readSyncRecord(parsed);
  if (!record) return false;
  applying = true; // our own merge writes shouldn't schedule another save
  try { return mergeSyncRecord(local, record); } finally { applying = false; }
}

/** Save the family's record to iCloud, merging iCloud's copy first so another device's work is never dropped. */
async function pushToICloud() {
  if (status.icloud === 'off') return;
  await pullFromICloud();
  const text = JSON.stringify(makeSyncRecord(local));
  if (new TextEncoder().encode(text).length > ICLOUD_MAX_BYTES) { setStatus({ icloud: 'full' }); return; }
  await ICloudSync.set({ key: ICLOUD_KEY, value: text });
  setStatus({ icloud: 'on', lastSaved: Date.now() });
}

let timer: ReturnType<typeof setTimeout> | null = null;
let applying = false;
let saving: Promise<void> = Promise.resolve();
/** Save now (device storage, then iCloud). Safe to call often; saves run one at a time. */
export function saveNow(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  saving = saving.then(async () => {
    try { await mirrorToDevice(); } catch { /* device storage failed: localStorage still has it */ }
    try { await pushToICloud(); } catch { setStatus({ icloud: 'error' }); }
    try { await mirrorToDevice(); } catch { /* ignore */ }
  });
  return saving;
}
const saveSoon = () => { if (applying) return; if (timer) clearTimeout(timer); timer = setTimeout(() => { void saveNow(); }, SAVE_DELAY_MS); };

/** Watch the app's own localStorage writes so every save is copied without changing the app's code. */
function watchWrites() {
  const proto = Object.getPrototypeOf(window.localStorage) as Storage;
  const set = proto.setItem; const remove = proto.removeItem;
  proto.setItem = function setItem(this: Storage, key: string, value: string) {
    set.call(this, key, value);
    if (this === window.localStorage && key.startsWith(PREFIX)) saveSoon();
  };
  proto.removeItem = function removeItem(this: Storage, key: string) {
    remove.call(this, key);
    if (this === window.localStorage && key.startsWith(PREFIX)) saveSoon();
  };
}

/**
 * Run once before the app renders. On the web it does nothing.
 * On iOS: restore from the device's storage, merge iCloud, and set up saving.
 */
export async function startNativeSaving(): Promise<void> {
  if (!isNativeApp()) return;
  setStatus({ native: true });
  try {
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      if (!key.startsWith(PREFIX)) continue;
      const { value } = await Preferences.get({ key });
      if (value !== null) local.setItem(key, value);
    }
  } catch { /* first launch or storage unavailable */ }
  // No accounts in the iOS app: always play on this device (with optional iCloud sync).
  local.setItem('fraction-quest-guest', '1');

  // Never hold the launch screen for iCloud: after 2.5 s open with this device's data and keep syncing behind.
  const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
  try {
    const { available } = await withTimeout(ICloudSync.isAvailable(), 1500);
    setStatus({ icloud: available ? 'on' : 'off' });
    if (available) await withTimeout(pullFromICloud(), 2500).catch(() => { /* finishes in the background on the next save */ });
  } catch { setStatus({ icloud: 'off' }); }

  watchWrites();
  void saveNow();

  // Another device saved: merge it now; show it when the child comes back to the app (no surprise reloads mid-question).
  let changedWhileOpen = false;
  try {
    await ICloudSync.addListener('changed', () => { void pullFromICloud().then((changed) => { if (changed) changedWhileOpen = true; }); });
    await ICloudSync.addListener('quotaExceeded', () => setStatus({ icloud: 'full' }));
  } catch { /* plugin missing (e.g. an old build) */ }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { void saveNow(); return; }
    void pullFromICloud().then((changed) => {
      if (changed || changedWhileOpen) window.location.reload();
    }).catch(() => { /* offline */ });
  });
}

/** Reload the app after its data changed underneath it (switching child, restoring a backup). On iOS, save first. */
export async function reloadAfterSave(): Promise<void> {
  if (isNativeApp()) { try { await saveNow(); } catch { /* still reload */ } }
  window.location.reload();
}

/** The Store for this device's localStorage (used by the profile and backup screens). */
export const deviceStore: Store = local;
