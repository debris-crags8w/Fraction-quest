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
    { parts: 4, count: 3, caption: '3 of 4 equal parts are shaded. That is three fourths.', at: 'readout', named: true },
  ],
  line: [
    { parts: 1, count: 0, caption: 'This line goes from 0 to 1. That is one whole.', at: 'none' },
    { parts: 4, count: 0, caption: 'Tap plus to cut it into 4 equal spaces.', at: 'plus' },
    { parts: 4, count: 0, caption: 'Every space is the same size. One space is one jump.', at: 'none' },
    { parts: 4, count: 1, caption: 'Start at 0. Hop one jump.', at: 'first' },
    { parts: 4, count: 3, caption: 'Two jumps, three jumps.', at: 'last' },
    { parts: 4, count: 3, caption: '3 jumps of 4 equal spaces. You land on three fourths.', at: 'readout', named: true },
  ],
};

export type IntroTry = { n: number; d: number; word: string };
export const INTRO_TRIES: Record<IntroKind, [IntroTry, IntroTry]> = {
  builder: [{ n: 1, d: 2, word: 'one half' }, { n: 2, d: 3, word: 'two thirds' }],
  line: [{ n: 2, d: 3, word: 'two thirds' }, { n: 3, d: 4, word: 'three fourths' }],
};

export const INTRO_TEXT: Record<IntroKind, { kicker: string; title: string; build: string; ready: string; readyBody: string; go: string }> = {
  builder: {
    kicker: 'Before you build', title: 'How to build a fraction', build: 'Build',
    ready: 'You know how to build!', readyBody: 'Split the whole into equal parts. Then shade the parts the fraction counts.',
    go: 'Start building',
  },
  line: {
    kicker: 'New: number lines', title: 'How a number line works', build: 'Find',
    ready: 'You can read a number line!', readyBody: 'Cut 0 to 1 into equal spaces. Count the jumps from 0. Where you land is the fraction.',
    go: 'Keep going',
  },
};

const unit = (kind: IntroKind, count: number) => kind === 'builder' ? (count === 1 ? 'part' : 'parts') : (count === 1 ? 'jump' : 'jumps');

/** The guided try's nudge for the model as it is now (never the answer itself: it says what to do next). */
export function introHint(kind: IntroKind, target: IntroTry, parts: number, count: number): { text: string; done: boolean } {
  if (parts === target.d && count === target.n) {
    return { done: true, text: kind === 'builder' ? `Yes! ${target.n} of ${target.d} equal parts is ${target.word}.` : `Yes! ${target.n} ${unit(kind, target.n)} of ${target.d} equal spaces is ${target.word}.` };
  }
  if (parts !== target.d) return { done: false, text: kind === 'builder' ? `First cut the whole into ${target.d} equal parts.` : `First cut 0 to 1 into ${target.d} equal spaces.` };
  return { done: false, text: kind === 'builder' ? `Now shade ${target.n} ${unit(kind, target.n)}.` : `Now count ${target.n} ${unit(kind, target.n)} from 0 and tap where you land.` };
}

/** Everything an intro can read aloud: the demo, every nudge of both tries, and the last card. */
export function introSpeech(kind: IntroKind): string[] {
  const lines = [INTRO_TEXT[kind].title, ...INTRO_DEMOS[kind].map((shot) => shot.caption), INTRO_TEXT[kind].ready, INTRO_TEXT[kind].readyBody];
  for (const target of INTRO_TRIES[kind]) {
    lines.push(`${INTRO_TEXT[kind].build} ${target.word}.`);
    lines.push(introHint(kind, target, target.d, target.n).text, introHint(kind, target, 0, 0).text, introHint(kind, target, target.d, 0).text);
  }
  return lines;
}

/** The Helper's pick screen: what each intro is about, and the line read before them. */
export const HELPER_PICKS: Record<IntroKind, string> = {
  builder: 'Split a whole into equal parts and shade them',
  line: 'Equal spaces, jumps from 0, where you land',
};
export const HELPER_PICK_SPEECH = [
  'Need a brush-up? Watch how it works, then try it.',
  `${INTRO_TEXT.builder.title}. ${HELPER_PICKS.builder}.`,
  `${INTRO_TEXT.line.title}. ${HELPER_PICKS.line}.`,
];
