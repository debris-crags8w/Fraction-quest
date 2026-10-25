/* What the lesson page's section Listen buttons read (LearningLab, LessonTeachingSupport). Kept here so the voice
   pack's sentence list (scripts/voice-sentences.ts) lists the same words and they play from the pack. */
import { sameFractionValue, type Mission } from './game';
import { sayFraction } from './lib/voice';
import type { guideForUnit } from './teaching-guide-data';

type Guide = NonNullable<ReturnType<typeof guideForUnit>>;

export const LAB_SECTION_SPEECH = {
  redo: 'Want more practice? Try a part again with new numbers. Your lesson stays finished.',
  buildPractice: 'Try 10 new, optional questions with this lesson’s ideas. Extra practice does not change lesson completion.',
  sameSize: 'Each square shows 1/4. The shapes look different, but each colored part is the same size: 4 of them fill the square. Equal parts are the same size, not always the same shape.',
  reteach: 'One idea has been tricky more than once: use each new model, then enter the answer. These extra checks help make the idea stick.',
};

/** Said once as a folded strip opens. */
export const foldSpeech = (folds: number, pieces: number) =>
  `${folds} ${folds === 1 ? 'fold' : 'folds'}. ${pieces} equal parts. Each part is 1/${pieces}.`;

type BuildKind = 'bar' | 'line' | 'set';
type BuildTarget = { n: number; d: number; wholes: number; total?: number; anyName?: boolean };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The two Build hints: first how to split the whole, then how many to shade, mark or select. */
export function buildHints(t: BuildTarget, k: BuildKind): string[] {
  const modelUnit = k === 'line' ? 'spaces' : k === 'set' ? 'groups' : 'parts';
  const counted = k === 'line' ? 'jump' : k === 'set' ? 'group' : 'part';
  return [
    k === 'set' ? `Share ${t.total ?? t.d} objects into ${t.d} equal groups.` : `Split each whole into ${t.d} equal ${modelUnit}.`,
    `${k === 'line' ? 'Mark' : k === 'set' ? 'Select' : 'Shade'} ${plural(t.n, counted, `${counted}s`)}.`,
  ];
}

// Short, friendly names for the mistakes we track (they choose the extra practice).
export const BUILD_SLIPS = {
  parts: 'Picking the number of equal parts',
  count: 'Counting pieces, groups or jumps',
  wholes: 'Using the right number of wholes',
  trans: 'Showing it the second way',
  reason: 'Picking the reason',
};
const MODEL_LABEL: Record<BuildKind, string> = { bar: 'Bar', line: 'Number line', set: 'Groups' };

/** What is still wrong with a build, as read aloud, and which slips it shows. */
export function buildErrors(kind: BuildKind, t: BuildTarget, s: { d: number; count: number; wholes: number }): { msgs: string[]; keys: string[] } {
  const msgs: string[] = []; const keys: string[] = [];
  const label = MODEL_LABEL[kind];
  const unit = kind === 'line' ? 'spaces' : kind === 'set' ? 'groups' : 'parts';
  if (s.d === 0) return { msgs: [`${label}: choose how many equal ${unit} make one whole.`], keys: [BUILD_SLIPS.parts] };
  if (kind === 'set') {
    const total = t.total ?? 0;
    if (total % s.d !== 0) { msgs.push(`${label}: ${total} can't split into ${s.d} equal groups. Try another number.`); keys.push(BUILD_SLIPS.parts); }
  }
  // Where any name is right (6/12 for 1/2), an equal fraction is built correctly.
  const sameAmount = Boolean(t.anyName) && s.d > 0 && s.count * t.d === t.n * s.d;
  if (sameAmount) {
    if (kind === 'bar' && s.wholes !== t.wholes) { msgs.push(`${label}: use ${t.wholes} whole ${t.wholes === 1 ? 'bar' : 'bars'}.`); keys.push(BUILD_SLIPS.wholes); }
    return { msgs, keys };
  }
  // Point at the part of the fraction to check, without saying the number (that would build it for the child).
  if (s.d !== t.d && !msgs.length) { msgs.push(`${label}: not yet. Look at the denominator: how many equal ${unit} make one whole?`); keys.push(BUILD_SLIPS.parts); }
  if (kind === 'bar' && s.wholes !== t.wholes) { msgs.push(`${label}: use ${t.wholes} whole ${t.wholes === 1 ? 'bar' : 'bars'}.`); keys.push(BUILD_SLIPS.wholes); }
  if (s.count !== t.n && s.d === t.d) {
    const action = kind === 'line' ? 'mark' : kind === 'set' ? 'select' : 'shade';
    const counted = kind === 'line' ? 'jump' : kind === 'set' ? 'group' : 'part';
    msgs.push(`${label}: not yet. Look at the numerator: how many ${counted}s should you ${action}?`);
    keys.push(BUILD_SLIPS.count);
  }
  return { msgs, keys };
}

/** The headings read before a build's mistakes. */
/** The first line of a build Part's green check ("Your bar is right."); the model feedback follows it. */
export const PART_CHECK_OPENERS = { bar: 'Your bar is right.', line: 'Your number line is right.', set: 'Your model is right.' } as const;

export const BUILD_ERROR_HEADINGS = ['Not yet! Fix these, then check again.', 'Changed something? Check again.'];

/** Several sections read as one. Listen goes straight to the words: the headings on screen are not read aloud. */
export const sectionsScript = (sections: { heading: string; text: string }[]) =>
  sections.map(({ text }) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`)).join(' ');

export const worksheetSpeech = (questions: number) =>
  `Answer all ${questions} questions to finish the lesson. Print the worksheet to hand in, then enter your answers here or with Check my paper.`;

/** The warm-up panel's cards, as read aloud. */
export const supportSpeech = (guide: Guide, mission: Pick<Mission, 'explainPrompt'>) => ({
  warmup: guide.warmup.prompt,
  words: `${guide.vocabulary.map(({ term, meaning }) => `${term}: ${meaning}`).join(' ')}`,
  explain: mission.explainPrompt ?? guide.explainFrame,
  teacher: guide.errorAnalysis.claim,
  stretch: guide.enrichment,
});

type Point = { numerator: number; denominator: number };
/** The order number line, described in words (its Listen button and screen readers read this). */
export function numberLineDescription(points: Point[], benchmark: Point, equivalentNames: { fraction: Point; equivalentTo: Point }[] = []): string {
  const fractionName = ({ numerator, denominator }: Point) => sayFraction(numerator, denominator);
  const namesFor = (point: Point) => equivalentNames.filter(({ equivalentTo }) => sameFractionValue(point, equivalentTo));
  const equivalents = (point: Point, names: { fraction: Point }[]) => names.map(({ fraction }) =>
    `${fractionName(point)} and ${fractionName(fraction)} are equivalent fractions. They mark the same amount and number-line spot.`,
  ).join(' ');
  const pointText = (point: Point) => `${fractionName(point)} is at ${point.numerator} of ${point.denominator} equal spaces from zero to one.`;
  const benchmarkNames = namesFor(benchmark);
  const benchmarkExtra = benchmarkNames.length ? ` ${equivalents(benchmark, benchmarkNames)}` : '';
  return [
    'A number line from zero to one.',
    ...points.map((point) => {
      const names = namesFor(point);
      return names.length ? `${pointText(point)} ${equivalents(point, names)}` : pointText(point);
    }),
    benchmark.numerator * 2 === benchmark.denominator
      ? `The one-half benchmark is halfway between zero and one.${benchmarkExtra}`
      : `The benchmark ${fractionName(benchmark)} is at ${benchmark.numerator} of ${benchmark.denominator} equal spaces from zero to one.${benchmarkExtra}`,
    `From left to right, the fractions are ${points.map(fractionName).join(', ')}.`,
  ].join(' ');
}
