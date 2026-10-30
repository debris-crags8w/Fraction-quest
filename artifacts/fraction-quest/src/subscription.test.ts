import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonsLocked, offerWords, perMonth, planChoices, readSubscription, webLessonsLocked, yearlySaving } from './lib/subscription';

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
    assert.deepEqual(readSubscription(), { state: 'active', renewsAt: 1_800_000_000_000, price: '$4.99', plans: [], busy: false, error: null, trial: null });
  });
  withShell({ platform: 'ios', wifi: true, subscription: { state: 'paid', price: '$4.99' } }, () => assert.equal(readSubscription(), null));
  withShell({ platform: 'ios', wifi: true }, () => assert.equal(readSubscription(), null));
  withShell({ platform: 'android', wifi: false, subscription: { state: 'none', renewsAt: 'soon', price: 'x'.repeat(40), busy: 'yes' } }, () => {
    assert.deepEqual(readSubscription(), { state: 'none', renewsAt: null, price: null, plans: [], busy: false, error: null, trial: null });
  });
});

test('in a plain browser lessons after the first point to the app; inside the app the store decides', () => {
  assert.equal(webLessonsLocked(), true);
  withShell({ platform: 'ios', wifi: true }, () => assert.equal(webLessonsLocked(), false));
});

test('the development server keeps every lesson open; the published website keeps the limit', () => {
  // Reported: the "rest of the adventure is in the app" screen showed on the Replit development URL.
  assert.equal(webLessonsLocked({ DEV: true }), false);
  assert.equal(webLessonsLocked({ DEV: false }), true);
  assert.equal(webLessonsLocked({ VITE_WEB_LESSONS_OPEN: '1' }), false);
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

test('the page reads whether the store will give this account the free trial', () => {
  withShell({ platform: 'ios', wifi: true, subscription: { state: 'none', trial: false } }, () => assert.equal(readSubscription()?.trial, false));
  withShell({ platform: 'ios', wifi: true, subscription: { state: 'none', trial: true } }, () => assert.equal(readSubscription()?.trial, true));
  withShell({ platform: 'ios', wifi: true, subscription: { state: 'none', trial: 'yes' } }, () => assert.equal(readSubscription()?.trial, null));
});

test('a family whose subscription ended is not promised a free trial', () => {
  const plans = [{ plan: 'yearly' as const, price: '$39.99' }, { plan: 'monthly' as const, price: '$4.99' }];
  const lapsed = offerWords({ state: 'none', plans }, { lapsed: true, platform: 'ios' });
  const notEligible = offerWords({ state: 'none', plans, trial: false }, { lapsed: false, platform: 'ios' });
  for (const words of [lapsed, notEligible]) {
    const all = [words.heading, words.price(plans[0]), words.terms, words.button, words.planButton('yearly'), words.planButton('monthly'), words.status].join(' ');
    assert.doesNotMatch(all, /free|trial|7 days|7-day/i);
    assert.equal(words.price(plans[0]), '$39.99 a year');
    assert.equal(words.status, 'Lessons are locked. Subscribe for $39.99 a year or $4.99 a month.');
  }
  // A family new to Fraction Quest (and a store that does not say) still sees the trial.
  for (const trial of [true, null]) {
    const words = offerWords({ state: 'none', plans, trial }, { lapsed: false, platform: 'ios' });
    assert.equal(words.heading, 'Try Fraction Quest free for 7 days');
    assert.equal(words.price(plans[1]), '7 days free, then $4.99 a month');
    assert.equal(words.button, 'Start free trial');
    assert.equal(words.status, 'Lessons are locked. Start the 7-day free trial, then $39.99 a year or $4.99 a month.');
  }
});

test('the paywall says where to cancel on each kind of phone', () => {
  const where = (platform: string) => offerWords({ state: 'none' }, { lapsed: false, platform }).terms;
  assert.match(where('ios'), /Cancel anytime in Settings on this iPhone or iPad,/);
  assert.match(where('android'), /Cancel anytime in Google Play,/);
  assert.match(where(''), /Cancel anytime in the App Store or Google Play,/);
  for (const platform of ['ios', 'android', '']) assert.doesNotMatch(where(platform), /your phone/);
  assert.equal(offerWords({ state: 'none' }, { lapsed: true, platform: 'android' }).terms, 'Renews until cancelled. Cancel anytime in Google Play.');
});
