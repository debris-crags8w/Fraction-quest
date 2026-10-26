import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AREA_CUTS, allEqual } from './area-shapes';
import { FRACTION_WORDS, PART_NAMES } from './intro-copy';
import { MISSIONS, problemPicture, type ModelSpec, type PracticeQuestion } from './game';
import { getWorksheet } from './learning-content';
import { generateQuestions, getExtraPractice } from './practice-bank';

/* Lessons 1 and 2 come before any part name beyond the first-lesson Words screen (halves, thirds, fourths, sixths,
   eighths), so their "Practice more" questions may use only those parts: in the words, in every choice (wrong ones
   included), in the hint, and in the picture. */

const TAUGHT = new Set<number>(FRACTION_WORDS.rows.map((row) => row.d));
const UNTAUGHT_NAMES = Object.entries(PART_NAMES).filter(([d]) => !TAUGHT.has(Number(d))).flatMap(([, name]) => [name.one, name.many]);
const LESSONS = ['fraction-names', 'equal-parts'] as const;

/** Every denominator a picture draws that is meant to be a number of equal parts. */
function pictureParts(model: ModelSpec | undefined): number[] {
  if (!model) return [];
  switch (model.kind) {
    case 'bars': return model.bars.map((bar) => bar.denominator).filter((d) => d > 1);
    case 'line': return [model.denominator];
    case 'partition': return [model.parts.length];
    case 'area': return [model.cut, ...(model.more?.map((figure) => figure.cut) ?? [])]
      // Only cuts that claim equal parts: an unfair cut ("not fourths") is not a part name.
      .filter((cut) => allEqual(cut)).map((cut) => AREA_CUTS[cut].length);
    default: return [];
  }
}

const problems = (question: PracticeQuestion): string[] => {
  const found: string[] = [];
  const text = [question.prompt, ...question.choices, question.hint, question.retryFeedback].join(' | ');
  for (const match of text.matchAll(/\b\d+\s*\/\s*(\d+)\b/g)) if (!TAUGHT.has(Number(match[1]))) found.push(`denominator ${match[1]}`);
  for (const name of UNTAUGHT_NAMES) if (new RegExp(`\\b${name}\\b`, 'i').test(text)) found.push(`part name "${name}"`);
  for (const match of text.matchAll(/\b\d+ths?\b/gi)) found.push(`part name "${match[0]}"`);
  for (const model of [question.model, question.simplerModel]) {
    for (const parts of pictureParts(model)) if (!TAUGHT.has(parts)) found.push(`a picture with ${parts} equal parts`);
  }
  return found;
};

describe('Practice more in lessons 1 and 2 uses only the part names taught so far', () => {
  for (const id of LESSONS) {
    it(`${id}: no untaught denominator or part name, in the words, any choice, or the picture`, () => {
      const base = MISSIONS.find((mission) => mission.id === id)!.questions.map((question) => question.id);
      const questions = [...getExtraPractice(id, base)];
      for (let seed = 1; seed <= 150; seed++) questions.push(...generateQuestions(id, base, seed, 12));
      const bad = new Map<string, string[]>();
      for (const question of questions) {
        const found = problems(question);
        if (found.length) bad.set(`${question.prompt} => ${question.choices.join(' | ')}`, found);
      }
      assert.deepEqual([...bad].slice(0, 6), [], `${bad.size} of ${questions.length} questions use a part the child has not been taught`);
    });
  }

  it('lesson 1 still asks both kinds of question, with four different choices and the right answer in every place', () => {
    const base = MISSIONS[0]!.questions.map((question) => question.id);
    const questions = Array.from({ length: 60 }, (_, seed) => generateQuestions('fraction-names', base, seed, 12)).flat();
    assert.ok(questions.some((question) => /what does the \d+ mean/i.test(question.prompt)));
    const shaded = questions.filter((question) => question.prompt === 'What fraction is shaded?');
    assert.ok(shaded.length > 50);
    for (const question of shaded) {
      assert.equal(question.choices.length, 4);
      assert.equal(new Set(question.choices).size, 4, `repeated choice: ${question.choices.join(' | ')}`);
    }
    // The right answer is not always in the same place.
    assert.ok(new Set(shaded.map((question) => question.correctChoice)).size === 4);
  });
});

describe('the lesson 2 worksheet uses the shapes the lesson is about', () => {
  it('every sheet has pizza and square rows, not only bars', () => {
    for (let variant = 0; variant < 6; variant++) {
      const shapes = getWorksheet('equal-parts', variant).map((row) => problemPicture(row)).filter((picture) => picture.kind === 'area');
      assert.ok(shapes.length >= 4, `variant ${variant}: ${shapes.length} shape rows`);
      assert.ok(shapes.some((picture) => picture.kind === 'area' && picture.cut.startsWith('circle-')), `variant ${variant}: no pizza`);
      assert.ok(shapes.some((picture) => picture.kind === 'area' && picture.cut.startsWith('fourths-')), `variant ${variant}: no square`);
    }
  });
});
