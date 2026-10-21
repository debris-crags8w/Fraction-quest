/* Wrong answers from real mistakes, for questions whose answer is a fraction or a mixed number. The generic fallback
   offers near misses (5/13 or 6/12 for 5/12, 3 7/8 for 2 7/8), which a child rules out without thinking about
   fractions. Here each wrong answer is what a child gets by making a specific slip: adding the denominators,
   keeping one denominator, renaming only one fraction, forgetting to carry or to trade a whole. Like
   misconceptions.ts, every rule first works the question out and is used only when it gets the app's answer. */

/** An amount as numerator and denominator (2 3/5 is 13/5). */
type Amount = [number, number];
const N = Number;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

function amount(text: string): Amount | null {
  const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(text.trim());
  if (m) return [N(m[1] ?? 0) * N(m[3]) + N(m[2]), N(m[3])];
  return /^\d+$/.test(text.trim()) ? [N(text), 1] : null;
}

/** The right amount the rule worked out, and each slip: [numerator, denominator] as a child would write it, or just
    its value, written over the answer's denominator. */
type Found = { right: number; slips: (Amount | number)[] };

/** The slips for x ± y, written over the denominators a child would use. */
function addOrSubtract(x: Amount, y: Amount, add: boolean): Found {
  const L = lcm(x[1], y[1]); const xs = x[0] * (L / x[1]); const ys = y[0] * (L / y[1]);
  const [w1, a, b] = [Math.floor(x[0] / x[1]), x[0] % x[1], x[1]];
  const [w2, c, d] = [Math.floor(y[0] / y[1]), y[0] % y[1], y[1]];
  const sign = add ? 1 : -1; const wholes = w1 + sign * w2;
  /** wholes + top/bottom, over `bottom`. */
  const over = (top: number, bottom: number): Amount => [wholes * bottom + top, bottom];
  const slips: Amount[] = [
    [add ? xs - ys : xs + ys, L], // the other operation
    add ? over(a + c, b + d) : over(Math.abs(a - c), Math.abs(b - d) || b), // straight across
    over(add ? a + c : Math.abs(a - c), Math.max(b, d)), // kept one denominator
    over(add ? a * (L / b) + c : Math.abs(a * (L / b) - c), L), // renamed only the first fraction
    over(add ? a + c * (L / d) : Math.abs(a - c * (L / d)), L), // renamed only the second
    x, y, // left one part out
    // Forgot to carry the whole, or to take away the traded whole (only when there is one).
    ...((add ? a * (L / b) + c * (L / d) >= L : a * (L / b) < c * (L / d)) ? [[add ? xs + ys - L : xs - ys + L, L] as Amount] : []),
    add ? [w1 * L + a * (L / b) + c * (L / d), L] : over(Math.abs(a * (L / b) - c * (L / d)), L), // dropped a whole; or took the smaller part from the bigger
    add && b === d ? over(a * c, b) : over(a + c, 2 * b), // multiplied the tops; or added the bottoms
    add ? over(a + c, 2 * b) : [b - (a - c), b], // added the bottoms; or found what's left of the whole
    over(add ? a + c : Math.abs(a - c), b * d), // multiplied the bottoms
    over(a * (L / b), L), over(c * (L / d), L), // worked the wholes and kept only one fraction part
    ...(wholes === 0 && (add ? xs + ys : xs - ys) > 0 ? [[L, add ? xs + ys : xs - ys] as Amount] : []), // upside down
  ];
  return { right: (add ? xs + ys : xs - ys) / L, slips };
}

/** What is left of one whole after x and then y (same denominator): what was used, one part forgotten, the bottoms
    added, or the second part added back instead of taken away. */
function leftOver([a, b]: Amount, [c]: Amount): Found {
  return { right: (b - a - c) / b, slips: [[a + c, b], [b - a, b], [b - c, b], [b - a - c, 2 * b], [b - a + c, b]] };
}

const LENGTH = /^(?:A|One) (?:board|ribbon) is ([\d /]+?)(?: m| meters?)?(?:\.| and) [Aa]nother is ([\d /]+?)(?: m| meters?)?\. How (?:many meters )?long (?:are they )?together\?$/;

const value = (text: string) => { const a = amount(text)!; return a[0] / a[1]; };

/** Multiplying and dividing: whole × fraction, fraction × fraction, sharing, gardens, grid areas, leveling. */
function timesOrShare(p: string): Found | null {
  let m: RegExpExecArray | null;
  // "4 × 1/3", "Write 4 × 1/3 as one fraction.", "A recipe uses 5/12 cup of flour. How much flour do 3 batches need?":
  // both parts multiplied, added, the bottom multiplied, one batch, upside down, the tops multiplied and the bottoms added.
  if ((m = /^(?:Write )?(\d+) × (\d+)\/(\d+)(?: = \?| as one fraction\.)$|^A recipe uses (\d+)\/(\d+) cup of \w+\. (?:You make (\d+) batches\. How much \w+ do you need|How much \w+ do (\d+) batches need)\?$/.exec(p))) {
    const [n, a, b] = m[1] ? [N(m[1]), N(m[2]), N(m[3])] : [N(m[6] ?? m[7]), N(m[4]), N(m[5])];
    return { right: (n * a) / b, slips: [[n * a, n * b], [n + a, b], [a, n * b], [a, b], [b, n * a], [n * a, b + n]] };
  }
  // "3/4 × 1/2", "What is 1/3 of 1/3?": added across, kept one denominator, added the tops, added the bottoms, crossed, upside down.
  if ((m = /^(?:What is )?(\d+)\/(\d+) (?:×|of) (\d+)\/(\d+)(?: = \?|\?)$/.exec(p))) {
    const [a, b, c, d] = m.slice(1).map(N);
    return { right: (a * c) / (b * d), slips: [[a + c, b + d], [a * c, d], [a * c, b], [a + c, b * d], [a * c, b + d], [a * d, b * c], [b * d, a * c]] };
  }
  // "3 children share 1/3 of a pan. 1/3 ÷ 3 = ?": multiplied, upside down, added, not split, two shares.
  if ((m = /^(\d+) children share 1\/(\d+) of a pan\. 1\/\2 ÷ \1 = \?$/.exec(p))) {
    const [n, b] = [N(m[1]), N(m[2])];
    return { right: 1 / (b * n), slips: [[n, b], [b * n, 1], [1, b + n], [1, b], [2, b * n]] };
  }
  // "2 loaves are shared fairly by 3 friends", "5 ÷ 4", "Write 3 ÷ 8 as a fraction.": upside down, one loaf, added, one more part.
  if ((m = /^(\d+) loa(?:f is|ves are) shared fairly by (\d+) friends\. How much does each friend get\?$|^(?:Write )?(\d+) ÷ (\d+)(?: = \?| as a fraction\.)$/.exec(p))) {
    const [n, q] = m[1] ? [N(m[1]), N(m[2])] : [N(m[3]), N(m[4])];
    return { right: n / q, slips: [[q, n], [1, q], [n, n + q], [n + q, q], [1, n]] };
  }
  // A mixed-number garden: whole × whole plus part × part, the wholes only, the sides added, one side's whole only.
  if ((m = /^A rectangular garden is (\d+ \d+\/\d+) meters by (\d+ \d+\/\d+) meters\. What is its area\?$/.exec(p))) {
    const [x, y] = [value(m[1]), value(m[2])]; const [wx, wy] = [Math.floor(x), Math.floor(y)];
    return { right: x * y, slips: [wx * wy + (x - wx) * (y - wy), wx * wy, x + y, wx * y, x * wy] };
  }
  // The overlap on the 3-by-4 grid: the sides added, one side only, the whole grid, the part not colored, upside down.
  if ((m = /is (\d+(?:\/\d+)?) units? by (\d+(?:\/\d+)?) units?\. Color the overlapping area/.exec(p))) {
    const [x, y] = [value(m[1]), value(m[2])];
    return { right: x * y, slips: [x + y, x, y, 1, 1 - x * y, 1 / (x * y)] };
  }
  // Leveling three cups: the total, the biggest or smallest cup, split 2 ways, the tops shared over the cups.
  if ((m = /^Three \w+(?: \w+)? hold (\d+)\/(\d+), (\d+)\/\2, (\d+)\/\2 liter\. Share the total equally\./.exec(p))) {
    const [a, b, c, e] = m.slice(1).map(N); const t = a + c + e;
    return { right: t / (3 * b), slips: [[t, b], [Math.max(a, c, e), b], [Math.min(a, c, e), b], [t, 2 * b], [t, 3], [t / 3, b + 3]] };
  }
  // "2/3 ÷ 1/6 = ?": the tops multiplied, how many fit in one whole, the top or the bottom, multiplied instead.
  if ((m = /^(\d+)\/(\d+) ÷ (\d+)\/(\d+) = \?$/.exec(p))) {
    const [a, b, c, d] = m.slice(1).map(N);
    return { right: (a / b) / (c / d), slips: [a * d, d, b, a, [a * c, b * d]] };
  }
  return null;
}

function found(prompt: string): Found | null {
  let p = prompt.replace(/^Quick review · [^:]+: /, '').replace(/^Rename: .+?\. Then /, '');
  let m: RegExpExecArray | null;
  // "A board is 1/3 meter. Another is 1/6 meter. How long are they together?" is 1/3 + 1/6.
  if ((m = LENGTH.exec(p))) p = `${m[1]} + ${m[2]} = ?`;
  // "Mia reads 2/5 of a book on Monday and 1/5 on Tuesday. How much is left to read?", "… garden … still empty?"
  if ((m = /(\d+\/\d+) of a book on \w+ and (\d+\/\d+) on \w+\. How much is left to read\?$|^(\d+\/\d+) of a garden is planted\. Then (\d+\/\d+) more is planted\. How much is still empty\?$/.exec(p))) {
    const [x, y] = m.slice(1).filter(Boolean).map((t) => amount(t)!);
    return x[1] === y[1] ? leftOver(x, y) : null;
  }
  // "Fill the blank: 3/4 + ? = 1": the same part again, both added, upside down, or one more piece.
  if ((m = /^Fill the blank: (\d+)\/(\d+) \+ \? = 1$/.exec(p))) {
    const [a, b] = [N(m[1]), N(m[2])];
    return { right: (b - a) / b, slips: [[a, b], [a + b, b], [b, b - a], [b - a, 2 * b], [1, b]] };
  }
  // "Sam says 2/4 − 1/4 = 1/8. What is the right answer?": the answer Sam gave is the first slip.
  const said = /^\w+ says (.+) = ([\d /]+)\. What is the right answer\?$/.exec(p);
  if (said) p = `${said[1]} = ?`;
  m = /^(?:What is )?((?:\d+ )?\d+\/\d+) ([+−]) ((?:\d+ )?\d+\/\d+)(?: = \?|\?)$/.exec(p);
  const result = m ? addOrSubtract(amount(m[1])!, amount(m[3])!, m[2] === '+') : timesOrShare(p);
  if (!result) return null;
  const claimed = said && amount(said[2]);
  return claimed ? { ...result, slips: [claimed, ...result.slips] } : result;
}

/** Write a slip the way the answer is written: a fraction ("22/18"), a mixed number ("2 7/8") or a whole number when
    the answer is one. A slip given as a value is written over the answer's denominator. */
function written(slip: Amount | number, answer: string, over: number): string | null {
  const whole = /^\d+$/.test(answer.trim());
  if (typeof slip === 'number') {
    // Over the answer's denominator, or (a whole-number answer) the smallest denominator that fits.
    const v = slip; const bottom = [over, ...Array.from({ length: 36 }, (_, k) => k + 1)].find((d) => Math.abs(v * d - Math.round(v * d)) < 1e-9);
    if (!bottom) return null;
    slip = [Math.round(v * bottom), bottom];
  }
  const [top, bottom] = slip;
  if (whole && top % bottom === 0) return top > 0 ? String(top / bottom) : null;
  if (!(bottom > 0) || !(top >= 0) || !Number.isInteger(top) || !Number.isInteger(bottom)) return null;
  // Beside a whole-number answer, a slip that isn't whole is written as a mixed number too.
  if (!whole && !/^\d+ \d+\/\d+$/.test(answer.trim())) return `${top}/${bottom}`;
  const wholes = Math.floor(top / bottom); const rest = top % bottom;
  return wholes === 0 ? `${rest}/${bottom}` : rest === 0 ? String(wholes) : `${wholes} ${rest}/${bottom}`;
}

/** The answer's unit, made to agree with the amount: "3/2 pounds", "1/6 pound" ("m" stays as it is). */
function unitFor(unit: string, value: number): string {
  if (unit.trim().length < 2) return unit;
  const one = unit.endsWith('s') ? unit.slice(0, -1) : unit;
  return value > 1 ? `${one}s` : one;
}

/** Real mistakes for this question, written like its answer; empty when no rule knows the question or a rule's
    own working disagrees with the app's answer. */
export function fractionMistakes(prompt: string, writtenAnswer: string): string[] {
  // An answer with a unit ("65/100 m", "3/4 meter"): the slips carry the same unit.
  const unit = / [a-z]+$/i.exec(writtenAnswer.trim())?.[0] ?? '';
  const answer = writtenAnswer.trim().slice(0, writtenAnswer.trim().length - unit.length);
  const right = amount(answer);
  const result = found(prompt);
  if (!right || !result || Math.abs(result.right - right[0] / right[1]) > 1e-9) return [];
  const out: string[] = []; const values = new Set([right[0] / right[1]]);
  for (const slip of result.slips) {
    const text = written(slip, answer, right[1]); const value = typeof slip === 'number' ? slip : slip[0] / slip[1];
    // A choice of 0 ("0/3") is never a believable answer to these questions.
    if (!text || value === 0 || [...values].some((v) => Math.abs(v - value) < 1e-9)) continue;
    values.add(value); out.push(text + unitFor(unit, value));
  }
  return out;
}
