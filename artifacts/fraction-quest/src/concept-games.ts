export type FractionModel = { n: number; d: number };

/** Compare positive fractions exactly, without rounding their decimal values. */
export function compareFractions(a: FractionModel, b: FractionModel): -1 | 0 | 1 {
  const difference = a.n * b.d - b.n * a.d;
  return difference < 0 ? -1 : difference > 0 ? 1 : 0;
}

export function areEquivalent(a: FractionModel, b: FractionModel): boolean {
  return a.d > 0 && b.d > 0 && a.n * b.d === b.n * a.d;
}

/** Return the equal-part counts that can show a target exactly on a 0-to-1 line. */
export function validLinePartitions(target: FractionModel, options: number[]): number[] {
  if (target.d <= 0 || target.n < 0 || target.n > target.d) return [];
  return options.filter(parts => Number.isInteger(parts) && parts >= target.d && parts % target.d === 0);
}

/** Convert a target fraction to its tick on an equivalent partition of the same whole. */
export function targetTick(target: FractionModel, partitions: number): number | null {
  if (!Number.isInteger(partitions) || partitions <= 0 || target.d <= 0 || partitions % target.d !== 0) return null;
  return target.n * (partitions / target.d);
}

/** Fraction War pairs. Mixes same denominators, same numerators (3/4 vs 3/8: fewer, bigger parts win),
    unlike pairs and a "same amount" pair. Every denominator is one the bar selector offers. */
export const WAR_ROUNDS: [FractionModel, FractionModel][] = [
  [{ n: 3, d: 5 }, { n: 2, d: 5 }],
  [{ n: 3, d: 4 }, { n: 3, d: 8 }],
  [{ n: 1, d: 2 }, { n: 3, d: 8 }],
  [{ n: 2, d: 6 }, { n: 2, d: 3 }],
  [{ n: 2, d: 4 }, { n: 1, d: 2 }],
  [{ n: 1, d: 3 }, { n: 1, d: 5 }],
  [{ n: 2, d: 3 }, { n: 3, d: 4 }],
  [{ n: 4, d: 5 }, { n: 4, d: 6 }],
];
export const WAR_PARTS = [2, 3, 4, 5, 6, 8];

/** A hint for a wrong Fraction War choice that fits the kind of pair. */
export function warHint(a: FractionModel, b: FractionModel): string {
  if (a.d === b.d) return 'Same denominator, so the parts are the same size. Which whole has more parts selected?';
  if (a.n === b.n) return `Both have ${a.n} part${a.n === 1 ? '' : 's'} selected. Fewer equal parts in the whole means each part is bigger. Which parts are bigger?`;
  return 'Compare how far each bar is shaded. You can change your choice or rebuild either bar.';
}

/* ---------- Fraction Line-Up: put four fractions in order ---------- */

export type LineUpRule = 'same-denominator' | 'same-numerator';
export type LineUpMode = LineUpRule | 'mixed';
export type LineUpDirection = 'smallest' | 'biggest';
export type LineUpRound = { rule: LineUpRule; direction: LineUpDirection; cards: FractionModel[] };
export const LINE_UP_ROUNDS = 6;

/** Small seeded random numbers, so a game can be replayed with the same rounds. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickDistinct = (pool: number[], count: number, random: () => number) => {
  const left = [...pool]; const out: number[] = [];
  while (out.length < count && left.length) out.push(left.splice(Math.floor(random() * left.length), 1)[0]);
  return out;
};

/** Is the line-up in order, smallest first or biggest first? */
export function lineUpInOrder(cards: FractionModel[], direction: LineUpDirection): boolean {
  return cards.every((card, i) => i === 0 || compareFractions(cards[i - 1], card) === (direction === 'smallest' ? -1 : 1));
}

/** Round `index` of a game: four fractions that share a denominator or a numerator, never shown already in order. */
export function lineUpRound(mode: LineUpMode, seed: number, index: number): LineUpRound {
  const random = seeded(seed * 97 + index * 7919 + 1);
  const rule: LineUpRule = mode === 'mixed' ? (index % 2 === 0 ? 'same-denominator' : 'same-numerator') : mode;
  const direction: LineUpDirection = index % 2 === 0 ? 'smallest' : 'biggest';
  let cards: FractionModel[];
  if (rule === 'same-denominator') {
    const d = [5, 6, 8, 10, 12][Math.floor(random() * 5)];
    cards = pickDistinct(Array.from({ length: d - 1 }, (_, i) => i + 1), 4, random).map((n) => ({ n, d }));
  } else {
    const n = 1 + Math.floor(random() * 3);
    cards = pickDistinct([2, 3, 4, 5, 6, 8, 10, 12].filter((d) => d > n), 4, random).map((d) => ({ n, d }));
  }
  // Never start in either finished order: that would be a free round.
  if (lineUpInOrder(cards, 'smallest') || lineUpInOrder(cards, 'biggest')) cards = [cards[1], cards[3], cards[0], cards[2]];
  return { rule, direction, cards };
}

/** The idea behind the rule, said kindly after a miss. Never names the answer. */
export function lineUpHint(round: LineUpRound): string {
  return round.rule === 'same-denominator'
    ? 'Same denominator: every piece is the same size. More pieces means more.'
    : 'Same numerator: the same number of pieces. Fewer pieces in the whole means bigger pieces.';
}
