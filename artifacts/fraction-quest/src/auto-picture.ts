import type { ModelSpec } from './game';
import { execAll } from './lib/regexp';

/* Every question gets a picture. When a question has no model of its own, draw the amounts it names:
   one bar per fraction (mixed numbers, decimals and percents too), so "Which is bigger, 3/4 or 3/8?"
   shows 3/4 and 3/8 side by side and the child can see why. Pure, so it can be tested. */

/** `written`: the question writes it as a fraction ("3/4", "1 2/3"), so its label is no give-away. A decimal or
    percent drawn as a bar keeps its label hidden: "What fraction is 0.35?" must not show 35/100. */
type Amount = { numerator: number; denominator: number; written?: boolean };
const MAX_BARS = 3;

/** The amounts named in a question, in order, without repeats (a sum keeps them: 1/3 + 1/3 is two bars). */
export function amountsIn(text: string): Amount[] {
  const found: { at: number; amount: Amount }[] = [];
  const taken: [number, number][] = [];
  const free = (start: number, end: number) => !taken.some(([a, b]) => start < b && end > a);
  const take = (match: RegExpExecArray, amount: Amount) => {
    const start = match.index; const end = start + match[0].length;
    if (!free(start, end)) return;
    taken.push([start, end]); found.push({ at: start, amount });
  };
  // Mixed numbers first ("1 2/3", "2 and 1/4"; the whole is not the end of a fraction: "2/5 and 4/5" is two), then plain fractions, decimals and percents.
  for (const m of execAll(text, /(?<![\d/])\b(\d+)\s+(?:and\s+)?(\d+)\/(\d+)\b/g)) {
    const [whole, n, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    // Not marked as written: its label would print the single fraction the question asks for.
    if (d > 0 && n < d) take(m as RegExpExecArray, { numerator: whole * d + n, denominator: d });
  }
  for (const m of execAll(text, /\b(\d+)\/(\d+)\b/g)) take(m, { numerator: Number(m[1]), denominator: Number(m[2]), written: true });
  for (const m of execAll(text, /\b(\d*)\.(\d{1,2})\b/g)) {
    const places = m[2].length; const denominator = 10 ** places;
    take(m as RegExpExecArray, { numerator: Number(m[1] || 0) * denominator + Number(m[2]), denominator });
  }
  for (const m of execAll(text, /\b(\d{1,3})%/g)) take(m, { numerator: Number(m[1]), denominator: 100 });
  const seen = new Set<string>();
  // "1/3 + 1/3" adds the same amount twice: two bars. So do "Then 1/4 more" and "1/4 on Monday and 1/4 on Tuesday".
  const sum = /\b(\d+\/\d+)\s*\+\s*\1\b/.test(text) || /\b(\d+\/\d+)\b.*\b(?:[Tt]hen|and) \1 more\b/.test(text)
    || /\b(\d+\/\d+) on \w+ and \1 on \w+/.test(text);
  return found.sort((a, b) => a.at - b.at).map((item) => item.amount)
    .filter(({ numerator, denominator }) => {
      const key = `${numerator}/${denominator}`;
      // Bars stay readable: up to 60 parts, plus hundredths, and at most 4 wholes.
      const drawable = denominator >= 2 && (denominator <= 60 || denominator === 100) && numerator >= 0 && numerator <= denominator * 4;
      if (!drawable || (seen.has(key) && !sum)) return false;
      seen.add(key); return true;
    });
}

/** Story questions with no fraction written in them still get the things in the story. */
function storyPicture(text: string): ModelSpec | null {
  // "4 pizzas are shared fairly by 3 friends": the wholes, not cut yet. Cutting them for the sharers would
  // show the denominator, which is what the child works out.
  const share = /(\d+) [a-z]+ (?:are|is) shared (?:fairly )?(?:by|among|between) (\d+)/i.exec(text);
  if (share && Number(share[1]) <= 10 && Number(share[2]) <= 12) {
    return { kind: 'bars', bars: Array.from({ length: Number(share[1]) }, () => ({ numerator: 0, denominator: 1 })), hideLabels: true };
  }
  // "12 beads are shared into 4 equal groups": the beads, to group.
  const beads = /(\d+) [a-z]+ (?:are|is) (?:shared|split|put) into (\d+) equal groups/i.exec(text);
  if (beads) {
    const total = Number(beads[1]);
    const groupCount = Number(beads[2]);
    if (total > 0 && total <= 40 && groupCount > 0) {
      return { kind: 'set', selected: 0, total, ...(total % groupCount === 0 ? { groupCount } : {}) };
    }
  }
  // "How many equal spaces from 0 to 1 make thirds?": a bare 0-to-1 line (splitting it would give the answer).
  if (/equal spaces from 0 to 1/i.test(text)) return { kind: 'line', numerator: 0, denominator: 1, wholes: 1, hideLabels: true };
  return null;
}

/** A picture of the amounts in `text` (bars), or of the story, or null when there is nothing to draw. */
export function autoPicture(text: string, caption?: string): ModelSpec | null {
  // "A frog makes 6 jumps. Each jump is 1/4 meter.": the number line to jump along, with no dot (the dot is the answer).
  const hops = /(\d+) jumps?\. Each jump is 1\/(\d+)/.exec(text);
  if (hops) return { kind: 'line', numerator: 0, denominator: Number(hops[2]), wholes: Math.max(1, Math.ceil(Number(hops[1]) / Number(hops[2]))), hideLabels: true };
  // "Rename: 3/5 = 6/10 and 1/2 = 5/10. Then 2 3/5 − 1 1/2 = ?": picture the amounts in the sum, not the renaming hint.
  const bars = amountsIn(text.replace(/^(.*?)Rename: .+?\. Then /, '$1')).slice(0, MAX_BARS);
  if (!bars.length) return storyPicture(text);
  return { kind: 'bars', bars: bars.map(({ numerator, denominator, written }) => ({ numerator, denominator, ...(written ? { named: true } : {}) })), ...(caption ? { caption } : {}) };
}
