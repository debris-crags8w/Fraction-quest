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

/** Secrets for every child: little things about the friends of Fractionville. None of them gives the ending away. */
const EVERYDAY_SECRETS = [
  'Bolt is scared of thunder. He hides under his workbench. Don’t tell!',
  'Pip practices his hops every morning before breakfast.',
  'Tilly has never lost a race. She just takes her time.',
  'Bea knows the name of every flower in Fractionville.',
  'Hoot reads with a tiny lamp after everyone is asleep.',
  'Numi’s favorite snack is half of a sandwich. Exactly half.',
  'I once ate a whole {cake} by myself. My tummy said no more {cake}.',
  'Bolt can build a toaster in one minute. It makes very loud toast.',
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
  'Pip once hopped over a whole puddle. It was a very small puddle.',
  'Tilly keeps a tiny stopwatch in her shell. She never looks at it.',
  'Bea hums while she works. The flowers lean in to listen.',
  'Hoot has read every book in Fractionville twice. His favorite has pictures.',
  'Numi can count by halves for a very long time. Try it!',
  'I keep a spare snack under my pillow. Shh!',
  'Bolt’s favorite sound is a gear that fits just right. Click!',
  'Pip is afraid of spiders. The spiders are not afraid of Pip.',
  'Tilly’s favorite fraction is one half. It is slow and steady.',
  'Bea’s hive has twelve rooms. She counted them twice.',
  'Hoot’s lantern was a gift from the town. It has never gone out.',
  'I practice my scary roar in the bath. It comes out as bubbles.',
  'Bolt oils his joints every Sunday. Squeak, squeak, ahh.',
  'Numi folds paper into thirds just for fun.',
  'Pip’s best hop is three lily pads long.',
  'Tilly hums a slow song when she climbs. Pip hums it faster.',
  'Bea can tell the day by which flowers are open.',
  'I once tried to share a {cake} with my reflection. We each got half!',
  'Hoot says the best riddles have one right answer and many ways to find it.',
  'Bolt built a tiny robot for Pip. It only knows how to hop.',
  'Numi says every whole starts with one good part.',
  'The bakery bell rings at sunrise. I am always first in line.',
  'Pip says a lily pad is a tiny part of a pond. Just right for one frog.',
  'Tilly once finished a race and took a nap on the finish line.',
];

/** More secrets for a Keeper: after the festival, with the stone whole again and the lantern still lit. */
const AFTER_ENDING_SECRETS = [
  'The Whole Stone glows a little brighter when someone solves a riddle.',
  'Hoot polishes the lantern every night. He says it likes to shine.',
  'Bolt says sorry less now. He says thank you more.',
  'My riddle notebook has a first page. It says, “Share fairly.”',
  'Pip fixed the festival stage, but he kept one tiny crack for luck.',
  'Tilly walks to the top of the hill each morning. She waves at the stone.',
  'Bea planted a garden in the shape of the Whole Stone. Fifteen plots!',
  'The fifteen pieces fit together so well that you cannot find the cracks.',
  'Numi saves a seat by the stone for the Keeper. That is you!',
  'Hoot hides a new riddle by the stone every night. The lantern helps him see.',
  'I keep my riddles in the bakery now. The crumbs are my clues.',
  'Bolt’s rocket boots stay on the shelf. He walks to the festival now.',
  'On quiet nights the stone hums a song. Bea says it is a lullaby.',
  'Pip and Bolt built a new bridge. Its sign says, “Equal planks only.”',
  'Tilly timed the whole festival. She says it lasted one whole night.',
  'I share the biggest slice now. Okay, okay. Sometimes.',
  'Hoot says the lantern is lit by every right answer in Fractionville.',
  'Bea labels every honey jar twice, in case two names fit.',
  'Numi says a riddle is a puzzle with a friendly face.',
  'The Keeper’s badge is a stone with fifteen tiny pieces. It really glows.',
  'Bolt wrote the festival’s thank-you note. It was fifteen beeps long.',
  'Pip’s party was so big the pond overflowed. Everyone got a lily pad.',
  'Tilly won the festival race. Pip says she cheated by being steady.',
  'I told Bolt a secret once. He kept it. That is why we are friends.',
  'Hoot’s owl friends visit when the stone glows. They bring tiny lanterns.',
  'Every festival night the town counts the pieces together, from one to fifteen.',
  'My new rule: no sneaky big pieces. Not even small sneaky ones.',
  'Numi once solved a mystery under the lantern. It was a lost mitten.',
  'The stone’s light starts the festival every year. This year it started on time.',
  'Bea says friends are like fractions. Every part matters.',
  'Pip hopped across the new bridge with his eyes closed. Plink, plink, plink!',
  'Bolt keeps a photo of the festival on his screen. He smiles at it.',
  'Hoot dusts his magnifying glass every Monday. A new mystery begins!',
  'I hide riddles in the bakery bread. Look closely at your toast!',
  'Tilly says slow and steady is how you solve the hardest riddles.',
  'Bea’s bees buzz louder when you get a riddle right.',
  'Bolt can say every clue from the case, in order. Beep, beep, beep!',
  'Bolt taped a thank-you card to the stone’s glass case. It says, “Beep!”',
  'Numi’s favorite part of the festival was the very last song.',
  'I think being the riddle maker is better than the biggest piece. Almost!',
  'A new riddle waits by the stone each morning. Hoot checks it first.',
  'The lantern’s glow reaches all the way to the hill. Tilly sees it from the top.',
];
/** Every secret. A child who has not finished the story hears only the first group. */
export const SECRETS = [...EVERYDAY_SECRETS, ...AFTER_ENDING_SECRETS];

const dayNumber = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return Math.floor(Date.UTC(year!, (month ?? 1) - 1, date ?? 1) / 86_400_000);
};
/** The same secret all day, and a new one tomorrow: stepping through the list by 7 (which shares no factor with its
    length) visits every secret once before any comes back, so no secret repeats for 40 days or more. */
export function dailySecret(day = today(), afterEnding = false): string {
  const pool = afterEnding ? SECRETS : EVERYDAY_SECRETS;
  return pool[(dayNumber(day) * 7) % pool.length]!;
}

/** After the ending Chomp, the riddle maker, has a mystery of the week tied to Hoot's lantern; it changes every Monday,
    and the next Monday he tells how it ended ("Last week ..."), so every mystery is solved. */
const MYSTERIES: { ask: string; answer: string }[] = [
  { ask: 'Mystery of the week: who left a tiny footprint by Hoot’s lantern? Chomp has clues.', answer: 'Last week’s tiny footprint by the lantern was Pip’s. He hopped by to say hello.' },
  { ask: 'Mystery of the week: the lantern flickered at midnight. Who blew on it?', answer: 'Last week the lantern flickered because Hoot’s owl friend flapped past at midnight.' },
  { ask: 'Mystery of the week: a trail of crumbs leads to the lantern. Chomp swears it wasn’t him.', answer: 'Last week Chomp told the truth. The crumbs fell from Bea’s honey cake.' },
  { ask: 'Mystery of the week: someone left a riddle under the lantern. Whose writing is it?', answer: 'Last week’s riddle under the lantern was Chomp’s. He wrote it just for the Keeper.' },
  { ask: 'Mystery of the week: the lantern glows a new color every night. Why?', answer: 'Last week the lantern glowed new colors because Hoot swaps its glass cover every night.' },
  { ask: 'Mystery of the week: Pip heard a hum from the lantern. Is it the stone singing?', answer: 'Last week’s hum by the lantern was Bolt. He hums while he polishes the glass.' },
  { ask: 'Mystery of the week: something shiny sits at the foot of the lantern. Where did it come from?', answer: 'Last week’s shiny thing by the lantern was a bolt that rolled off Bolt’s bench.' },
  { ask: 'Mystery of the week: Bea found a flower that glows in the lantern light.', answer: 'Last week’s glowing flower grew from a seed Bea dropped in the festival garden.' },
  { ask: 'Mystery of the week: the lantern’s oil jar is lighter. Who borrowed a drop?', answer: 'Last week Hoot borrowed the drop. He polished the lantern, then filled the jar again.' },
  { ask: 'Mystery of the week: Tilly saw a shadow dance around the lantern. Whose is it?', answer: 'Last week’s dancing shadow was Numi’s. Numi was practicing a festival dance.' },
  { ask: 'Mystery of the week: a secret door appeared behind the lantern. Where does it go?', answer: 'Last week’s secret door leads to Hoot’s library of old riddles.' },
  { ask: 'Mystery of the week: Bolt’s screen beeped in code near the lantern. What does it say?', answer: 'Last week Bolt’s beeps said, “Thank you, Keeper.” He was too shy to say it out loud.' },
];
// Weeks start on Monday (1 January 1970 was a Thursday, so the first Monday is day 4).
const mysteryWeek = (day: string) => Math.floor((dayNumber(day) - 4) / 7);
const mysteryAt = (week: number) => MYSTERIES[((week % MYSTERIES.length) + MYSTERIES.length) % MYSTERIES.length]!;
export const mysteryOfTheWeek = (day = today()): string => mysteryAt(mysteryWeek(day)).ask;
/** How last week's mystery ended (whatever the Keeper saw): see `mysteryRecap` for when it is told. */
export const mysteryAnswer = (day = today()): string => mysteryAt(mysteryWeek(day) - 1).answer;

/** What this device remembers about the mysteries: the weeks whose mystery the Keeper saw, and when last week's ending was told. */
export type MysteryLog = { seen?: number[]; told?: { week: number; day: string } };
/** Last week's ending, on the Keeper's first visit of the new week (and again that same day), but only if they saw
    last week's mystery: a brand-new Keeper is never told the end of a mystery they never heard. */
export function mysteryRecap(log: MysteryLog, day = today()): string | null {
  const last = mysteryWeek(day) - 1;
  if (!log.seen?.includes(last)) return null;
  if (log.told && log.told.week === last && log.told.day !== day) return null;
  return mysteryAnswer(day);
}
/** After the mystery card was shown: this week's mystery is seen, and (when `toldRecap`) last week's ending is told. */
export function noteMystery(log: MysteryLog, day = today(), toldRecap: boolean): MysteryLog {
  const week = mysteryWeek(day);
  const seen = [...new Set([...(log.seen ?? []), week])].filter((item) => item >= week - 3);
  const told = toldRecap && !(log.told && log.told.week === week - 1) ? { week: week - 1, day } : log.told;
  return { seen, ...(told ? { told } : {}) };
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

export type LanternCardInput = { streak: number; oil: number; litToday: boolean; dailyDone: boolean; storyOn: boolean; /** All 15 stone pieces are back: Chomp's mystery of the week is waiting. */ afterEnding?: boolean };
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
export function lanternCard({ streak, oil, litToday, dailyDone, storyOn, afterEnding = false }: LanternCardInput): LanternCard {
  const state = litToday ? 'lit' : streak > 0 ? 'waiting' : 'first';
  const toOil = SPARE_OIL_EVERY - (streak % SPARE_OIL_EVERY);
  const card: Omit<LanternCard, 'spoken'> = storyOn
    ? {
      state,
      title: state === 'lit' ? 'Tonight’s lantern is lit!' : state === 'waiting' ? 'Tonight’s lantern' : 'Light your first lantern',
      speaker: 'Hoot',
      line: state === 'lit' ? 'Hoo-ray! See you tomorrow.' : state === 'waiting' ? 'Light it to keep your streak glowing!' : 'One right answer a day keeps it glowing.',
      facts: [...(streak > 0 ? [`${plural(streak, 'night', 'nights')} in a row`] : []), ...(oil > 0 ? [`${plural(oil, 'spare drop', 'spare drops')} of oil`] : [])],
      notes: [
        ...(afterEnding ? ['Chomp’s mystery of the week is waiting.'] : []),
        ...(state === 'lit'
          ? [...(dailyDone ? ['Chomp has a new riddle tomorrow.'] : []), ...(oil < SPARE_OIL_MAX ? [`${plural(toOil, 'more night', 'more nights')} to earn a spare drop of oil.`] : [])]
          : []),
      ],
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
export const LANTERN_CARD_SPOKEN: string[] = [...new Set([true, false].flatMap((storyOn) => [true, false].flatMap((afterEnding) => [true, false].flatMap((litToday) => [true, false].flatMap((dailyDone) =>
  Array.from({ length: SPARE_OIL_EVERY * 2 }, (_, streak) => [0, 1, 2].map((oil) => lanternCard({ streak, oil, litToday, dailyDone, storyOn, afterEnding }).spoken)).flat())))))];
