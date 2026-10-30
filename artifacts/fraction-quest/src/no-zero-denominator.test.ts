import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAssessmentItems, getAssessmentDefinitions } from './assessments';
import { MISSIONS } from './game';
import { getWorksheet } from './learning-content';
import { generateQuestions, hasGenerator } from './practice-bank';

// A fraction with 0 parts ("3/0") is not a slip a child makes: it is wrong math on the screen.
const zeroDenominator = /\d\s*\/\s*0(?!\d)/;
const texts = (...parts: (string | undefined)[]) => parts.filter((part): part is string => !!part);

describe('no zero denominator is ever shown', () => {
  it('worksheets, in every redo sheet', () => {
    const bad: string[] = [];
    for (const mission of MISSIONS) for (let variant = 0; variant <= 25; variant++) for (const row of getWorksheet(mission.id, variant)) {
      for (const text of texts(row.prompt, row.answer, row.hint, row.why, row.explain)) if (zeroDenominator.test(text)) bad.push(`${mission.id} v${variant}: ${text}`);
    }
    assert.deepEqual(bad, []);
  });

  it('lesson questions and Practice more', () => {
    const bad: string[] = [];
    for (const mission of MISSIONS) {
      const questions = [...mission.questions];
      if (hasGenerator(mission.id)) for (let seed = 1; seed <= 12; seed++) questions.push(...generateQuestions(mission.id, mission.questions.map(question => question.id), seed * 313, 12));
      for (const question of questions) for (const text of texts(question.prompt, ...question.choices, question.hint, question.retryFeedback)) {
        if (zeroDenominator.test(text)) bad.push(`${mission.id}: ${text}`);
      }
    }
    assert.deepEqual(bad, []);
  });

  it('Check-ins', () => {
    const bad: string[] = [];
    for (const definition of getAssessmentDefinitions()) for (const seed of [3, 41, 77, 120, 500]) for (const item of buildAssessmentItems(definition, seed)) {
      for (const text of texts(item.prompt, item.answer, item.problem.hint, item.problem.why, item.problem.explain)) if (zeroDenominator.test(text)) bad.push(`${definition.id} ${seed}: ${text}`);
    }
    assert.deepEqual(bad, []);
  });
});
