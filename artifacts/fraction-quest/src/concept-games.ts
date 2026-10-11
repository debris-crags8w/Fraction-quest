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
