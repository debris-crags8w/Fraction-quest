/* The model intros' words (model-intro.tsx): what each demo shot says and what the guided tries ask. Kept here so the
   voice pack's sentence list (scripts/voice-sentences.ts) lists the same words. */
import type { IntroKind } from './lib/fun';

/** One shot of the demo: the model's state and its caption. `at` is where the tapping finger points. */
export type IntroShot = { parts: number; count: number; caption: string; at: 'none' | 'plus' | 'first' | 'last' | 'readout'; named?: boolean };

export const INTRO_DEMOS: Record<IntroKind, IntroShot[]> = {
  builder: [
    { parts: 1, count: 0, caption: 'This bar is one whole.', at: 'none' },
    { parts: 2, count: 0, caption: 'Tap plus to cut the whole into equal parts.', at: 'plus' },
    { parts: 4, count: 0, caption: '4 equal parts. Every part is the same size.', at: 'plus' },
    { parts: 4, count: 1, caption: 'Now tap a part to shade it.', at: 'first' },
    { parts: 4, count: 3, caption: 'Tap again to shade 3 parts.', at: 'last' },
    { parts: 4, count: 3, caption: '3 of 4 equal parts are shaded. Say it like this: 3 out of 4 equal parts.', at: 'readout', named: true },
  ],
  line: [
    { parts: 1, count: 0, caption: 'This line goes from 0 to 1. That is one whole.', at: 'none' },
    { parts: 4, count: 0, caption: 'Tap plus to cut it into 4 equal spaces.', at: 'plus' },
    { parts: 4, count: 0, caption: 'Every space is the same size. One space is one jump.', at: 'none' },
    { parts: 4, count: 1, caption: 'Start at 0. Hop one jump.', at: 'first' },
    { parts: 4, count: 3, caption: 'Two jumps, three jumps.', at: 'last' },
    { parts: 4, count: 3, caption: '3 jumps of 4 equal spaces. You land on 3 out of 4.', at: 'readout', named: true },
  ],
};

export type IntroTry = { n: number; d: number; word: string };
export const INTRO_TRIES: Record<IntroKind, [IntroTry, IntroTry]> = {
  // Both play on lesson 1's lesson page, so they say fractions as "out of", as lesson 1 does (part names come in lesson 2).
  builder: [{ n: 1, d: 2, word: '1 out of 2 equal parts' }, { n: 2, d: 3, word: '2 out of 3 equal parts' }],
  line: [{ n: 2, d: 3, word: '2 out of 3' }, { n: 3, d: 4, word: '3 out of 4' }],
};

export const INTRO_TEXT: Record<IntroKind, { kicker: string; title: string; build: string }> = {
  builder: { kicker: 'Before you build', title: 'How to build a fraction', build: 'Build' },
  line: { kicker: 'New: number lines', title: 'How a number line works', build: 'Find' },
};

const unit = (kind: IntroKind, count: number) => kind === 'builder' ? (count === 1 ? 'part' : 'parts') : (count === 1 ? 'jump' : 'jumps');

/** The guided try's nudge for the model as it is now (never the answer itself: it says what to do next). */
export function introHint(kind: IntroKind, target: IntroTry, parts: number, count: number): { text: string; done: boolean } {
  if (parts === target.d && count === target.n) {
    return { done: true, text: kind === 'builder' ? `Yes! You shaded ${target.word}.` : `Yes! ${target.n} ${unit(kind, target.n)} of ${target.d} equal spaces: you land on ${target.word}.` };
  }
  if (parts !== target.d) return { done: false, text: kind === 'builder' ? `First cut the whole into ${target.d} equal parts.` : `First cut 0 to 1 into ${target.d} equal spaces.` };
  return { done: false, text: kind === 'builder' ? `Now shade ${target.n} ${unit(kind, target.n)}.` : `Now count ${target.n} ${unit(kind, target.n)} from 0 and tap where you land.` };
}

/** Everything an intro can read aloud: the demo and every nudge of both tries. */
export function introSpeech(kind: IntroKind): string[] {
  const lines = [INTRO_TEXT[kind].title, ...INTRO_DEMOS[kind].map((shot) => shot.caption)];
  for (const target of INTRO_TRIES[kind]) {
    lines.push(`${INTRO_TEXT[kind].build} ${target.word}.`);
    lines.push(introHint(kind, target, target.d, target.n).text, introHint(kind, target, 0, 0).text, introHint(kind, target, target.d, 0).text);
  }
  return lines;
}

/** The Helper's pick screen: what each intro is about, and the line read before them. */
export const HELPER_PICKS: Record<IntroKind | 'words', string> = {
  builder: 'Split a whole into equal parts and shade them',
  line: 'Equal spaces, jumps from 0, where you land',
  words: 'One half, one third, one fourth, and more',
};
export const HELPER_PICK_SPEECH = [
  'Need a brush-up? Watch how it works, then try it.',
  `${INTRO_TEXT.builder.title}. ${HELPER_PICKS.builder}.`,
  `${INTRO_TEXT.line.title}. ${HELPER_PICKS.line}.`,
  'Fraction names. One half, one third, one fourth, and more.',
];

/** The name of one part for each denominator the course writes and Listen can name ("sixteenth" for 16). This is the one
    list: Listen (lib/voice.ts) reads "1/16" as "one sixteenth" from it, and every name here is taught by a card (the
    Words screen, a word card on an idea's Learn page, or a lesson page's New word card: new-words.ts). */
export const PART_NAMES: Readonly<Record<number, { one: string; many: string }>> = {
  2: { one: 'half', many: 'halves' }, 3: { one: 'third', many: 'thirds' }, 4: { one: 'fourth', many: 'fourths' },
  5: { one: 'fifth', many: 'fifths' }, 6: { one: 'sixth', many: 'sixths' }, 7: { one: 'seventh', many: 'sevenths' },
  8: { one: 'eighth', many: 'eighths' }, 9: { one: 'ninth', many: 'ninths' }, 10: { one: 'tenth', many: 'tenths' },
  11: { one: 'eleventh', many: 'elevenths' }, 12: { one: 'twelfth', many: 'twelfths' }, 14: { one: 'fourteenth', many: 'fourteenths' },
  15: { one: 'fifteenth', many: 'fifteenths' }, 16: { one: 'sixteenth', many: 'sixteenths' }, 18: { one: 'eighteenth', many: 'eighteenths' },
  20: { one: 'twentieth', many: 'twentieths' }, 24: { one: 'twenty-fourth', many: 'twenty-fourths' }, 25: { one: 'twenty-fifth', many: 'twenty-fifths' },
  28: { one: 'twenty-eighth', many: 'twenty-eighths' }, 32: { one: 'thirty-second', many: 'thirty-seconds' }, 50: { one: 'fiftieth', many: 'fiftieths' },
  100: { one: 'hundredth', many: 'hundredths' },
};

/** The Words screen in a child's first lesson (page 2): the part names they meet first, each with a bar of equal parts and one part
    shaded. Words and pictures only: no written fraction here (lesson 1's ideas 2 and 3 teach writing one), which also keeps the screen
    on a phone. */
export const FRACTION_WORDS = {
  title: 'Fraction names',
  rule: 'Equal parts have names. 2 are halves, 3 are thirds, 4 are fourths.',
  rows: [2, 3, 4, 6, 8].map((d) => ({ d, word: `one ${PART_NAMES[d].one}`, also: d === 4 ? 'also: one quarter' : undefined })),
} as const;

/** Words, page 1: what a fraction is, with 1/4 on a bar of 4 equal parts. No "numerator"/"denominator" yet (lesson 1 teaches them after its first idea). */
export const WHAT_IS_A_FRACTION = {
  title: 'What is a fraction?',
  rule: 'A fraction names part of a whole. The whole must be cut into equal parts.',
  whole: '4 equal parts make the whole',
  top: 'how many parts we count. Here, 1.',
  bottom: 'how many equal parts make the whole. Here, 4.',
} as const;

/** What Listen reads on "What is a fraction?", sentence by sentence (the fraction said in words). */
export function whatIsAFractionSpeech(): string[] {
  return [
    WHAT_IS_A_FRACTION.title, WHAT_IS_A_FRACTION.rule, `${WHAT_IS_A_FRACTION.whole}.`,
    `The top number is ${WHAT_IS_A_FRACTION.top}`, `The bottom number is ${WHAT_IS_A_FRACTION.bottom}`,
    'So one fourth means 1 of 4 equal parts.',
  ];
}

/** What Listen reads on the Words screen, sentence by sentence. */
export function fractionWordsSpeech(): string[] {
  const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
  return [
    `${FRACTION_WORDS.title}.`, FRACTION_WORDS.rule,
    ...FRACTION_WORDS.rows.map((row) => `${capital(row.word)}${row.also ? ', also called one quarter' : ''}.`),
  ];
}

/** A lesson's "New word" card, for a part name the child hasn't met before (fifths, tenths, sixteenths, hundredths …). */
export const newWordSpeech = (d: number) => `New word. 1 of ${d} equal parts is one ${PART_NAMES[d].one}. ${d} equal parts are ${PART_NAMES[d].many}.`;
