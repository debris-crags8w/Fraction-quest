import { isYesNoProblem, type WorksheetProblem } from './learning-content';

/* How a child gives each answer without typing: drag (or tap) tiles into slots. The shape comes from the
   question's wording and answer format, never from the answer's value, so it gives nothing away. Every shape
   builds the same answer string the checker already understands ("3/4", "1 2/4", "0.3", "50%", "1/4, 2/4", ">"). */

export type AnswerShape =
  | { kind: 'yesno' }
  /** The question names the choices ("Which is bigger, 3/4 or 3/8?"): drag one of them into the answer box. */
  | { kind: 'pick'; options: string[] }
  /** Drag <, = or > into the gap between the two amounts. */
  | { kind: 'symbol'; left: string; right: string }
  /** Drag the amounts into order: no commas to type. */
  | { kind: 'ordered'; items: string[]; first: 'smallest' | 'biggest' | null }
  /** Number tiles: a whole number, optionally a percent. */
  | { kind: 'number'; suffix?: '%' }
  /** Numerator over denominator. `allowWhole`: a whole-number answer may leave the denominator empty. */
  | { kind: 'fraction'; allowWhole: boolean }
  /** Wholes and a fraction. `flexible`: the whole or the fraction may be left empty, so the same boxes fit a
      whole-number, fraction or mixed answer and their layout says nothing about which it is. */
  | { kind: 'mixed'; flexible?: boolean }
  | { kind: 'decimal' };

/** Slots for number tiles, in reading order. */
export const SLOTS: Record<'number' | 'fraction' | 'mixed' | 'decimal', string[]> = {
  number: ['n'], fraction: ['num', 'den'], mixed: ['whole', 'num', 'den'], decimal: ['whole', 'dec'],
};
/** Most digits one slot holds (100 is the biggest number a child needs). */
export const SLOT_DIGITS = 3;

const AMOUNT = String.raw`\d+(?:\s\d+\/\d+|\/\d+|\.\d+)?`;

/** The amounts listed before "or" at the end of a question: "Which is closer to 1/2: 3/8 or 1/8?" → 3/8, 1/8. */
export function namedChoices(prompt: string): string[] {
  const question = prompt.split(/(?<=[.!])\s+/).find((sentence) => /\?$/.test(sentence.trim())) ?? prompt;
  const match = new RegExp(String.raw`((?:${AMOUNT})(?:,\s*${AMOUNT})*),?\s+or\s+(${AMOUNT})\s*\?`).exec(question);
  if (!match) return [];
  return [...match[1].split(/,\s*/), match[2]].map((value) => value.trim());
}

const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

export function answerShape(problem: WorksheetProblem): AnswerShape {
  const answer = problem.answer.trim();
  if (isYesNoProblem(problem)) return { kind: 'yesno' };
  if (problem.form === 'symbol') {
    const gap = /(?:^|:\s*)([^:]*?)\s*__\s*(.+?)\.?$/.exec(problem.prompt);
    const compared = /compare (.+?) with/i.exec(problem.prompt);
    return { kind: 'symbol', left: (gap?.[1] || compared?.[1] || '').trim(), right: (gap?.[2] ?? '').trim() };
  }
  if (problem.form === 'ordered') {
    const items = answer.split(',').map((value) => value.trim());
    // Cards appear in the order the question lists them, so their order says nothing about the answer.
    const at = (value: string) => { const i = problem.prompt.indexOf(value); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
    const shown = [...items].sort((a, b) => at(a) - at(b) || a.localeCompare(b));
    const first = /smallest first/i.test(problem.prompt) ? 'smallest' : /biggest first|largest first|greatest first/i.test(problem.prompt) ? 'biggest' : null;
    return { kind: 'ordered', items: shown, first };
  }
  const options = namedChoices(problem.prompt);
  if (options.length >= 2 && options.some((option) => same(option, answer))) return { kind: 'pick', options };
  if (/%$/.test(answer)) return { kind: 'number', suffix: '%' };
  // Questions with mixed numbers in them, and ruler lengths: one layout whatever form the answer takes.
  if (problem.rulerTask || (/\b\d+ \d+\/\d+\b/.test(problem.prompt) && !/wholes and a fraction/i.test(problem.prompt))) return { kind: 'mixed', flexible: true };
  if (problem.form === 'mixed') return { kind: 'mixed' };
  if (problem.form === 'decimal') return { kind: 'decimal' };
  if (/^\d+$/.test(answer)) {
    const missingPart = /missing (?:numerator|denominator)|\?\/\d|\d\/\?/i.test(problem.prompt);
    const counting = missingPart || (/\bhow many\b/i.test(problem.prompt) && !/\bwhat fraction\b|\bhow (?:long|far|much)\b/i.test(problem.prompt));
    return counting ? { kind: 'number' } : { kind: 'fraction', allowWhole: true };
  }
  if (/^\d+\s+\d+\/\d+$/.test(answer)) return { kind: 'mixed' };
  return { kind: 'fraction', allowWhole: false };
}

/** The answer string a set of filled slots makes ('' while it isn't complete). */
export function slotAnswer(shape: AnswerShape, slots: Record<string, string>): string {
  const v = (key: string) => slots[key] ?? '';
  switch (shape.kind) {
    case 'number': return v('n') ? `${v('n')}${shape.suffix ?? ''}` : '';
    case 'fraction':
      if (v('num') && v('den')) return `${v('num')}/${v('den')}`;
      return shape.allowWhole && v('num') && !v('den') ? v('num') : '';
    case 'mixed':
      if (v('whole') && v('num') && v('den')) return `${v('whole')} ${v('num')}/${v('den')}`;
      if (!shape.flexible) return '';
      return v('num') && v('den') && !v('whole') ? `${v('num')}/${v('den')}` : v('whole') && !v('num') && !v('den') ? v('whole') : '';
    case 'decimal': return v('whole') && v('dec') ? `${v('whole')}.${v('dec')}` : '';
    default: return '';
  }
}

/** Fill the slots back in from a saved answer (so a child's work is still there when they come back). */
export function slotsFromAnswer(shape: AnswerShape, value: string): Record<string, string> {
  const raw = value.trim().replace(/%$/, '');
  if (shape.kind === 'number') return /^\d+$/.test(raw) ? { n: raw } : {};
  if (shape.kind === 'fraction') {
    const m = /^(\d+)\/(\d+)$/.exec(raw);
    return m ? { num: m[1], den: m[2] } : /^\d+$/.test(raw) ? { num: raw } : {};
  }
  if (shape.kind === 'mixed') {
    const m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(raw); if (m) return { whole: m[1], num: m[2], den: m[3] };
    const fraction = /^(\d+)\/(\d+)$/.exec(raw); if (shape.flexible && fraction) return { num: fraction[1], den: fraction[2] };
    return shape.flexible && /^\d+$/.test(raw) ? { whole: raw } : {};
  }
  if (shape.kind === 'decimal') { const m = /^(\d+)\.(\d+)$/.exec(raw); return m ? { whole: m[1], dec: m[2] } : {}; }
  return {};
}

/** Can a child build `answer` with this shape? (Used by tests over every lesson's questions.) */
export function canBuild(shape: AnswerShape, answer: string): boolean {
  const a = answer.trim();
  switch (shape.kind) {
    case 'yesno': return /^(yes|no)$/i.test(a);
    case 'pick': return shape.options.some((option) => same(option, a));
    case 'symbol': return /^[<=>]$/.test(a);
    case 'ordered': return a.split(',').map((x) => x.trim()).every((x) => shape.items.includes(x));
    default: {
      const slots = slotsFromAnswer(shape, a);
      return slotAnswer(shape, slots) === a && Object.values(slots).every((digits) => digits.length <= SLOT_DIGITS);
    }
  }
}
