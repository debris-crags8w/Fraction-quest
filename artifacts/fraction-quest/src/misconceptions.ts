/* Wrong answers that come from real mistakes, for questions whose answer is a whole number. The generic fallback
   offers the answer ± 1 or 2 ("499, 500, 501"), which a child rules out without thinking about fractions. Here each
   wrong answer is what a child gets by making a specific slip: one group instead of several, the part that is left,
   the whole amount, adding instead of multiplying. Every rule first works the question out and checks it gets the
   app's answer, so a question it misreads is left as it is. Counting questions ("how many spaces for thirds?")
   keep their near misses: being off by one is the real mistake there. */
import { answerValue } from './learning-content';
import { fractionMistakes } from './fraction-slips';

const N = Number;
const PER: Record<string, number> = { 'inches/foot': 12, 'minutes/hour': 60, 'seconds/minute': 60, 'hours/day': 24, 'milliliters/liter': 1000,
  'grams/kilogram': 1000, 'centimeters/meter': 100, 'ounces/pound': 16, 'cents/dollar': 100 };
const BIG: Record<string, [string, number]> = { liter: ['milliliters', 1000], kilogram: ['grams', 1000] };

/** [right answer, slips] for the question, or null when no rule knows it. */
function slips(prompt: string): [number, number[]] | null {
  const p = prompt.replace(/^Quick review · [^:]+: /, '');
  let m: RegExpExecArray | null;
  // Equal groups: "12 beads are shared into 4 equal groups. How many beads are in 3 groups?"
  if ((m = /(\d+) \w+ are shared into (\d+) equal groups\. How many \w+ are in (one|\d+) groups?\?/.exec(p))) {
    const [n, b, k] = [N(m[1]), N(m[2]), m[3] === 'one' ? 1 : N(m[3])];
    const right = (n / b) * k;
    return [right, [k > 1 ? n / b : n - right, n - right, n, n * k]];
  }
  // Finding the whole: "15 stickers are 5/6 of a pack", "A piece of ribbon is 10 meters long. It is 5/6 of the whole ribbon",
  // "Tom read 8 pages. That is 2/3 of his book"
  if ((m = /(\d+) \w+ (?:are|is) (\d+)\/(\d+) of|is (\d+) meters long\. It is (\d+)\/(\d+) of|read (\d+) pages\. That is (\d+)\/(\d+) of/.exec(p))) {
    const v = m.slice(1).filter(Boolean).map(N); const [part, a, b] = v;
    const right = (part / a) * b;
    return [right, [part, a > 1 ? part * b : part + b, a > 1 ? part / a : part * (b - 1), part + right]];
  }
  // Part of the rest: "Ana has 24 stickers. She gives 1/4 of them … Then … 1/3 of the rest …"
  if ((m = /has (\d+) \w+\. (?:She|He) gives (?:away )?(\d+)\/(\d+) of them[^.]*\. Then (?:she|he) gives (?:away )?(\d+)\/(\d+) of the rest/.exec(p))) {
    const [t, a, b, c, e] = m.slice(1).map(N);
    const rest = t - (t / b) * a; const right = rest - (rest / e) * c;
    return [right, [rest, t - (t / b) * a - (t / e) * c, (t / b) * a, (rest / e) * c]];
  }
  // A fraction of a group or a length: "What is 2/3 of 9 pencils?", "40 snacks … What is 2/10 of the snacks?",
  // "A box has 6 buttons. How many … in 1/3 of the box?", "A ribbon is 6 m long. How long is 1/3 of it?"
  if ((m = /(\d+)\/(\d+) of (?:the |a )?(\d+)?/.exec(p)) && /\bof\b/.test(p)) {
    const [a, b] = [N(m[1]), N(m[2])];
    // The group size follows "of", or else is the first whole number in the story ("40 snacks … 2/10 of the snacks").
    const n = m[3] ? N(m[3]) : N(p.replace(/\d+\/\d+/g, ' ').match(/\d+/)?.[0] ?? NaN);
    if (Number.isFinite(n) && n % b === 0) {
      const right = (n / b) * a;
      return [right, [a > 1 ? n / b : NaN, n - right, n, a > 1 ? n * a : n * b]];
    }
  }
  // Scoops: "How many 1/3 cup scoops fill 2 cups?", "How many 1/8 cup scoops fill 3/4 cup?"
  if ((m = /How many 1\/(\d+)(?:-cup scoops| cup scoops| cups) fill (\d+) cups?\?/.exec(p))) {
    const [b, c] = [N(m[1]), N(m[2])];
    return [b * c, [b + c, c > 1 ? b : b + 1, c > 1 ? c : b * 2, b * c + b]];
  }
  if ((m = /How many (\d+)\/(\d+) cup scoops (?:of \w+ )?fill (?:a )?(\d+)\/(\d+) cup\?/.exec(p))) {
    const [a1, b1, a2, b2] = m.slice(1).map(N);
    return [(a2 / b2) / (a1 / b1), [a2, b2, b1, a2 * b1]];
  }
  // Units: "How many minutes are in 3/4 hour?", "A bag weighs 1/4 kilogram. How many grams is that?",
  // "A 2-liter jug is 1/4 full. How many milliliters are inside?"
  if ((m = /How many (\w+) are in (\d+)\/(\d+) (\w+)\?/.exec(p)) && PER[`${m[1]}/${m[4]}`]) {
    const per = PER[`${m[1]}/${m[4]}`]; const [a, b] = [N(m[2]), N(m[3])];
    const right = (per / b) * a;
    return [right, [a > 1 ? per / b : per * a, per - right, per, a > 1 ? per * a : per * b]];
  }
  if ((m = /(?:A (?:bottle has|bag weighs) (\d+)\/(\d+) (liter|kilogram)|A (\d+)-(liter|kilogram)[\w ]* is (\d+)\/(\d+) full)\./.exec(p))) {
    const [a, b, unit, wholes] = m[1] ? [N(m[1]), N(m[2]), m[3], 1] : [N(m[6]), N(m[7]), m[5], N(m[4])];
    const per = BIG[unit][1] * wholes; const right = (per / b) * a;
    return [right, [wholes > 1 ? (BIG[unit][1] / b) * a : a > 1 ? per / b : per * a, per - right, per, a > 1 ? per * a : per * b]];
  }
  // Wholes: "How many wholes are 9/3?", "Write 4/4 as a whole number."
  if ((m = /How many wholes are (\d+)\/(\d+)\?/.exec(p))) {
    const [n, d] = [N(m[1]), N(m[2])];
    return [n / d, [n - d, n, d, n + d]];
  }
  if ((m = /Write (\d+)\/\1 as a whole number\./.exec(p))) return [1, [N(m[1]), 0, 2 * N(m[1])]];
  // Equivalent fractions: "Fill the blank: 1/2 = ?/8", "3/4 = 6/?", "?/5 = 12/20"
  if ((m = /(\d+)\/(\d+) = \?\/(\d+)/.exec(p))) {
    const [a, b, d] = m.slice(1).map(N);
    return [(a * d) / b, [a + (d - b), d / b, d, a]];
  }
  if ((m = /(\d+)\/(\d+) = (\d+)\/\?/.exec(p))) {
    const [a, b, c] = m.slice(1).map(N);
    return [(b * c) / a, [b + (c - a), c, b, b * c]];
  }
  if ((m = /\?\/(\d+) = (\d+)\/(\d+)/.exec(p))) {
    const [b, c, d] = m.slice(1).map(N);
    return [(c * b) / d, [c - (d - b), b, c, d / b]];
  }
  return null;
}

/** Slips for this question, written like its answer ("6 stickers", "2 m"); empty when no rule applies or a rule's
    own working disagrees with the app's answer. */
export function misconceptionWrongs(prompt: string, answer: string): string[] {
  const unit = /^\d+( [a-z ]+)?$/i.exec(answer.trim());
  if (!unit) return [];
  const found = slips(prompt);
  if (!found) return [];
  const [right, wrongs] = found;
  if (Math.abs(right - answerValue(answer)) > 1e-9) return [];
  const suffix = unit[1] ?? '';
  return [...new Set(wrongs.filter((v) => Number.isInteger(v) && v >= 0 && v !== right && v <= 10_000))].map((v) => `${v}${suffix}`);
}

/** Swap near-miss wrong choices for slips from real mistakes: within 2 of a whole-number answer, and for a fraction
    or mixed-number answer (fraction-slips.ts) every wrong choice that isn't one. The right answer keeps its place,
    real mistakes already there stay, and no choice is ever repeated. */
export function preferMisconceptions<T extends { prompt: string; choices: string[]; correctChoice: number }>(question: T): T {
  const answer = question.choices[question.correctChoice];
  const whole = misconceptionWrongs(question.prompt, answer);
  const fractions = whole.length ? [] : fractionMistakes(question.prompt, answer);
  const wrongs = whole.length ? whole : fractions;
  if (!wrongs.length) return question;
  const right = answerValue(answer);
  const isSlip = (v: number) => fractions.some((slip) => Math.abs(answerValue(slip) - v) < 1e-9);
  const used = new Set(question.choices.map((choice) => answerValue(choice)));
  const fresh = wrongs.filter((wrong) => !used.has(answerValue(wrong)));
  const choices = question.choices.map((choice, index) => {
    if (index === question.correctChoice) return choice;
    const v = answerValue(choice);
    if (fractions.length ? isSlip(v) : Number.isFinite(v) && Math.abs(v - right) > 2) return choice;
    return fresh.shift() ?? choice;
  });
  return choices.every((choice, index) => choice === question.choices[index]) ? question : { ...question, choices };
}
