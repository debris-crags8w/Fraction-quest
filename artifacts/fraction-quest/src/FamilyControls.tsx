import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListLearnerProfiles,
  useCreateLearnerProfile,
  useUpdateLearnerProfile,
  useListClassrooms,
  useCreateClassroom,
  useJoinClassroom,
  useGetClassroomRoster,
  useAssignClassroomUnits,
  getListLearnerProfilesQueryKey,
  getListClassroomsQueryKey,
  getGetClassroomRosterQueryKey,
  exportPrivacyData,
  deleteLearnerProfile,
  type ClassroomLearner,
  type LearnerProfile,
} from '@workspace/api-client-react';
import { useAccount } from './account';
import { AlertTriangle, Check, ChevronDown, Clipboard, Download, LoaderCircle, LockKeyhole, Plus, RefreshCw, Shield, Trash2, Users, X } from 'lucide-react';
import './FamilyControls.css';

type FamilyControlsProps = { unitTitles?: string[] };
type ConfirmAction = { kind: 'delete-profile'; profile: LearnerProfile } | { kind: 'clear-progress' } | { kind: 'delete-account' } | null;

const UNIT_IDS = Array.from({ length: 14 }, (_, index) => String(index + 1));
const titleFor = (unitId: string, titles?: string[]) => {
  const number = Number(unitId.replace(/\D/g, ''));
  return titles?.[number - 1] ? `Unit ${number} · ${titles[number - 1]}` : `Unit ${number || unitId.replace('unit-', '')}`;
};
const errorText = (error: unknown, fallback: string) => {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === 'string' ? data.error : error instanceof Error ? error.message : fallback;
};

export default function FamilyControls({ unitTitles }: FamilyControlsProps) {
  const account = useAccount();
  const queryClient = useQueryClient();
  const profilesQuery = useListLearnerProfiles({
    query: { enabled: Boolean(account.user), queryKey: [...getListLearnerProfilesQueryKey(), account.user?.id ?? 'guest'] },
  });
  const classroomsQuery = useListClassrooms({
    query: { enabled: Boolean(account.user), queryKey: [...getListClassroomsQueryKey(), account.user?.id ?? 'guest'] },
  });
  const createProfile = useCreateLearnerProfile();
  const updateProfile = useUpdateLearnerProfile();
  const createClassroom = useCreateClassroom();
  const joinClassroom = useJoinClassroom();
  const assignUnits = useAssignClassroomUnits();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [classLabel, setClassLabel] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [draftUnits, setDraftUnits] = useState<Record<string, string[]>>({});
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [latestJoinCode, setLatestJoinCode] = useState('');
  const dialogCancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const profiles = profilesQuery.data ?? account.profiles;
  const classrooms = classroomsQuery.data ?? [];
  const classroomId = selectedClassId ?? classrooms[0]?.id ?? null;
  const selectedClassroom = classrooms.find((room) => room.id === classroomId) ?? null;
  const rosterQuery = useGetClassroomRoster(classroomId ?? 0, {
    query: { enabled: classroomId !== null && classroomId > 0, queryKey: getGetClassroomRosterQueryKey(classroomId ?? 0) },
  });
  const availableProfiles = useMemo(() => profiles.filter((profile) => profile.classroomId === null), [profiles]);

  useEffect(() => {
    if (!confirm) return;
    dialogCancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setConfirm(null);
      if (event.key === 'Tab' && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)'));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirm, busy]);

  const refreshFamily = async (preferId?: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListLearnerProfilesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListClassroomsQueryKey() }),
      classroomId ? queryClient.invalidateQueries({ queryKey: getGetClassroomRosterQueryKey(classroomId) }) : Promise.resolve(),
      account.refreshProfiles(preferId),
    ]);
  };
  const begin = (key: string) => { setBusy(key); setError(''); setNotice(''); };
  const finish = () => setBusy('');

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = newName.trim();
    if (!displayName) return;
    begin('profile');
    try {
      const created = await createProfile.mutateAsync({ data: { displayName } });
      setNewName('');
      await refreshFamily();
      setNotice(`${created.displayName} is ready to learn.`);
    } catch (err) { setError(errorText(err, 'The learner profile could not be added. Try again.')); }
    finally { finish(); }
  };

  const saveRename = async (event: FormEvent, profileId: number) => {
    event.preventDefault();
    const displayName = editName.trim();
    if (!displayName) return;
    begin(`rename-${profileId}`);
    try {
      const updated = await updateProfile.mutateAsync({ profileId, data: { displayName } });
      setEditingId(null);
      await refreshFamily();
      setNotice('Learner name updated.');
    } catch (err) { setError(errorText(err, 'The learner name could not be updated.')); }
    finally { finish(); }
  };

  const removeProfile = async (profile: LearnerProfile) => {
    begin('delete-profile');
    try {
      await deleteLearnerProfile(profile.id);
      setConfirm(null);
      const nextId = profile.id === account.activeProfileId ? profiles.find((item) => item.id !== profile.id)?.id : account.activeProfileId ?? undefined;
      await refreshFamily(nextId);
      setNotice(`${profile.displayName} was removed.`);
    } catch (err) { setError(errorText(err, 'This profile could not be deleted.')); }
    finally { finish(); }
  };

  const createRoom = async (event: FormEvent) => {
    event.preventDefault();
    const label = classLabel.trim();
    if (!label) return;
    begin('classroom');
    try {
      const room = await createClassroom.mutateAsync({ data: { label } });
      setClassLabel('');
      setLatestJoinCode(room.joinCode);
      setSelectedClassId(room.id);
      await refreshFamily();
      setNotice(`Classroom “${room.label}” created. Share its join code with families.`);
    } catch (err) { setError(errorText(err, 'The classroom could not be created.')); }
    finally { finish(); }
  };

  const submitJoin = async (event: FormEvent) => {
    event.preventDefault();
    const profileId = Number(selectedProfileId);
    if (!profileId || joinCode.trim().length < 6) return;
    begin('join');
    try {
      const joined = await joinClassroom.mutateAsync({ data: { profileId, joinCode: joinCode.trim().toUpperCase() } });
      setJoinCode('');
      await refreshFamily();
      setNotice(`${profiles.find((profile) => profile.id === profileId)?.displayName ?? 'Learner'} joined ${joined.classroomLabel}.`);
    } catch (err) { setError(errorText(err, 'That code could not be joined. Check it and try again.')); }
    finally { finish(); }
  };

  const saveAssignment = async (learner: ClassroomLearner) => {
    if (!classroomId) return;
    const unitIds = draftUnits[learner.memberCode] ?? learner.assignedUnitIds;
    begin(`assign-${learner.memberCode}`);
    try {
      await assignUnits.mutateAsync({ classroomId, memberCode: learner.memberCode, data: { unitIds } });
      setDraftUnits((current) => { const next = { ...current }; delete next[learner.memberCode]; return next; });
      await queryClient.invalidateQueries({ queryKey: getGetClassroomRosterQueryKey(classroomId) });
      setNotice(`Units saved for code ${learner.memberCode}.`);
    } catch (err) { setError(errorText(err, 'Unit assignments could not be saved.')); }
    finally { finish(); }
  };

  const runExport = async () => {
    begin('export');
    try {
      const payload = await exportPrivacyData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fraction-quest-privacy-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice('Your account export has been downloaded as JSON.');
    } catch (err) { setError(errorText(err, 'The privacy export could not be created.')); }
    finally { finish(); }
  };

  const removeAccount = async () => {
    begin('delete-account');
    try {
      await account.deleteAccount(deletePassword);
      setDeletePassword('');
      setConfirm(null);
    } catch (err) { setError(errorText(err, 'The account could not be deleted. Nothing was removed.')); }
    finally { finish(); }
  };

  const clearProgress = async () => {
    begin('clear-progress');
    try {
      await account.clearActiveProfileProgress();
      setConfirm(null);
      setNotice(`Saved progress for ${account.activeProfile?.displayName ?? 'the active learner'} was cleared.`);
    } catch (err) { setError(errorText(err, 'Saved progress could not be cleared.')); }
    finally { finish(); }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch { setError('Clipboard access is unavailable. Select and copy the code instead.'); }
  };

  if (!account.user) {
    return (
      <section className="fq-family fq-family-guest" aria-labelledby="fq-family-title">
        <h2 id="fq-family-title">Family and privacy settings</h2>
        <p>Guest progress stays on this device. Sign in to manage learner profiles, classroom links, online progress, and data exports.</p>
        <button type="button" className="fq-family-button primary" onClick={account.goToSignIn}>Sign in for family settings</button>
      </section>
    );
  }

  return (
    <section className="fq-family" aria-labelledby="fq-family-title">
      <header className="fq-family-hero">
        <div className="fq-family-orbit" aria-hidden="true"><span>1</span><i /><b>½</b></div>
        <div className="fq-family-intro">
          <p className="fq-family-kicker"><LockKeyhole size={14} /> Family controls</p>
          <h2 id="fq-family-title">A little care for<br /><em>their learning space.</em></h2>
          <p>Manage learner profiles, classroom connections, and saved data from one grown-up place.</p>
        </div>
        <aside className="fq-family-trust">
          <Shield size={20} aria-hidden="true" />
          <strong>Privacy, plainly</strong>
          <p>The adult gate is a reminder, not identity proof. Educator reports use learner codes, never student names. Guest progress stays local.</p>
        </aside>
      </header>

      {(profilesQuery.isLoading || classroomsQuery.isLoading) && (
        <div className="fq-family-loading" role="status"><span className="fq-family-skeleton" /><span className="fq-family-skeleton short" /><span className="fq-family-skeleton" />Loading family settings…</div>
      )}
      {(profilesQuery.isError || classroomsQuery.isError) && (
        <div className="fq-family-feedback error" role="alert">
          <AlertTriangle size={18} /> We couldn’t load all family settings.
          <button type="button" className="fq-family-text-button" onClick={() => { void profilesQuery.refetch(); void classroomsQuery.refetch(); }}>Try again</button>
        </div>
      )}
      {error && <div className="fq-family-feedback error" role="alert"><AlertTriangle size={18} />{error}<button className="fq-family-dismiss" aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
      {notice && <div className="fq-family-feedback success" role="status"><Check size={18} />{notice}<button className="fq-family-dismiss" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={16} /></button></div>}

      <div className="fq-family-layout">
        <div className="fq-family-main">
          <section className="fq-family-panel fq-family-profiles" aria-labelledby="fq-profiles-title">
            <div className="fq-family-panel-head">
              <div><p className="fq-family-overline">01 / At home</p><h3 id="fq-profiles-title">Learner profiles</h3></div>
              <span className="fq-family-count">{profiles.length} {profiles.length === 1 ? 'learner' : 'learners'}</span>
            </div>
            <p className="fq-family-copy">Choose who is learning now, or update the name shown on this device.</p>
            {profilesQuery.isLoading && profiles.length === 0 ? <div className="fq-family-profile-skeleton" aria-hidden="true"><i /><span /><span /></div> : profiles.length === 0 ? (
              <div className="fq-family-empty"><Users size={22} /><strong>No learner profiles yet</strong><span>Add a profile to begin a saved learning journey.</span></div>
            ) : (
              <ul className="fq-family-profile-list">
                {profiles.map((profile, index) => {
                  const active = profile.id === account.activeProfileId;
                  return <li key={profile.id} className={`fq-family-profile ${active ? 'is-active' : ''}`}>
                    <button className="fq-family-profile-select" type="button" onClick={() => void account.selectProfile(profile.id)} aria-current={active ? 'true' : undefined} aria-label={`Switch learning to ${profile.displayName}`}>
                      <span className={`fq-family-avatar tone-${index % 4}`} aria-hidden="true">{profile.displayName.trim().slice(0, 1).toUpperCase()}</span>
                      <span className="fq-family-profile-name"><strong>{profile.displayName}</strong><small>{active ? 'Active learning profile' : profile.classroomId ? 'Connected to a classroom' : 'Personal learning profile'}</small></span>
                      {active && <span className="fq-family-active-mark"><Check size={14} /> Active</span>}
                    </button>
                    {editingId === profile.id ? <form className="fq-family-inline-edit" onSubmit={(event) => void saveRename(event, profile.id)}>
                      <label className="sr-only" htmlFor={`fq-edit-${profile.id}`}>New name for {profile.displayName}</label>
                      <input id={`fq-edit-${profile.id}`} value={editName} maxLength={30} onChange={(event) => setEditName(event.target.value)} autoFocus />
                      <button className="fq-family-mini-action save" type="submit" disabled={!editName.trim() || busy === `rename-${profile.id}`} aria-label="Save learner name"><Check size={16} /></button>
                      <button className="fq-family-mini-action" type="button" onClick={() => setEditingId(null)} aria-label="Cancel editing"><X size={16} /></button>
                    </form> : <div className="fq-family-profile-actions">
                      <button type="button" className="fq-family-link" onClick={() => { setEditingId(profile.id); setEditName(profile.displayName); }}>Rename</button>
                      <button type="button" className="fq-family-link danger" onClick={() => setConfirm({ kind: 'delete-profile', profile })} disabled={profiles.length <= 1} aria-label={`Delete ${profile.displayName}`}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>}
                  </li>;
                })}
              </ul>
            )}
            {profiles.length === 1 && <p className="fq-family-footnote"><LockKeyhole size={14} /> The last profile stays on the account. To start fresh, clear its saved progress below.</p>}
            <form className="fq-family-add-form" onSubmit={(event) => void submitProfile(event)}>
              <label htmlFor="fq-new-learner">Add a learner</label>
              <div className="fq-family-form-row"><input id="fq-new-learner" value={newName} maxLength={30} placeholder="Learner name" onChange={(event) => setNewName(event.target.value)} required />
                <button className="fq-family-button primary" type="submit" disabled={!newName.trim() || busy === 'profile'}>{busy === 'profile' ? <LoaderCircle className="fq-spin" size={17} /> : <Plus size={17} />} Add profile</button>
              </div>
              <small>Use a nickname; it is not shown in educator reports.</small>
            </form>
          </section>

          <section className="fq-family-panel fq-family-classes" aria-labelledby="fq-classroom-title">
            <div className="fq-family-panel-head">
              <div><p className="fq-family-overline">02 / With a class</p><h3 id="fq-classroom-title">Classroom connections</h3></div>
              <span className="fq-family-panel-icon"><Users size={19} /></span>
            </div>
            <p className="fq-family-copy">A classroom lets an educator set learning units and view progress by anonymous code.</p>

            {classrooms.length > 0 && <div className="fq-family-class-selector">
              <label htmlFor="fq-classroom-select">Your classrooms</label>
              <div className="fq-family-select-wrap"><select id="fq-classroom-select" value={classroomId ?? ''} onChange={(event) => setSelectedClassId(Number(event.target.value))}>
                {classrooms.map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}
              </select><ChevronDown size={16} aria-hidden="true" /></div>
            </div>}

            {(latestJoinCode || selectedClassroom?.joinCode) && <div className="fq-family-code-card" aria-live="polite">
              <div><small>Share this classroom join code</small><strong>{latestJoinCode || selectedClassroom?.joinCode}</strong></div>
              <button type="button" className="fq-family-copy-button" onClick={() => void copyCode(latestJoinCode || selectedClassroom!.joinCode)}><Clipboard size={15} />{copiedCode ? 'Copied' : 'Copy code'}</button>
              <button type="button" className="fq-family-code-dismiss" onClick={() => setLatestJoinCode('')} aria-label="Hide join code"><X size={15} /></button>
            </div>}

            {classroomId !== null && <>
              <div className="fq-family-roster-heading"><div><h4>Class roster</h4><p>Codes only. Learner names are never shown here.</p></div><button type="button" className="fq-family-refresh" onClick={() => void rosterQuery.refetch()} aria-label="Refresh class roster"><RefreshCw size={15} /></button></div>
              {rosterQuery.isLoading ? <div className="fq-family-roster-loading" role="status">Loading anonymous roster…</div> : rosterQuery.isError ? <div className="fq-family-inline-error" role="alert">Roster unavailable. <button type="button" onClick={() => void rosterQuery.refetch()}>Retry</button></div> : rosterQuery.data?.length ? (
                <div className="fq-family-roster">
                  {rosterQuery.data.map((learner) => {
                    const selected = draftUnits[learner.memberCode] ?? learner.assignedUnitIds;
                    const changed = Boolean(draftUnits[learner.memberCode]);
                    return <article key={learner.memberCode} className="fq-family-roster-card">
                      <div className="fq-family-roster-top"><span className="fq-family-code-label">LEARNER CODE</span><strong>{learner.memberCode}</strong><span className="fq-family-mission-count">{learner.completedMissionIds.length} missions complete</span></div>
                      <fieldset className="fq-family-unit-fieldset">
                        <legend>Assigned units</legend>
                        <div className="fq-family-unit-grid">
                          {UNIT_IDS.map((unitId) => <label key={unitId} className={`fq-family-unit-check ${selected.includes(unitId) ? 'checked' : ''}`} title={titleFor(unitId, unitTitles)}>
                            <input type="checkbox" checked={selected.includes(unitId)} disabled={selected.length === 1 && selected.includes(unitId)} aria-label={`Assign ${titleFor(unitId, unitTitles)} to code ${learner.memberCode}`} onChange={(event) => {
                              setDraftUnits((current) => {
                                const base = current[learner.memberCode] ?? learner.assignedUnitIds;
                                const next = event.target.checked ? [...base, unitId] : base.filter((id) => id !== unitId);
                                return { ...current, [learner.memberCode]: next };
                              });
                            }} />
                            <span>{unitId.replace('unit-', '')}</span>
                          </label>)}
                        </div>
                      </fieldset>
                      <div className="fq-family-roster-bottom">
                        <span>{selected.length} {selected.length === 1 ? 'unit' : 'units'} assigned</span>
                        <button type="button" className="fq-family-button small" onClick={() => void saveAssignment(learner)} disabled={!changed || busy === `assign-${learner.memberCode}`}>
                          {busy === `assign-${learner.memberCode}` ? <LoaderCircle className="fq-spin" size={15} /> : <Check size={15} />} Save units
                        </button>
                      </div>
                    </article>;
                  })}
                </div>
              ) : <div className="fq-family-empty roster-empty"><Users size={21} /><strong>No learners in this classroom yet</strong><span>When a family joins, their anonymous code appears here.</span></div>}
            </>}
            {classroomId === null && <div className="fq-family-empty roster-empty"><Users size={21} /><strong>No classroom created yet</strong><span>Create one here, or join a class using a code from an educator.</span></div>}

            <div className="fq-family-class-actions">
              <form onSubmit={(event) => void createRoom(event)}>
                <label htmlFor="fq-class-label">Create a classroom</label>
                <div className="fq-family-form-row"><input id="fq-class-label" value={classLabel} maxLength={60} onChange={(event) => setClassLabel(event.target.value)} placeholder="For example, Room 12" />
                  <button type="submit" className="fq-family-button secondary" disabled={!classLabel.trim() || busy === 'classroom'}>{busy === 'classroom' ? <LoaderCircle className="fq-spin" size={16} /> : <Plus size={16} />} Create</button></div>
              </form>
              <form onSubmit={(event) => void submitJoin(event)}>
                <label htmlFor="fq-join-profile">Join an existing class</label>
                <div className="fq-family-join-row">
                  <div className="fq-family-select-wrap"><select id="fq-join-profile" value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>
                    <option value="">Choose learner</option>{availableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}
                  </select><ChevronDown size={15} aria-hidden="true" /></div>
                  <input aria-label="Classroom join code" value={joinCode} maxLength={16} autoCapitalize="characters" onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Join code" />
                  <button type="submit" className="fq-family-button outline" disabled={!selectedProfileId || joinCode.trim().length < 6 || busy === 'join'}>{busy === 'join' ? <LoaderCircle className="fq-spin" size={16} /> : 'Join'}</button>
                </div>
                {availableProfiles.length === 0 && <small>Every learner profile is already connected to a class.</small>}
              </form>
            </div>
          </section>
        </div>

        <aside className="fq-family-side">
          <section className="fq-family-side-card active-card">
            <p className="fq-family-overline">Currently learning</p>
            {account.activeProfile ? <><div className="fq-family-side-avatar">{account.activeProfile.displayName.slice(0, 1).toUpperCase()}</div><h3>{account.activeProfile.displayName}</h3><p>Progress sync <strong className={`fq-sync-${account.syncStatus}`}>{account.syncStatus === 'saved' ? 'Saved' : account.syncStatus === 'saving' ? 'Saving' : 'Offline'}</strong></p></> : <p>No active learner is selected.</p>}
          </section>
          <section className="fq-family-side-card">
            <p className="fq-family-overline">Your data</p>
            <h3>Take it with you.</h3>
            <p>Download a copy of the account, learner, and classroom data saved by Fraction Quest.</p>
            <button type="button" className="fq-family-button download" onClick={() => void runExport()} disabled={busy === 'export'}>{busy === 'export' ? <LoaderCircle className="fq-spin" size={17} /> : <Download size={17} />} Export account data</button>
            <small>JSON file · includes saved learner progress</small>
          </section>
          <section className="fq-family-side-card fq-family-danger-card">
            <p className="fq-family-overline">Start over</p>
            <h3>Clear saved progress</h3>
            <p>Remove online and on-device progress for the active learner. Their profile remains available.</p>
            <button type="button" className="fq-family-button clear" onClick={() => setConfirm({ kind: 'clear-progress' })} disabled={!account.activeProfileId}>Clear active learner’s progress</button>
          </section>
          <section className="fq-family-side-card fq-family-danger-card" data-testid="delete-account-card">
            <p className="fq-family-overline">Leave Fraction Quest</p>
            <h3>Delete this account</h3>
            <p>Permanently delete the account, every learner profile, classroom and saved progress. This cannot be undone. Export your data first if you want a copy.</p>
            <button type="button" className="fq-family-button clear" onClick={() => { setDeletePassword(''); setConfirm({ kind: 'delete-account' }); }} data-testid="button-delete-account">Delete account and all data</button>
          </section>
          <p className="fq-family-privacy-note"><Shield size={15} /> Learner nicknames are for your household. Classroom rosters display anonymous member codes only.</p>
        </aside>
      </div>

      {confirm && <div className="fq-family-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setConfirm(null); }}>
        <section ref={dialogRef} className="fq-family-dialog" role="alertdialog" aria-modal="true" aria-labelledby="fq-confirm-title" aria-describedby="fq-confirm-description">
          <span className="fq-family-dialog-icon"><AlertTriangle size={22} /></span>
          <h3 id="fq-confirm-title">{confirm.kind === 'delete-profile' ? `Remove ${confirm.profile.displayName}?` : confirm.kind === 'delete-account' ? 'Delete the whole account?' : 'Clear saved progress?'}</h3>
          <p id="fq-confirm-description">{confirm.kind === 'delete-profile'
            ? 'This permanently removes the learner profile and its saved data. The last learner profile cannot be deleted; clear progress instead if you want a fresh start.'
            : confirm.kind === 'delete-account'
              ? 'This permanently deletes the account, all learner profiles, classrooms and saved progress, and signs you out. It cannot be undone.'
              : `This permanently clears saved lesson progress and preferences for ${account.activeProfile?.displayName ?? 'the active learner'}. Their profile will remain.`}</p>
          {confirm.kind === 'delete-account' && (
            <label className="fq-family-delete-password">
              <span>Type the account password to confirm</span>
              <input type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} data-testid="input-delete-account-password" />
            </label>
          )}
          <div className="fq-family-dialog-actions">
            <button ref={dialogCancelRef} type="button" className="fq-family-button outline" onClick={() => setConfirm(null)} disabled={Boolean(busy)}>Keep it</button>
            <button type="button" className="fq-family-button destructive" onClick={() => confirm.kind === 'delete-profile' ? void removeProfile(confirm.profile) : confirm.kind === 'delete-account' ? void removeAccount() : void clearProgress()} disabled={Boolean(busy) || (confirm.kind === 'delete-account' && !deletePassword)} data-testid="button-confirm-family-action">
              {busy ? <LoaderCircle className="fq-spin" size={16} /> : <Trash2 size={16} />}{confirm.kind === 'delete-profile' ? 'Remove profile' : confirm.kind === 'delete-account' ? 'Delete everything' : 'Clear progress'}
            </button>
          </div>
        </section>
      </div>}
    </section>
  );
}
