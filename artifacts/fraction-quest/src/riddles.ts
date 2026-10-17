/* Chomp's daily riddles: daily practice told as a story. Chomp sets up each question (never a hint, never a
   number), and finishing earns his secret of the day. Hoot's lantern shows the streak as a week of nights. */

import { today, type DayActivity } from './lib/fun';

/** Chomp's set-up line for the question at `index` (words only, so it cannot hint at an answer). */
const SETUPS = [
  'Riddle one! Bet you can’t solve it.',
  'Okay, okay. That was easy. Try this one!',
  'Here’s a trickier riddle. Ready?',
  'Hmm. You’re good. How about this?',
  'Last riddle! My hardest one yet.',
];
export const riddleSetup = (index: number, total: number) =>
  index >= total - 1 ? SETUPS[SETUPS.length - 1] : SETUPS[Math.min(index, SETUPS.length - 2)];

/** One secret a day: little things about the friends of Fractionville. */
export const SECRETS = [
  'Bolt is scared of thunder. He hides under his workbench. Don’t tell!',
  'Pip practices his hops every morning before breakfast.',
  'Tilly has never lost a race. She just takes her time.',
  'Bea knows the name of every flower in Fractionville.',
  'Hoot reads with a tiny lamp after everyone is asleep.',
  'Numi’s favorite snack is half of a sandwich. Exactly half.',
  'I once ate a whole {cake} by myself. My tummy said no more {cake}.',
  'Bolt’s rocket boots can fly as high as the bakery roof.',
  'Pip’s lily pad has a secret drawer full of shiny pebbles.',
  'Tilly’s shell has a map of the whole town drawn on it.',
  'Bea’s honey is the sweetest because she shares it fairly.',
  'Hoot can turn his head almost all the way around. Spooky!',
  'Numi hums when thinking. Listen next time!',
  'I am learning to share. It is harder than riddles.',
  'Bolt beeps three times when he is happy.',
  'Pip and Tilly race every Sunday. Tilly always wins.',
  'Bea once got lost in a sunflower. Pip found her.',
  'Hoot’s magnifying glass was a gift from Numi.',
  'The Whole Stone hums softly at night. Some say it sings.',
  'My teeth are very pointy, but I brush them twice a day.',
  'Bolt keeps a picture of the whole team on his screen.',
];
/** The same secret all day, a new one tomorrow. */
export function dailySecret(day = today()): string {
  let hash = 0;
  for (const char of day) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return SECRETS[hash % SECRETS.length];
}

export type LanternNight = { day: string; label: string; lit: boolean; today: boolean };
/** The last 7 days, ending today: a night is lit when at least one answer was right that day. */
export function lanternWeek(activity: Record<string, DayActivity> | undefined, now = new Date()): LanternNight[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - i));
    const day = today(date);
    return { day, label: i === 6 ? 'Today' : names[date.getDay()], lit: (activity?.[day]?.answered ?? 0) > 0, today: i === 6 };
  });
}

/** Chomp's reaction to a checked riddle answer: words only. */
export const riddleReaction = (result: 'correct' | 'retry', index: number) =>
  result === 'correct'
    ? ['Grr! You solved it!', 'What? How did you know?', 'Okay, you’re good at this.'][index % 3]
    : ['Tricky one, right? Try again!', 'Not yet! Have another go.', 'Hmm. Look one more time.'][index % 3];
