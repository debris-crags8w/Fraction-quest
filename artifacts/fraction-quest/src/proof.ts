import { withoutUnit } from './measure-units';
/* The accuracy proof engine. Every question the app can ask is solved here again, from its words (and its
   picture), without using the code that wrote it. The tests in proof.test.ts run this over every lesson,
   worksheet, redo sheet, practice set, build, review, Check-in, Find my level and challenge, and fail on any
   question it cannot solve or that disagrees with the app's answer. Keep it independent: no imports from the
   code that makes questions, only from the picture geometry. */
import { AREA_CUTS, pieceArea, shadedArea, type AreaCut } from './area-shapes';
import { PROOF_KEY } from './proof-key';

export type ProofPicture =
  | { kind: 'bar' | 'set' | 'line'; n: number; d: number; wholes?: number; total?: number; sizes?: number[] }
  | { kind: 'bars'; bars: ({ numerator: number; denominator: number } | { n: number; d: number; label?: string })[] }
  | { kind: 'set'; selected: number; total: number; groupCount?: number }
  | { kind: 'line'; numerator: number; denominator: number }
  | { kind: 'partition'; parts: number[] }
  | { kind: 'decimal'; tenths: number }
  | { kind: 'area'; cut: AreaCut; shaded?: number[] }
  | { kind: 'equation'; text: string }
  | { kind: 'grid' | 'dots'; rows: number; cols: number; shaded: number[] }
  | { kind: 'fold'; folds: number[] }
  | { kind: 'ruler'; denominator: number; wholes: number; end: number }
  | { kind: 'lineplot'; denominator: number; wholes: number; values: number[] };

export type ProofItem = {
  source: string; lesson: string; prompt: string;
  /** The app's answer: a worksheet answer, the correct choice, or a build target. */
  answer?: string; choices?: string[]; correct?: number;
  target?: { kind: string; n: number; d: number; total?: number };
  pictures?: ProofPicture[];
  rulerEnd?: { end: number; denominator: number };
  linePlot?: { values: number[]; denominator: number };
};

/** A failure names what is wrong; null means the engine has no rule for this question (also a test failure). */
export type ProofResult = { ok: true; rule: string } | { ok: false; rule: string; why: string } | null;

// ---------------------------------------------------------------------------------------------- numbers

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** The value of an answer as a child sees it: 3/4, 1 3/4, 1 and 3/4, 0.75, 75%, 2 m, 15. NaN when not a number. */
export function valueOf(text: string): number {
  const t = text.trim().replace(/^(\S+(?: (?:and )?\d+\/\d+)?)\s+[a-z]+$/, '$1').replace(/^(\d+) and (\d+\/\d+)$/, '$1 $2'); // "5 beads", "2 m"
  let m: RegExpExecArray | null;
  if ((m = /^(-?\d+)\s+(?:and\s+)?(\d+)\/(\d+)$/.exec(t))) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  if ((m = /^(-?\d+)\/(\d+)$/.exec(t))) return Number(m[1]) / Number(m[2]);
  if ((m = /^(-?\d*\.?\d+)%$/.exec(t))) return Number(m[1]) / 100;
  if (/^-?\d*\.?\d+$/.test(t)) return Number(t);
  return NaN;
}
const frac = (s: string) => { const [a, b] = s.split('/').map(Number); return a / b; };
const N = Number;
const UNIT_WORD: Record<string, number> = { halves: 2, thirds: 3, fourths: 4, fifths: 5, sixths: 6, sevenths: 7, eighths: 8, ninths: 9, tenths: 10, twelfths: 12, hundredths: 100 };
const PER: Record<string, number> = { 'inches/foot': 12, 'minutes/hour': 60, 'seconds/minute': 60, 'hours/day': 24, 'milliliters/liter': 1000,
  'grams/kilogram': 1000, 'centimeters/meter': 100, 'ounces/pound': 16, 'cents/dollar': 100 };

// ---------------------------------------------------------------------------------------------- expectations

type Expect =
  | { value: number; denominator?: number; simplest?: boolean; form?: 'decimal' | 'percent' | 'mixed' | 'whole' }
  | { text: string }
  | { symbol: '<' | '>' | '='; statement?: string }
  | { order: number[] }
  | { yes: boolean };

/** A rule that matched the words but cannot decide this question: try the next rule (or count it as unsolved). */
const SKIP = '__skip__';

type Rule = { name: string; re: RegExp; solve: (m: RegExpExecArray, item: ProofItem) => Expect | string };

/** One amount as written: 1 3/4, 1 and 3/4, 3/4, 0.35, 45%, 7. */
const TERM = String.raw`\d+ (?:and )?\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+%|\d+`;
const EXPR = String.raw`(?:${TERM})(?: [+−×] (?:${TERM}))+`;
/** Evaluate a + b − c × d ÷ e left to right with × and ÷ first (all the app writes). */
const evaluate = (expr: string): number => {
  const tokens = expr.split(/ ([+−×÷]) /);
  const values: number[] = []; const ops: string[] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const v = valueOf(tokens[i]);
    if (i > 0 && tokens[i - 1] === '×') values[values.length - 1] *= v;
    else if (i > 0 && tokens[i - 1] === '÷') values[values.length - 1] /= v;
    else { values.push(v); if (i > 0) ops.push(tokens[i - 1]); }
  }
  return values.slice(1).reduce((sum, v, k) => sum + (ops[k] === '+' ? v : -v), values[0]);
};
const sym = (a: number, b: number): '<' | '>' | '=' => (near(a, b) ? '=' : a < b ? '<' : '>');

const sumOf = (c: string) => c.split(' + ').reduce((t, x) => t + valueOf(x), 0);
const rankedOrder = (c: string, up: boolean) => { const v = c.split(/\s*[<>]\s*/).map(valueOf); return v.every((x, i) => i === 0 || (up ? x > v[i - 1] : x < v[i - 1])) && /[<>]/.test(c); };
type Pick = { re: RegExp; fits: (choice: string, m: RegExpExecArray, all: string[]) => boolean };
const extreme = (all: string[], f: (v: number) => number, max: boolean) => { const vs = all.map((c) => f(valueOf(c))); return max ? Math.max(...vs) : Math.min(...vs); };
/** "Which ... ?" questions: what makes a choice right. */
const PICK: Pick[] = [
  { re: /^closest to (0|1|one whole)$/, fits: (c, m, all) => { const t = m[1] === '0' ? 0 : 1; return near(Math.abs(valueOf(c) - t), extreme(all, (v) => Math.abs(v - t), false)); } },
  { re: /^(?:the )?(biggest|smallest)$/, fits: (c, m, all) => near(valueOf(c), extreme(all, (v) => v, m[1] === 'biggest')) },
  { re: /^(?:more than|bigger than) (\S+)$/, fits: (c, m) => valueOf(c) > (m[1] === 'one whole' ? 1 : valueOf(m[1])) },
  { re: /^more than one whole$/, fits: (c) => valueOf(c) > 1 },
  { re: /^between (\S+) and (\S+)(?: on the number line)?$/, fits: (c, m) => valueOf(c) > valueOf(m[1]) && valueOf(c) < valueOf(m[2]) },
  { re: /^(?:exactly|the same as|equals?|the same amount as) (\S+)$/, fits: (c, m) => near(valueOf(c), valueOf(m[1])) },
  { re: /^NOT (?:the same as|at the same spot as) (\S+)(?: on a number line)?$/, fits: (c, m) => !near(valueOf(c), valueOf(m[1])) },
  { re: /^(\S+)$/, fits: (c, m) => /^\d/.test(m[1]) && near(sumOf(c), valueOf(m[1])) },
  { re: /^one whole$/, fits: (c) => near(sumOf(c), 1) },
  { re: /^does NOT make one whole$/, fits: (c) => !near(sumOf(c), 1) },
  { re: /^(bigger|smaller|longer|more)[,:] (\S+) or (\S+)$/, fits: (c, m) => { const [a, b] = [valueOf(m[2]), valueOf(m[3])]; const big = m[1] !== 'smaller';
      return !near(a, b) && near(valueOf(c), big ? Math.max(a, b) : Math.min(a, b)); } },
  { re: /^closer to one whole: (\S+) or (\S+)$/, fits: (c, m) => near(valueOf(c), Math.abs(1 - valueOf(m[1])) < Math.abs(1 - valueOf(m[2])) ? valueOf(m[1]) : valueOf(m[2])) },
  { re: /^a unit fraction$/, fits: (c) => /^1\/\d+$/.test(c) },
  { re: /^just a little (less|more) than 1\/2$/, fits: (c, m, all) => { const side = (v: number) => (m[1] === 'less' ? v < 0.5 : v > 0.5);
      const ok = all.filter((x) => side(valueOf(x))); return side(valueOf(c)) && near(Math.abs(valueOf(c) - 0.5), Math.min(...ok.map((x) => Math.abs(valueOf(x) - 0.5)))); } },
  { re: /^a little (less|more) than 1\/2$/, fits: (c, m, all) => { const side = (v: number) => (m[1] === 'less' ? v < 0.5 : v > 0.5);
      const ok = all.filter((x) => side(valueOf(x))); return side(valueOf(c)) && near(Math.abs(valueOf(c) - 0.5), Math.min(...ok.map((x) => Math.abs(valueOf(x) - 0.5)))); } },
  { re: /^(smallest|biggest) to (?:smallest|biggest)$/, fits: (c, m) => rankedOrder(c, m[1] === 'smallest') },
];

/** Rules, tried in order. A rule may return a string: that is a failure found while solving (a bad picture). */
const RULES: Rule[] = [
  // --- comparing and ordering
  { name: 'which is bigger/smaller', re: /^Which is (bigger|smaller|longer|shorter), (\d+\/\d+) or (\d+\/\d+)\?(?: Make it\.)?$/,
    solve: (m) => { const [a, b] = [frac(m[2]), frac(m[3])]; if (near(a, b)) return { text: 'They are equal' };
      const big = /bigger|longer/.test(m[1]); return { value: (a > b) === big ? a : b }; } },
  { name: 'which is biggest/longest of three', re: /^Which is (biggest|smallest|longest|shortest):? (\d+\/\d+), (\d+\/\d+),? or (\d+\/\d+)\?(?: Make it\.)?$/,
    solve: (m) => { const v = [m[2], m[3], m[4]].map(frac); const pick = /biggest|longest/.test(m[1]) ? Math.max(...v) : Math.min(...v);
      if (v.filter((x) => near(x, pick)).length > 1) return 'two choices tie'; return { value: pick }; } },
  { name: 'gap sign', re: /^(?:Put <, = or > in the gap|Pick the sign|Compare):? (\S+) __ (\S+?)\.?$/,
    solve: (m) => ({ symbol: sym(valueOf(m[1]), valueOf(m[2])), statement: `${m[1]} ${sym(valueOf(m[1]), valueOf(m[2]))} ${m[2]}` }) },
  { name: 'order', re: /^Put (.+) in order, (smallest|biggest) first\.$/,
    solve: (m) => { const v = m[1].split(/,? and |, /).map(valueOf); if (new Set(v.map((x) => x.toFixed(9))).size < v.length) return 'two fractions are equal, so the order is not unique';
      return { order: [...v].sort((a, b) => (m[2] === 'smallest' ? a - b : b - a)) }; } },
  { name: 'more or less than half', re: /^Is (\d+\/\d+) more or less than 1\/2\?$/,
    solve: (m) => { const v = frac(m[1]); if (near(v, 0.5)) return 'equal to 1/2'; return { text: v > 0.5 ? 'More than 1/2' : 'Less than 1/2' }; } },
  { name: 'closest benchmark', re: /^Is (\d+\/\d+) closest to 0, 1\/2,? (?:or )?1(?:,? or 2)?\?$/,
    solve: (m, item) => { const v = frac(m[1]); const marks = /or 2\?$/.test(item.prompt) ? [0, 0.5, 1, 2] : [0, 0.5, 1];
      const dist = marks.map((x) => Math.abs(x - v)); const best = Math.min(...dist);
      if (dist.filter((x) => near(x, best)).length > 1) return `${m[1]} is halfway between two benchmarks`;
      return { value: marks[dist.indexOf(best)] }; } },
  { name: 'make it, then place it', re: /^Make (\d+\/\d+)\. Is it near 0, 1\/2 or 1\?$/, solve: (m) => ({ value: frac(m[1]) }) },
  { name: 'more or less than half (pick)', re: /^Which is (more|less) than 1\/2[:,] (\d+\/\d+) or (\d+\/\d+)\?(?: Make it\.)?$/,
    solve: (m) => { const fit = [m[2], m[3]].filter((x) => (m[1] === 'more' ? frac(x) > 0.5 : frac(x) < 0.5));
      if (fit.length !== 1) return `${fit.length} of the two are ${m[1]} than 1/2`; return { value: frac(fit[0]) }; } },
  { name: 'closer to 0 or 1', re: /^Which is closer to (0|1): (\d+\/\d+) or (\d+\/\d+)\?$/,
    solve: (m) => { const t = N(m[1]); const [a, b] = [frac(m[2]), frac(m[3])];
      if (near(Math.abs(a - t), Math.abs(b - t))) return 'both are equally close'; return { value: Math.abs(a - t) < Math.abs(b - t) ? a : b }; } },
  { name: 'closer to half', re: /^Which is closer to 1\/2: (\d+\/\d+) or (\d+\/\d+)\?(?: Make it\.)?$/,
    solve: (m) => { const [a, b] = [frac(m[1]), frac(m[2])]; const [da, db] = [Math.abs(a - 0.5), Math.abs(b - 0.5)];
      if (near(da, db)) return 'both are equally close'; return { value: da < db ? a : b }; } },
  { name: 'closest to half (choices)', re: /^Which (?:fraction )?is closest to 1\/2\?$/,
    solve: (_m, item) => { const v = (item.choices ?? []).map(valueOf); const d = v.map((x) => Math.abs(x - 0.5)); const best = Math.min(...d);
      if (d.filter((x) => near(x, best)).length > 1) return 'two choices are equally close'; return { value: v[d.indexOf(best)] }; } },
  { name: 'estimate against 1', re: /^Without finding the exact (sum|difference), compare (\d+\/\d+) ([+−]) (\d+\/\d+) with 1: __ 1\.$/,
    solve: (m) => { const t = frac(m[2]) + (m[3] === '+' ? 1 : -1) * frac(m[4]); if (near(t, 1)) return 'exactly 1';
      return { symbol: t < 1 ? '<' : '>', statement: `${m[2]} ${m[3]} ${m[4]} ${t < 1 ? '<' : '>'} 1` }; } },
  { name: 'scaling', re: /^(?:Move the (?:scale )?slider to \d+\/\d+\. |Bolt sets his machine\. )?Without multiplying, compare (\d+)\/(\d+) × (\d+) with \3: __ \3\.$/,
    solve: (m) => { const s = sym(N(m[1]) / N(m[2]), 1); return { symbol: s, statement: `${m[1]}/${m[2]} × ${m[3]} ${s} ${m[3]}` }; } },
  { name: 'spot the mistake: compare claim', re: /^\w+ says (\d+\/\d+) is bigger than (\d+\/\d+)(?: because .+)?\. Is that right\?(?: Answer yes or no\.)?$/,
    solve: (m) => ({ yes: frac(m[1]) > frac(m[2]) }) },
  { name: 'spot the mistake: equal claim', re: /^\w+ says (\d+\/\d+) = (\d+\/\d+)\. Is that right\?(?: Answer yes or no\.)?$/,
    solve: (m) => ({ yes: near(frac(m[1]), frac(m[2])) }) },
  { name: 'spot the mistake: sum claim', re: /^\w+ says (\d+\/\d+) ([+−]) (\d+\/\d+) = (\d+ \d+\/\d+|\d+\/\d+)\. (?:Is that right|Does that make sense)\?(?: Answer yes or no\.)?$/,
    solve: (m) => ({ yes: near(frac(m[1]) + (m[2] === '+' ? 1 : -1) * frac(m[3]), valueOf(m[4])) }) },

  // --- adding, subtracting, multiplying, dividing
  { name: 'add/subtract', re: /^(?:Rename: .+?\. Then )?(?:What is )?(\d+\/\d+) ([+−]) (\d+\/\d+)(?: = \?|\?)$/,
    solve: (m) => ({ value: frac(m[1]) + (m[2] === '+' ? 1 : -1) * frac(m[3]) }) },
  { name: 'mixed add/subtract', re: /^(?:Rename: .+?\. Then )?(\d+) (\d+\/\d+) ([+−]) (?:(\d+) )?(\d+\/\d+) = \?$/,
    solve: (m) => ({ value: N(m[1]) + frac(m[2]) + (m[3] === '+' ? 1 : -1) * (N(m[4] ?? 0) + frac(m[5])) }) },
  { name: 'spot the mistake: fix a sum', re: /^\w+ says (\d+\/\d+) ([+−]) (\d+\/\d+) = \S+?\. What is the right answer\?(?: Use (\w+)\.)?$/,
    solve: (m) => ({ value: frac(m[1]) + (m[2] === '+' ? 1 : -1) * frac(m[3]), denominator: m[4] ? UNIT_WORD[m[4]] : undefined }) },
  { name: 'spot the mistake: fix a product', re: /^\w+ says (\d+) × (\d+\/\d+) = \S+?\. What is the right answer\?$/,
    solve: (m) => ({ value: N(m[1]) * frac(m[2]) }) },
  { name: 'spot the mistake: fix a mixed number', re: /^\w+ says (\d+\/\d+) = (\d+ \d+\/\d+)\. What is the right answer\?$/,
    solve: (m) => ({ value: frac(m[1]), form: 'mixed' }) },
  { name: 'spot the mistake: fix half of', re: /^\w+ says half of (\d+\/\d+) is \S+?\. What is the right answer\?$/,
    solve: (m) => ({ value: frac(m[1]) / 2 }) },
  { name: 'spot the mistake: fix an equivalence', re: /^\w+ says (\d+\/\d+) = \d+\/\d+ because .+\. What is the right answer\? Use (\w+)\.$/,
    solve: (m) => ({ value: frac(m[1]), denominator: UNIT_WORD[m[2]] }) },
  { name: 'whole × fraction', re: /^(\d+) × (\d+\/\d+) = \?$/, solve: (m) => ({ value: N(m[1]) * frac(m[2]) }) },
  { name: 'groups of unit fraction', re: /^Write (\d+) × 1\/(\d+) as one fraction\.$/, solve: (m) => ({ value: N(m[1]) / N(m[2]), denominator: N(m[2]) }) },
  { name: 'fraction of fraction', re: /^What is (\d+\/\d+) of (\d+\/\d+)\?$/, solve: (m) => ({ value: frac(m[1]) * frac(m[2]) }) },
  { name: 'make fraction of fraction', re: /^Make (\d+\/\d+) of (\d+\/\d+)\.$/, solve: (m) => ({ value: frac(m[1]) * frac(m[2]) }) },
  { name: 'fraction ÷ fraction', re: /^(\d+\/\d+) ÷ (\d+\/\d+) = \?$/, solve: (m) => ({ value: frac(m[1]) / frac(m[2]) }) },
  { name: 'whole ÷ whole', re: /^(\d+) ÷ (\d+) = \?$/, solve: (m) => ({ value: N(m[1]) / N(m[2]) }) },
  { name: 'scoops into cups', re: /^How many 1\/(\d+) cup scoops fill (\d+) cups?\?$/, solve: (m) => ({ value: N(m[1]) * N(m[2]) }) },
  { name: 'scoops into a fraction of a cup', re: /^How many (\d+\/\d+) cup scoops fill (\d+\/\d+) cup\?$/, solve: (m) => ({ value: frac(m[2]) / frac(m[1]) }) },
  { name: 'parts past one whole', re: /^How many (\w+) past one whole is (\d+)\/(\d+)\?$/, solve: (m) => ({ value: N(m[2]) - N(m[3]) }) },
  { name: 'another way to make it', re: /^Is ((?:\d+\/\d+)(?: \+ \d+\/\d+)+) another way to make (\d+\/\d+)\?(?: Answer yes or no\.)?$/, solve: (m) => ({ yes: near(sumOf(m[1]), frac(m[2])) }) },
  { name: 'unit parts in a fraction', re: /^How many 1\/(\d+) parts make (\d+)\/\1\?$/, solve: (m) => ({ value: N(m[2]) }) },
  { name: 'garden area', re: /^(?:A rectangular garden is|Build|A rectangle is) (\d+) (\d+\/\d+)(?: meters by | × | units by )(\d+) (\d+\/\d+)(?: meters\. What is its area\?| square units\.| units\. Build its area\.)$/,
    solve: (m) => ({ value: (N(m[1]) + frac(m[2])) * (N(m[3]) + frac(m[4])) }) },
  { name: 'grid overlap area', re: /^A rectangular [\w ]+ is (1|\d\/3) unit by (\d)\/4 unit\. Color the overlapping area on the 3-by-4 grid\. What is its area in square units\?$/,
    solve: (m) => ({ value: (m[1] === '1' ? 1 : frac(m[1])) * N(m[2]) / 4, denominator: 12 }) },
  { name: 'share a unit fraction', re: /^(\d+) children share 1\/(\d+) of a pan equally\. What fraction of the whole pan does each child get\?$/,
    solve: (m) => ({ value: 1 / N(m[2]) / N(m[1]) }) },

  // --- fractions of amounts and stories
  { name: 'fraction × whole', re: /^(\d+\/\d+) × (\d+) = \?$/, solve: (m) => ({ value: frac(m[1]) * N(m[2]) }) },
  { name: 'fraction of a group, written with ×', re: /^(\d+\/\d+) of (\d+) \w+ are \w+\. Solve \1 × \2 to find how many are \w+\.$/, solve: (m) => ({ value: frac(m[1]) * N(m[2]) }) },
  { name: 'fraction of a number', re: /^What is (\d+)\/(\d+) of (\d+)(?: [a-z]+)?\?$/, solve: (m) => ({ value: N(m[3]) / N(m[2]) * N(m[1]) }) },
  { name: 'cut a length and pick parts (build)', re: /^A (?:ribbon|rope) is (\d+) meters long\. (?:Cut it into (\d+) equal parts\. Pick (\d+) parts|Show (\d+)\/(\d+) of it)\.$/,
    solve: (m, item) => { if (item.target?.total !== undefined && item.target.total !== N(m[1])) return `the set has ${item.target.total}, not ${m[1]}`;
      return { value: m[2] ? N(m[3]) / N(m[2]) : N(m[4]) / N(m[5]) }; } },
  { name: 'write in hundredths (build)', re: /^Write (\d+\/\d+) in hundredths(?: to find its percent)?\. Make it\.$/, solve: (m) => ({ value: frac(m[1]), denominator: 100 }) },
  { name: 'fraction of a box', re: /^A box has (\d+) (\w+)\. How many \2 are in (\d+)\/(\d+) of the box\?$/, solve: (m) => ({ value: N(m[1]) / N(m[4]) * N(m[3]) }) },
  { name: 'equal groups', re: /^(\d+) (\w+) are shared into (\d+) equal groups\. How many \2 are in (one|\d+) groups?\?$/,
    solve: (m) => ({ value: N(m[1]) / N(m[3]) * (m[4] === 'one' ? 1 : N(m[4])) }) },
  { name: 'ribbon fraction of length', re: /^A ribbon is (\d+) (?:meters|m) long\. How long is (\d+)\/(\d+) of it\?$/, solve: (m) => ({ value: N(m[1]) / N(m[3]) * N(m[2]) }) },
  { name: 'share part of a thing', re: /^(\d+\/\d+) of a (\w+) is shared fairly by (\d+) friends\. What part of the whole \2 does each friend get\?$/,
    solve: (m) => ({ value: frac(m[1]) / N(m[3]) }) },
  { name: 'fair share', re: /^(\d+) (?:loaf is|loaves are|pizza is|pizzas are) shared fairly by (\d+) (?:friends|stage helpers)\. (?:How much (?:pizza )?does each (?:friend|helper) get\?|Build how much one friend gets\.)$/,
    solve: (m) => ({ value: N(m[1]) / N(m[2]) }) },
  { name: 'friends share pieces', re: /^(?:(\d+) friends share (\d+) equal pieces fairly|Chomp cut an? [\w’ -]+ into (\d+) equal pieces\. (\d+) friends share them fairly)\. How many pieces does each friend get\?$/,
    solve: (m) => (m[1] ? { value: N(m[2]) / N(m[1]) } : { value: N(m[3]) / N(m[4]) }) },
  { name: 'friends share a bar', re: /^(\d+) friends share this bar fairly\. Shade one friend's share\. What fraction is it\?$/, solve: (m) => ({ value: 1 / N(m[1]) }) },
  { name: 'chance', re: /^A bag has (\d+) marbles\. (\d+) (?:is|are) green\. What is the chance of picking green\?$/, solve: (m) => ({ value: N(m[2]) / N(m[1]), denominator: N(m[1]) }) },
  { name: 'spinner chance', re: /^A spinner has (\d+) equal parts\. (\d+) (?:is|are) \w+\. Make the chance of \w+\.$/, solve: (m) => ({ value: N(m[2]) / N(m[1]) }) },
  { name: 'take away, then add', re: /^A jug has (\d+\/\d+) liter\. Sam drinks (\d+\/\d+) liter, then adds (\d+\/\d+) liter\. (?:How much is in the jug now\?|Make what is in the jug now\.)$/,
    solve: (m) => ({ value: frac(m[1]) - frac(m[2]) + frac(m[3]) }) },
  { name: 'add, then compare', re: /^Ana ran (\d+\/\d+) mile and then (\d+\/\d+) mile\. Ben ran (\d+\/\d+) mile\. How much farther did Ana run\?$/,
    solve: (m) => ({ value: frac(m[1]) + frac(m[2]) - frac(m[3]) }) },
  { name: 'what is left (two parts)', re: /^(?:(\d+\/\d+) of a garden is planted\. Then (\d+\/\d+) more is planted\. How much is still empty\?|Mia reads (\d+\/\d+) of a book on Monday and (\d+\/\d+) on Tuesday\. How much is left to read\?)$/,
    solve: (m) => ({ value: 1 - frac(m[1] ?? m[3]) - frac(m[2] ?? m[4]) }) },
  { name: 'not painted yet', re: /^(\d+\/\d+) of a (?:box|wall|fence|room) is painted\. What fraction is not painted yet\?$/, solve: (m) => ({ value: 1 - frac(m[1]) }) },
  { name: 'part of the rest (count)', re: /^Ana has (\d+) stickers\. She gives (?:away )?(\d+\/\d+) of them(?: to Ben)?\. Then she gives (?:away )?(\d+\/\d+) of the rest(?: to Cal)?\. How many (?:are left|stickers does Ana have now)\?$/,
    solve: (m) => ({ value: N(m[1]) * (1 - frac(m[2])) * (1 - frac(m[3])) }) },
  { name: 'part of the rest (fraction)', re: /^Max eats (\d+\/\d+) of a pizza\. Then he eats (\d+\/\d+) of what is left\. What fraction of the pizza is left now\?$/,
    solve: (m) => ({ value: (1 - frac(m[1])) * (1 - frac(m[2])) }) },
  { name: 'find the whole', re: /^(?:(\d+) stickers are (\d+\/\d+) of (?:Ana's stickers|a pack)\. How many stickers (?:does Ana have|are in the pack)\?|A piece of ribbon is (\d+) meters long\. It is (\d+\/\d+) of the whole ribbon\. How many meters long is the whole ribbon\?|Tom read (\d+) pages\. That is (\d+\/\d+) of his book\. How many pages are in the book\?)$/,
    solve: (m) => { const part = N(m[1] ?? m[3] ?? m[5]); const f = frac(m[2] ?? m[4] ?? m[6]); return { value: part / f }; } },
  { name: 'recipe batches', re: /^A recipe uses (\d+\/\d+) cup of flour\. (?:You make (\d+) batches\. How much flour do you need\?|How much flour do (\d+) batches need\?)$/,
    solve: (m) => ({ value: frac(m[1]) * N(m[2] ?? m[3]) }) },
  { name: 'two amounts together', re: /^(?:A (?:board|ribbon) is (\d+\/\d+) (?:meter|m)\.? (?:Another is|and another is) (\d+\/\d+) (?:meter|m)\. How (?:long are they together|many meters (?:long together|in all))\?|A recipe uses (\d+\/\d+) cup and another (\d+\/\d+) cup\. How much in all\?|Sam walks (\d+\/\d+) mile, then (\d+\/\d+) mile more\. How far in all\?|A jug has (\d+\/\d+) liter\. You add (\d+\/\d+) liter\. How many liters now\?|Make (\d+\/\d+) meter \+ (\d+\/\d+) meter\.)$/,
    solve: (m) => { const v = m.slice(1).filter(Boolean); return { value: frac(v[0]) + frac(v[1]) }; } },
  { name: 'add or cut a length', re: /^A (?:piece of tape|paper strip|ribbon|rope) is (\d+ \d+\/\d+|\d+\/\d+) meters? long\. (Add|Cut off) (\d+\/\d+) meter(?: more)?\. How (?:long is it now|much is left)\?$/,
    solve: (m) => ({ value: valueOf(m[1]) + (m[2] === 'Add' ? 1 : -1) * frac(m[3]) }) },
  { name: 'frog jumps', re: /^A frog makes (\d+) jumps?\. Each jump is (\d+\/\d+) meter\. How far did it go\?$/, solve: (m) => ({ value: N(m[1]) * frac(m[2]) }) },
  { name: 'jumps of a unit', re: /^(?:(\d+) jumps of 1\/(\d+) make what fraction\?|Each jump is 1\/(\d+)\. What is (\d+) jumps from 0\?)$/,
    solve: (m) => (m[1] ? { value: N(m[1]) / N(m[2]) } : { value: N(m[4]) / N(m[3]) }) },
  { name: 'unit parts together', re: /^Put (\d+) parts of 1\/(\d+) together\. Build the total\.$/, solve: (m) => ({ value: N(m[1]) / N(m[2]) }) },
  // Coins: a dime is 1/10 (10/100) of a dollar, a penny 1/100.
  { name: 'dimes and pennies', re: /^(?:\w+ has )?(\d+) dimes?(?: and (\d+) penn(?:y|ies))?\. What part of a dollar is that(?:, in hundredths)?\?$/,
    solve: (m) => ({ value: (10 * N(m[1]) + N(m[2] ?? 0)) / 100, denominator: 100 }) },
  { name: 'tenths of a dollar in hundredths', re: /^Write (\d+)\/10 of a dollar in hundredths\.$/, solve: (m) => ({ value: N(m[1]) / 10, denominator: 100 }) },
  { name: 'tenths and hundredths of a dollar', re: /^(\d+)\/10 \+ (\d+)\/100 of a dollar\. How much is that in hundredths\?$/,
    solve: (m) => ({ value: N(m[1]) / 10 + N(m[2]) / 100, denominator: 100 }) },
  { name: 'coins as hundredths (build)', re: /^Make (\d+) dimes?(?: and (\d+) penn(?:y|ies))? as hundredths of a dollar\.$/,
    solve: (m) => ({ value: (10 * N(m[1]) + N(m[2] ?? 0)) / 100 }) },
  // Equal portions: n groups of a/b, how much in all and which whole numbers the total is between.
  { name: 'equal portions', re: /^Each \w+ (?:drinks|eats|gets|uses) (\d+\/\d+)(?: (?!of )\w+)?(?: of [\w ]+)?\. (\d+) \w+(?: come)?\. (?:How (?:much|many \w+) in all\?|Build the total\.)$/,
    solve: (m) => ({ value: N(m[2]) * frac(m[1]) }) },
  { name: 'equal portions between wholes', re: /^Each \w+ (?:drinks|eats|gets|uses) (\d+\/\d+)(?: (?!of )\w+)?(?: of [\w ]+)?\. (\d+) \w+\. (?:Between which two whole numbers is the total\?|The total is between two whole numbers\. What is the bigger one\?)$/,
    solve: (m) => { const t = N(m[2]) * frac(m[1]); if (near(t, Math.round(t))) return 'the total is a whole number';
      return m[0].endsWith('bigger one?') ? { value: Math.ceil(t) } : { text: `${Math.floor(t)} and ${Math.floor(t) + 1}` }; } },
  // A length on a line marked in eighths, and two lengths together.
  { name: 'length on an eighths line (build)', re: /^A \w+ is (\d+\/\d+) inch long\. Show it on a line marked in eighths\.$/, solve: (m) => ({ value: frac(m[1]) }) },
  { name: 'two lengths together (build)', re: /^Two \w+ are (\d+\/\d+) and (\d+\/\d+) inch\. Show how long they are together\.$/, solve: (m) => ({ value: frac(m[1]) + frac(m[2]) }) },
  { name: 'line plot count', re: /^(?:Plot these|The line plot shows these) ribbon lengths: (.+) inch\. How many ribbons are (\d+\/\d+) inch long\?$/,
    solve: (m) => ({ value: m[1].split(', ').filter((x) => near(frac(x), frac(m[2]))).length }) },
  // Read a line plot: the values are only in the picture.
  { name: 'line plot read (picture)', re: /^The line plot (?:on [\w’ ]+ )?shows [\w ]+ lengths in eighths of an inch\. (?:What is the difference between the longest and shortest|How many [\w ]+ are (\d+\/\d+) inch long|How long are all the (\d+\/\d+) inch [\w ]+ together)\?$/,
    solve: (m, item) => { const plot = (item.pictures ?? []).find((x) => x.kind === 'lineplot');
      if (!plot || plot.kind !== 'lineplot') return 'no line plot';
      const v = plot.values.map((t) => t / plot.denominator); const at = (x: string) => v.filter((y) => near(y, frac(x))).length;
      if (m[1]) return { value: at(m[1]) };
      if (m[2]) return { value: at(m[2]) * frac(m[2]) };
      return { value: Math.max(...v) - Math.min(...v) }; } },
  { name: 'line plot difference', re: /^(?:(?:Plot these|The line plot shows these) [\w ]+ lengths in eighths|Rain fell on \d+ days): (.+) inch\. (?:What is the difference between the longest and shortest|How much more rain fell on the wettest day than the driest)\?$/,
    solve: (m) => { const v = m[1].split(', ').map(frac); return { value: Math.max(...v) - Math.min(...v) }; } },
  // Plot in eighths: the lengths are in the question, so the plot is worked out from them.
  { name: 'line plot how many more', re: /^(?:(?:Plot these|The line plot shows these) [\w ]+ lengths in eighths|[A-Z]\w+): (.+) inch\. (?:Plot them\. )?How many more Xs are at (\d+\/\d+) than at (\d+\/\d+)\?$/,
    solve: (m) => { const v = m[1].split(', ').map(frac); const at = (x: string) => v.filter((y) => near(y, frac(x))).length; return { value: at(m[2]) - at(m[3]) }; } },
  { name: 'line plot longer than (quarters)', re: /^The line plot shows \w+ lengths: ([\d/ ,]+) inches\. How many \w+ are longer than ([\d/ ]+) inches\?$/,
    solve: (m) => ({ value: m[1].split(', ').map(valueOf).filter((y) => y > valueOf(m[2]) && !near(y, valueOf(m[2]))).length }) },
  { name: 'line plot longer than', re: /^(?:(?:Plot these|The line plot shows these) [\w ]+ lengths in eighths|[A-Z]\w+): (.+) inch\. (?:Plot them\. )?How many (?:\w+ )?are longer than (\d+\/\d+) inch\?$/,
    solve: (m) => ({ value: m[1].split(', ').map(frac).filter((y) => y > frac(m[2]) && !near(y, frac(m[2]))).length }) },
  { name: 'line plot two shortest', re: /^(?:(?:Plot these|The line plot shows these) [\w ]+ lengths in eighths|[A-Z]\w+): (.+) inch\. (?:Plot them\. )?How long are the two shortest together\?$/,
    solve: (m) => { const v = m[1].split(', ').map(frac).sort((a, b) => a - b); return { value: v[0] + v[1] }; } },
  { name: 'line plot most marks', re: /^[A-Z]\w+: (.+) inch\. Plot them\. Which length has the most Xs\?$/,
    solve: (m) => { const v = m[1].split(', '); const count = (x: string) => v.filter((y) => near(frac(y), frac(x))).length;
      const top = Math.max(...v.map(count)); const most = [...new Set(v)].filter((x) => count(x) === top);
      return most.length === 1 ? { value: frac(most[0]) } : 'two lengths tie for the most Xs'; } },
  // Line plot totals: every X's amount added, or one stack's total minus another's.
  { name: 'line plot total', re: /^(?:The line plot shows [\w ]+ (?:in|on) \d+ \w+|Plot these \w+ in eighths of a liter|(?:Beakers|Cups) hold): (.+) (?:liter|inch)\. (?:How much [\w ]+ in all\?|Show the total on a line\.)$/,
    solve: (m) => ({ value: m[1].split(/, | and /).map(frac).reduce((a, b) => a + b, 0) }) },
  { name: 'line plot total (build)', re: /^(?:Beakers|Cups) hold (.+) liter\. Show the total on a line\.$/,
    solve: (m) => ({ value: m[1].split(/, | and /).map(frac).reduce((a, b) => a + b, 0) }) },
  { name: 'line plot stack difference', re: /^(?:The line plot shows [\w ]+ in \d+ \w+|Plot these \w+ in eighths of a liter): (.+) liter\. How much more do all the (\d+\/\d+) \w+ hold together than all the (\d+\/\d+) \w+ together\?$/,
    solve: (m) => { const v = m[1].split(', ').map(frac); const stack = (x: string) => v.filter((y) => near(y, frac(x))).reduce((a, b) => a + b, 0);
      return { value: stack(m[2]) - stack(m[3]) }; } },
  // Two-step conversions: a mixed number of big units in small units, then take away or add.
  { name: 'convert, then add or take away', re: /^A \w+ (?:is|holds) (\d+ \d+\/\d+) (feet|hours|liters|meters|pounds)(?: long| of \w+)?\. (?:Pip|The first part) (cuts off|takes out|takes|pours out|adds) (\d+) (inches|minutes|milliliters|centimeters|ounces)\. How many \5 (?:are left|long is it now|are in the \w+ now)\?$/,
    solve: (m) => { const per = { feet: 12, hours: 60, liters: 1000, meters: 100, pounds: 16 }[m[2] as 'feet']; const start = valueOf(m[1]) * per;
      return { value: m[3] === 'adds' ? start + N(m[4]) : start - N(m[4]) }; } },
  { name: 'feet in inches (build)', re: /^A (?:ribbon|rope) is (\d+ \d+\/\d+) feet long\. Show it in inches(?:, 12 to a foot|: each bar is 1 foot of 12 inches)\.$/,
    solve: (m) => ({ value: valueOf(m[1]) }) },
  { name: 'feet in inches, then cut (build)', re: /^A rope is (\d+ \d+\/\d+) feet long\. Pip cuts off (\d+) inch(?:es)?\. Show what is left in inches, 12 to a foot\.$/,
    solve: (m) => ({ value: valueOf(m[1]) - N(m[2]) / 12, denominator: 12 }) },
  { name: 'line plot level', re: /^(Three|Six) [\w’ -]+ hold (.+) liter\. (?:Plot them, then share|Share) the total equally\. How many liters go in each\?$/,
    solve: (m) => { const v = m[2].split(', ').map(frac); const n = m[1] === 'Six' ? 6 : 3;
      return v.length === n ? { value: v.reduce((a, b) => a + b, 0) / n } : `${m[1].toLowerCase()} amounts named but ${v.length} listed`; } },

  // --- naming, renaming and equivalence
  { name: 'simplest form', re: /^Write (\d+\/\d+) in simplest form\.$/, solve: (m) => ({ value: frac(m[1]), simplest: true }) },
  { name: 'rename to a denominator', re: /^(?:Write (\d+\/\d+) with a denominator of (\d+)\.|A ribbon is (\d+\/\d+) colored\. Show it with a denominator of (\d+)\.|(\d+\/\d+) is marked on a line\. Which fraction with a denominator of (\d+) is at the same spot\?|Change (\d+\/\d+) into (hundredths)\.|Write (\d+)% as a fraction with a denominator of (100)\.)$/,
    solve: (m) => { const v = m.slice(1).filter(Boolean); const value = /%/.test(m[0]) ? N(v[0]) / 100 : frac(v[0]);
      return { value, denominator: v[1] === 'hundredths' ? 100 : N(v[1]) }; } },
  { name: 'percent to fraction', re: /^Write (\d+)% as a fraction\.$/, solve: (m) => ({ value: N(m[1]) / 100 }) },
  { name: 'multiply or divide top and bottom', re: /^(Multiply|Divide) the numerator and denominator of (\d+)\/(\d+) by (\d+)\. What do you get\?$/,
    solve: (m) => { const k = N(m[4]); const [t, b] = m[1] === 'Multiply' ? [N(m[2]) * k, N(m[3]) * k] : [N(m[2]) / k, N(m[3]) / k];
      if (!Number.isInteger(t) || !Number.isInteger(b)) return 'does not divide evenly'; return { text: `${t}/${b}` }; } },
  { name: 'cut every part', re: /^This bar shows (\d+)\/(\d+)\. Cut every part into (\d+)\. What is the new fraction\?$/,
    solve: (m) => ({ text: `${N(m[1]) * N(m[3])}/${N(m[2]) * N(m[3])}` }) },
  { name: 'missing number', re: /^(?:This bar shows \d+\/\d+\. )?(?:Fill the (?:blank|missing (?:numerator|denominator)):|Each triangle is 1\/8 of the square\. Two are shaded\. Fill the missing numerator:) (\S+) = (\S+?)\.?$/,
    solve: (m) => { const [l, r] = [m[1], m[2]]; const known = l.includes('?') ? r : l; const unknown = l.includes('?') ? l : r;
      const [kt, kb] = known.split('/').map(Number); const [ut, ub] = unknown.split('/');
      const value = ut === '?' ? kt / kb * N(ub) : N(ut) * kb / kt; if (!Number.isInteger(value)) return 'the missing number is not whole'; return { value }; } },
  { name: 'complete to an amount', re: /^(?:Complete|Fill the blank:) (\d+\/\d+) \+ \? = (1|\d+\/\d+)\.?$/, solve: (m) => ({ value: (m[2] === '1' ? 1 : frac(m[2])) - frac(m[1]) }) },
  { name: 'missing to one whole', re: /^How much is missing from (\d+\/\d+) to make (?:one|1) whole\?$/, solve: (m) => ({ value: 1 - frac(m[1]) }) },
  { name: 'distance from half', re: /^(?:What is (\d+)\/(\d+) (more|less) than 1\/2\?|How much more does (\d+\/\d+) need to reach half\?)$/,
    solve: (m) => (m[4] ? { value: 0.5 - frac(m[4]) } : { value: 0.5 + (m[3] === 'more' ? 1 : -1) * N(m[1]) / N(m[2]) }) },
  { name: 'same as (choices)', re: /^Which is the same as (\d+\/\d+)\?$/, solve: (m) => ({ value: frac(m[1]) }) },
  { name: 'adds up to (choices)', re: /^Which adds up to (\d+\/\d+)\?$/,
    solve: (m, item) => { const ok = (item.choices ?? []).filter((c) => near(c.split(' + ').reduce((s, x) => s + frac(x), 0), frac(m[1])));
      if (ok.length !== 1) return `${ok.length} choices add up to ${m[1]}`; return { text: ok[0] }; } },
  { name: 'wholes and a fraction', re: /^(?:What is (\d+)\/(\d+) as wholes and a fraction\?|Write (\d+)\/(\d+) as wholes and a fraction\.)$/,
    solve: (m) => { const [t, b] = m[1] ? [N(m[1]), N(m[2])] : [N(m[3]), N(m[4])]; return { value: t / b, form: 'mixed' }; } },
  { name: 'mixed to improper', re: /^(?:What is (\d+) and (\d+)\/(\d+) as (\w+)\?|Write (\d+) (\d+)\/(\d+) as a single fraction\.)$/,
    solve: (m) => { const [w, t, b] = m[1] ? [N(m[1]), N(m[2]), N(m[3])] : [N(m[5]), N(m[6]), N(m[7])];
      if (m[4] && UNIT_WORD[m[4]] !== b) return `"${m[4]}" does not match the denominator ${b}`; return { value: w + t / b, denominator: b }; } },
  { name: 'whole number fractions', re: /^(?:How many wholes are (\d+)\/(\d+)\?|Write (\d+)\/(\d+) as a whole number\.|Write (\d+) whole bars as a fraction with a denominator of 1\.)$/,
    solve: (m) => (m[5] ? { value: N(m[5]), denominator: 1 } : { value: N(m[1] ?? m[3]) / N(m[2] ?? m[4]), form: 'whole' }) },
  { name: 'decimal to fraction', re: /^(?:What fraction is ([\d.]+)\?|Write ([\d.]+) as a fraction\.)$/,
    solve: (m) => { const t = m[1] ?? m[2]; const places = (t.split('.')[1] ?? '').length; return { value: N(t), denominator: 10 ** places }; } },
  { name: 'to decimal', re: /^Write (\d+\/\d+)(?: \+ (\d+\/\d+))? as a decimal\.$/, solve: (m) => ({ value: frac(m[1]) + (m[2] ? frac(m[2]) : 0), form: 'decimal' }) },
  { name: 'to percent', re: /^Write (\d+\/\d+) as a percent\.$/, solve: (m) => ({ value: frac(m[1]), form: 'percent' }) },
  { name: 'meter strip decimal', re: /^A meter strip has (10|100) equal parts\. (\d+) (?:is|are) colored\. Write the colored part as a decimal\.$/, solve: (m) => ({ value: N(m[2]) / N(m[1]), form: 'decimal' }) },
  { name: 'unit conversion', re: /^How many (\w+) are in (\d+\/\d+) (\w+)\?$/,
    solve: (m) => { const per = PER[`${m[1]}/${m[3]}`]; if (!per) return `no unit table for ${m[1]}/${m[3]}`; return { value: per * frac(m[2]) }; } },
  { name: 'measure story', re: /^(?:A (?:bottle has|bag weighs) (\d+\/\d+) (liter|kilogram)\. How many (?:milliliters|grams) (?:is that)\?|A (\d+)-(kilogram bag|liter jug) is (\d+\/\d+) full\. How many (?:grams|milliliters) (?:are in it|are inside)\?)$/,
    solve: (m) => (m[1] ? { value: 1000 * frac(m[1]) } : { value: 1000 * N(m[3]) * frac(m[5]) }) },
  { name: 'meaning of the denominator', re: /^In (\d+)\/(\d+), what does the \2 mean\?$/, solve: (m) => ({ text: `${m[2]} equal parts in all` }) },
  { name: 'one part of a whole', re: /^A whole is cut into (\d+) equal parts\. What is 1 part\?$/, solve: (m) => ({ value: 1 / N(m[1]) }) },
  { name: 'one jump', re: /^0 to 1 has (\d+) equal spaces\. What is 1 jump\?$/, solve: (m) => ({ value: 1 / N(m[1]) }) },
  { name: 'spaces for a unit', re: /^How many equal spaces (?:do you need for|from 0 to 1 make) (\w+)\?$/, solve: (m) => ({ value: UNIT_WORD[m[1]] }) },
  { name: 'parts in a written fraction', re: /^In (\d+)\/(\d+), how many (?:parts are shaded|equal parts make (?:one|1) whole)\?$/,
    solve: (m, item) => ({ value: /shaded/.test(item.prompt) ? N(m[1]) : N(m[2]) }) },
  { name: 'count unit parts', re: /^Tap each 1\/(\d+) part to count it\. How many 1\/\1 parts make (?:one|1) whole\?$/, solve: (m) => ({ value: N(m[1]) }) },

  // --- dividing with the ÷ sign, sharing and fitting
  { name: 'scoops with a division', re: /^How many 1\/(\d+)-cup scoops fill (\d+) cups?\? (\d+) ÷ 1\/(\d+) = \?$/,
    solve: (m) => (m[3] !== m[2] || m[4] !== m[1] ? 'the division does not match the story' : { value: N(m[1]) * N(m[2]) }) },
  { name: 'share a unit fraction (÷)', re: /^(\d+) (?:children|friends) share 1\/(\d+) of a pan(?: of [\w’ -]+)?\. 1\/(\d+) ÷ (\d+) = \?$/,
    solve: (m) => (m[3] !== m[2] || m[4] !== m[1] ? 'the division does not match the story' : { value: 1 / N(m[2]) / N(m[1]) }) },
  { name: 'division', re: new RegExp(String.raw`^(${TERM}) ÷ (${TERM}) = \?$`), solve: (m) => ({ value: valueOf(m[1]) / valueOf(m[2]) }) },
  { name: 'division as a fraction', re: /^(?:Write|Make) (\d+) ÷ (\d+) as a fraction\.$/, solve: (m) => ({ value: N(m[1]) / N(m[2]), denominator: N(m[2]) }) },
  { name: 'between whole numbers (the bigger one)', re: /^(\d+)\/(\d+) is between two whole numbers\. What is the bigger one\?$/,
    solve: (m) => (N(m[1]) % N(m[2]) === 0 ? `${m[1]}/${m[2]} is a whole number` : { value: Math.ceil(N(m[1]) / N(m[2])) }) },
  { name: 'between which two whole numbers', re: /^Between which two whole numbers is (\d+)\/(\d+)\?$/,
    solve: (m) => { const low = Math.floor(N(m[1]) / N(m[2])); return N(m[1]) % N(m[2]) === 0 ? `${m[1]}/${m[2]} is a whole number` : { text: `${low} and ${low + 1}` }; } },
  { name: 'sharing story', re: new RegExp(String.raw`^(${TERM}) (?:pounds?|cups?|liters?) of [\w ]+ (?:is|are) shared by (\d+) friends\. (?:What fraction of an? \w+ does each get|How much does each get)\?$`),
    solve: (m) => ({ value: valueOf(m[1]) / N(m[2]) }) },
  { name: 'fitting story', re: new RegExp(String.raw`^How many (\d+\/\d+)-\w+ \w+ (?:can be filled from (${TERM}) \w+ of [\w ]+|(?:do|does) (${TERM}) \w+ of \w+ fill)\?$`),
    solve: (m) => ({ value: valueOf(m[2] ?? m[3]) / frac(m[1]) }) },
  { name: 'sharing or fitting', re: /^(.+[.?]) Is this sharing or fitting\?$/,
    // Sharing: an amount split among friends; fitting: how many pieces of a size the amount holds.
    solve: (m) => (/\bshared?\b|\bEach friend gets the same amount\b/.test(m[1]) ? { text: 'Sharing' }
      : /^How many\b|\bEach \w+ holds \d+\/\d+\b/.test(m[1]) ? { text: 'Fitting' } : 'the story is neither sharing nor fitting') },

  // --- decimals on a grid, and comparing parts of the same whole
  { name: 'hundredths in a decimal', re: /^How many hundredths is (\d*\.\d{1,2})\?$/, solve: (m) => ({ value: Math.round(N(m[1]) * 100), form: 'whole' }) },
  { name: 'which is more of two', re: /^Which is (more|less): (\S+) or (\S+)\?$/,
    solve: (m) => { const [a, b] = [valueOf(m[2]), valueOf(m[3])]; if (near(a, b)) return 'the two are equal'; return { value: (a > b) === (m[1] === 'more') ? a : b }; } },
  { name: 'same whole', re: /^(\w+) eats (\S+) of a (small |big )?pizza\. (\w+) eats (\S+) of (?:a (small|big)|the same size) pizza\. (Can you tell who eats more\?(?: Answer yes or no\.)?|Who eats more\?)$/,
    solve: (m) => { const same = !m[3] && !m[6]; if (/^Can/.test(m[7])) return { yes: same };
      if (!same) return { text: "You can't tell" }; const [a, b] = [valueOf(m[2]), valueOf(m[5])]; return near(a, b) ? { text: 'They eat the same' } : { text: a > b ? m[1] : m[4] }; } },

  // --- multiplying by a fraction: bigger, smaller or the same
  { name: 'factor against the amount (sign)', re: new RegExp(String.raw`^Without multiplying, compare (\d+)\/(\d+) × (${TERM}) with \3: __ \3\.$`),
    solve: (m) => { const s = sym(N(m[1]) / N(m[2]), 1); return { symbol: s, statement: `${m[1]}/${m[2]} × ${m[3]} ${s} ${m[3]}` }; } },
  { name: 'factor against the amount (yes or no)', re: new RegExp(String.raw`^Is (\d+)\/(\d+) × (${TERM}) (more than|less than|the same as) \3\?(?: Answer yes or no\.)?$`),
    solve: (m) => { const k = N(m[1]) / N(m[2]); return { yes: m[4] === 'more than' ? k > 1 && !near(k, 1) : m[4] === 'less than' ? k < 1 && !near(k, 1) : near(k, 1) }; } },
  { name: 'factor against the amount (words)', re: new RegExp(String.raw`^Is (\d+)\/(\d+) × (${TERM}) more or less than \3\?$`),
    solve: (m) => { const k = N(m[1]) / N(m[2]); return { text: `${near(k, 1) ? 'Equal to' : k < 1 ? 'Less than' : 'More than'} ${m[3]}` }; } },
  { name: 'which product is more or less', re: new RegExp(String.raw`^Which one is (more|less) than (${TERM})\?$`),
    solve: (m, item) => { const n = valueOf(m[2]); const fits = (item.choices ?? []).filter((c) => { const v = evaluate(c); return !near(v, n) && (m[1] === 'more' ? v > n : v < n); });
      if (fits.length !== 1) return `${fits.length} choices are ${m[1]} than ${m[2]}`; return { text: fits[0] }; } },

  // --- more forms of the same lessons (Practice more and New questions draw on these)
  { name: 'more or less than half (a full container)', re: /^A (?:jug|glass|bottle|bucket) is (\d+\/\d+) full\. Is that more or less than half\?$/,
    solve: (m) => { const v = frac(m[1]); if (near(v, 0.5)) return 'exactly half'; return { text: v > 0.5 ? 'More than half' : 'Less than half' }; } },
  { name: 'nearer one of two benchmarks', re: /^Is (\d+\/\d+) nearer (0|1\/2) or (1\/2|1)\?$/,
    solve: (m) => { const v = frac(m[1]); const [a, b] = [valueOf(m[2]), valueOf(m[3])]; const [da, db] = [Math.abs(v - a), Math.abs(v - b)];
      if (near(da, db)) return `${m[1]} is halfway between ${m[2]} and ${m[3]}`; return { text: `Nearer ${da < db ? m[2] : m[3]}` }; } },
  { name: 'rename to a named part', re: /^(Halves|Thirds|Fourths|Fifths|Sixths|Eighths|Ninths|Tenths|Twelfths) and (\w+) are different sizes\. Rename (\d+)\/(\d+) as \2\.$/,
    solve: (m) => (UNIT_WORD[m[1].toLowerCase()] !== N(m[4]) ? `"${m[1]}" does not match the denominator ${m[4]}` : { value: frac(`${m[3]}/${m[4]}`), denominator: UNIT_WORD[m[2]] }) },
  { name: 'a number that divides both', re: /^Which number divides both (\d+) and (\d+)\?$/,
    solve: (m, item) => { const fits = (item.choices ?? []).filter((c) => N(c) > 1 && N(m[1]) % N(c) === 0 && N(m[2]) % N(c) === 0);
      if (fits.length !== 1) return `${fits.length} choices divide both ${m[1]} and ${m[2]}`; return { text: fits[0] }; } },
  { name: 'colored strip: fraction colored', re: /^A strip has (\d+) equal parts\. (\d+) (?:is|are) colored\. What fraction is (not )?colored\?$/,
    solve: (m) => ({ value: (m[3] ? N(m[1]) - N(m[2]) : N(m[2])) / N(m[1]), denominator: N(m[1]) }) },
  { name: 'decimal at the dot', re: /^What decimal is at the dot\?$/,
    solve: (_m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'line'); if (!p) return 'no number line';
      const [n, d] = 'n' in p ? [p.n, p.d] : [(p as { numerator: number }).numerator, (p as { denominator: number }).denominator];
      if (d !== 10) return `the line has ${d} spaces, not tenths`; return { value: n / d, form: 'decimal' }; } },
  { name: 'colored strip: decimal', re: /^A strip has 10 equal parts\. (\d+) (?:is|are) colored\. Write the colored part as a decimal\.$/,
    solve: (m) => ({ value: N(m[1]) / 10, form: 'decimal' }) },
  { name: 'how many parts make one whole', re: /^How many (halves|thirds|fourths|fifths|sixths|eighths|tenths|twelfths) make one whole\?$/,
    solve: (m) => ({ value: UNIT_WORD[m[1]], form: 'whole' }) },
  { name: 'friends share one thing', re: /^(\d+) friends share a (?:pizza|cake|bar) fairly\. What fraction (?:of the (?:pizza|cake) )?does each friend get\?$/,
    solve: (m) => ({ value: 1 / N(m[1]), denominator: N(m[1]) }) },
  { name: 'one of the equal tiles', re: /^What fraction is 1 of (\d+) equal tiles\?$/, solve: (m) => ({ value: 1 / N(m[1]), denominator: N(m[1]) }) },

  // Find my level asks measurement skills with what the quiz can show (placement-extras.ts): a number line for a ruler, measurements in the words.
  { name: 'ruler as a number line', re: /^A ruler is marked in (halves|fourths) of an inch\. The \w+(?: \w+)? ends at the dot\. How long is the \w+(?: \w+)? in inches\?$/,
    solve: (m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'line'); if (!p) return 'no number line';
      const [n, d] = 'n' in p ? [p.n, p.d] : [(p as { numerator: number }).numerator, (p as { denominator: number }).denominator];
      if (d !== UNIT_WORD[m[1]]) return `the prompt says ${m[1]} but the line has ${d} spaces in each inch`; return { value: n / d }; } },
  { name: 'measurements in the words: difference', re: /^These \w+ lengths are (.+) inch\. What is the difference between the longest and shortest\?$/,
    solve: (m) => { const v = m[1].split(/,? and |, /).map(frac); return { value: Math.max(...v) - Math.min(...v) }; } },
  { name: 'measurements in the words: how many', re: /^These \w+ lengths are (.+) inch\. How many \w+ are (\d+\/\d+) inch long\?$/,
    solve: (m) => ({ value: m[1].split(/,? and |, /).map(frac).filter((x) => near(x, frac(m[2]))).length }) },

  // --- pick the one choice that fits (exactly one must)
  { name: 'pick: the choice that fits', re: /^Which (?:fraction |amount |number |decimal |part |sum |order )?(?:is |covers |goes |fits |equals |makes )?(.+)\?$/,
    solve: (m, item) => {
      const choices = item.choices ?? []; if (!choices.length) return SKIP;
      const test = PICK.map((p) => ({ p, m: p.re.exec(m[1]) })).find((x) => x.m);
      if (!test) return SKIP;
      const fits = choices.filter((c) => test.p.fits(c, test.m!, choices));
      if (fits.length !== 1) return `${fits.length} choices fit "${m[1]}": ${choices.join(' / ')}`;
      return { text: fits[0] };
    } },

    // --- building (the target is the answer)
  { name: 'build a fraction', re: /^(?:Build|Make) (\d+\/\d+)(?: two ways)?\.(?: Show the same amount with a bar and a number line\.)?$/, solve: (m) => ({ value: frac(m[1]) }) },
  { name: 'scale by 1 (build)', re: /^Build (\d+)\/\1 of (\d+) counters\. Is it less, the same or more\?$/, solve: () => ({ value: 1 }) },
  { name: 'scale above 1 (build)', re: /^Build (\d+\/\d+) of 1 bar\. Is it more or less than 1 bar\?$/, solve: (m) => ({ value: frac(m[1]) }) },
  { name: 'build part of a set', re: /^(?:Build (\d+)\/(\d+) of (\d+) counters\. Make \2 equal groups\.|Put (\d+) \w+ in (\d+) equal groups\. Pick (?:1\/\5|(\d+) (?:of the )?groups)\.)$/,
    solve: (m, item) => { if (m[1]) return { value: N(m[1]) / N(m[2]) }; const groups = N(m[5]); const picked = m[6] ? N(m[6]) : 1;
      if (item.target && item.target.total !== N(m[4])) return `the set has ${item.target.total} objects, not ${m[4]}`; return { value: picked / groups }; } },
  { name: 'make a unit length', re: /^A ribbon is 1\/(\d+) (?:of a meter|colored)\. Make 1\/\1\.$/, solve: (m) => ({ value: 1 / N(m[1]) }) },
  { name: 'shade parts of a tile', re: /^A tile has (\d+) equal parts\. Shade (\d+)\.$/, solve: (m) => ({ value: N(m[2]) / N(m[1]) }) },
  { name: 'expression', re: new RegExp(String.raw`^(?:(?:Make|Build|Model) )?(${EXPR})(?: = \?|\.|(?: using| in) (\w+)\.)?(?: (?:Is (?:the sum|it|the answer) .+|Make it\.?))?$`),
    solve: (m) => ({ value: evaluate(m[1]), denominator: m[2] ? UNIT_WORD[m[2]] : undefined }) },
  { name: 'make an amount', re: new RegExp(String.raw`^(?:A ribbon is (?:${TERM}) (?:of a meter|colored)\. )?(?:Make|Build|Show|Mark) (${TERM})(?: (?:as a fraction|using (\w+)|in (\w+)|with (\w+)|on the (?:number )?line))?\.(?: (?:It is more than one whole|Just one part!|Split every part|(?:Then compare|Compare) it to \S+|\S+ lands on the same spot|Does it land on \S+|How many whole bars does it fill)\??\.?)?$`),
    solve: (m) => ({ value: valueOf(m[1]), denominator: UNIT_WORD[m[2] ?? m[3] ?? m[4] ?? ''] }) },
  { name: 'make in simplest form', re: /^(?:Make (\d+\/\d+) in simplest form|A strip is (\d+\/\d+) colored\. Make it in simplest form)\.$/,
    solve: (m, item) => { if (item.target && gcd(item.target.n, item.target.d) !== 1) return `builds ${item.target.n}/${item.target.d}, not simplest`; return { value: frac(m[1] ?? m[2]) }; } },
  { name: 'show in other units', re: /^(?:Show|Make) (\d+\/\d+) (?:using|in) (\w+)\.(?: Split every part\.)?$|^A ribbon is (\d+\/\d+) colored\. Show it in (\w+)\.$/,
    solve: (m) => ({ value: frac(m[1] ?? m[3]), denominator: UNIT_WORD[m[2] ?? m[4]] }) },
  { name: 'wholes in units', re: /^Build (\d+) wholes using (\w+)\.$/, solve: (m) => ({ value: N(m[1]), denominator: UNIT_WORD[m[2]] }) },
  { name: 'mark a length', re: /^(?:Mark (\d+\/\d+) of a \w+ on the line|Mark a length of (\d+ \d+\/\d+) inches on a ruler|A [\w ]+ is (\d+ \d+\/\d+|\d+\/\d+) inch(?:es)? long\. Mark it on the ruler|Mark (\d+ and \d+\/\d+) on the number line|Mark (\d+ \d+\/\d+|\d+\/\d+|\d+) inch(?:es)? on the ruler)\.$/,
    solve: (m) => ({ value: valueOf(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]) }) },
  { name: 'distance from a benchmark (build)', re: /^(?:Use (\w+)\. )?Make (?:a fraction )?(\d+\/\d+) less than (half|one whole)\.$/,
    solve: (m) => ({ value: (m[3] === 'half' ? 0.5 : 1) - frac(m[2]), denominator: m[1] ? UNIT_WORD[m[1]] : undefined }) },
  { name: 'away from full', re: /^A jug is (\d+\/\d+) away from full\. Show how full it is\.$/, solve: (m) => ({ value: 1 - frac(m[1]) }) },
  { name: 'share a unit fraction (build)', re: /^Share 1\/(\d+) of an? \w+ (?:equally )?among (\d+) children\. Build one share\.$/, solve: (m) => ({ value: 1 / N(m[1]) / N(m[2]) }) },
  { name: 'scoops (build)', re: /^How many 1\/(\d+)(?:-cup scoops| cups) fill (\d+) cups?\? Make it(?: in \w+)?\.$/, solve: (m) => ({ value: N(m[2]), denominator: N(m[1]) }) },
  { name: 'fraction of a set (build)', re: /^(?:Build (\d+\/\d+) of (\d+)\. Is .+|Find (\d+\/\d+) of (\d+) \w+\. Make \d+ equal groups\.)$/,
    solve: (m, item) => { const total = N(m[2] ?? m[4]); if (item.target?.total !== undefined && item.target.total !== total) return `the set has ${item.target.total}, not ${total}`; return { value: frac(m[1] ?? m[3]) }; } },
  { name: 'groups (build)', re: /^(?:Put (\d+) \w+ in (\d+) equal groups\. Pick (1 group|\d+\/\d+)|Share (\d+) \w+ among (\d+) friends\. Pick 1 share)\.$/,
    solve: (m, item) => { const total = N(m[1] ?? m[4]); const groups = N(m[2] ?? m[5]); if (item.target?.total !== undefined && item.target.total !== total) return `the set has ${item.target.total}, not ${total}`;
      return { value: m[3] && m[3] !== '1 group' ? frac(m[3]) : 1 / groups }; } },
  { name: 'cut and shade (build)', re: /^(?:Cut (?:a bar|a pizza|0 to 1) into (\d+) equal (?:parts|slices|spaces)\. (?:Shade|Make) (\d+)(?: jumps?)?|A pan has (\d+) equal parts\. \d+ are eaten\. Make (\d+)\/\3|A pizza has (\d+) equal slices\. Make one slice|A garden has (\d+) equal beds\. Plant (\d+)|Make (\d+)\/(\d+) with \w+ 1\/\9 parts)\.$/,
    solve: (m) => { if (m[1]) return { value: N(m[2]) / N(m[1]) }; if (m[3]) return { value: N(m[4]) / N(m[3]) }; if (m[5]) return { value: 1 / N(m[5]) };
      if (m[6]) return { value: N(m[7]) / N(m[6]) }; return { value: N(m[8]) / N(m[9]) }; } },
  { name: 'what is left of one whole (build)', re: /^(?:(\d+\/\d+) is used\. Make what is left of one whole|A recipe uses (\d+\/\d+) of a bag\. Make what is left)\.$/, solve: (m) => ({ value: 1 - frac(m[1] ?? m[2]) }) },
  { name: 'still empty (build)', re: /^A garden is (\d+\/\d+) planted\. Plant (\d+\/\d+) more\. Make the (?:part still empty|empty part)\.$/, solve: (m) => ({ value: 1 - frac(m[1]) - frac(m[2]) }) },
  { name: 'take away (build)', re: /^(?:A ribbon is (\d+\/\d+)(?: meter)? long\. Cut off (\d+\/\d+)(?: meter)?|A jug is (\d+\/\d+) full\. Pour out (\d+\/\d+)|A roll is (\d+ \d+\/\d+) meters long\. Cut off (\d+ \d+\/\d+) meters)\. Make what is left\.$/,
    solve: (m) => { const v = m.slice(1).filter(Boolean); return { value: valueOf(v[0]) - valueOf(v[1]) }; } },
  { name: 'add on (build)', re: /^(?:Walk (\d+ \d+\/\d+) miles, then (\d+\/\d+) mile more\. Make the total|A (?:jug|bottle) (?:has|holds) (\d+\/\d+) liter(?: of water)?\. Add (\d+\/\d+) liter\. How much is there now\?|Model (\d+\/\d+) liter plus (\d+\/\d+) liter\.)\.?$/,
    solve: (m) => { const v = m.slice(1).filter(Boolean); return { value: valueOf(v[0]) + valueOf(v[1]) }; } },
  { name: 'groups of a cup (build)', re: /^(\d+) cups each hold (\d+\/\d+) cup of juice\. Make the total\.$/, solve: (m) => ({ value: N(m[1]) * frac(m[2]) }) },
  { name: 'double a recipe (build)', re: /^A recipe uses (\d+\/\d+) cup of \w+\. Double it\. Make it in (\w+)\.$/, solve: (m) => ({ value: 2 * frac(m[1]), denominator: UNIT_WORD[m[2]] }) },
  { name: 'part of the rest (build)', re: /^(?:Spend|Eat|Pour out) (\d+\/\d+) of (?:your money|a pizza|a jug)\. Then (?:spend|eat|pour out) (\d+\/\d+) of the rest\. Make what is left\.$/,
    solve: (m) => ({ value: (1 - frac(m[1])) * (1 - frac(m[2])) }) },
  { name: 'how many fit (build)', re: /^How many (\d+\/\d+)s fit in (\d+\/\d+)\? Make \2 in (\w+)\.$/, solve: (m) => ({ value: frac(m[2]), denominator: UNIT_WORD[m[3]] }) },
  { name: 'find the whole (build)', re: /^(\d+) \w+ are 1\/(\d+) of an? \w+\. (?:Shade all the parts of the whole \w+|Build the whole \w+)\.$/,
    solve: (m, item) => { if (item.target?.total !== undefined && item.target.total !== N(m[1]) * N(m[2])) return `the whole should have ${N(m[1]) * N(m[2])}`; return { value: 1, denominator: N(m[2]) }; } },
  { name: 'fix a sum (build)', re: /^\w+ says (\d+\/\d+) ([+−]) (\d+\/\d+) = \S+\. Make the right answer\.$/, solve: (m) => ({ value: frac(m[1]) + (m[2] === '+' ? 1 : -1) * frac(m[3]) }) },
  { name: 'fair share (build)', re: /^(\d+) pizzas are shared fairly by (\d+) tables\. Build how much one table gets\.$/, solve: (m) => ({ value: N(m[1]) / N(m[2]) }) },
  { name: 'percent (build)', re: /^(?:(\d+) out of 100 kids said yes\. Make it|A score is (\d+)%\. Make it as a fraction|A phone is (\d+)% charged\. Make it|Make (\d+)% as a fraction)\.$/,
    solve: (m) => ({ value: N(m[1] ?? m[2] ?? m[3] ?? m[4]) / 100, denominator: 100 }) },
  { name: 'decimal (build)', re: /^(?:A battery shows|A jar is) ([\d.]+)(?: full)?\. Make it in (\w+)\.$/, solve: (m) => ({ value: N(m[1]), denominator: UNIT_WORD[m[2]] }) },
  { name: 'chance (build)', re: /^A bag has (\d+) marbles\. (\d+) (?:is|are) green\. Make the chance of green\.$/, solve: (m) => ({ value: N(m[2]) / N(m[1]) }) },
  { name: 'unit conversion (build)', re: /^Show why (\d+\/\d+) (\w+) is (\d+) (\w+)\.$/,
    solve: (m) => { const per = PER[`${m[4]}/${m[2]}`]; if (!per) return `no unit table for ${m[4]}/${m[2]}`; if (!near(per * frac(m[1]), N(m[3]))) return `${m[1]} ${m[2]} is not ${m[3]} ${m[4]}`; return { value: frac(m[1]) }; } },
  { name: 'rectangle area (build)', re: /^(?:Build the area of a rectangle that is|A rectangle is) (\d+\/\d+) unit by (\d+\/\d+) unit\.(?: Find its area\.)?$/, solve: (m) => ({ value: frac(m[1]) * frac(m[2]) }) },
  { name: 'estimate (build)', re: /^Estimate (\d+\/\d+) \+ (\d+\/\d+)\. Is it more or less than 1\?$/, solve: (m) => ({ value: frac(m[1]) + frac(m[2]) }) },
  { name: 'compare and make the bigger', re: /^Which is (bigger|longer), (\d+\/\d+) or (\d+\/\d+)(?: of an? \w+)?\?(?: Make (?:the bigger one|it)\.)?$/,
    solve: (m) => ({ value: Math.max(frac(m[2]), frac(m[3])) }) },
  { name: 'missing numerator (build)', re: /^(\d+)\/(\d+) = \?\/(\d+)\. Make it\.$/, solve: (m) => ({ value: N(m[1]) / N(m[2]), denominator: N(m[3]) }) },
  { name: 'line plot difference (build)', re: /^The shortest (?:mark|bug|pencil) is (\d+\/\d+) inch and the longest is (\d+\/\d+) inch\. Find their difference\.$/, solve: (m) => ({ value: frac(m[2]) - frac(m[1]) }) },
  { name: 'line plot mode (build)', re: /^(?:Plot the measurements (.+) inch(?:es)?|[A-Z]\w+ are (.+) inch(?:es)? long\. Mark where 2 Xs go)\.$/,
    solve: (m) => { const v = (m[1] ?? m[2]).replace(/,? and /, ', ').split(', '); const counts = new Map<string, number>(); for (const x of v) counts.set(x, (counts.get(x) ?? 0) + 1);
      const top = [...counts.entries()].filter(([, c]) => c >= 2); if (top.length !== 1) return 'no single value with 2 Xs'; return { value: valueOf(top[0][0]) }; } },
  { name: 'share equally (build)', re: /^(?:Three beakers hold (.+) liters?\. Share the total equally|Share (\d+(?: \d+\/\d+)?) liters? equally among 3 cups\. Show one cup)\.$/,
    solve: (m) => { const total = m[1] ? m[1].replace(/,? and /, ', ').split(', ').reduce((s, x) => s + valueOf(x), 0) : valueOf(m[2]); return { value: total / 3 }; } },

];

// ---------------------------------------------------------------------------------------------- pictures

const barOf = (b: { numerator: number; denominator: number } | { n: number; d: number }) => ('n' in b ? b.n / b.d : b.numerator / b.denominator);
const barValue = (p: ProofPicture): number | null => {
  if (p.kind === 'bar' && 'n' in p) return p.n / p.d;
  if (p.kind === 'bars') return p.bars.reduce((s, b) => s + barOf(b), 0);
  if (p.kind === 'area') return shadedArea(p.cut, p.shaded ?? []);
  if (p.kind === 'grid' || p.kind === 'dots') return p.shaded.length / (p.rows * p.cols);
  if (p.kind === 'decimal') return p.tenths / 10;
  return null;
};
const equalParts = (p: ProofPicture): boolean | null => {
  if (p.kind === 'area') { const a = AREA_CUTS[p.cut].map(pieceArea); return a.every((x) => near(x, a[0])); }
  if ((p.kind === 'bar' || p.kind === 'line') && 'n' in p) return !p.sizes || p.sizes.every((s) => s === p.sizes![0]);
  if (p.kind === 'partition') return p.parts.every((s) => near(s, p.parts[0]));
  return null;
};
const partCount = (p: ProofPicture): number | null => {
  if (p.kind === 'area') return AREA_CUTS[p.cut].length;
  if ((p.kind === 'bar' || p.kind === 'line') && 'n' in p) return p.d;
  if (p.kind === 'partition') return p.parts.length;
  return null;
};

/** Questions answered from the picture: shaded amounts, equal parts, counting parts, the dot on a line, rulers. */
const PICTURE_RULES: Rule[] = [
  { name: 'picture: what fraction is shaded', re: /^(?:What fraction (?:of (?:this bar model|the (?:circle|grid|tile|square|bar)|this circle) )?is shaded\?(?: Each bar is one whole\.)?|One (?:part|slice) of this (?:bar|pizza) is shaded\..*|One part is shaded\. What fraction of the whole bar is it\?|The shaded part is 1 of the equal parts\. What fraction of the bar is shaded\?|All the slices are the same size\. What fraction of the pizza is the shaded slice\?|One triangle is colored\. What fraction of the square is it\?|What fraction of the square (?:is the shaded (?:triangle|small square)|do the 2 shaded triangles cover)\?|This \w+ is on a [\w ]+\. What fraction of the \w+ is colored\?|The baker’s round [\w’ -]+ is cut into equal slices\. The colored slices get frosting\. What fraction of the [\w’ -]+ is colored\?)$/,
    solve: (_m, item) => { const p = (item.pictures ?? []).map(barValue).find((v) => v !== null);
      if (p === undefined || p === null) return 'no shaded picture to read'; return { value: p }; } },
  { name: 'picture: equal parts?', re: /^(?:Is this (?:bar|strip|square|pizza|hexagon|circle) cut into (?:equal (?:parts|\w+)|(\d+) equal (?:slices|strips)|\w+)\?|Are all the parts of this bar the same size\?|On this tile pattern, are the 4 parts of the square equal in area\?|Two small squares and two triangles fill this square\. Are all 4 parts equal in area\?|This pizza is cut into 4 slices\. Are the slices equal in area\?|These strips are long and thin\. Are they still fourths\?|Are all 4 parts of this square the same size\?)(?: Answer yes or no\.)?$/,
    solve: (m, item) => { const p = (item.pictures ?? []).find((x) => equalParts(x) !== null); if (!p) return 'no partition picture to read';
      const word = /cut into (?:equal )?(\w+)\?/.exec(item.prompt)?.[1]; const wanted = m[1] ? N(m[1]) : word && UNIT_WORD[word] ? UNIT_WORD[word] : /fourths/.test(item.prompt) ? 4 : null;
      const equal = equalParts(p)!; const count = partCount(p)!;
      return { yes: equal && (wanted === null || count === wanted) }; } },
  { name: 'picture: shaded part of a grid or dots', re: /^(?:What fraction of the (rectangle|dots) (?:is|are) shaded\?( Give it in simplest form\.)?|The big square is one whole\. What (decimal|percent) (?:shows the shaded part|is shaded)\?|These marbles are in a bag\. You pick one without looking\. What is the chance it is dark\?|Each bar is one whole\. How much is shaded in all\?)$/,
    solve: (m, item) => { const v = (item.pictures ?? []).map(barValue).find((x) => x !== null); if (v === undefined || v === null) return 'no picture';
      return { value: v, simplest: !!m[2], form: m[3] === 'decimal' ? 'decimal' : m[3] === 'percent' ? 'percent' : undefined }; } },
  { name: 'picture: which labelled bar', re: /^(?:Which bar has more than half shaded\?|The bars are the same size\. Which bar has the most shaded\?)$/,
    solve: (_m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'bars'); if (!p || p.kind !== 'bars') return 'no bars';
      const bars = p.bars as { n: number; d: number; label: string }[]; const v = bars.map((b) => b.n / b.d);
      const ok = /more than half/.test(item.prompt) ? bars.filter((_, i) => v[i] > 0.5) : bars.filter((_, i) => near(v[i], Math.max(...v)));
      if (ok.length !== 1) return `${ok.length} bars fit`; return { text: ok[0].label }; } },
  { name: 'picture: same amount on another bar', re: /^The top bar shows (\d+\/\d+)\. How many parts of the bottom bar must you shade to show the same amount\?$/,
    solve: (m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'bars'); if (!p || p.kind !== 'bars') return 'no bars';
      const [top, bottom] = p.bars as { n: number; d: number }[]; if (!near(top.n / top.d, frac(m[1]))) return 'the top bar does not show the fraction named';
      return { value: frac(m[1]) * bottom.d }; } },
  { name: 'picture: dot on a meter line', re: /^The line is 1 meter long\. A snail crawls from 0 to the dot\. How far is that\?$/,
    solve: (_m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'line') as { n: number; d: number } | undefined; if (!p) return 'no line';
      return { value: 100 * p.n / p.d }; } },
  { name: 'picture: difference of two bars', re: /^Bar A shows (\d+\/\d+)\. Bar B shows (\d+\/\d+)\. How much more of bar A is shaded\?$/,
    solve: (m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'bars'); if (!p || p.kind !== 'bars') return 'no bars';
      const [a, b] = (p.bars as { n: number; d: number }[]).map((x) => x.n / x.d); if (!near(a, frac(m[1])) || !near(b, frac(m[2]))) return 'the bars do not show the fractions named';
      return { value: a - b }; } },
  { name: 'picture: whole from a shaded part', re: /^The shaded part is (\d+) (\w+)\. How many \2 are in the whole bar\?$/,
    solve: (m, item) => { const v = (item.pictures ?? []).map(barValue).find((x) => x !== null); if (!v) return 'no bar'; return { value: N(m[1]) / v }; } },
  { name: 'picture: one colored part', re: /^One (?:triangle|strip|square) is colored\. What fraction of the (?:whole )?square is it\?$/,
    solve: (_m, item) => { const v = (item.pictures ?? []).map(barValue).find((x) => x !== null); return v === undefined || v === null ? 'no picture' : { value: v }; } },
  { name: 'picture: are they fourths?', re: /^(?:Is each part of this square one fourth of it\?|This square is cut into 4 parts\. Are they fourths\?|These parts are triangles, not squares\. Are they still fourths\?|Is this square cut into fourths\?)$/,
    solve: (_m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'area'); if (!p) return 'no square';
      return { yes: equalParts(p)! && partCount(p) === 4 }; } },
  { name: 'picture: pieces that cover a space', re: /^How many small (squares|triangles) (?:make one half of the whole square|cover the same space as the small square)\?$/,
    solve: (m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'area'); if (!p || p.kind !== 'area') return 'no square';
      const pieces = AREA_CUTS[p.cut]; const kind = m[1] === 'squares' ? 'square' : 'triangle';
      const piece = pieces.filter((x) => x.shape === kind).map(pieceArea); if (!piece.length) return `the picture has no ${kind}s`;
      if (!piece.every((x) => near(x, piece[0]))) return `the ${kind}s are not all the same size`;
      const space = /one half/.test(item.prompt) ? 0.5 : pieceArea(pieces.find((x) => x.shape === 'square')!);
      return { value: space / piece[0] }; } },
  { name: 'picture: color parts of a shape', re: /^(?:This (\w+) is on a [\w ]+|The baker’s (?:tray|round) [\w’ -]+ is cut into equal (?:strips|slices))\. Color (\d+) parts?\. What fraction of the (?:\1|[\w’ -]+) is colored\?$/,
    solve: (m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'area'); if (!p || p.kind !== 'area') return 'no shape';
      const areas = AREA_CUTS[p.cut].map(pieceArea);
      if (!areas.every((x) => near(x, areas[0]))) return 'the parts are not equal';
      return { value: N(m[2]) / areas.length }; } },
  { name: 'picture: count the parts', re: /^Tap each part to count it\. How many equal parts (?:is this bar cut into|make the whole bar)\?$/,
    solve: (_m, item) => { const p = (item.pictures ?? []).find((x) => partCount(x) !== null); if (!p) return 'no bar to count'; return { value: partCount(p)! }; } },
  { name: 'picture: dot on a line', re: /^(?:Each whole has (\d+) equal spaces\. )?What fraction is at the dot\?$/,
    solve: (m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'line'); if (!p) return 'no number line';
      const [n, d] = 'n' in p ? [p.n, p.d] : [(p as { numerator: number }).numerator, (p as { denominator: number }).denominator];
      if (m[1] && N(m[1]) !== d) return `the prompt says ${m[1]} spaces but the line has ${d}`; return { value: n / d, denominator: d }; } },
  { name: 'picture: shade and name', re: /^(?:Shade 1 part(?: of this bar)?\.(?: (\d+) parts make the whole bar\.)? What fraction (?:of the bar )?did you shade\?|Color 1 equal part of this bar\. What fraction did you color\?)$/,
    solve: (m, item) => { const p = (item.pictures ?? []).find((x) => partCount(x) !== null); const d = p ? partCount(p)! : m[1] ? N(m[1]) : null;
      if (!d) return 'no bar'; if (m[1] && p && N(m[1]) !== d) return `the prompt says ${m[1]} parts, the bar has ${d}`; return { value: 1 / d }; } },
  { name: 'picture: color part of an area', re: /^(?:On (?:the|this) [\w ]+, this \w+ is split into (\d+) equal-area [\w ]+\. Color (\d+)\. What fraction of the whole is colored\?|Color 2 of the 4 triangles\. What fraction of the square did you color\?|Color 1\/4 of the square\. Any way that works is fine\. What fraction did you color\?)$/,
    solve: (m, item) => { if (m[1]) { const p = (item.pictures ?? []).find((x) => x.kind === 'area');
        if (p && p.kind === 'area' && partCount(p) !== N(m[1])) return `the shape has ${partCount(p)} parts, not ${m[1]}`;
        if (p && !equalParts(p)) return 'the parts are not equal in area'; return { value: N(m[2]) / N(m[1]) }; }
      return { value: /2 of the 4/.test(item.prompt) ? 0.5 : 0.25 }; } },
  { name: 'picture: color in smaller pieces', re: /^Color (1\/\d+) of the square(?: using only triangles)?\. How many (eighths|triangles) did you color\?$/,
    solve: (m, item) => { const p = (item.pictures ?? []).find((x) => x.kind === 'area'); if (!p || p.kind !== 'area') return 'no square';
      const tri = AREA_CUTS[p.cut].filter((x) => x.shape === 'triangle').map(pieceArea); const piece = m[2] === 'eighths' ? 1 / 8 : tri[0];
      return { value: frac(m[1]) / piece }; } },
  { name: 'picture: ruler', re: /^The blue [\w ]+ starts at zero(?: and ends at a tick with no number)?\. Use the ruler\. How long is it in inches\?$/,
    solve: (_m, item) => { if (item.rulerEnd) return { value: item.rulerEnd.end / item.rulerEnd.denominator };
      const ruler = (item.pictures ?? []).find((x) => x.kind === 'ruler');
      return ruler && ruler.kind === 'ruler' ? { value: ruler.end / ruler.denominator } : 'no ruler'; } },
];

// ---------------------------------------------------------------------------------------------- picture agreement

/* The text rules above read a question from its words. For the adding, subtracting and comparing rules the picture is
   read too: a picture of bars may draw only amounts the question names (or its answer or a choice), it must draw the
   amounts that are compared (a benchmark may be a marked line instead), and it must draw at least one amount that is
   added or taken away. A picture left over
   from another question, or drawn for the wrong numbers, fails. */
const PICTURE_AMOUNTS: Record<string, { amounts: (m: RegExpExecArray) => number[]; all: boolean }> = {
  'add/subtract': { amounts: (m) => [frac(m[1]), frac(m[3])], all: false },
  'mixed add/subtract': { amounts: (m) => [N(m[1]) + frac(m[2]), N(m[4] ?? 0) + frac(m[5])], all: false },
  'which is bigger/smaller': { amounts: (m) => [frac(m[2]), frac(m[3])], all: true },
  'which is biggest/longest of three': { amounts: (m) => [m[2], m[3], m[4]].map(frac), all: true },
  'gap sign': { amounts: (m) => [valueOf(m[1]), valueOf(m[2])], all: true },
  'order': { amounts: (m) => m[1].split(/,? and |, /).map(valueOf), all: true },
};
/** The length of every bar a question's pictures draw. */
export const drawnBars = (pictures: ProofPicture[] = []): number[] => pictures.flatMap((p) =>
  p.kind === 'bars' ? p.bars.map((b) => ('n' in b ? b.n / b.d : b.numerator / b.denominator)) : p.kind === 'bar' && 'n' in p ? [p.n / p.d] : []);

/** Why the picture does not match the question's own numbers, or null when it does (or draws no bars). */
function pictureProblem(rule: string, m: RegExpExecArray, item: ProofItem): string | null {
  const spec = PICTURE_AMOUNTS[rule];
  const drawn = drawnBars(item.pictures);
  if (!spec || !drawn.length) return null;
  const amounts = spec.amounts(m);
  if (amounts.some((a) => !Number.isFinite(a))) return null;
  const known = [...amounts, ...[item.answer, ...(item.choices ?? [])].map((text) => (text === undefined ? NaN : valueOf(text)))];
  const foreign = drawn.find((v) => !known.some((a) => near(a, v)));
  if (foreign !== undefined) return `the picture draws a bar of ${foreign}, which the question never names`;
  // A benchmark (0, 1/2 or 1) may be the line the bars are read against instead of a bar of its own.
  // (A worksheet row, which has no choices, may draw only the first compared amount: compare-decimals rows do.)
  const every = spec.all && item.choices !== undefined;
  const needed = every ? amounts.filter((a) => ![0, 0.5, 1].some((mark) => near(a, mark))) : [];
  const missing = every ? needed.find((a) => !drawn.some((v) => near(v, a))) : amounts.some((a) => drawn.some((v) => near(v, a))) ? undefined : amounts[0];
  return missing === undefined ? null : `the picture does not draw ${missing}, an amount the question ${every ? 'compares' : 'works with'}`;
}

// ---------------------------------------------------------------------------------------------- checking

const STRIP = [/^Quick review · [^:]+: /, / Build the answer two ways\.$/, / Answer yes or no\.$/];
export function normalizePrompt(prompt: string): string {
  let p = prompt.trim();
  for (const re of STRIP) p = p.replace(re, '');
  return p;
}

const rawAnswer = (item: ProofItem) => item.answer ?? (item.choices && item.correct !== undefined ? item.choices[item.correct] : undefined);
// Measurement choices carry their unit ("15 minutes"); rules and keys check the amount.
const answerText = (item: ProofItem) => { const raw = rawAnswer(item); return raw === undefined ? raw : withoutUnit(raw); };

function check(expect: Expect, item: ProofItem, rule: string): ProofResult {
  const fail = (why: string): ProofResult => ({ ok: false, rule, why });
  // Builds: the target model is the answer.
  if (item.target) {
    if (!('value' in expect)) return { ok: true, rule };
    const v = item.target.n / item.target.d;
    if (!near(v, expect.value)) return fail(`builds ${item.target.n}/${item.target.d}, but the answer is ${expect.value}`);
    if (expect.denominator && item.target.d !== expect.denominator) return fail(`builds with denominator ${item.target.d}, asked for ${expect.denominator}`);
    return { ok: true, rule };
  }
  const answer = answerText(item);
  if (answer === undefined) return fail('no answer');
  const choices = item.choices;
  if ('value' in expect) {
    const v = valueOf(answer.replace(/^(\d+) and (\d+\/\d+)$/, '$1 $2'));
    if (!near(v, expect.value)) return fail(`answer "${answer}" = ${v}, but it is ${expect.value}`);
    if (expect.denominator && Number(/\/(\d+)$/.exec(answer)?.[1] ?? (Number.isInteger(v) ? 1 : NaN)) !== expect.denominator && !/^\d+$/.test(answer))
      return fail(`answer "${answer}" should have denominator ${expect.denominator}`);
    if (expect.simplest) { const [t, b] = answer.split('/').map(Number); if (b && gcd(t, b) !== 1) return fail(`"${answer}" is not in simplest form`); }
    if (expect.form === 'decimal' && !/^\d*\.\d+$|^\d+$/.test(answer)) return fail(`"${answer}" is not a decimal`);
    if (expect.form === 'percent' && !/%$/.test(answer)) return fail(`"${answer}" is not a percent`);
    if (expect.form === 'mixed' && expect.value > 1 && !Number.isInteger(expect.value) && !/^\d+ (?:and )?\d+\/\d+$/.test(answer)) return fail(`"${answer}" is not wholes and a fraction`);
    if (expect.form === 'whole' && !/^\d+$/.test(answer)) return fail(`"${answer}" is not a whole number`);
    if (choices) {
      const same = choices.filter((c) => near(valueOf(c.replace(/^(\d+) and (\d+\/\d+)$/, '$1 $2')), expect.value));
      if (same.length !== 1 && !expect.denominator && !expect.simplest && !expect.form) return fail(`${same.length} choices equal the answer: ${choices.join(' / ')}`);
    }
    return { ok: true, rule };
  }
  if ('text' in expect) {
    if (answer.trim() !== expect.text) return fail(`answer "${answer}", expected "${expect.text}"`);
    return { ok: true, rule };
  }
  if ('symbol' in expect) {
    const got = answer.trim();
    if (got === expect.symbol || (expect.statement && got.replace(/\s+/g, ' ') === expect.statement)) return { ok: true, rule };
    return fail(`answer "${got}", expected "${expect.statement ?? expect.symbol}"`);
  }
  if ('order' in expect) {
    const got = answer.split(/\s*[,<>]\s*/).map(valueOf);
    if (got.length !== expect.order.length || got.some((x, i) => !near(x, expect.order[i]))) return fail(`order "${answer}" is wrong`);
    return { ok: true, rule };
  }
  const yes = /^yes\b/i.test(answer.trim()); const no = /^no\b/i.test(answer.trim());
  if (!yes && !no) return fail(`"${answer}" is not yes or no`);
  if (yes !== expect.yes) return fail(`answer "${answer}", but it should be ${expect.yes ? 'yes' : 'no'}`);
  return { ok: true, rule };
}

/** Solve one question again and compare with the app. */
export function prove(item: ProofItem): ProofResult {
  const prompt = normalizePrompt(item.prompt);
  // Story mode tells a question in a scene first ("Tilly compares two routes. Pick the sign: …"). A leading sentence
  // with no numbers cannot change the math, so try the question without it too.
  const tries = [prompt];
  for (let rest = prompt, m: RegExpExecArray | null; (m = /^([^\d.?!:]*[.!:]) (.+)$/.exec(rest)); ) { rest = m[2]; tries.push(rest[0].toUpperCase() + rest.slice(1)); }
  for (const text of tries) for (const rule of [...RULES, ...PICTURE_RULES]) {
    const m = rule.re.exec(text);
    if (!m) continue;
    const expect = rule.solve(m, item);
    if (expect === SKIP) continue;
    if (typeof expect === 'string') return { ok: false, rule: rule.name, why: expect };
    if ('value' in expect && !Number.isFinite(expect.value)) return { ok: false, rule: rule.name, why: 'the question has no finite answer' };
    const checked = check(expect, item, rule.name);
    const picture = checked?.ok ? pictureProblem(rule.name, m, item) : null;
    return picture ? { ok: false, rule: rule.name, why: picture } : checked;
  }
  const key = PROOF_KEY[prompt];
  if (key !== undefined) {
    const answer = answerText(item) ?? (item.target ? `${item.target.n}/${item.target.d}` : undefined);
    return answer === key || answer === withoutUnit(key) ? { ok: true, rule: 'hand-checked key' } : { ok: false, rule: 'hand-checked key', why: `answer "${answer}", the key says "${key}"` };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------- written claims

/* Explanations, hints and feedback state sums as they go ("3/4 = 9/12", "8 − 1 − 2 = 5", "3 × 2/3 = 6/3 = 2").
   Every one is worked out again: each side of each "=" must be the same amount. Words ("3 fourths") are left alone. */
const CLAIM = new RegExp(String.raw`(?<![\d/]|\d\.)(?:${TERM})(?: [+−×÷] (?:${TERM}))*(?: = (?:${TERM})(?: [+−×÷] (?:${TERM}))*)+(?![\d/]|\.\d| [+−×÷] \?)`, 'g');
/** A sum a story character gets wrong on purpose ("Sam wrote 1/4 + 2/4 = 3/8."): the lesson is that it is not true. */
const SAID_BY = /\b(?:wrote|writes|says|said|thinks|thought)\s+$/;

/** Every written sum in a text ("3/4 = 9/12"), as written. */
export const writtenClaims = (text: string): string[] => [...text.matchAll(CLAIM)].map((m) => m[0]);
/** A count of parts after the last side ("= 70 hundredths"): the side is that many of those parts. */
const partsAfter = (text: string, end: number): number => {
  const word = /^ ([a-z]+)\b/.exec(text.slice(end))?.[1];
  return word && word in UNIT_WORD ? UNIT_WORD[word] : 1;
};

/** The written sums in a text that are not true, quoted. */
export function falseClaims(text: string): string[] {
  const wrong: string[] = [];
  for (const m of text.matchAll(CLAIM)) {
    const claim = m[0];
    if (SAID_BY.test(text.slice(0, m.index ?? 0))) continue;
    const sides = claim.split(' = ').map(evaluate);
    // "0.7 = 70 hundredths" names parts on the last side only; "1 + 2 = 3 fourths" counts the same parts all through.
    if (/[./%]/.test(claim.split(' = ')[0])) sides[sides.length - 1] /= partsAfter(text, (m.index ?? 0) + claim.length);
    if (sides.some((side) => !Number.isFinite(side))) continue;
    if (sides.some((side) => !near(side, sides[0]))) wrong.push(claim);
  }
  return wrong;
}
