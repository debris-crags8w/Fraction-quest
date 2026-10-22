import assert from 'node:assert/strict';
import test from 'node:test';
import { parseShellMessage, shellInfoScript } from './web-app';

test('the app accepts only the four subscription requests from the page', () => {
  for (const action of ['status', 'buy', 'restore', 'manage']) {
    assert.deepEqual(parseShellMessage(JSON.stringify({ type: 'subscription', action })), { type: 'subscription', action });
  }
  assert.deepEqual(parseShellMessage(JSON.stringify({ type: 'subscription', action: 'buy', plan: 'yearly' })), { type: 'subscription', action: 'buy', plan: 'yearly' });
  // An unknown plan is dropped (the monthly plan is bought), and nothing else rides along.
  assert.deepEqual(parseShellMessage(JSON.stringify({ type: 'subscription', action: 'buy', plan: 'lifetime', extra: 1 })), { type: 'subscription', action: 'buy' });
  assert.equal(parseShellMessage(JSON.stringify({ type: 'subscription', action: 'refund' })), null);
  assert.equal(parseShellMessage(JSON.stringify({ type: 'subscription' })), null);
  assert.equal(parseShellMessage('not json'), null);
});

test('the app tells the page its subscription status, and leaves it out when there is none to tell', () => {
  const run = (script: string) => {
    const scope = { window: { dispatchEvent: () => true } as Record<string, unknown> };
    new Function('window', 'Event', script)(scope.window, class { constructor(public type: string) {} });
    return scope.window.fractionQuestShell;
  };
  assert.deepEqual(run(shellInfoScript('ios', true, { state: 'none', price: '$4.99' })), { platform: 'ios', wifi: true, subscription: { state: 'none', price: '$4.99' } });
  assert.deepEqual(run(shellInfoScript('android', false)), { platform: 'android', wifi: false });
  const reminder = { time: '16:00', days: [1, 2], permission: 'granted' as const };
  assert.deepEqual(run(shellInfoScript('ios', true, null, { reminder, openPractice: 5 })), { platform: 'ios', wifi: true, reminder, openPractice: 5 });
});

test('the app accepts the reminder settings and the practised day from the page', () => {
  assert.deepEqual(parseShellMessage(JSON.stringify({ type: 'reminder', action: 'set', time: '17:00', days: [6, 0] })), { type: 'reminder', action: 'set', time: '17:00', days: [0, 6] });
  assert.deepEqual(parseShellMessage(JSON.stringify({ type: 'reminder', action: 'practised', day: '2026-10-22' })), { type: 'reminder', action: 'practised', day: '2026-10-22' });
  assert.equal(parseShellMessage(JSON.stringify({ type: 'reminder', action: 'spam' })), null);
});
