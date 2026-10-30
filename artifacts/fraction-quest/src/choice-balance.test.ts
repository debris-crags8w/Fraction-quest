import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { generateQuestions } from './practice-bank';
import { CHALLENGES } from './challenges';
import { valueOf } from './proof';
import { allCheckpoints } from './checkpoint';

/* Measurement tests for how a question's choices are balanced: no pair of choices that mean the same thing, no
   picture that draws only the right choice, no yes/no set where the right choice is the lone "Yes", no right answer
   that is the only fraction already written in the prompt. They read every lesson question, idea question and
   generated practice set (seeds 0 to 40), plus the unit challenges and their steps. */

type Q = { prompt: string; choices: string[]; correctChoice: number; model?: { kind: string; bars?: { numerator: number; denominator: number }[] }; hint?: string; retryFeedback?: string };
type Row = { src: string; lesson: string; q: Q };

const SEEDS = Array.from({ length: 41 }, (_, i) => i);
let cache: Row[] | null = null;
function everyQuestion(): Row[] {
  if (cache) return cache;
  const rows: Row[] = [];
  for (const m of MISSIONS) {
    const ids = m.questions.map((q) => q.id);
    for (const q of m.questions) rows.push({ src: 'lesson', lesson: m.id, q });
    for (const q of m.ideaQuestions ?? []) rows.push({ src: 'idea', lesson: m.id, q });
    for (const seed of SEEDS) for (const q of generateQuestions(m.id, ids, seed * 7919 + 3, 12)) rows.push({ src: 'practice', lesson: m.id, q });
  }
  for (const [unit, qs] of Object.entries(CHALLENGES)) for (const q of qs) {
    rows.push({ src: 'challenge', lesson: `unit ${unit}`, q: { prompt: q.prompt, choices: q.choices, correctChoice: q.correct } });
    for (const s of q.steps ?? []) rows.push({ src: 'challenge step', lesson: `unit ${unit}`, q: { prompt: s.prompt, choices: s.choices, correctChoice: s.correct } });
  }
  cache = rows;
  return rows;
}
const show = ({ src, lesson, q }: Row) => `${src} · ${lesson}: ${q.prompt} :: ${q.choices.join(' | ')} (right ${q.correctChoice})`;

/** "a < b", "b > a" and "a = b" / "b = a" are the same statement; so are "1/4 < 1/2 < 3/4" and "3/4 > 1/2 > 1/4". */
function statement(choice: string): string | null {
  const parts = choice.trim().split(/ ([<>=]) /);
  if (parts.length < 3 || parts.length % 2 === 0) return null;
  const items = parts.filter((_, i) => i % 2 === 0); const signs = parts.filter((_, i) => i % 2 === 1);
  if (new Set(signs).size > 1) return null;
  if (signs[0] === '>') return items.reverse().join(' < ');
  if (signs[0] === '=') return [...items].sort().join(' = ');
  return items.join(' < ');
}

describe('no two choices say the same thing', () => {
  it('a comparison is never written twice (one way round and the other), in any lesson, idea, practice set or challenge', () => {
    const twins = everyQuestion().filter(({ q }) => {
      const said = q.choices.map(statement);
      if (said.some((s) => s === null)) return false;
      return new Set(said).size < said.length;
    });
    const byLesson = new Map<string, number>();
    for (const { lesson, src } of twins) byLesson.set(`${lesson}/${src}`, (byLesson.get(`${lesson}/${src}`) ?? 0) + 1);
    assert.equal(twins.length, 0, `${twins.length} choice sets have a pair that mean the same, e.g. ${twins.slice(0, 3).map(show).join(' // ')}; by lesson: ${JSON.stringify([...byLesson])}`);
  });

  it('a sign question still has four different choices, one true statement, and the true one is the authored right answer', () => {
    let signSets = 0;
    for (const row of everyQuestion()) {
      const stated = row.q.choices.map(statement);
      if (stated.filter((s) => s !== null).length < 3 || !/__/.test(row.q.prompt)) continue;
      signSets++;
      assert.equal(new Set(row.q.choices.map((c) => c.trim())).size, row.q.choices.length, show(row));
      const m = /(?:compare |: )(.+?)(?: with [^:]*)?:? __ (.+?)\.?$/.exec(row.q.prompt);
      assert.ok(m, show(row));
      const [a, b] = [m![1].includes(':') ? m![1].split(':').pop()!.trim() : m![1], m![2]];
      const value = (text: string) => { const parts = text.split(/ ([+×]) /); return parts.length === 1 ? valueOf(text) : parts[1] === '+' ? valueOf(parts[0]) + valueOf(parts[2]) : valueOf(parts[0]) * valueOf(parts[2]); };
      const [x, y] = [value(a.trim()), value(b.trim())];
      if (![x, y].every(Number.isFinite)) continue;
      const trueOnes = row.q.choices.filter((c) => { const s = / ([<>=]) /.exec(c.trim()); if (!s) return false; const [l, r] = c.trim().split(/ [<>=] /); const [lv, rv] = [value(l), value(r)];
        return s[1] === '<' ? lv < rv - 1e-9 : s[1] === '>' ? lv > rv + 1e-9 : Math.abs(lv - rv) < 1e-9; });
      assert.equal(trueOnes.length, 1, `${show(row)} has ${trueOnes.length} true statements`);
      assert.equal(trueOnes[0], row.q.choices[row.q.correctChoice], show(row));
    }
    assert.ok(signSets > 1000, `only ${signSets} sign sets read`);
  });
});

describe('a picture never draws only the right choice', () => {
  it('"Which one is more/less than N?" draws every choice (or none), never just the right factor', () => {
    let sets = 0; const alone: Row[] = []; const shown = new Map<number, number>();
    for (const row of everyQuestion()) {
      if (row.lesson !== 'bigger-or-smaller' || !/^Which one is (?:more|less) than \d+\?$/.test(row.q.prompt)) continue;
      sets++;
      const factor = (c: string) => /^(\d+)\/(\d+) ×/.exec(c)!;
      const bars = row.q.model?.kind === 'bars' ? row.q.model.bars ?? [] : [];
      const drawn = row.q.choices.map((c) => { const [, n, d] = factor(c); return bars.some((bar) => bar.numerator === Number(n) && bar.denominator === Number(d)); });
      const count = drawn.filter(Boolean).length;
      shown.set(count, (shown.get(count) ?? 0) + 1);
      if (count === 1 && drawn[row.q.correctChoice]) alone.push(row);
      assert.ok(count === 0 || count === row.q.choices.length, `${show(row)}: the picture draws ${count} of ${row.q.choices.length} choices`);
    }
    assert.ok(sets > 100, `only ${sets} sets read`);
    assert.equal(alone.length, 0, `${alone.length} of ${sets} sets draw only the right factor`);
  });
});

describe('a picture draws all the fraction choices or none', () => {
  it('"Which fraction is closest to ...?" has a bar for all four choices, never three, in lessons, practice and Check-ins', () => {
    const rows = [...everyQuestion(), ...allCheckpoints().flatMap(({ mission, questions }) => questions.map((q) => ({ src: 'checkpoint', lesson: mission.id, q })))];
    let sets = 0;
    for (const row of rows) {
      if (!/^Which (?:fraction|amount|is) (?:is )?closest to /.test(row.q.prompt) || !row.q.choices.every((c) => /^\d+\/\d+$/.test(c.trim()))) continue;
      const bars = row.q.model?.kind === 'bars' ? row.q.model.bars ?? [] : [];
      const count = row.q.choices.filter((c) => { const [n, d] = c.trim().split('/').map(Number); return bars.some((bar) => bar.numerator === n && bar.denominator === d); }).length;
      sets++;
      assert.ok(count === 0 || count === row.q.choices.length, `${show(row)}: the picture draws ${count} of ${row.q.choices.length} choices`);
    }
    assert.ok(sets > 100, `only ${sets} sets read`);
  });
});

describe('a wrong choice is never a true statement', () => {
  it('an unequal area picture does not offer "No, the shapes are different" beside the right "No"', () => {
    let sets = 0;
    for (const row of everyQuestion()) {
      const m = row.q.model as { kind: string; cut?: string } | undefined;
      if (m?.kind !== 'area' || !/^(?:circle-unequal|fourths-unequal|quarter-and-triangles)$/.test(m.cut ?? '') || !/^Is this \w+ cut into equal parts\?$/.test(row.q.prompt)) continue;
      sets++;
      assert.ok(!row.q.choices.some((c) => /shapes are different/.test(c)), `${show(row)}: the shapes of the parts really are different`);
    }
    assert.ok(sets > 20, `only ${sets} sets read`);
  });
});

describe('yes/no sets do not give the right choice away', () => {
  const group = (c: string) => (/^yes\b/i.test(c) ? 'Y' : /^no\b/i.test(c) ? 'N' : '-');
  const yesNoRows = () => everyQuestion().filter(({ q }) => q.choices.length >= 3 && q.choices.every((c) => group(c) !== '-'));

  it('the right choice is never the only "Yes" among "No"s, and rarely the odd one out at all', () => {
    const rows = yesNoRows();
    assert.ok(rows.length > 500, `only ${rows.length} yes/no sets`);
    const soleYes = rows.filter(({ q }) => { const g = q.choices.map(group); return g[q.correctChoice] === 'Y' && g.filter((x) => x === 'Y').length === 1; });
    const oddRight = rows.filter(({ q }) => { const g = q.choices.map(group); return g.filter((x) => x === g[q.correctChoice]).length === 1; });
    const soleShare = soleYes.length / rows.length; const oddShare = oddRight.length / rows.length;
    assert.equal(soleYes.length, 0, `right is the lone Yes in ${soleYes.length} of ${rows.length} sets (${(soleShare * 100).toFixed(1)}%), e.g. ${soleYes.slice(0, 2).map(show).join(' // ')}`);
    assert.ok(oddShare < 0.15, `right is the odd one out in ${(oddShare * 100).toFixed(1)}% of ${rows.length} sets`);
  });

  it('the right choice is a Yes about as often as it is a No', () => {
    const rows = yesNoRows();
    const yes = rows.filter(({ q }) => group(q.choices[q.correctChoice]) === 'Y').length / rows.length;
    assert.ok(yes > 0.3 && yes < 0.7, `the right choice is a Yes in ${(yes * 100).toFixed(1)}% of sets`);
  });

  it('"No" still comes before "Yes" in every set', () => {
    for (const row of yesNoRows()) assert.match(row.q.choices.map(group).join(''), /^N*Y*$/, show(row));
  });
});

describe('the right answer is not the only fraction already in the prompt', () => {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const inPrompt = (prompt: string, fraction: string) => new RegExp(`(?<![\\d/])${esc(fraction)}(?![\\d/])`).test(prompt);
  const bare = (c: string) => c.trim().replace(/\s+[a-z]+$/i, '');
  /** The right choice is a fraction written in the prompt and no wrong choice is (the prompts that ask to pick from what they name are left out). */
  const giveaway = ({ q }: Row) => {
    const right = bare(q.choices[q.correctChoice]);
    if (!/\d\/\d/.test(right) || !inPrompt(q.prompt, right) || /same as|equal|Which is bigger|bigger|smaller|order/.test(q.prompt)) return false;
    return !q.choices.some((c, i) => i !== q.correctChoice && inPrompt(q.prompt, bare(c)));
  };
  const LIMIT = 0.01;

  it('every lesson has under 1% of its practice questions like that (it was up to 23.5%)', () => {
    const byLesson = new Map<string, { n: number; total: number; ex: string }>();
    for (const row of everyQuestion().filter((r) => r.src === 'practice')) {
      const entry = byLesson.get(row.lesson) ?? { n: 0, total: 0, ex: '' };
      entry.total++;
      if (giveaway(row)) { entry.n++; entry.ex ||= show(row); }
      byLesson.set(row.lesson, entry);
    }
    const bad = [...byLesson].filter(([, v]) => v.n / v.total >= LIMIT).map(([k, v]) => `${k} ${(v.n / v.total * 100).toFixed(1)}% (${v.n}/${v.total}) e.g. ${v.ex}`);
    assert.deepEqual(bad, [], 'lessons whose right answer is often the only fraction in the prompt');
  });
});

describe('a check question has exactly one answer a child can reason out', () => {
  it('"Which multiplication checks 3 ÷ 1/2 = 6?" asks for the one that gets back to 3', () => {
    const lesson = MISSIONS.find((m) => m.id === 'share-or-fit')!;
    const q = (lesson.ideaQuestions ?? []).find((item) => /^Pip says 3 ÷ 1\/2 = 6\./.test(item.prompt))!;
    assert.ok(q, 'the question exists');
    assert.match(q.prompt, /gets? back to 3\b/, q.prompt);
    const product = (equation: string) => { const m = /^(\S+) × (\S+) = (\S+)$/.exec(equation.trim())!; return { made: valueOf(m[1]) * valueOf(m[2]), said: valueOf(m[3]) }; };
    for (const choice of q.choices) assert.ok(Math.abs(product(choice).made - product(choice).said) < 1e-9, `${choice} is a true equation`);
    const back = q.choices.filter((choice) => Math.abs(product(choice).said - 3) < 1e-9);
    assert.deepEqual(back, [q.choices[q.correctChoice]], 'only the right choice makes 3');
    assert.equal(q.choices[q.correctChoice], '6 × 1/2 = 3');
  });
});

describe('explanations read as sentences', () => {
  it('"Write 5/100 as a decimal" is not explained as "5/100 = 5/100 = 0.05"', () => {
    const lesson = MISSIONS.find((m) => m.id === 'decimal-fraction-equivalence')!;
    const ids = lesson.questions.map((q) => q.id); let hundredths = 0;
    for (const seed of SEEDS) for (const q of generateQuestions(lesson.id, ids, seed, 12)) {
      assert.doesNotMatch(q.retryFeedback ?? '', /(\d+\/\d+) = \1\b/, `${q.prompt} → ${q.retryFeedback}`);
      if (/\/100 as a decimal/.test(q.prompt)) hundredths++;
    }
    assert.ok(hundredths > 10, `only ${hundredths} hundredths questions seen`);
  });

  it('a shared unit fraction is explained in statements, not by repeating the hint question', () => {
    const lesson = MISSIONS.find((m) => m.id === 'unit-fraction-divided-whole')!;
    const ids = lesson.questions.map((q) => q.id); let seen = 0;
    const all: Q[] = [...lesson.questions, ...(lesson.ideaQuestions ?? []), ...SEEDS.flatMap((seed) => generateQuestions(lesson.id, ids, seed, 12))];
    for (const q of all) {
      if (!/share/.test(q.prompt)) continue;
      seen++;
      assert.doesNotMatch(q.retryFeedback ?? '', /\?/, `${q.prompt} → ${q.retryFeedback}`);
      assert.notEqual(q.retryFeedback?.startsWith(q.hint ?? '\u0000'), true, `${q.prompt}: the explanation starts with the hint`);
    }
    assert.ok(seen > 50, `only ${seen} questions seen`);
  });
});
