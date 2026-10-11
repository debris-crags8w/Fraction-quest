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
