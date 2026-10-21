import type { ModelSpec } from './game';

/** A mixed-number side length, like 2 1/2 meters. */
export type GardenSide = { whole: number; numerator: number; denominator: number };

export const gardenSize = (side: GardenSide) => side.whole + side.numerator / side.denominator;

/** A garden picture with the longer side across, so a tall garden still fits a phone screen. */
export function gardenModel(a: GardenSide, b: GardenSide, labelParts = false): ModelSpec {
  const [width, height] = gardenSize(a) >= gardenSize(b) ? [a, b] : [b, a];
  return { kind: 'garden', width, height, ...(labelParts ? { labelParts } : {}) };
}
