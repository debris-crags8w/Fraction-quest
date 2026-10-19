/* Stack the Tower: fraction blocks arrive one at a time and go into a tower, biggest at the bottom.
   The fractions have different numerators and different denominators, so kids compare them with the
   benchmarks 0, 1/2 and 1. A wrong spot wobbles the tower; three wobbles and it topples. */

export type TowerBlock = { n: number; d: number };
export type TowerRound = {
  /** The first block, already standing on the ground. */
  first: TowerBlock;
  /** The blocks that arrive next, in order. */
  arriving: TowerBlock[];
};
export const TOWER_ROUNDS = 6;
/** Three wobbles and the tower topples. */
export const TOWER_WOBBLES = 3;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const blockValue = (block: TowerBlock) => block.n / block.d;
/** Compare with 1/2 using whole numbers: -1 less, 0 equal, 1 more. */
export const versusHalf = (block: TowerBlock) => Math.sign(2 * block.n - block.d);

/** Where a block belongs in a tower listed bottom first: after every bigger block. */
export const correctGap = (tower: TowerBlock[], block: TowerBlock) =>
  tower.filter((placed) => placed.n * block.d > block.n * placed.d).length;

/** A tower listed bottom first is standing when every block is smaller than the one under it. */
export const towerStands = (tower: TowerBlock[]) =>
  tower.every((block, i) => i === 0 || block.n * tower[i - 1].d < tower[i - 1].n * block.d);

/** Stars for a finished tower: 3 with no wobble, 2 with one, 1 with two. */
export const towerStars = (wobbles: number) => Math.max(1, 3 - wobbles);

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

/** Easiest first: far apart (near 0, near 1/2, near 1), then closer, then two blocks close to 1/2. */
const LEVELS: { blocks: number; denominators: number[]; minGap: number; nearHalf: boolean }[] = [
  { blocks: 4, denominators: [2, 3, 4, 5, 6, 8], minGap: 0.2, nearHalf: false },
  { blocks: 4, denominators: [2, 3, 4, 5, 6, 8, 10], minGap: 0.18, nearHalf: false },
  { blocks: 4, denominators: [3, 4, 5, 6, 8, 10], minGap: 0.12, nearHalf: false },
  { blocks: 5, denominators: [3, 4, 5, 6, 8, 10], minGap: 0.1, nearHalf: false },
  { blocks: 5, denominators: [3, 4, 5, 6, 8, 9, 10, 12], minGap: 0.06, nearHalf: true },
  { blocks: 5, denominators: [3, 4, 5, 6, 8, 9, 10, 12], minGap: 0.06, nearHalf: true },
];

/** Tower `index` of a game: distinct denominators, at least two numerators, simplest form, values spread apart. */
export function towerRound(seed: number, index: number): TowerRound {
  const level = LEVELS[index % LEVELS.length];
  const random = seeded(seed * 211 + index * 1009 + 7);
  const shuffle = <T,>(items: T[]) => items.map((item) => [random(), item] as const).sort((x, y) => x[0] - y[0]).map(([, item]) => item);
  const pool = shuffle(level.denominators.flatMap((d) => Array.from({ length: d - 1 }, (_, i) => ({ n: i + 1, d }))
    .filter((block) => gcd(block.n, block.d) === 1)));
  const fits = (chosen: TowerBlock[], block: TowerBlock) => chosen.every((other) => other.d !== block.d
    && Math.abs(blockValue(other) - blockValue(block)) >= level.minGap - 1e-9);
  const complete = (chosen: TowerBlock[]) => {
    if (new Set(chosen.map((block) => block.n)).size < 2) return false;
    if (!level.nearHalf) return true;
    const near = chosen.filter((block) => versusHalf(block) !== 0 && Math.abs(blockValue(block) - 0.5) <= 0.15);
    return new Set(near.map(versusHalf)).size === 2;
  };
  // A seeded depth-first search over the shuffled pool, so a tower is always found.
  const search = (chosen: TowerBlock[], from: number): TowerBlock[] | null => {
    if (chosen.length === level.blocks) return complete(chosen) ? chosen : null;
    for (let i = from; i < pool.length; i++) {
      if (!fits(chosen, pool[i])) continue;
      const found = search([...chosen, pool[i]], i + 1);
      if (found) return found;
    }
    return null;
  };
  const blocks = search([], 0);
  if (blocks) {
    // The first block stands on the ground; the rest arrive in a shuffled order.
    const order = shuffle(blocks);
    return { first: order[0], arriving: order.slice(1) };
  }
  throw new Error(`No tower for level ${index}`);
}

const name = (block: TowerBlock) => `${block.n}/${block.d}`;
/** How to compare one block with 1/2, without saying the answer. */
const parts = (count: number) => `${count} ${count === 1 ? 'part' : 'parts'}`;
const halfQuestion = (block: TowerBlock) => block.d % 2 === 0
  ? `Is ${name(block)} more or less than 1/2? Half of ${parts(block.d)} is ${parts(block.d / 2)}.`
  : `Is ${name(block)} more or less than 1/2? Compare ${parts(block.n)} with half of ${parts(block.d)}.`;

/** A hint after a wrong spot. It names the strategy (compare with 1/2, 0 or 1) but never the right gap. */
export function towerHint(tower: TowerBlock[], block: TowerBlock, gap: number): string {
  const right = correctGap(tower, block);
  // The block next to the chosen gap that is in the wrong order with it.
  const neighbor = gap > right ? tower[gap - 1] : tower[gap];
  const [a, b] = [versusHalf(block), versusHalf(neighbor)];
  if (a === 0) return `${name(block)} is the same as 1/2. ${halfQuestion(neighbor)}`;
  if (b === 0) return `${name(neighbor)} is the same as 1/2. ${halfQuestion(block)}`;
  if (a !== b) return `Bigger blocks go lower. ${halfQuestion(block)}`;
  return a < 0
    ? `${name(block)} and ${name(neighbor)} are both less than 1/2. Which one is closer to 0?`
    : `${name(block)} and ${name(neighbor)} are both more than 1/2. Which one is missing less to make 1?`;
}
