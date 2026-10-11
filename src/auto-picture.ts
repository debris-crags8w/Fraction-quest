import type { ModelSpec } from './game';

/* Every question gets a picture. When a question has no model of its own, draw the amounts it names:
   one bar per fraction (mixed numbers, decimals and percents too), so "Which is bigger, 3/4 or 3/8?"
   shows 3/4 and 3/8 side by side and the child can see why. Pure, so it can be tested. */

type Amount = { numerator: number; denominator: number };
const MAX_BARS = 3;

/** The amounts named in a question, in order, without repeats. */
export function amountsIn(text: string): Amount[] {
  const found: { at: number; amount: Amount }[] = [];
  const taken: [number, number][] = [];
  const free = (start: number, end: number) => !taken.some(([a, b]) => start < b && end > a);
  const take = (match: RegExpExecArray, amount: Amount) => {
    const start = match.index; const end = start + match[0].length;
    if (!free(start, end)) return;
    taken.push([start, end]); found.push({ at: start, amount });
  };
  // Mixed numbers first ("1 2/3", "2 and 1/4"), then plain fractions, decimals and percents.
  for (const m of text.matchAll(/\b(\d+)\s+(?:and\s+)?(\d+)\/(\d+)\b/g)) {
    const [whole, n, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (d > 0 && n < d) take(m as RegExpExecArray, { numerator: whole * d + n, denominator: d });
  }
  for (const m of text.matchAll(/\b(\d+)\/(\d+)\b/g)) take(m as RegExpExecArray, { numerator: Number(m[1]), denominator: Number(m[2]) });
  for (const m of text.matchAll(/\b(\d*)\.(\d{1,2})\b/g)) {
    const places = m[2].length; const denominator = 10 ** places;
    take(m as RegExpExecArray, { numerator: Number(m[1] || 0) * denominator + Number(m[2]), denominator });
  }
  for (const m of text.matchAll(/\b(\d{1,3})%/g)) take(m as RegExpExecArray, { numerator: Number(m[1]), denominator: 100 });
  const seen = new Set<string>();
  return found.sort((a, b) => a.at - b.at).map((item) => item.amount)
    .filter(({ numerator, denominator }) => {
      const key = `${numerator}/${denominator}`;
      // Bars stay readable: up to 60 parts, plus hundredths, and at most 4 wholes.
      const drawable = denominator >= 2 && (denominator <= 60 || denominator === 100) && numerator >= 0 && numerator <= denominator * 4;
      if (!drawable || seen.has(key)) return false;
      seen.add(key); return true;
    });
}

/** Story questions with no fraction written in them still get the things in the story. */
function storyPicture(text: string): ModelSpec | null {
  // "4 pizzas are shared fairly by 3 friends": the wholes, each cut for the sharers, nothing shaded yet.
  const share = /(\d+) [a-z]+ (?:are|is) shared (?:fairly )?(?:by|among|between) (\d+)/i.exec(text);
  if (share && Number(share[1]) <= 8 && Number(share[2]) <= 12) {
    return { kind: 'bars', bars: Array.from({ length: Number(share[1]) }, () => ({ numerator: 0, denominator: Number(share[2]) })), hideLabels: true };
  }
  // "12 beads are shared into 4 equal groups": the beads, to group.
  const beads = /(\d+) [a-z]+ (?:are|is) (?:shared|split|put) into (\d+) equal groups/i.exec(text);
  if (beads && Number(beads[1]) <= 40) return { kind: 'set', selected: 0, total: Number(beads[1]) };
  // "How many equal spaces from 0 to 1 make thirds?": a bare 0-to-1 line (splitting it would give the answer).
  if (/equal spaces from 0 to 1/i.test(text)) return { kind: 'line', numerator: 0, denominator: 1, wholes: 1, hideLabels: true };
  return null;
}

/** A picture of the amounts in `text` (bars), or of the story, or null when there is nothing to draw. */
export function autoPicture(text: string, caption?: string): ModelSpec | null {
  const bars = amountsIn(text).slice(0, MAX_BARS);
  if (!bars.length) return storyPicture(text);
  return { kind: 'bars', bars, ...(caption ? { caption } : {}) };
}
