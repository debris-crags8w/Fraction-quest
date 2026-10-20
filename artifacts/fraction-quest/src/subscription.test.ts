import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonsLocked, readSubscription, webLessonsLocked } from './lib/subscription';

const withShell = (shell: unknown, run: () => void) => {
  const scope = globalThis as { fractionQuestShell?: unknown };
  scope.fractionQuestShell = shell;
  try { run(); } finally { delete scope.fractionQuestShell; }
};

test('a browser with no app around it has no subscription and nothing locked', () => {
  assert.equal(readSubscription(), null);
  assert.equal(lessonsLocked(null), false);
});

test('lessons lock only when the store says there is no subscription', () => {
  assert.equal(lessonsLocked({ state: 'none' }), true);
  assert.equal(lessonsLocked({ state: 'active' }), false);
  // The store could not be reached or is not set up: a child is never stuck because of it.
  assert.equal(lessonsLocked({ state: 'unavailable' }), false);
});

test('the page keeps only well-formed parts of what the app reports', () => {
  withShell({ platform: 'ios', wifi: true, subscription: { state: 'active', renewsAt: 1_800_000_000_000, price: '$4.99', busy: false } }, () => {
    assert.deepEqual(readSubscription(), { state: 'active', renewsAt: 1_800_000_000_000, price: '$4.99', busy: false, error: null });
  });
  withShell({ platform: 'ios', wifi: true, subscription: { state: 'paid', price: '$4.99' } }, () => assert.equal(readSubscription(), null));
  withShell({ platform: 'ios', wifi: true }, () => assert.equal(readSubscription(), null));
  withShell({ platform: 'android', wifi: false, subscription: { state: 'none', renewsAt: 'soon', price: 'x'.repeat(40), busy: 'yes' } }, () => {
    assert.deepEqual(readSubscription(), { state: 'none', renewsAt: null, price: null, busy: false, error: null });
  });
});

test('in a plain browser lessons after the first point to the app; inside the app the store decides', () => {
  assert.equal(webLessonsLocked(), true);
  withShell({ platform: 'ios', wifi: true }, () => assert.equal(webLessonsLocked(), false));
});
