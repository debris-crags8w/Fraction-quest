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
});
