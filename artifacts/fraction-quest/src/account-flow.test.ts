import assert from 'node:assert/strict';
import test from 'node:test';
import { accountEntryAfterSessionFailure, accountEntryFailure, authenticateAccount, createProgressSaveQueue, hydrateAccountProgress, signOutSafely, versionedProgressSave, type AccountBundle } from './account-flow';
import { EMPTY_PROGRESS, MISSIONS, type Progress } from './game';
import { emptyLearningRecord } from './learning';

const guest: AccountBundle = {
  progress: { completedMissionIds: ['equal-parts'], starsByMission: { 'equal-parts': 2 }, reviewQueue: [] },
  fun: { xp: 30, day: '2026-10-11', answeredToday: 3, dayStreak: 2, lastActiveDay: '2026-10-11', sound: true },
};

test('guest work reloads into guest mode only when a guest marker was saved', () => {
  assert.equal(accountEntryAfterSessionFailure(true), 'guest');
  assert.equal(accountEntryAfterSessionFailure(false), 'signed-out');
});

test('a rejected session after login returns to sign-in with cookie guidance', () => {
  assert.deepEqual(accountEntryFailure(401, 'fallback'), {
    kind: 'signed-out',
    notice: "Your sign-in was accepted, but this browser couldn't keep the session. Check that cookies are allowed for Fraction Quest, then sign in again.",
  });
});

test('other profile-load failures stay recoverable without claiming the session was rejected', () => {
  assert.deepEqual(accountEntryFailure(503, 'The profiles could not be loaded.'), {
    kind: 'profile-error',
    notice: 'The profiles could not be loaded.',
  });
});

test('sign-up and sign-in call their matching account endpoint', async () => {
  const calls: string[] = [];
  const api = {
    signup: async (body: { username: string; displayName: string; password: string; parentConsent: boolean }) => {
      calls.push(`signup:${body.username}:${body.displayName}`);
      assert.equal(body.parentConsent, true);
      return { id: 7 };
    },
    login: async (body: { username: string; password: string }) => {
      calls.push(`login:${body.username}`);
      return { id: 7 };
    },
  };
  assert.deepEqual(await authenticateAccount('create', { username: 'star_fox', password: 'abcdefgh', parentConsent: true }, api), { id: 7 });
  assert.deepEqual(await authenticateAccount('sign-in', { username: 'star_fox', password: 'abcdefgh' }, api), { id: 7 });
  assert.deepEqual(calls, ['signup:star_fox:star_fox', 'login:star_fox']);
});

test('account hydration loads the account snapshot without mixing in this device’s guest work', async () => {
  const account: AccountBundle = {
    progress: { completedMissionIds: ['fraction-names'], starsByMission: { 'fraction-names': 3 }, reviewQueue: [] },
    fun: { ...guest.fun, xp: 90 },
  };
  let device = guest;
  let savedToAccount = 0;
  const result = await hydrateAccountProgress({
    getProgress: async () => ({ progress: account.progress, fun: account.fun }),
    saveProgress: async () => { savedToAccount += 1; },
  }, {
    read: () => device,
    write: (bundle) => { device = bundle; },
  });

  assert.deepEqual(result, account);
  assert.deepEqual(device, account);
  assert.equal(savedToAccount, 0);
});

test('account hydration carries a saved voice preference to another device', async () => {
  const accountVoice = 'desktop-voice|en-US';
  let device: AccountBundle = {
    ...guest,
    fun: { ...guest.fun, preferredLearningVoiceId: 'phone-voice|en-US' },
  };
  const restored = await hydrateAccountProgress({
    getProgress: async () => ({
      progress: guest.progress,
      fun: { ...guest.fun, preferredLearningVoiceId: accountVoice },
    }),
    saveProgress: async () => {},
  }, {
    read: () => device,
    write: (bundle) => { device = bundle; },
  });

  assert.equal(restored.fun.preferredLearningVoiceId, accountVoice);
  assert.equal(device.fun.preferredLearningVoiceId, accountVoice);
});

test('a new account receives guest work, and a failed upload leaves the device copy unchanged', async () => {
  let device = guest;
  let received: unknown;
  const result = await hydrateAccountProgress({
    getProgress: async () => ({ progress: null, fun: null }),
    saveProgress: async (bundle) => { received = bundle; },
  }, {
    read: () => device,
    write: (bundle) => { device = bundle; },
  });
  assert.deepEqual(received, guest);
  assert.deepEqual(result, guest);

  await assert.rejects(() => hydrateAccountProgress({
    getProgress: async () => ({ progress: null, fun: null }),
    saveProgress: async () => { throw new Error('network down'); },
  }, {
    read: () => device,
    write: (bundle) => { device = bundle; },
  }), /network down/);
  assert.deepEqual(device, guest);
});

test('sign-out keeps local work if saving or server logout fails', async () => {
  let cleared = false;
  await assert.rejects(
    () => signOutSafely(async () => false, async () => {}, () => { cleared = true; }),
    /latest work couldn't be saved/,
  );
  assert.equal(cleared, false);

  await assert.rejects(
    () => signOutSafely(async () => true, async () => { throw new Error('offline'); }, () => { cleared = true; }),
    /couldn't be signed out/,
  );
  assert.equal(cleared, false);

  await signOutSafely(async () => true, async () => {}, () => { cleared = true; });
  assert.equal(cleared, true);
});

test('failed progress saves remain pending and can be retried without replacing newer work', async () => {
  const calls: number[] = [];
  const statuses: string[] = [];
  let shouldFail = true;
  const queue = createProgressSaveQueue(async (value: number) => {
    calls.push(value);
    if (shouldFail) throw new Error('offline');
  }, (status) => statuses.push(status));

  queue.enqueue(1, 60_000);
  assert.equal(await queue.flush(), false);
  assert.equal(queue.peekPending(), 1);
  assert.equal(statuses.at(-1), 'offline');

  shouldFail = false;
  queue.enqueue(2, 60_000);
  assert.equal(await queue.flush(), true);
  assert.deepEqual(calls, [1, 2]);
  assert.equal(queue.peekPending(), null);
  assert.equal(statuses.at(-1), 'saved');
});

test('offline learner progress survives a page reload and clears after a successful retry', async () => {
  let persisted: number | null = null;
  let online = false;
  const makeQueue = () => createProgressSaveQueue<number>(
    async () => { if (!online) throw new Error('offline'); },
    () => {},
    { load: () => persisted, store: (value) => { persisted = value; } },
  );
  const beforeReload = makeQueue();
  beforeReload.enqueue(42, 60_000);
  assert.equal(await beforeReload.flush(), false);
  assert.equal(persisted, 42);

  online = true;
  const afterReload = makeQueue();
  assert.equal(afterReload.peekPending(), 42);
  assert.equal(await afterReload.flush(), true);
  assert.equal(persisted, null);
});

test('student sign-up, saved-progress return visit, sign-out, and sign-in complete without mixing devices', async () => {
  const accounts = new Map<string, { id: number; password: string; saved: AccountBundle | null }>();
  let active: { id: number; username: string } | null = null;
  let device = guest;
  const authApi = {
    signup: async ({ username, password }: { username: string; displayName: string; password: string }) => {
      if (accounts.has(username)) throw new Error('taken');
      const account = { id: accounts.size + 1, password, saved: null };
      accounts.set(username, account);
      active = { id: account.id, username };
      return { id: account.id, username };
    },
    login: async ({ username, password }: { username: string; password: string }) => {
      const account = accounts.get(username);
      if (!account || account.password !== password) throw new Error('incorrect');
      active = { id: account.id, username };
      return { id: account.id, username };
    },
  };
  const progressApi = {
    getProgress: async () => {
      const account = active && accounts.get(active.username);
      if (!account) throw new Error('not signed in');
      return { progress: account.saved?.progress ?? null, fun: account.saved?.fun ?? null };
    },
    saveProgress: async (bundle: { progress: Record<string, unknown>; fun: Record<string, unknown> }) => {
      if (!active) throw new Error('not signed in');
      const account = accounts.get(active.username)!;
      account.saved = bundle as unknown as AccountBundle;
    },
  };
  const store = {
    read: () => device,
    write: (bundle: AccountBundle) => { device = bundle; },
  };

  const created = await authenticateAccount('create', { username: 'star_fox', password: 'abcdefgh' }, authApi);
  const initial = await hydrateAccountProgress(progressApi, store);
  assert.equal(created.id, 1);
  assert.deepEqual(initial, guest);
  assert.deepEqual(accounts.get('star_fox')?.saved, guest);

  // A new browser session resolves the signed-in student, then loads only their saved snapshot.
  const firstSession = active;
  active = firstSession;
  device = { progress: { completedMissionIds: [], starsByMission: {}, reviewQueue: [] }, fun: { ...guest.fun, xp: 0 } };
  const returning = await hydrateAccountProgress(progressApi, store);
  assert.deepEqual(returning, guest);
  assert.deepEqual(device, guest);

  let cleared = false;
  await signOutSafely(async () => true, async () => { active = null; }, () => {
    device = { progress: { completedMissionIds: [], starsByMission: {}, reviewQueue: [] }, fun: guest.fun };
    cleared = true;
  });
  assert.equal(cleared, true);
  assert.equal(active, null);

  // Failed credentials do not hydrate, overwrite, or clear the device's existing work.
  const beforeFailedLogin = device;
  await assert.rejects(() => authenticateAccount('sign-in', { username: 'star_fox', password: 'wrongpass' }, authApi), /incorrect/);
  assert.equal(device, beforeFailedLogin);

  await authenticateAccount('sign-in', { username: 'star_fox', password: 'abcdefgh' }, authApi);
  const afterReturn = await hydrateAccountProgress(progressApi, store);
  assert.deepEqual(afterReturn, guest);
  assert.deepEqual(device, guest);
});

/* Two devices, one learner: the server keeps a version and refuses a save made from an older one (409, with its copy). */
function twoDeviceServer(start: { progress: Progress; version: number; resetVersion?: number }) {
  let saved = { progress: start.progress as unknown, fun: {} as unknown, version: start.version };
  let resetVersion = start.resetVersion ?? 0;
  const puts: (number | undefined)[] = [];
  return {
    get copy() { return saved; },
    clear() { saved = { progress: {}, fun: {}, version: saved.version + 1 }; resetVersion = saved.version; },
    api: {
      load: async () => saved,
      save: async (copy: { progress: unknown; fun: unknown; version?: number }) => {
        puts.push(copy.version);
        if (copy.version !== undefined && copy.version !== saved.version) {
          throw Object.assign(new Error('conflict'), { status: 409, data: { ...saved, clearedSince: resetVersion > copy.version, updatedAt: null, error: 'x' } });
        }
        saved = { progress: copy.progress, fun: copy.fun, version: saved.version + 1 };
        return { version: saved.version };
      },
    },
    puts,
  };
}
const [lessonA, lessonB] = MISSIONS.map((mission) => mission.id);
const finishedOnly = (...ids: string[]): Progress => ({
  ...EMPTY_PROGRESS, completedMissionIds: ids, starsByMission: Object.fromEntries(ids.map((id) => [id, 3])),
  learning: Object.fromEntries(ids.map((id) => [id, { ...emptyLearningRecord(), practiceDone: true, completedAt: 1 }])),
});
const plainClean = (copy: { progress: unknown; fun: unknown }) => ({ progress: { ...EMPTY_PROGRESS, ...(copy.progress as Progress) }, fun: copy.fun as AccountBundle['fun'] });
const memory = (start: number | null) => { let value = start; return { read: () => value, write: (next: number | null) => { value = next; } }; };

test('a device saving an old copy does not erase a lesson finished on another device', async () => {
  // The tablet finished lesson B (server version 6); the phone last loaded version 5 and finished lesson A.
  const server = twoDeviceServer({ progress: finishedOnly(lessonB), version: 6 });
  const version = memory(5);
  const told: { progress: Progress; cleared: boolean }[] = [];
  const save = versionedProgressSave(server.api, version, plainClean, (copy) => told.push(copy));
  await save({ progress: finishedOnly(lessonA), fun: {} as AccountBundle['fun'] });
  assert.deepEqual(server.puts, [5, 6], 'refused once, then saved on the current version');
  assert.deepEqual([...(server.copy.progress as Progress).completedMissionIds].sort(), [lessonA, lessonB].sort());
  assert.equal(version.read(), 7);
  assert.equal(told.length, 1, 'the app is given the saved copy to merge into what is on screen');
  assert.deepEqual(told[0].progress.completedMissionIds, [lessonB]);
  assert.equal(told[0].cleared, false);
});

test('a save from the latest version goes straight through and remembers the new version', async () => {
  const server = twoDeviceServer({ progress: finishedOnly(lessonB), version: 3 });
  const version = memory(3);
  await versionedProgressSave(server.api, version, plainClean, () => assert.fail('no merge needed'))({ progress: finishedOnly(lessonB, lessonA), fun: {} as AccountBundle['fun'] });
  assert.deepEqual(server.puts, [3]);
  assert.equal(version.read(), 4);
});

test('a device that never learned a version loads the saved copy and merges before it saves', async () => {
  const server = twoDeviceServer({ progress: finishedOnly(lessonB), version: 2 });
  const version = memory(null);
  await versionedProgressSave(server.api, version, plainClean, () => {})({ progress: finishedOnly(lessonA), fun: {} as AccountBundle['fun'] });
  assert.deepEqual(server.puts, [2]);
  assert.deepEqual([...(server.copy.progress as Progress).completedMissionIds].sort(), [lessonA, lessonB].sort());
});

test('progress a grown-up cleared on another device is not merged back from an old copy', async () => {
  const server = twoDeviceServer({ progress: finishedOnly(lessonB), version: 4 });
  const version = memory(4);
  server.clear();
  const told: { cleared: boolean }[] = [];
  await versionedProgressSave(server.api, version, plainClean, (copy) => told.push(copy))({ progress: finishedOnly(lessonA, lessonB), fun: {} as AccountBundle['fun'] });
  assert.deepEqual((server.copy.progress as Progress).completedMissionIds, []);
  assert.deepEqual(told.map((copy) => copy.cleared), [true]);
});

test('a save that keeps meeting newer copies gives up for now, and the queue retries it later', async () => {
  const save = versionedProgressSave({
    load: async () => ({ progress: {}, fun: {}, version: 1 }),
    save: async () => { throw Object.assign(new Error('conflict'), { status: 409, data: { progress: {}, fun: {}, version: 99, clearedSince: false } }); },
  }, memory(1), plainClean, () => {});
  await assert.rejects(save({ progress: finishedOnly(lessonA), fun: {} as AccountBundle['fun'] }));
});

test('a merged copy is not lost when the connection drops right after a refused save', async () => {
  // The phone saved lesson A offline (version 4); the tablet has since saved lesson B (version 5). The phone's save is
  // refused, merged, and then the network drops on the merged save. The retry must still keep lesson B.
  const server = twoDeviceServer({ progress: finishedOnly(lessonB), version: 5 });
  let dropNext = false;
  let dropped = false;
  const flaky = {
    load: server.api.load,
    save: async (copy: { progress: Record<string, unknown>; fun: Record<string, unknown>; version?: number }) => {
      if (dropNext) { dropNext = false; throw new Error('network'); }
      // The connection drops once, on the save right after the first refusal.
      try { return await server.api.save(copy); } catch (error) { if (!dropped) { dropped = true; dropNext = true; } throw error; }
    },
  };
  const version = memory(4);
  const queue = createProgressSaveQueue<AccountBundle>(versionedProgressSave(flaky, version, plainClean, () => {}));
  queue.enqueue({ progress: finishedOnly(lessonA), fun: {} as AccountBundle['fun'] }, 0);
  assert.equal(await queue.flush(), false, 'the merged save met the dropped connection');
  assert.equal(await queue.flush(), true);
  assert.deepEqual([...(server.copy.progress as Progress).completedMissionIds].sort(), [lessonA, lessonB].sort(), 'lesson B from the tablet stays');
});

test('after three refused saves the version is not moved on, so the queued copy is merged again next time', async () => {
  const server = twoDeviceServer({ progress: finishedOnly(lessonB), version: 9 });
  let refusals = 0;
  const busy = {
    load: server.api.load,
    save: async (copy: { progress: Record<string, unknown>; fun: Record<string, unknown>; version?: number }) => {
      // Another device keeps saving in between, three times.
      if (refusals < 3) { refusals += 1; throw Object.assign(new Error('conflict'), { status: 409, data: { ...server.copy, version: server.copy.version + refusals, clearedSince: false } }); }
      return server.api.save(copy);
    },
  };
  const version = memory(3);
  const queue = createProgressSaveQueue<AccountBundle>(versionedProgressSave(busy, version, plainClean, () => {}));
  queue.enqueue({ progress: finishedOnly(lessonA), fun: {} as AccountBundle['fun'] }, 0);
  assert.equal(await queue.flush(), false);
  assert.equal(version.read(), 3, 'no version is kept until a save is accepted');
  assert.equal(await queue.flush(), true);
  assert.deepEqual([...(server.copy.progress as Progress).completedMissionIds].sort(), [lessonA, lessonB].sort());
});

test('after three refused saves the save status says another device is saving, not offline', async () => {
  const statuses: string[] = [];
  const save = versionedProgressSave({
    load: async () => ({ progress: {}, fun: {}, version: 1 }),
    save: async () => { throw Object.assign(new Error('conflict'), { status: 409, data: { progress: {}, fun: {}, version: 99, clearedSince: false } }); },
  }, memory(1), plainClean, () => {});
  const queue = createProgressSaveQueue<AccountBundle>(save, (status) => statuses.push(status));
  queue.enqueue({ progress: finishedOnly(lessonA), fun: {} as AccountBundle['fun'] }, 0);
  assert.equal(await queue.flush(), false);
  assert.equal(statuses.at(-1), 'busy');
  const offline = createProgressSaveQueue<AccountBundle>(async () => { throw new Error('network'); }, (status) => statuses.push(status));
  offline.enqueue({ progress: finishedOnly(lessonA), fun: {} as AccountBundle['fun'] }, 0);
  assert.equal(await offline.flush(), false);
  assert.equal(statuses.at(-1), 'offline');
});
