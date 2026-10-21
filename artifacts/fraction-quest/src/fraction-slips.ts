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

/** [numerator, denominator] pairs for each slip, and the right amount the rule worked out. */
type Found = { right: number; slips: Amount[] };

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
  if (!m) return null;
  const result = addOrSubtract(amount(m[1])!, amount(m[3])!, m[2] === '+');
  const claimed = said && amount(said[2]);
  return claimed ? { ...result, slips: [claimed, ...result.slips] } : result;
}

/** Write a slip the way the answer is written: a fraction ("22/18"), or a mixed number ("2 7/8") when the answer is one. */
function written(slip: Amount, answer: string): string | null {
  const [top, bottom] = slip;
  if (!(bottom > 0) || !(top >= 0) || !Number.isInteger(top) || !Number.isInteger(bottom)) return null;
  if (!/^\d+ \d+\/\d+$/.test(answer.trim())) return `${top}/${bottom}`;
  const whole = Math.floor(top / bottom); const rest = top % bottom;
  return whole === 0 ? `${rest}/${bottom}` : rest === 0 ? String(whole) : `${whole} ${rest}/${bottom}`;
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
    const text = written(slip, answer); const value = slip[0] / slip[1];
    // A choice of 0 ("0/3") is never a believable answer to these questions.
    if (!text || value === 0 || [...values].some((v) => Math.abs(v - value) < 1e-9)) continue;
    values.add(value); out.push(text + unit);
  }
  return out;
}
