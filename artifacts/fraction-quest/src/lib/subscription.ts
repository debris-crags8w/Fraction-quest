/* The subscription (yearly or monthly), sold only in the app (iPhone and Android). The app's shell asks Apple or Google and puts
   the answer on `window.fractionQuestShell.subscription`; this page asks it to buy, restore or manage. The app is
   where Fraction Quest lives: in a plain browser, only the first lesson is open and the rest point to the app. */
import { useSyncExternalStore } from 'react';
import { onAppShellChange } from './app-shell';
import { postToShell } from './native-shell';

export type Plan = 'yearly' | 'monthly';
/** A plan the store has for sale. */
export type PlanOffer = { plan: Plan; price: string; amount?: number | null; currency?: string | null };
export type Subscription = {
  state: 'active' | 'none' | 'unavailable';
  renewsAt?: number | null;
  /** The monthly price text. */
  price?: string | null;
  /** The plans the store has for sale; left out by older apps, which sell only the monthly plan. */
  plans?: PlanOffer[];
  busy?: boolean;
  error?: string | null;
  /** Whether the store will give this store account the 7-day free trial (Apple and Google give it once); null when
      the store does not say (an older app). */
  trial?: boolean | null;
};
export type SubscriptionAction = 'status' | 'buy' | 'restore' | 'manage';
/** Shown when the store has no price yet (the store's own price text replaces it). */
export const LISTED_PRICE = '$4.99';
export const LISTED_YEARLY_PRICE = '$39.99';
const SUBSCRIBED_ONCE_KEY = 'fraction-quest-subscribed-once';

/** What the shell last said, or null outside the app (or in an older app that does not sell subscriptions). */
export function readSubscription(): Subscription | null {
  const raw = (globalThis as { fractionQuestShell?: { subscription?: Partial<Subscription> } }).fractionQuestShell?.subscription;
  if (!raw || typeof raw !== 'object' || !['active', 'none', 'unavailable'].includes(String(raw.state))) return null;
  return {
    state: raw.state as Subscription['state'],
    renewsAt: typeof raw.renewsAt === 'number' && Number.isFinite(raw.renewsAt) ? raw.renewsAt : null,
    price: typeof raw.price === 'string' && raw.price.length <= 24 ? raw.price : null,
    plans: readPlans(raw.plans),
    busy: raw.busy === true,
    error: typeof raw.error === 'string' ? raw.error.slice(0, 200) : null,
    trial: typeof raw.trial === 'boolean' ? raw.trial : null,
  };
}

function readPlans(raw: unknown): PlanOffer[] {
  if (!Array.isArray(raw)) return [];
  const plans: PlanOffer[] = [];
  for (const plan of ['yearly', 'monthly'] as const) {
    const offer = raw.find((item): item is Record<string, unknown> => !!item && typeof item === 'object' && (item as { plan?: unknown }).plan === plan);
    if (!offer || typeof offer.price !== 'string' || !offer.price || offer.price.length > 24) continue;
    plans.push({
      plan,
      price: offer.price,
      amount: typeof offer.amount === 'number' && Number.isFinite(offer.amount) && offer.amount > 0 ? offer.amount : null,
      currency: typeof offer.currency === 'string' && /^[A-Z]{3}$/.test(offer.currency) ? offer.currency : null,
    });
  }
  return plans;
}

/** What the paywall offers: the store's plans, yearly first. An app that names no plans sells only the monthly one. */
export function planChoices(subscription: Subscription): PlanOffer[] {
  return subscription.plans?.length ? subscription.plans : [{ plan: 'monthly', price: subscription.price ?? LISTED_PRICE }];
}

/** How much the yearly plan saves against twelve months, as a whole percent, when both prices are in one currency. */
export function yearlySaving(plans: PlanOffer[]): number | null {
  const yearly = plans.find((offer) => offer.plan === 'yearly');
  const monthly = plans.find((offer) => offer.plan === 'monthly');
  if (!yearly?.amount || !monthly?.amount || yearly.currency !== monthly.currency) return null;
  const saving = Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100);
  return saving > 0 ? saving : null;
}

/** The yearly price spread over twelve months ("$3.33"), or null without the number and currency. */
export function perMonth(offer: PlanOffer): string | null {
  if (!offer.amount || !offer.currency) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: offer.currency }).format(Math.floor((offer.amount / 12) * 100) / 100);
  } catch { return null; }
}

/** The words the paywall and the grown-ups' Subscription section use. The free trial is promised only to a family that
    can get it: not after a subscription on this device ended (the store gives the trial once), and not when the store
    says this account has had it. Where to cancel depends on the phone. */
export function offerWords(subscription: Subscription, { lapsed, platform }: { lapsed: boolean; platform: string }) {
  const trial = !lapsed && subscription.trial !== false;
  const per = (plan: Plan) => (plan === 'yearly' ? 'a year' : 'a month');
  const where = platform === 'android' ? 'in Google Play' : platform === 'ios' ? 'in Settings on this iPhone or iPad' : 'in the App Store or Google Play';
  const prices = planChoices(subscription).map((offer) => `${offer.price} ${per(offer.plan)}`).join(' or ');
  return {
    trial,
    heading: trial ? 'Try Fraction Quest free for 7 days' : 'Keep learning with Fraction Quest',
    price: (offer: PlanOffer) => (trial ? `7 days free, then ${offer.price} ${per(offer.plan)}` : `${offer.price} ${per(offer.plan)}`),
    terms: trial
      ? `Renews until cancelled. Cancel anytime ${where}, at least a day before the trial ends, and you won’t be charged.`
      : `Renews until cancelled. Cancel anytime ${where}.`,
    button: trial ? 'Start free trial' : 'Subscribe',
    planButton: (plan: Plan) => (trial ? (plan === 'yearly' ? 'Start yearly trial' : 'Start monthly trial') : (plan === 'yearly' ? 'Subscribe yearly' : 'Subscribe monthly')),
    status: trial ? `Lessons are locked. Start the 7-day free trial, then ${prices}.` : `Lessons are locked. Subscribe for ${prices}.`,
  };
}

/** Lessons are locked only when the store says there is no subscription. Unknown (no store, offline, not set up
    yet) leaves them open, so a child is never stuck because of the store. */
export const lessonsLocked = (subscription: Subscription | null): boolean => subscription?.state === 'none';

type BuildEnv = { DEV?: boolean; VITE_WEB_LESSONS_OPEN?: string };

/** In a plain browser (not the app), lessons after the first point to the app: on the published website only. The
    development server (`vite` dev, such as the Replit preview) and a build with VITE_WEB_LESSONS_OPEN=1 (the browser
    tests) keep them open, unless a test turns the browser limit back on with `__fqWebLimit`. */
export function webLessonsLocked(env: BuildEnv = (import.meta.env ?? {}) as BuildEnv): boolean {
  const scope = globalThis as { fractionQuestShell?: unknown; ReactNativeWebView?: unknown; __fqWebLimit?: boolean };
  if (scope.fractionQuestShell || scope.ReactNativeWebView) return false;
  const open = env.DEV === true || String(env.VITE_WEB_LESSONS_OPEN ?? '') === '1';
  return !open || scope.__fqWebLimit === true;
}

export const askShell = (action: SubscriptionAction, plan?: Plan): boolean =>
  postToShell(plan ? { type: 'subscription', action, plan } : { type: 'subscription', action });

/** Whether this device has had an active subscription before (to say "keep going" rather than "unlock"). */
export function subscribedBefore(): boolean {
  try { return localStorage.getItem(SUBSCRIBED_ONCE_KEY) === '1'; } catch { return false; }
}
function rememberSubscribed(subscription: Subscription | null) {
  if (subscription?.state !== 'active') return;
  try { localStorage.setItem(SUBSCRIBED_ONCE_KEY, '1'); } catch { /* storage off: the first-time wording shows */ }
}

let cached: Subscription | null = null;
let cachedKey = '';
function snapshot(): Subscription | null {
  const next = readSubscription();
  const key = JSON.stringify(next);
  if (key !== cachedKey) { cached = next; cachedKey = key; rememberSubscribed(next); }
  return cached;
}

/** The subscription as the shell reports it, updated whenever the shell says something changed. */
export function useSubscription(): Subscription | null {
  return useSyncExternalStore(onAppShellChange, snapshot, () => null);
}

/** The note under Hoot on the ask-a-grown-up screen. The level quiz is named only when the child took one. */
export function askSavedNote(lapsed: boolean, levelQuizDone: boolean): string {
  if (lapsed) return 'You can still read the Storybook and see your stone pieces.';
  return levelQuizDone ? 'Your level quiz and everything you did so far are saved.' : 'Everything you did so far is saved.';
}
