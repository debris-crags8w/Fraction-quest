import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, Cloud, CloudOff, Download, Pencil, Trash2, Upload, UserPlus, Users, X } from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { addProfile, AVATARS, getProfiles, makeBackup, MAX_PROFILES, removeProfile, renameProfile, restoreBackup, switchProfile, type Profile } from './lib/profiles';
import { deviceStore, getSyncStatus, isNativeApp, onSyncStatus, reloadAfterSave, saveNow, type SyncStatus } from './lib/native';

/* Child profiles (no accounts, no passwords) and backups. Children pick who is playing; grown-ups add,
   rename or remove children and save or restore backups from the grown-ups page. */

function useProfiles() {
  const [list, setList] = useState(() => getProfiles(deviceStore));
  return { list, refresh: () => setList(getProfiles(deviceStore)) };
}

/** Top-bar chip: who is playing. Tap to switch child. */
export function ProfileChip() {
  const { list } = useProfiles();
  const [open, setOpen] = useState(false);
  const active = list.profiles.find((p) => p.id === list.active) ?? list.profiles[0];
  return (
    <>
      <button type="button" className="fq-account fq-profile-chip" onClick={() => setOpen(true)} aria-haspopup="dialog" data-testid="button-profile-chip">
        <span className="fq-account-avatar fq-profile-avatar" aria-hidden="true">{active.avatar}</span>
        <span className="fq-account-name"><strong>{active.name}</strong><small>{list.profiles.length > 1 ? 'Tap to switch' : 'Saved on this device'}</small></span>
      </button>
      {open && <ProfilePicker onClose={() => setOpen(false)} />}
    </>
  );
}

/** "Who's playing?" Switching reloads the app with that child's progress. */
export function ProfilePicker({ onClose }: { onClose: () => void }) {
  const { list } = useProfiles();
  const [switching, setSwitching] = useState(false);
  const first = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { first.current?.focus(); }, []);
  const pick = async (profile: Profile) => {
    if (profile.id === list.active) { onClose(); return; }
    setSwitching(true);
    if (switchProfile(deviceStore, profile.id)) await reloadAfterSave();
    else setSwitching(false);
  };
  return (
    <div className="fq-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fq-modal fq-profile-picker" role="dialog" aria-modal="true" aria-labelledby="profile-picker-title" data-testid="profile-picker">
        <button className="fq-icon-button fq-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h2 id="profile-picker-title">Who's playing?</h2>
        <ul className="fq-profile-list">
          {list.profiles.map((p, i) => (
            <li key={p.id}>
              <button ref={i === 0 ? first : undefined} type="button" className={`fq-profile-option ${p.id === list.active ? 'active' : ''}`} disabled={switching} onClick={() => void pick(p)} data-testid={`button-profile-${i}`}>
                <span className="fq-profile-avatar" aria-hidden="true">{p.avatar}</span>
                <strong>{p.name}</strong>
                {p.id === list.active && <span className="fq-profile-now"><Check size={15} /> Playing</span>}
              </button>
            </li>
          ))}
        </ul>
        <p className="fq-parent-note">Grown-ups can add a child in <b>For grown-ups</b>.</p>
      </div>
    </div>
  );
}

/** Grown-ups: add, rename or remove children (up to 6). */
export function ChildrenManager() {
  const { list, refresh } = useProfiles();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[1]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (addProfile(deviceStore, name, avatar)) { setName(''); refresh(); }
  };
  const full = list.profiles.length >= MAX_PROFILES;
  return (
    <section className="fq-parent-section fq-family" data-testid="children-manager" aria-labelledby="children-title">
      <h2 id="children-title"><Users size={20} /> Children</h2>
      <p className="fq-parent-note">Each child has their own lessons, stars and games. No accounts or passwords. Switch child from the name at the top of the map.</p>
      <ul className="fq-family-list">
        {list.profiles.map((p) => (
          <li key={p.id} data-testid={`child-${p.id}`}>
            <span className="fq-profile-avatar" aria-hidden="true">{p.avatar}</span>
            {editing === p.id ? (
              <form className="fq-family-edit" onSubmit={(e) => { e.preventDefault(); if (renameProfile(deviceStore, p.id, editName)) { setEditing(null); refresh(); } }}>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={20} aria-label={`New name for ${p.name}`} data-testid="input-rename-child" />
                <button type="submit" className="fq-button" disabled={!editName.trim()}>Save</button>
                <button type="button" className="fq-button ghost" onClick={() => setEditing(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <strong>{p.name}{p.id === list.active ? ' (playing now)' : ''}</strong>
                <button type="button" className="fq-icon-button" onClick={() => { setEditing(p.id); setEditName(p.name); }} aria-label={`Rename ${p.name}`}><Pencil size={16} /></button>
                {p.id !== list.active && list.profiles.length > 1 && (confirmRemove === p.id ? (
                  <span className="fq-family-confirm">
                    Remove {p.name} and all their progress?
                    <button type="button" className="fq-button" onClick={() => { removeProfile(deviceStore, p.id); setConfirmRemove(null); refresh(); }} data-testid="button-confirm-remove-child">Remove</button>
                    <button type="button" className="fq-button ghost" onClick={() => setConfirmRemove(null)}>Keep</button>
                  </span>
                ) : <button type="button" className="fq-icon-button" onClick={() => setConfirmRemove(p.id)} aria-label={`Remove ${p.name}`}><Trash2 size={16} /></button>)}
              </>
            )}
          </li>
        ))}
      </ul>
      {full ? <p className="fq-parent-note">You can have up to {MAX_PROFILES} children.</p> : (
        <form className="fq-family-add" onSubmit={add}>
          <label htmlFor="new-child-name">Add a child</label>
          <div className="fq-family-avatars" role="radiogroup" aria-label="Pick a picture">
            {AVATARS.map((a) => <button key={a} type="button" role="radio" aria-checked={avatar === a} className={avatar === a ? 'on' : ''} onClick={() => setAvatar(a)}>{a}</button>)}
          </div>
          <div className="fq-family-add-row">
            <input id="new-child-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="First name or nickname" autoComplete="off" data-testid="input-new-child" />
            <button type="submit" className="fq-button" disabled={!name.trim()} data-testid="button-add-child"><UserPlus size={17} /> Add</button>
          </div>
          <p className="fq-parent-note">Tip: a nickname is fine. Names stay on your devices (and your iCloud, on iPhone and iPad).</p>
        </form>
      )}
    </section>
  );
}

/** Grown-ups: where progress is saved, plus backup and restore (all children). */
export function BackupPanel() {
  const [sync, setSync] = useState<SyncStatus>(getSyncStatus());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => { const off = onSyncStatus(setSync); return () => { off(); }; }, []);

  const save = async () => {
    setBusy(true); setMessage(null);
    const text = makeBackup(deviceStore);
    const name = `fraction-quest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      if (isNativeApp()) {
        const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: 'Fraction Quest backup', url: uri, dialogTitle: 'Save your backup' });
      } else {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setMessage({ ok: true, text: 'Backup saved. Keep the file somewhere safe (Files, email or a drive).' });
    } catch {
      setMessage({ ok: false, text: 'The backup was not saved. Please try again.' });
    } finally { setBusy(false); }
  };

  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 2_000_000) { setMessage({ ok: false, text: 'That file is too big to be a Fraction Quest backup.' }); return; }
    const result = restoreBackup(deviceStore, await file.text());
    if (!result.ok) { setMessage({ ok: false, text: result.message }); return; }
    setMessage({ ok: true, text: `Restored ${result.children} ${result.children === 1 ? 'child' : 'children'}. Nothing on this device was lost. Reloading…` });
    if (isNativeApp()) await saveNow();
    setTimeout(() => { void reloadAfterSave(); }, 900);
  };

  const where = !sync.native ? 'Progress is saved in this browser on this device.'
    : sync.icloud === 'on' ? 'Saved on this device and in your iCloud, so it follows you to your other iPhone or iPad.'
    : sync.icloud === 'full' ? 'Saved on this device. iCloud is full for this app, so other devices may not update. Save a backup to be safe.'
    : sync.icloud === 'error' ? 'Saved on this device. iCloud could not be reached just now; it will try again.'
    : 'Saved on this device. Sign in to iCloud in Settings to keep it on your other devices too.';

  return (
    <section className="fq-parent-section fq-backup" data-testid="backup-panel" aria-labelledby="backup-title">
      <h2 id="backup-title">{sync.native && sync.icloud === 'on' ? <Cloud size={20} /> : <CloudOff size={20} />} Saving and backup</h2>
      <p data-testid="text-save-location">{where}{sync.lastSaved ? ` Last saved to iCloud at ${new Date(sync.lastSaved).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : ''}</p>
      <p className="fq-parent-note">A backup file keeps every child's progress. Restoring adds it to what's here; nothing gets erased.</p>
      <div className="fq-backup-buttons">
        <button type="button" className="fq-button secondary" onClick={() => void save()} disabled={busy} data-testid="button-save-backup"><Download size={17} /> Save a backup</button>
        <button type="button" className="fq-button ghost" onClick={() => fileInput.current?.click()} data-testid="button-restore-backup"><Upload size={17} /> Restore a backup</button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => void restore(e)} data-testid="input-restore-backup" />
      </div>
      {message && <p className={`fq-backup-message ${message.ok ? 'ok' : 'bad'}`} role="status" data-testid="text-backup-message">{message.text}</p>}
    </section>
  );
}
