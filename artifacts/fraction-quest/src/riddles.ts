/* Chomp's daily riddles: daily practice told as a story. Chomp sets up each question (never a hint, never a
   number), and finishing earns his secret of the day. Hoot's lantern shows the streak as a week of nights. */

import { SPARE_OIL_EVERY, SPARE_OIL_MAX, today, type DayActivity, type OilNotice } from './lib/fun';

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

export type LanternNight = { day: string; label: string; lit: boolean; today: boolean; /** No right answer, but a drop of spare oil kept the streak going. */ saved: boolean };
/** The last 7 days, ending today: a night is lit when at least one answer was right that day, saved when spare oil covered it. */
export function lanternWeek(activity: Record<string, DayActivity> | undefined, now = new Date(), savedDays: readonly string[] = []): LanternNight[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - i));
    const day = today(date);
    const lit = (activity?.[day]?.answered ?? 0) > 0;
    return { day, label: i === 6 ? 'Today' : names[date.getDay()], lit, today: i === 6, saved: !lit && savedDays.includes(day) };
  });
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayName = (day: string) => DAY_NAMES[new Date(`${day}T12:00:00`).getDay()];
const count = (n: number, one: string, many: string) => `${n === 1 ? 'a' : n} ${n === 1 ? one : many}`;

/** What Hoot says (story mode) or the plain message, when spare oil was used or earned. A part in { key } is a key word:
    it is underlined on screen and read like the rest. */
export type OilWords = { title: string; speaker: 'Hoot' | null; parts: (string | { key: string })[] };
export function oilNoticeWords(notice: OilNotice, storyOn: boolean, streak: number): OilWords {
  if (notice.kind === 'used') {
    const days = notice.days.map(dayName);
    const missed = days.length === 1 ? days[0] : `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`;
    return storyOn
      ? { title: 'Your lantern is still lit!', speaker: 'Hoot', parts: ['Welcome back! You missed ', { key: missed }, `, so I used ${count(days.length, 'drop', 'drops')} of `, { key: 'spare oil' }, `. Your ${streak} ${streak === 1 ? 'night is' : 'nights are'} safe.`] }
      : { title: 'Your streak is safe!', speaker: null, parts: ['You missed ', { key: missed }, `, so ${days.length === 1 ? 'a streak saver' : `${days.length} streak savers`} kept your `, { key: `${streak}-day streak` }, ' going.'] };
  }
  return storyOn
    ? { title: 'A whole week of light!', speaker: 'Hoot', parts: [`${notice.streak} nights in a row! Here is a drop of `, { key: 'spare oil' }, '. It keeps your lantern lit if you miss a night.'] }
    : { title: `${notice.streak} days in a row!`, speaker: null, parts: ['You earned a ', { key: 'streak saver' }, '. It keeps your streak going if you miss a day.'] };
}
export const oilWordsText = (words: OilWords) => words.parts.map((part) => (typeof part === 'string' ? part : part.key)).join('');

/** Chomp's reaction to a checked riddle answer: words only. */
export const riddleReaction = (result: 'correct' | 'retry', index: number) =>
  result === 'correct'
    ? ['Grr! You solved it!', 'What? How did you know?', 'Okay, you’re good at this.'][index % 3]
    : ['Tricky one, right? Try again!', 'Not yet! Have another go.', 'Hmm. Look one more time.'][index % 3];

/* ---------- Tonight's lantern: today's task on the map ---------- */

export type LanternCardInput = { streak: number; oil: number; litToday: boolean; dailyDone: boolean; storyOn: boolean };
export type LanternCard = {
  state: 'waiting' | 'lit' | 'first';
  title: string;
  /** Who says the line (Hoot in story mode; null when it is plain). */
  speaker: 'Hoot' | null;
  line: string;
  /** Shown, not read: the streak and the spare oil. */
  facts: string[];
  /** Short lines under a lit lantern: tomorrow's riddle and the next drop of oil. */
  notes: string[];
  /** The button's words, or none once today's riddles are done. */
  button?: string;
  /** What Listen reads: the title, the line and the notes. No streak numbers, so it plays from the voice pack. */
  spoken: string;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/** The card for today: a lantern still to light (or a first one, when there is no streak), or one already lit. */
export function lanternCard({ streak, oil, litToday, dailyDone, storyOn }: LanternCardInput): LanternCard {
  const state = litToday ? 'lit' : streak > 0 ? 'waiting' : 'first';
  const toOil = SPARE_OIL_EVERY - (streak % SPARE_OIL_EVERY);
  const card: Omit<LanternCard, 'spoken'> = storyOn
    ? {
      state,
      title: state === 'lit' ? 'Tonight’s lantern is lit!' : state === 'waiting' ? 'Tonight’s lantern' : 'Light your first lantern',
      speaker: 'Hoot',
      line: state === 'lit' ? 'Hoo-ray! See you tomorrow.' : state === 'waiting' ? 'Light it to keep your streak glowing!' : 'One right answer a day keeps it glowing.',
      facts: [...(streak > 0 ? [`${plural(streak, 'night', 'nights')} in a row`] : []), ...(oil > 0 ? [`${plural(oil, 'spare drop', 'spare drops')} of oil`] : [])],
      notes: state === 'lit'
        ? [...(dailyDone ? ['Chomp has a new riddle tomorrow.'] : []), ...(oil < SPARE_OIL_MAX ? [`${plural(toOil, 'more night', 'more nights')} to earn a spare drop of oil.`] : [])]
        : [],
      button: state !== 'lit' ? 'Light it: Chomp’s 5 riddles' : dailyDone ? undefined : 'Chomp’s 5 riddles',
    }
    : {
      state,
      title: state === 'lit' ? 'Your streak is safe today' : 'Today’s practice',
      speaker: null,
      line: state === 'lit' ? 'See you tomorrow.' : state === 'waiting' ? 'Keep your streak going.' : 'Get one answer right to start a streak.',
      facts: streak > 0 ? [`${plural(streak, 'day', 'days')} in a row`] : [],
      notes: state === 'lit' && dailyDone ? ['New questions tomorrow.'] : [],
      button: dailyDone ? undefined : 'Start: 5 review questions',
    };
  return { ...card, spoken: [sentence(card.title), card.line, ...card.notes].join(' ') };
}

/** Every line Listen can read on the card (the oil line repeats every 7 nights), for the voice pack. */
export const LANTERN_CARD_SPOKEN: string[] = [...new Set([true, false].flatMap((storyOn) => [true, false].flatMap((litToday) => [true, false].flatMap((dailyDone) =>
  Array.from({ length: SPARE_OIL_EVERY * 2 }, (_, streak) => [0, 1, 2].map((oil) => lanternCard({ streak, oil, litToday, dailyDone, storyOn }).spoken)).flat()))))];
