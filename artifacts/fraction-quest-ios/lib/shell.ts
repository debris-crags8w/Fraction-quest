/* Small pieces of the shell (app/index.tsx) kept free of React Native, so they can be tested in Node. */

/** How long a page load may take before the shell stops waiting and offers "Try again". A first-ever load on a slow
    phone line can take a while; past this a child is better off with a clear message than a spinner. */
export const LOAD_TIMEOUT_MS = 20_000;

/** Calls `onTimeout` if the load is still going after LOAD_TIMEOUT_MS. Returns the cancel to call when it finishes. */
export function startLoadTimer(onTimeout: () => void, ms = LOAD_TIMEOUT_MS): () => void {
  const timer = setTimeout(onTimeout, ms);
  return () => clearTimeout(timer);
}

export type HapticCue = 'selection' | 'correct' | 'retry' | 'star' | 'complete' | 'impact';
/** The part of expo-haptics the shell uses (passed in, so a test can stand in for the device). */
export type HapticsModule = {
  selectionAsync(): Promise<void>;
  notificationAsync(type: unknown): Promise<void>;
  impactAsync(style: unknown): Promise<void>;
  NotificationFeedbackType: { Success: unknown; Warning: unknown };
  ImpactFeedbackStyle: { Light: unknown; Heavy: unknown };
};

/** A gentle tap for an answer or a story moment. Haptics are optional: a device without them, or a call that throws or
    fails, is ignored. */
export async function playHaptic(cue: HapticCue, haptics: HapticsModule): Promise<void> {
  try {
    if (cue === 'selection') await haptics.selectionAsync();
    else if (cue === 'retry') await haptics.notificationAsync(haptics.NotificationFeedbackType.Warning);
    else if (cue === 'complete') await haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
    else if (cue === 'impact') await haptics.impactAsync(haptics.ImpactFeedbackStyle.Heavy); // a big story moment: the stone cracking, a splash
    else await haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* haptics are optional and may be unavailable on this device */
  }
}
