import { answerValue, distractorCandidates } from './learning-content';
import { namedChoices } from './answer-shape';

/* Every tap question has four choices (A–D). Lessons were written with three, so this adds a believable fourth
   wrong answer from the question's own kind: never a second right answer, never a repeat of another choice.
   Questions it can't safely extend (worded reasons like "No, …") get their fourth choice written by hand. */

const SIGNS = new Set(['<', '=', '>']);
const norm = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
const EPS = 1e-9;
export const SIGN_FOURTH = "Can't tell";

/** Pick the sign questions: there are only three signs, so their fourth choice is "Can't tell". */
export function isSignQuestion(choices: string[]): boolean {
  const signs = choices.filter((choice) => SIGNS.has(choice.trim()));
  return signs.length >= 3 && choices.every((choice) => SIGNS.has(choice.trim()) || choice === SIGN_FOURTH);
}

const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** "1/2", "one whole", "1 whole", "half", "0" → a number (NaN when it isn't one). */
function amount(text: string): number {
  const t = text.trim().toLowerCase();
  if (/^(?:one|1) whole$/.test(t) || t === 'one') return 1;
  if (t === 'half' || t === 'one half') return 0.5;
  if (t === 'zero') return 0;
  return answerValue(t);
}

type Rule = (value: number, text: string) => boolean;

/** What makes a choice wrong for a "which…?" question, read from its wording (null: not a kind we know). */
function wrongRule(prompt: string, right: string): Rule | null {
  const p = prompt.toLowerCase();
  const target = amount(right);
  const near = /(?:closest|closer|nearest|near) to ([^?:,]+?)(?:[?:,]|$)/.exec(p);
  if (near) {
    const x = amount(near[1]);
    if (!Number.isFinite(x)) return null;
    return (v) => Math.abs(v - x) > Math.abs(target - x) + 0.05;
  }
  const between = /(?<!difference )between ([\d/ .]+?) and ([\d/ .]+?|1 whole|one whole)(?:[?.]|$)/.exec(p);
  if (between) {
    const [lo, hi] = [amount(between[1]), amount(between[2])];
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return (v) => v < lo - EPS || v > hi + EPS;
  }
  const more = /more than ([^?.]+?)(?:[?.]|$)/.exec(p);
  if (more && !/more or less/.test(p)) {
    const x = amount(more[1]);
    return Number.isFinite(x) ? (v) => v < x - EPS : null;
  }
  const less = /less than ([^?.]+?)(?:[?.]|$)/.exec(p);
  if (less && !/more or less/.test(p)) {
    const x = amount(less[1]);
    return Number.isFinite(x) ? (v) => v > x + EPS : null;
  }
  if (/unit fraction/.test(p)) return (_, text) => !/^1\/\d+$/.test(text);
  if (/same|equal|equivalent/.test(p)) return (v) => Math.abs(v - target) > EPS;
  if (/\b(?:bigger|biggest|greater|greatest|larger|largest|more)\b/.test(p)) return (v) => v < target - EPS;
  if (/\b(?:smaller|smallest|less|least|fewer)\b/.test(p)) return (v) => v > target + EPS;
  return null;
}

/** A "which…?" question rather than "work out the amount" (same test the practice bank uses). */
const isWhichQuestion = (prompt: string) => !/same as/i.test(prompt) && /\bwhich\b|closest|closer|bigger|smaller|more than|less than|(?<!difference )between/i.test(prompt);

/** The other orders of a list ("1/3, 2/3, 3/3"), in a fixed order picked from the text. */
function otherOrders(list: string): string[] {
  const items = list.split(',').map((item) => item.trim());
  const out: string[][] = [];
  const walk = (rest: string[], built: string[]) => {
    if (!rest.length) { out.push(built); return; }
    rest.forEach((item, i) => walk([...rest.slice(0, i), ...rest.slice(i + 1)], [...built, item]));
  };
  walk(items, []);
  const shift = hash(list) % out.length;
  return [...out.slice(shift), ...out.slice(0, shift)].map((order) => order.join(', '));
}

/** "1/5 + 3/5" → its parts. */
const SUM = /^(\d+)\/(\d+) \+ (\d+)\/(\d+)$/;

const denominatorOf = (text: string) => /\/(\d+)\b/.exec(text)?.[1];
/** 0: same denominator as the right answer, 1: one another choice uses, 2: no denominator, 3: a new one. */
function denominatorRank(text: string, right: string, choices: string[]): number {
  const d = denominatorOf(text);
  if (!d) return 2;
  if (d === denominatorOf(right)) return 0;
  return choices.some((choice) => denominatorOf(choice) === d) ? 1 : 3;
}

/** A fourth wrong choice for a three-choice question, or null when it needs one written by hand.
    Sign questions get "Can't tell". */
export function fourthChoice(prompt: string, choices: string[], correct: number): string | null {
  if (choices.length !== 3) return null;
  if (isSignQuestion(choices)) return SIGN_FOURTH;
  const right = choices[correct];
  const taken = new Set(choices.map(norm));
  const fresh = (text: string) => !!text && !taken.has(norm(text));

  // Orders: another order of the same amounts.
  // (Only lists of amounts: "Yes, 3 equal pieces" has a comma too.)
  const listed = right.split(',').map((item) => item.trim());
  if (listed.length > 1 && listed.every((item) => Number.isFinite(amount(item)))) return otherOrders(right).find(fresh) ?? null;

  // Sums: two pieces of the same size that add up to something else.
  const sum = SUM.exec(right);
  if (sum && choices.every((choice) => SUM.test(choice))) {
    const d = Number(sum[2]);
    const total = Number(sum[1]) + Number(sum[3]);
    const sums = choices.map((choice) => { const m = SUM.exec(choice)!; return Number(m[1]) + Number(m[3]); });
    for (const [a, b] of [[1, total], [2, total], [1, total - 2], [2, total - 1], [total, 1], [1, 1], [2, 2]]) {
      if (a < 1 || b < 1 || a + b === total || sums.includes(a + b)) continue;
      const text = `${a}/${d} + ${b}/${d}`;
      if (fresh(text)) return text;
    }
    return null;
  }

  // Worded yes/no reasons and other sentences are written by hand.
  if (choices.some((choice) => /^(?:yes|no)\b/i.test(choice.trim()))) return null;

  // "Which is bigger, 4/7 or 2/7?" with "They are equal": the classic wrong idea is that you can't tell.
  if (choices.some((choice) => /^they (?:are|match|cover)|equally/i.test(choice.trim()))) return fresh("You can't tell") ? "You can't tell" : null;

  // "More than 1/2 / Less than 1/2 / Exactly 1/2" (or half).
  if (choices.every((choice) => /^(?:more than|less than|exactly|equal to) (?:1\/2|half)$/i.test(choice.trim()))) {
    const text = /half/i.test(right) ? 'More than 1 whole' : 'More than 1';
    return fresh(text) ? text : null;
  }

  const values = choices.map(amount);
  if (!values.every(Number.isFinite)) return null;
  const target = values[correct];
  const decimal = /^\d*\.\d+$/.test(right.trim());
  // Same look as the other choices: decimals stay decimals, fractions stay fractions, units stay.
  const sameLook = (text: string) => decimal ? /^\d*\.\d+$/.test(text) : !/^\d*\.\d+$/.test(text);
  const pool = [...new Set([right, ...choices].flatMap((choice) => distractorCandidates(choice)))]
    .filter((text) => sameLook(text) && fresh(text))
    .filter((text) => { const v = amount(text); return Number.isFinite(v) && v >= 0 && values.every((other) => Math.abs(other - v) > EPS); })
    // Look like the other choices: the right answer's denominator first, then ones already shown; odd big ones last.
    .map((text, order) => ({ text, order, rank: denominatorRank(text, right, choices) }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map(({ text }) => text);

  if (isWhichQuestion(prompt)) {
    // The question lists its own options ("…: 1/2 or 1/10?"): adding one would change the question.
    if (namedChoices(prompt).length >= 2) return null;
    const rule = wrongRule(prompt, right);
    if (!rule) return null;
    const d = /^\d+\/(\d+)$/.exec(right)?.[1];
    const ok = pool.filter((text) => rule(amount(text), text));
    // Prefer the denominator the question already uses, so the new choice doesn't stand out.
    return ok.find((text) => d && text.endsWith(`/${d}`)) ?? ok[0] ?? null;
  }

  // "Work out the amount": a common slip, on the side with fewer wrong answers so the right one isn't
  // always the biggest or smallest.
  const below = values.filter((v, i) => i !== correct && v < target).length;
  const wantBelow = below < 1.5;
  return pool.find((text) => (amount(text) < target) === wantBelow) ?? pool[0] ?? null;
}

/** Add the fourth choice when there is one (the right answer keeps its place). */
export function withFourthChoice<T extends { prompt: string; choices: string[]; correctChoice: number }>(question: T): T {
  const extra = fourthChoice(question.prompt, question.choices, question.correctChoice);
  return extra ? { ...question, choices: [...question.choices, extra] } : question;
}

/** Ordering answers without commas (user rule: no commas in answers). "Put … in order, smallest first" shows
    "1/4 < 1/2 < 3/4"; biggest first shows "3/4 > 1/2 > 1/4". Read aloud as "is less than" / "is greater than". */
export function orderedWithSigns(prompt: string, choices: string[]): string[] {
  const order = /in order, (smallest|biggest) first/i.exec(prompt);
  if (!order) return choices;
  const sign = order[1].toLowerCase() === 'smallest' ? ' < ' : ' > ';
  return choices.map((choice) => (choice.includes(',') ? choice.split(',').map((item) => item.trim()).join(sign) : choice));
}

/** Answers that start with "No" or "Yes" are sorted: every "No, …" first, then every "Yes, …", then any other
    answer ("You can't tell"). Each group keeps its order, and the right answer moves with its choice. Questions
    without both a yes and a no answer are left as they are. */
export function noBeforeYes<T extends { choices: string[]; correctChoice: number }>(question: T): T {
  const yes = (text: string) => /^yes\b/i.test(text.trim());
  const no = (text: string) => /^no\b/i.test(text.trim());
  if (!question.choices.some(yes) || !question.choices.some(no)) return question;
  const right = question.choices[question.correctChoice];
  const choices = [...question.choices.filter(no), ...question.choices.filter(yes), ...question.choices.filter((c) => !yes(c) && !no(c))];
  return { ...question, choices, correctChoice: choices.indexOf(right) };
}
