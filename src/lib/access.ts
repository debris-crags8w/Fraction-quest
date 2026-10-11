/* Who can open what. Unit 1 is free. Every part of units 2–14 (lessons, practice, labs, worksheets, redos,
   reviews, daily practice, games, printables, answer keys, unit challenges, level-quiz placement) needs an
   active subscription in the iOS app. The website is for testing and stays fully open, unless the address has
   ?paywall=1 (to preview the locks). Keep every check going through here so nothing slips past. */

import { getMission, MISSIONS, type Progress } from '../game';

export const FREE_UNITS: ReadonlySet<number> = new Set([1]);
/** The monthly subscription's product id in App Store Connect (change with the bundle id). */
export const SUBSCRIPTION_PRODUCT_ID = 'com.fractionquest.app.monthly';
/** Shown only if the App Store can't be reached; the real, local price always comes from StoreKit. */
export const FALLBACK_PRICE = '$2.99';
export const TRIAL_DAYS = 7;
/** Apple's standard Terms of Use (EULA). Replace if you publish your own terms. */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
/** Required before App Store submission: the public privacy policy (e.g. on the company page). Empty hides the link. */
export const PRIVACY_POLICY_URL = '';

export type Access = { paywall: boolean; subscribed: boolean };
/** Everything open (the website, or a subscriber). */
export const OPEN_ACCESS: Access = { paywall: false, subscribed: true };

export const unitOpen = (unit: number, access: Access) => !access.paywall || access.subscribed || FREE_UNITS.has(unit);
export function missionOpen(missionId: string, access: Access): boolean {
  if (!MISSIONS.some((m) => m.id === missionId)) return false;
  return unitOpen(getMission(missionId).unit, access);
}
/** True when something is locked only because there is no subscription. */
export const needsSubscription = (missionId: string, access: Access) => !missionOpen(missionId, access) && MISSIONS.some((m) => m.id === missionId);
/** The level quiz places children into later units, so it is part of the full course. */
export const levelQuizOpen = (access: Access) => !access.paywall || access.subscribed;
export const lockedUnitCount = (access: Access) => new Set(MISSIONS.map((m) => m.unit).filter((u) => !unitOpen(u, access))).size;

/** Progress as the child can use it now: reviews and today's practice from locked units are left out. */
export function openProgress(progress: Progress, access: Access): Progress {
  if (!access.paywall || access.subscribed) return progress;
  const dailyLocked = progress.dailyPractice?.questions.some((q) => !missionOpen(q.missionId, access));
  return {
    ...progress,
    reviewQueue: progress.reviewQueue.filter((item) => missionOpen(item.missionId, access)),
    ...(dailyLocked ? { dailyPractice: undefined } : {}),
  };
}

/** The website shows the locks only with ?paywall=1 (for testing the subscription screens in a browser). */
export function paywallActive(native: boolean, search: string): boolean {
  return native || new URLSearchParams(search).get('paywall') === '1';
}
