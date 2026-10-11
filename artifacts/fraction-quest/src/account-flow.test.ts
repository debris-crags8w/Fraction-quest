import assert from 'node:assert/strict';
import test from 'node:test';
import { accountEntryAfterSessionFailure, authenticateAccount, createProgressSaveQueue, hydrateAccountProgress, signOutSafely, type AccountBundle } from './account-flow';

const guest: AccountBundle = {
  progress: { completedMissionIds: ['equal-parts'], starsByMission: { 'equal-parts': 2 }, reviewQueue: [] },
  fun: { xp: 30, day: '2026-10-11', answeredToday: 3, dayStreak: 2, lastActiveDay: '2026-10-11', sound: true },
};

test('guest work reloads into guest mode only when a guest marker was saved', () => {
  assert.equal(accountEntryAfterSessionFailure(true), 'guest');
  assert.equal(accountEntryAfterSessionFailure(false), 'signed-out');
});

test('sign-up and sign-in call their matching account endpoint', async () => {
  const calls: string[] = [];
  const api = {
    signup: async (body: { username: string; displayName: string; password: string }) => {
      calls.push(`signup:${body.username}:${body.displayName}`);
      return { id: 7 };
    },
    login: async (body: { username: string; password: string }) => {
      calls.push(`login:${body.username}`);
      return { id: 7 };
    },
  };
  assert.deepEqual(await authenticateAccount('create', { username: 'star_fox', password: 'abcdefgh' }, api), { id: 7 });
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
