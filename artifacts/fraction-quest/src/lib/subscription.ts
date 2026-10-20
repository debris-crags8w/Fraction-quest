/* The monthly subscription, sold only in the app (iPhone and Android). The app's shell asks Apple or Google and puts
   the answer on `window.fractionQuestShell.subscription`; this page asks it to buy, restore or manage. In a plain
   browser there is no subscription and nothing is locked. */
import { useSyncExternalStore } from 'react';
import { onAppShellChange } from './app-shell';
import { postToShell } from './native-shell';

export type Subscription = {
  state: 'active' | 'none' | 'unavailable';
  renewsAt?: number | null;
  price?: string | null;
  busy?: boolean;
  error?: string | null;
};
export type SubscriptionAction = 'status' | 'buy' | 'restore' | 'manage';
/** Shown when the store has no price yet (the store's own price text replaces it). */
export const LISTED_PRICE = '$4.99';
const SUBSCRIBED_ONCE_KEY = 'fraction-quest-subscribed-once';

/** What the shell last said, or null outside the app (or in an older app that does not sell subscriptions). */
export function readSubscription(): Subscription | null {
  const raw = (globalThis as { fractionQuestShell?: { subscription?: Partial<Subscription> } }).fractionQuestShell?.subscription;
  if (!raw || typeof raw !== 'object' || !['active', 'none', 'unavailable'].includes(String(raw.state))) return null;
  return {
    state: raw.state as Subscription['state'],
    renewsAt: typeof raw.renewsAt === 'number' && Number.isFinite(raw.renewsAt) ? raw.renewsAt : null,
    price: typeof raw.price === 'string' && raw.price.length <= 24 ? raw.price : null,
    busy: raw.busy === true,
    error: typeof raw.error === 'string' ? raw.error.slice(0, 200) : null,
  };
}

/** Lessons are locked only when the store says there is no subscription. Unknown (no store, offline, not set up
    yet) leaves them open, so a child is never stuck because of the store. */
export const lessonsLocked = (subscription: Subscription | null): boolean => subscription?.state === 'none';

export const askShell = (action: SubscriptionAction): boolean => postToShell({ type: 'subscription', action });

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
