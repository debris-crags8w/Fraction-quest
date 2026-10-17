/* Frog Hop: a frog on a number line hops by fraction cards to land exactly on a goal lily pad.
   Positions are counted in "steps" of 1/denominator, so all the maths is whole numbers (no rounding).
   A hop always goes toward the goal; hopping past it is a splash, and the frog then hops back (subtraction). */

export type FrogCard = { n: number; d: number };
export type FrogRound = {
  /** The line is cut into steps of 1/denominator. */
  denominator: number;
  /** The line runs from 0 to this many wholes. */
  wholes: number;
  /** The goal, in steps (goal / denominator is the fraction). */
  goal: number;
  /** The jump cards for the whole round (they can be used again and again). */
  cards: FrogCard[];
};
export const FROG_ROUNDS = 6;

/** How many steps of 1/denominator a card jumps (1/4 on an eighths line is 2 steps). */
export const cardSteps = (card: FrogCard, denominator: number) => (card.n * denominator) / card.d;

export type HopResult = { from: number; to: number; splash: boolean; landed: boolean };

/** Hop once with a card: toward the goal, never off either end of the line. Passing the goal is a splash. */
export function hop(round: FrogRound, position: number, card: FrogCard): HopResult {
  const steps = cardSteps(card, round.denominator);
  const direction = position <= round.goal ? 1 : -1;
  const end = round.wholes * round.denominator;
  const to = Math.max(0, Math.min(end, position + direction * steps));
  const splash = (position < round.goal && to > round.goal) || (position > round.goal && to < round.goal);
  return { from: position, to, splash, landed: to === round.goal };
}

/** The fewest hops that land exactly on the goal from 0 (hops go toward the goal, as in the game). */
export function parHops(round: FrogRound): number {
  const seen = new Map<number, number>([[0, 0]]);
  let frontier = [0];
  for (let hops = 1; hops <= 12; hops++) {
    const next: number[] = [];
    for (const position of frontier) {
      for (const card of round.cards) {
        const { to, landed } = hop(round, position, card);
        if (landed) return hops;
        if (!seen.has(to)) { seen.set(to, hops); next.push(to); }
      }
    }
    frontier = next;
  }
  return Infinity;
}

/** Flies for a landing: 3 at par, 2 one hop over, 1 otherwise. */
export const fliesFor = (hops: number, par: number) => (hops <= par ? 3 : hops === par + 1 ? 2 : 1);
/** The crocodile reaches the frog after par + 3 hops without landing. */
export const crocodileLimit = (par: number) => par + 3;

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

/** The levels, easiest first: fourths, eighths, sixths with thirds, past one whole, twelfths. */
const LEVELS: { denominator: number; wholes: number; cards: FrogCard[] }[] = [
  { denominator: 4, wholes: 1, cards: [{ n: 1, d: 2 }, { n: 1, d: 4 }] },
  { denominator: 8, wholes: 1, cards: [{ n: 1, d: 2 }, { n: 1, d: 4 }, { n: 1, d: 8 }] },
  { denominator: 6, wholes: 1, cards: [{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 1, d: 6 }] },
  { denominator: 8, wholes: 2, cards: [{ n: 3, d: 4 }, { n: 1, d: 2 }, { n: 1, d: 8 }] },
  { denominator: 12, wholes: 1, cards: [{ n: 1, d: 3 }, { n: 1, d: 4 }, { n: 1, d: 12 }] },
  { denominator: 6, wholes: 2, cards: [{ n: 2, d: 3 }, { n: 1, d: 2 }, { n: 1, d: 6 }] },
];

/** Round `index` of a game. The goal is never one card away (that would be no puzzle) and is always reachable. */
export function frogRound(seed: number, index: number): FrogRound {
  const level = LEVELS[index % LEVELS.length];
  const random = seeded(seed * 131 + index * 977 + 3);
  const end = level.wholes * level.denominator;
  const oneHop = new Set(level.cards.map((card) => cardSteps(card, level.denominator)));
  const goals = Array.from({ length: end - 1 }, (_, i) => i + 1)
    .filter((goal) => !oneHop.has(goal) && goal % level.denominator !== 0);
  const goal = goals[Math.floor(random() * goals.length)];
  return { denominator: level.denominator, wholes: level.wholes, goal, cards: level.cards };
}

/** A position in steps as a fraction name, simplest form: 6 eighths → "3/4", 8 eighths → "1", 10 eighths → "1 1/4". */
export function positionName(steps: number, denominator: number): string {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  if (steps === 0) return '0';
  const whole = Math.floor(steps / denominator);
  const rest = steps % denominator;
  if (!rest) return String(whole);
  const g = gcd(rest, denominator);
  const part = `${rest / g}/${denominator / g}`;
  return whole ? `${whole} ${part}` : part;
}
