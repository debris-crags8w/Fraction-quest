/* Rescore 5 (value): the code that tells a family's devices apart belongs to one learner's saved data, not to the device.
   Each account profile (and the guest) gets its own, and signing out or deleting the account removes it. */
import assert from 'node:assert/strict';
import test from 'node:test';

const store = new Map<string, string>();
(globalThis as { window?: unknown }).window = { localStorage: {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
} };
const { deviceId } = await import('./lib/fun');
const { clearScopedLearnerStorage, setLearnerStorageScope } = await import('./storage-scope');

test('each learner scope has its own device code, kept with that scope', () => {
  store.set('fraction-quest-device', 'd-shared1234');
  setLearnerStorageScope('user-1:profile-1');
  const first = deviceId();
  assert.notEqual(first, 'd-shared1234', 'the old code shared by every account is not used');
  assert.equal(store.has('fraction-quest-device'), false, 'and it is removed');
  assert.equal(deviceId(), first, 'the same code each time in one scope');
  setLearnerStorageScope('user-2:profile-9');
  const second = deviceId();
  assert.notEqual(second, first, 'another account on the same device gets another code');
  setLearnerStorageScope('guest');
  assert.notEqual(deviceId(), first);
  setLearnerStorageScope('user-1:profile-1');
  assert.equal(deviceId(), first, 'back in the first scope: its own code again');
});

test('signing out or deleting the account removes that scope\'s device code', () => {
  setLearnerStorageScope('user-3:profile-3');
  const before = deviceId();
  clearScopedLearnerStorage('user-3:profile-3');
  assert.equal([...store.keys()].some((key) => key.endsWith(':user-3:profile-3') && key.startsWith('fraction-quest-device')), false);
  assert.notEqual(deviceId(), before, 'a new code after signing in again');
});
