/* A worked "why" for the checkpoint questions whose generator only has the hint to say after a right answer (the lessons
   whose questions come from their worksheet rows: rulers, line plots, conversions, decimals, renaming). Built from the
   question's own numbers and picture, so it is true for that exact question; checked by checkpoint.test.ts (it reaches the
   right answer, one short sentence each). Returns undefined when it cannot work the question out; the hint stays then. */
import type { PracticeQuestion } from './game';

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
/** n/d written the way the worksheets write it: a whole, a fraction, or a whole and a fraction (never simplified). */
const asMixed = (n: number, d: number) => {
  const whole = Math.floor(n / d); const rest = n % d;
  return rest === 0 ? `${whole}` : whole === 0 ? `${rest}/${d}` : `${whole} ${rest}/${d}`;
};
const list = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const xs = (count: number) => (count === 1 ? '1 X' : `${count} Xs`);
const thereAre = (count: number) => (count === 0 ? 'There are no Xs' : count === 1 ? 'There is 1 X' : `There are ${count} Xs`);
const UNIT_WORDS = /\s+(?:inch|inches|hours?|minutes?|seconds?|grams?|milliliters?|centimeters?|ounces?|cups?|pounds?|liters?|meters?|feet|foot|cents?)$/;
/** The right answer without its unit word ("18 hours" is 18). */
const rightValue = (question: PracticeQuestion) => question.choices[question.correctChoice].replace(UNIT_WORDS, '').trim();
/** A number as written in a prompt ("2 3/4", "3/4" or "5") as a fraction. */
function parse(text: string): { n: number; d: number } | null {
  const mixed = text.trim().match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (mixed) { const d = Number(mixed[3]); return { n: Number(mixed[1] ?? 0) * d + Number(mixed[2]), d }; }
  const whole = text.trim().match(/^(\d+)$/);
  return whole ? { n: Number(whole[1]), d: 1 } : null;
}
const lineValues = (question: PracticeQuestion) => (question.model.kind === 'lineplot' ? { values: question.model.values, d: question.model.denominator } : null);
const countOf = (values: number[], value: number) => values.filter((v) => v === value).length;

function ruler(q: PracticeQuestion): string | undefined {
  if (q.model.kind !== 'ruler') return undefined;
  const { denominator: d, end } = q.model as { denominator: number; end: number };
  const thing = q.prompt.match(/The blue (.+?) starts at zero/)?.[1] ?? 'strip';
  const unit = end <= d ? 'inch' : 'inches';
  return `${d} short spaces make 1 inch. The ${thing} ends ${end} ${end === 1 ? 'space' : 'spaces'} from zero, so it is ${asMixed(end, d)} ${unit} long.`;
}

function linePlot(q: PracticeQuestion): string | undefined {
  const plot = lineValues(q);
  if (!plot) return undefined;
  const { values, d } = plot;
  const at = (n: number) => `${n}/${d}`;
  let m = q.prompt.match(/How many \w[\w ]* (?:are|is) (\d+)\/\d+ inch(?:es)? long\?/);
  if (m) { const t = Number(m[1]); const c = countOf(values, t); return `${thereAre(c)} above ${at(t)}, so ${c}.`; }
  m = q.prompt.match(/How many are longer than (\d+)\/\d+ inch/);
  if (m) {
    const t = Number(m[1]); const longer = values.filter((v) => v > t).sort((a, b) => a - b);
    if (!longer.length) return `No length is longer than ${at(t)}, so 0.`;
    return longer.length === 1 ? `Only ${at(longer[0])} is longer than ${at(t)}, so 1.` : `${list(longer.map(at))} are longer than ${at(t)}. That is ${longer.length}.`;
  }
  m = q.prompt.match(/How many more Xs are at (\d+)\/\d+ than at (\d+)\/\d+\?/);
  if (m) {
    const a = countOf(values, Number(m[1])); const b = countOf(values, Number(m[2]));
    return `${thereAre(a)} at ${at(Number(m[1]))} and ${xs(b)} at ${at(Number(m[2]))}. ${a} − ${b} = ${a - b}.`;
  }
  if (/two shortest together/.test(q.prompt)) {
    const [a, b] = [...values].sort((x, y) => x - y);
    return `The two shortest are ${at(a)} and ${at(b)}. ${at(a)} + ${at(b)} = ${at(a + b)}.`;
  }
  if (/difference between the longest and shortest/.test(q.prompt)) {
    const most = Math.max(...values); const least = Math.min(...values);
    return `The longest is ${at(most)} and the shortest is ${at(least)}. ${at(most)} − ${at(least)} = ${at(most - least)}.`;
  }
  m = q.prompt.match(/How long are all the (\d+)\/\d+ inch [\w ]+ together\?/);
  if (m) {
    const t = Number(m[1]); const c = countOf(values, t);
    if (c === 1) return `There is 1 X above ${at(t)}, so ${at(t)}.`;
    return `${thereAre(c)} above ${at(t)}. ${Array.from({ length: c }, () => at(t)).join(' + ')} = ${at(c * t)}.`;
  }
  m = q.prompt.match(/How much more do all the (\d+)\/\d+ (\w+) hold together than all the (\d+)\/\d+ \w+ together\?/);
  if (m) {
    const a = Number(m[1]); const b = Number(m[3]); const ta = countOf(values, a) * a; const tb = countOf(values, b) * b;
    return `The ${at(a)} ${m[2]} hold ${at(ta)} together. The ${at(b)} ${m[2]} hold ${at(tb)}. ${at(ta)} − ${at(tb)} = ${at(ta - tb)}.`;
  }
  if (/How much water in all\?/.test(q.prompt)) {
    const sum = values.reduce((s, v) => s + v, 0);
    return `Add the eighths for every X: ${values.join(' + ')} = ${sum}. That is ${at(sum)} ${sum > d ? 'liters' : 'liter'}.`;
  }
  return undefined;
}

function wholes(q: PracticeQuestion): string | undefined {
  let m = q.prompt.match(/Write (\d+) whole bars? as a fraction with a denominator of 1/);
  if (m) { const w = Number(m[1]); return `With a denominator of 1, each part is a whole bar. ${w} ${w === 1 ? 'bar makes' : 'bars make'} ${w}/1.`; }
  m = q.prompt.match(/How many wholes are (\d+)\/(\d+)\?/);
  if (m) {
    const n = Number(m[1]); const d = Number(m[2]); const k = n / d;
    if (!Number.isInteger(k)) return undefined;
    return `${d}/${d} is one whole. ${n}/${d} is ${k} ${k === 1 ? 'group' : 'groups'} of ${d}/${d}, so ${k} ${k === 1 ? 'whole' : 'wholes'}.`;
  }
  m = q.prompt.match(/Write (\d+)\/(\d+) as a whole number/);
  if (m) {
    const n = Number(m[1]); const d = Number(m[2]); const k = n / d;
    if (!Number.isInteger(k)) return undefined;
    return k === 1 ? `${n}/${d} has all ${d} parts of the whole, so it is 1.` : `${n}/${d} is ${k} groups of ${d}/${d}, so it is ${k}.`;
  }
  return undefined;
}

function decimals(q: PracticeQuestion): string | undefined {
  const m = q.prompt.match(/Compare: (\d*\.\d+) __ (\d*\.\d+)\./);
  if (!m) return undefined;
  const hundredths = (x: string) => Math.round(Number(x) * 100);
  const a = hundredths(m[1]); const b = hundredths(m[2]);
  const name = (n: number) => `${n} ${n === 1 ? 'hundredth' : 'hundredths'}`;
  const compare = a > b ? `${a} is more than ${b}` : a < b ? `${a} is less than ${b}` : 'They are the same';
  return `${m[1]} is ${name(a)}. ${m[2]} is ${name(b)}. ${compare}, so ${q.choices[q.correctChoice]}.`;
}

function money(q: PracticeQuestion): string | undefined {
  let m = q.prompt.match(/(\d+) dimes? and (\d+) (?:penny|pennies)\./);
  if (m) {
    const a = Number(m[1]); const b = Number(m[2]);
    return `${a} ${a === 1 ? 'dime is' : 'dimes are'} ${a * 10} hundredths. Add the ${b} ${b === 1 ? 'penny' : 'pennies'} to get ${a * 10 + b}/100.`;
  }
  m = q.prompt.match(/Write (\d+)\/10 of a dollar in hundredths/);
  if (m) { const n = Number(m[1]); return `${n}/10 is ${n} ${n === 1 ? 'dime' : 'dimes'}. Each dime is 10 pennies, so ${n * 10}/100.`; }
  m = q.prompt.match(/(\d+)\/10 \+ (\d+)\/100 of a dollar/);
  if (m) { const a = Number(m[1]); const b = Number(m[2]); return `${a}/10 is ${a * 10} hundredths. Add ${b} more to get ${a * 10 + b}/100.`; }
  return undefined;
}

function copies(q: PracticeQuestion): string | undefined {
  const m = q.prompt.match(/Write (\d+) × 1\/(\d+) as one fraction/);
  if (!m) return undefined;
  const k = Number(m[1]); const d = Number(m[2]);
  return `${k} copies of 1/${d} make ${k} parts of size 1/${d}. That is ${k}/${d}.`;
}

/** "How many minutes are in 2/3 hour?" and the like: the whole from the hint ("An hour is 60 minutes."), then equal groups. */
function convert(q: PracticeQuestion): string | undefined {
  const whole = q.hint.match(/^([^.]*?\b(?:is|are) (\d+) ([a-z]+))\./i);
  const part = q.prompt.match(/(\d+)\/(\d+)/);
  if (!whole || !part || !/How many \w+ (?:are|is)/.test(q.prompt)) return undefined;
  const total = Number(whole[2]); const unit = whole[3]; const n = Number(part[1]); const d = Number(part[2]);
  if (total % d) return undefined;
  const each = total / d;
  const first = `${whole[1][0].toUpperCase()}${whole[1].slice(1)}.`;
  return n === 1 ? `${first} ${total} split into ${d} equal groups is ${each} each. So ${each} ${unit}.`
    : `${first} ${total} split into ${d} equal groups is ${each} each. ${n} groups make ${n * each} ${unit}.`;
}

/** Two amounts put together ("A jug has 1/4 liter. You add 1/2 liter."). */
function addTwo(q: PracticeQuestion): string | undefined {
  const parts = [...q.prompt.matchAll(/(\d+)\/(\d+)/g)].map((m) => ({ n: Number(m[1]), d: Number(m[2]) }));
  if (parts.length !== 2 || !/together|in all|now\?/.test(q.prompt)) return undefined;
  const [a, b] = parts; const L = lcm(a.d, b.d);
  const ra = a.n * (L / a.d); const rb = b.n * (L / b.d);
  const renamed = [a, b].filter((x) => x.d !== L).map((x) => `${x.n}/${x.d} is the same as ${x.n * (L / x.d)}/${L}.`);
  const sum = ra + rb;
  const end = sum === L ? `${ra}/${L} + ${rb}/${L} = ${L}/${L}, and ${L}/${L} is 1 whole.` : `${ra}/${L} + ${rb}/${L} = ${asMixed(sum, L)}.`;
  return [...renamed, end].join(' ');
}

function portions(q: PracticeQuestion): string | undefined {
  const each = q.prompt.match(/Each \w+ gets (\d+)\/(\d+) /);
  const many = q.prompt.match(/\. (\d+) \w+\. (?:How many|The total)/);
  if (!each || !many) return undefined;
  const n = Number(each[1]); const d = Number(each[2]); const k = Number(many[1]); const total = k * n;
  if (/between two whole numbers/.test(q.prompt)) {
    if (total % d === 0) return undefined;
    const w = Math.floor(total / d);
    return `${k} groups of ${n}/${d} make ${total}/${d}. ${w * d}/${d} is ${w} and ${(w + 1) * d}/${d} is ${w + 1}, so the total is between them.`;
  }
  return `${k} × ${n} = ${total}. So ${k} groups of ${n}/${d} make ${total}/${d}.`;
}

/** "1 2/5 + 1 1/2 = ?" or "3 1/3 − 1 3/4 = ?" (a "Rename: … Then" start is skipped): rename to one denominator, trade a whole if
    the first part is too small, then add or take away. */
function unlike(q: PracticeQuestion): string | undefined {
  const sum = q.prompt.replace(/^Rename:.*?Then /, '').match(/^((?:\d+ )?\d+\/\d+) ([+−]) ((?:\d+ )?\d+\/\d+) = \?$/);
  if (!sum) return undefined;
  const split = (text: string) => { const m = text.match(/^(?:(\d+) )?(\d+)\/(\d+)$/)!; return { w: Number(m[1] ?? 0), n: Number(m[2]), d: Number(m[3]) }; };
  const x = split(sum[1]); const y = split(sum[3]); const L = lcm(x.d, y.d);
  const A = x.n * (L / x.d); const B = y.n * (L / y.d);
  const write = (w: number, n: number) => (n === 0 ? `${w}` : w === 0 ? `${n}/${L}` : `${w} ${n}/${L}`);
  const renamed = [x, y].filter((v, i) => v.d !== L && (i === 0 || v.n !== x.n || v.d !== x.d)).map((v) => `${v.n}/${v.d} is ${v.n * (L / v.d)}/${L}`);
  const lines = renamed.length ? [`${list(renamed)}.`] : [];
  if (sum[2] === '+') {
    const whole = x.w + y.w; const top = A + B;
    const done = top >= L ? `, which is ${write(whole + 1, top - L)}` : '';
    lines.push(`${write(x.w, A)} + ${write(y.w, B)} = ${write(whole, top)}${done}.`);
  } else {
    let w = x.w; let top = A;
    if (top < B) { lines.push(`Trade 1 whole: ${write(x.w, A)} is ${write(x.w - 1, A + L)}.`); w -= 1; top += L; }
    lines.push(`${write(w, top)} − ${write(y.w, B)} = ${write(w - y.w, top - B)}.`);
  }
  return lines.join(' ');
}

function scaling(q: PracticeQuestion): string | undefined {
  const m = q.prompt.match(/compare ((?:\d+ )?\d+\/\d+) × (\d+) with \2/);
  const factor = m && parse(m[1]);
  if (!m || !factor) return undefined;
  const right = q.choices[q.correctChoice];
  if (factor.n === factor.d) return `${m[1]} is 1. Multiplying by 1 keeps ${m[2]} the same, so ${right}.`;
  return factor.n < factor.d ? `${m[1]} is less than 1. Multiplying by it shrinks ${m[2]}, so ${right}.`
    : `${m[1]} is more than 1. Multiplying by it grows ${m[2]}, so ${right}.`;
}

function leveling(q: PracticeQuestion): string | undefined {
  const m = q.prompt.match(/Three \w[\w ]* hold (\d+)\/(\d+), (\d+)\/\d+, (\d+)\/\d+ liter/);
  if (!m) return undefined;
  const d = Number(m[2]); const amounts = [Number(m[1]), Number(m[3]), Number(m[4])]; const total = amounts.reduce((s, v) => s + v, 0);
  if (total % 3) return undefined;
  const each = total / 3; const right = rightValue(q);
  const same = right === `${each}/${d}` ? '' : ` ${each}/${d} is the same as ${right}.`;
  return `${amounts.map((v) => `${v}/${d}`).join(' + ')} = ${total}/${d}. In 3 equal shares, that is ${each}/${d} each.${same}`;
}

function twoStep(q: PracticeQuestion): string | undefined {
  const start = q.prompt.match(/(\d+) (\d+)\/(\d+) (feet|hours|meters|pounds)/);
  const size = q.hint.match(/1 \w+ is (\d+) (\w+)\./);
  const change = q.prompt.match(/(?:cuts off|takes out|takes|adds) (\d+) \w+/);
  if (!start || !size || !change) return undefined;
  const w = Number(start[1]); const n = Number(start[2]); const d = Number(start[3]); const unit = Number(size[1]); const small = size[2];
  if ((n * unit) % d) return undefined;
  const part = (n * unit) / d; const total = w * unit + part; const amount = Number(change[1]);
  const adds = /adds/.test(change[0]);
  const wholePart = w === 1 ? `${unit}` : `${w} × ${unit}`;
  return `${w} ${n}/${d} ${start[4]} is ${wholePart} + ${part} = ${total} ${small}. Then ${total} ${adds ? '+' : '−'} ${amount} = ${adds ? total + amount : total - amount}.`;
}

function sideArea(q: PracticeQuestion): string | undefined {
  const m = q.prompt.match(/is (1|\d+\/\d+) units? by (1|\d+\/\d+) units?\. Color the overlapping area on the (\d+)-by-(\d+) grid/);
  if (!m) return undefined;
  const grid = [Number(m[3]), Number(m[4])];
  const sides = [m[1], m[2]].map((side, i) => (side === '1' ? { n: grid[i], d: grid[i], whole: true } : { ...parse(side)!, whole: false }));
  if (sides[0].d !== grid[0] || sides[1].d !== grid[1]) return undefined;
  const lead = sides.filter((s) => s.whole).map((s) => `1 unit is ${s.d}/${s.d}.`);
  const top = sides[0].n * sides[1].n; const bottom = grid[0] * grid[1];
  return [...lead, `Multiply the tops: ${sides[0].n} × ${sides[1].n} = ${top}. Multiply the bottoms: ${grid[0]} × ${grid[1]} = ${bottom}. So the area is ${top}/${bottom}.`].join(' ');
}

function mixedArea(q: PracticeQuestion): string | undefined {
  const m = q.prompt.match(/is (\d+) (\d+)\/(\d+) meters by (\d+) (\d+)\/(\d+) meters/);
  if (!m) return undefined;
  const [w1, a, b, w2, c, d] = m.slice(1).map(Number);
  const pieces = [`${w1 * w2}`, `${w1 * c}/${d}`, `${a * w2}/${b}`, `${a * c}/${b * d}`];
  const total = w1 * w2 * b * d + w1 * c * b + a * w2 * d + a * c;
  return `Split it at the whole meters into four parts: ${list(pieces)}. Together they make ${asMixed(total, b * d)}.`;
}

const BY_LESSON: Record<string, (q: PracticeQuestion) => string | undefined> = {
  'ruler-measurement': ruler,
  'build-line-plots': linePlot,
  'plot-in-eighths': linePlot,
  'read-line-plots': linePlot,
  'line-plot-totals': linePlot,
  'whole-numbers-as-fractions': wholes,
  'compare-decimals': decimals,
  'dimes-and-pennies': money,
  'unit-fraction-multiples': copies,
  'measurement-word-problems': (q) => convert(q) ?? addTwo(q),
  'fractional-unit-conversions': convert,
  'party-portions': portions,
  'add-unlike-fractions': unlike,
  'mixed-unlike-operations': unlike,
  'multiplication-scaling': scaling,
  'line-plot-leveling': leveling,
  'two-step-conversions': twoStep,
  'fractional-side-area': sideArea,
  'multiply-mixed-numbers': mixedArea,
};

/** A worked why for this question, or undefined when the lesson has none or the question is not one it can work out. */
export function workedWhy(missionId: string, question: PracticeQuestion): string | undefined {
  return BY_LESSON[missionId]?.(question);
}
