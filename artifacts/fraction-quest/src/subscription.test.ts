import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonsLocked, perMonth, planChoices, readSubscription, webLessonsLocked, yearlySaving } from './lib/subscription';

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
    assert.deepEqual(readSubscription(), { state: 'active', renewsAt: 1_800_000_000_000, price: '$4.99', plans: [], busy: false, error: null });
  });
  withShell({ platform: 'ios', wifi: true, subscription: { state: 'paid', price: '$4.99' } }, () => assert.equal(readSubscription(), null));
  withShell({ platform: 'ios', wifi: true }, () => assert.equal(readSubscription(), null));
  withShell({ platform: 'android', wifi: false, subscription: { state: 'none', renewsAt: 'soon', price: 'x'.repeat(40), busy: 'yes' } }, () => {
    assert.deepEqual(readSubscription(), { state: 'none', renewsAt: null, price: null, plans: [], busy: false, error: null });
  });
});

test('in a plain browser lessons after the first point to the app; inside the app the store decides', () => {
  assert.equal(webLessonsLocked(), true);
  withShell({ platform: 'ios', wifi: true }, () => assert.equal(webLessonsLocked(), false));
});

test('the page reads the plans the store has for sale, yearly first, and drops anything malformed', () => {
  const plans = [
    { plan: 'monthly', price: '$4.99', amount: 4.99, currency: 'USD' },
    { plan: 'lifetime', price: '$99' },
    { plan: 'yearly', price: '$39.99', amount: 39.99, currency: 'USD' },
  ];
  withShell({ platform: 'ios', wifi: true, subscription: { state: 'none', price: '$4.99', plans } }, () => {
    assert.deepEqual(readSubscription()!.plans, [
      { plan: 'yearly', price: '$39.99', amount: 39.99, currency: 'USD' },
      { plan: 'monthly', price: '$4.99', amount: 4.99, currency: 'USD' },
    ]);
  });
  withShell({ platform: 'ios', wifi: true, subscription: { state: 'none', plans: [{ plan: 'yearly', price: '', amount: -1 }, { plan: 'monthly', price: '$4.99', amount: 'x', currency: 'dollars' }] } }, () => {
    assert.deepEqual(readSubscription()!.plans, [{ plan: 'monthly', price: '$4.99', amount: null, currency: null }]);
  });
});

test('an older app that names no plans sells only the monthly plan', () => {
  assert.deepEqual(planChoices({ state: 'none', price: '£4.49' }), [{ plan: 'monthly', price: '£4.49' }]);
  assert.deepEqual(planChoices({ state: 'none' }), [{ plan: 'monthly', price: '$4.99' }]);
});

test('the yearly plan shows its saving and monthly cost only when the numbers allow it', () => {
  const yearly = { plan: 'yearly' as const, price: '$39.99', amount: 39.99, currency: 'USD' };
  const monthly = { plan: 'monthly' as const, price: '$4.99', amount: 4.99, currency: 'USD' };
  assert.equal(yearlySaving([yearly, monthly]), 33);
  assert.equal(yearlySaving([yearly, { ...monthly, currency: 'EUR' }]), null, 'different currencies');
  assert.equal(yearlySaving([yearly, { ...monthly, amount: null }]), null, 'no number');
  assert.equal(yearlySaving([{ ...yearly, amount: 70 }, monthly]), null, 'no saving');
  assert.equal(yearlySaving([yearly]), null);
  assert.match(perMonth(yearly) ?? '', /3\.33/);
  assert.equal(perMonth({ ...yearly, currency: null }), null);
});
