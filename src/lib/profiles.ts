/* Child profiles, the sync record and backups — no accounts, no server.

   How it works: the app keeps reading and writing its two usual keys (progress, games/settings) for the child
   who is playing. Each profile also has its own saved slot. Switching child saves the current keys into the
   current child's slot and loads the other child's slot into the keys. The whole family's data (every slot)
   is one "sync record" that goes to iCloud and into backup files, and is merged, never overwritten.

   Everything here works on a small Store interface (like localStorage), so it can be tested without a device. */

import { parseProgress, STORAGE_KEY as PROGRESS_KEY } from '../game';
import { FUN_KEY, parseFun } from './fun';
import { mergeFun, mergeProgress } from './merge';

export type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };
export type Profile = { id: string; name: string; avatar: string; createdAt: number };
export type ProfileList = { active: string; profiles: Profile[]; deleted: Record<string, number> };
export type ProfileData = { progress: string | null; fun: string | null };
/** Everything the family has saved: who the children are and each child's data. */
export type SyncRecord = { app: 'fraction-quest'; v: 1; savedAt: number; profiles: Profile[]; deleted: Record<string, number>; data: Record<string, ProfileData> };

export const PROFILES_KEY = 'fraction-quest-profiles-v1';
const slotKey = (id: string) => `fraction-quest-profile-${id}`;
/** The first child has the same id on every device, so two devices don't each invent a "Player 1". */
export const FIRST_PROFILE_ID = 'main';
export const AVATARS = ['🦊', '🐼', '🐙', '🦉', '🐢', '🦄', '🐝', '🐸'] as const;
export const MAX_PROFILES = 6;
const NAME_MAX = 20;

const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
const read = <T,>(store: Store, key: string): T | null => { try { const raw = store.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; } };

function cleanProfiles(value: unknown): Profile[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((p): Profile[] => {
    if (!p || typeof p !== 'object') return [];
    const { id, name, avatar, createdAt } = p as Partial<Profile>;
    if (typeof id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(id) || seen.has(id) || typeof name !== 'string' || !cleanName(name)) return [];
    seen.add(id);
    return [{ id, name: cleanName(name), avatar: typeof avatar === 'string' && (AVATARS as readonly string[]).includes(avatar) ? avatar : AVATARS[0], createdAt: typeof createdAt === 'number' && Number.isFinite(createdAt) ? createdAt : 0 }];
  }).slice(0, MAX_PROFILES);
}
const cleanDeleted = (value: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (value && typeof value === 'object') for (const [id, at] of Object.entries(value)) if (/^[a-z0-9-]{1,40}$/.test(id) && typeof at === 'number' && Number.isFinite(at)) out[id] = at;
  return out;
};

/** The profile list, creating "Player 1" (who keeps any progress already on this device) the first time. */
export function getProfiles(store: Store, now = Date.now()): ProfileList {
  const saved = read<Partial<ProfileList>>(store, PROFILES_KEY);
  const profiles = cleanProfiles(saved?.profiles);
  if (profiles.length) {
    const active = profiles.some((p) => p.id === saved?.active) ? saved!.active! : profiles[0].id;
    return { active, profiles, deleted: cleanDeleted(saved?.deleted) };
  }
  const list: ProfileList = { active: FIRST_PROFILE_ID, profiles: [{ id: FIRST_PROFILE_ID, name: 'Player 1', avatar: AVATARS[0], createdAt: now }], deleted: {} };
  writeList(store, list);
  return list;
}
function writeList(store: Store, list: ProfileList) { try { store.setItem(PROFILES_KEY, JSON.stringify(list)); } catch { /* storage blocked */ } }

const currentData = (store: Store): ProfileData => ({ progress: store.getItem(PROGRESS_KEY), fun: store.getItem(FUN_KEY) });
const putCurrent = (store: Store, data: ProfileData) => {
  if (data.progress) store.setItem(PROGRESS_KEY, data.progress); else store.removeItem(PROGRESS_KEY);
  if (data.fun) store.setItem(FUN_KEY, data.fun); else store.removeItem(FUN_KEY);
};
const readSlot = (store: Store, id: string): ProfileData => {
  const slot = read<Partial<ProfileData>>(store, slotKey(id));
  return { progress: typeof slot?.progress === 'string' ? slot.progress : null, fun: typeof slot?.fun === 'string' ? slot.fun : null };
};

/** A child's saved data (the playing child's comes from the live keys). */
export function profileData(store: Store, id: string): ProfileData {
  return getProfiles(store).active === id ? currentData(store) : readSlot(store, id);
}

/** Switch to another child. The caller reloads the app so it reads the new child's data. */
export function switchProfile(store: Store, id: string): boolean {
  const list = getProfiles(store);
  if (list.active === id || !list.profiles.some((p) => p.id === id)) return false;
  store.setItem(slotKey(list.active), JSON.stringify(currentData(store)));
  putCurrent(store, readSlot(store, id));
  writeList(store, { ...list, active: id });
  return true;
}

export function addProfile(store: Store, name: string, avatar: string, now = Date.now(), random = Math.random): Profile | null {
  const list = getProfiles(store, now);
  const clean = cleanName(name);
  if (!clean || list.profiles.length >= MAX_PROFILES) return null;
  const profile: Profile = { id: `p-${now.toString(36)}-${Math.floor(random() * 1e6).toString(36)}`, name: clean, avatar: (AVATARS as readonly string[]).includes(avatar) ? avatar : AVATARS[0], createdAt: now };
  writeList(store, { ...list, profiles: [...list.profiles, profile] });
  return profile;
}

export function renameProfile(store: Store, id: string, name: string, avatar?: string): boolean {
  const list = getProfiles(store); const clean = cleanName(name);
  if (!clean || !list.profiles.some((p) => p.id === id)) return false;
  writeList(store, { ...list, profiles: list.profiles.map((p) => p.id === id ? { ...p, name: clean, avatar: avatar && (AVATARS as readonly string[]).includes(avatar) ? avatar : p.avatar } : p) });
  return true;
}

/** Remove a child who isn't playing right now (the last child can't be removed). Remembered so sync doesn't bring them back. */
export function removeProfile(store: Store, id: string, now = Date.now()): boolean {
  const list = getProfiles(store);
  if (list.active === id || list.profiles.length <= 1 || !list.profiles.some((p) => p.id === id)) return false;
  store.removeItem(slotKey(id));
  writeList(store, { ...list, profiles: list.profiles.filter((p) => p.id !== id), deleted: { ...list.deleted, [id]: now } });
  return true;
}

/** The family's whole saved data, for iCloud and backups. */
export function makeSyncRecord(store: Store, now = Date.now()): SyncRecord {
  const list = getProfiles(store, now);
  const data: Record<string, ProfileData> = {};
  for (const p of list.profiles) data[p.id] = profileData(store, p.id);
  return { app: 'fraction-quest', v: 1, savedAt: now, profiles: list.profiles, deleted: list.deleted, data };
}

/** Check a record from iCloud or a backup file. Returns null if it isn't one of ours. */
export function readSyncRecord(value: unknown): SyncRecord | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Partial<SyncRecord>;
  if (rec.app !== 'fraction-quest' || rec.v !== 1) return null;
  const profiles = cleanProfiles(rec.profiles);
  if (!profiles.length) return null;
  const data: Record<string, ProfileData> = {};
  for (const p of profiles) {
    const d = (rec.data as Record<string, Partial<ProfileData>> | undefined)?.[p.id];
    data[p.id] = { progress: typeof d?.progress === 'string' ? d.progress : null, fun: typeof d?.fun === 'string' ? d.fun : null };
  }
  return { app: 'fraction-quest', v: 1, savedAt: typeof rec.savedAt === 'number' ? rec.savedAt : 0, profiles, deleted: cleanDeleted(rec.deleted), data };
}

// Keep this device's text when the merge means the same thing, so re-merging is a no-op (no needless iCloud writes).
const sameProgress = (a: string, b: string) => JSON.stringify(parseProgress(a)) === JSON.stringify(parseProgress(b));
const sameFun = (a: string, b: string) => JSON.stringify(parseFun(a)) === JSON.stringify(parseFun(b));
const mergeData = (mine: ProfileData, theirs: ProfileData): ProfileData => {
  const progress = !theirs.progress ? mine.progress : !mine.progress ? theirs.progress
    : JSON.stringify(mergeProgress(parseProgress(mine.progress), parseProgress(theirs.progress)));
  const fun = !theirs.fun ? mine.fun : !mine.fun ? theirs.fun : JSON.stringify(mergeFun(parseFun(mine.fun), parseFun(theirs.fun)));
  return {
    progress: mine.progress && progress && sameProgress(mine.progress, progress) ? mine.progress : progress,
    fun: mine.fun && fun && sameFun(mine.fun, fun) ? mine.fun : fun,
  };
};

/**
 * Merge another copy of the family's data into this device (iCloud on launch, or a backup file).
 * Children are matched by id; each child's data is merged so nothing is lost. A child removed on either
 * side stays removed unless they were added again later. The playing child on this device stays the same.
 * Returns true if anything on this device changed.
 */
export function mergeSyncRecord(store: Store, incoming: SyncRecord, now = Date.now()): boolean {
  const list = getProfiles(store, now);
  const deleted = { ...incoming.deleted };
  for (const [id, at] of Object.entries(list.deleted)) deleted[id] = Math.max(deleted[id] ?? 0, at);
  const alive = (p: Profile) => !(p.id in deleted) || p.createdAt > deleted[p.id] || p.id === list.active;

  const byId = new Map<string, Profile>();
  for (const p of [...list.profiles, ...incoming.profiles]) if (!byId.has(p.id) && alive(p)) byId.set(p.id, p);
  // Keep names from this device for children both sides know; new children come from the other copy.
  const profiles = [...byId.values()].slice(0, MAX_PROFILES);

  // Only write what changed, so merging an unchanged copy touches nothing (and triggers no new save).
  let changed = false;
  for (const p of profiles) {
    const mine = profileData(store, p.id); const theirs = incoming.data[p.id] ?? { progress: null, fun: null };
    const merged = mergeData(mine, theirs);
    if (merged.progress === mine.progress && merged.fun === mine.fun && (p.id === list.active || store.getItem(slotKey(p.id)) !== null || (!merged.progress && !merged.fun))) continue;
    changed = true;
    if (p.id === list.active) putCurrent(store, merged); else store.setItem(slotKey(p.id), JSON.stringify(merged));
  }
  for (const p of list.profiles) if (!profiles.some((q) => q.id === p.id)) { store.removeItem(slotKey(p.id)); changed = true; }
  const listChanged = JSON.stringify(profiles) !== JSON.stringify(list.profiles) || JSON.stringify(deleted) !== JSON.stringify(list.deleted);
  if (listChanged) writeList(store, { active: list.active, profiles, deleted });
  return changed || listChanged;
}

/** A backup file's text (all children). */
export function makeBackup(store: Store, now = Date.now()): string {
  return JSON.stringify(makeSyncRecord(store, now));
}

/** Read a backup file and merge it in. Never removes progress on this device. */
export function restoreBackup(store: Store, text: string, now = Date.now()): { ok: true; children: number } | { ok: false; message: string } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, message: 'That file is not a Fraction Quest backup.' }; }
  const record = readSyncRecord(parsed);
  if (!record) return { ok: false, message: 'That file is not a Fraction Quest backup.' };
  mergeSyncRecord(store, record, now);
  return { ok: true, children: record.profiles.length };
}
