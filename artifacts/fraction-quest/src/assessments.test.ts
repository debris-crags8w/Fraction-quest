import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CHALLENGES } from './challenges';
import { assessmentResponse, buildAssessmentItems, getAssessmentDefinitions, saveAssessmentAttempt, summarizeStandardMastery } from './assessments';
import { EMPTY_PROGRESS, isMissionUnlocked, loadProgress, MISSIONS, saveProgress, type AssessmentAttempt } from './game';
import { generateQuestions, hasGenerator } from './practice-bank';
import { getWorksheet } from './learning-content';
import { MISSION_STANDARDS } from './standard-catalog';

describe('standard-tagged assessments', () => {
  it('tags every mission, lesson question, worksheet item, generated item, and challenge item', () => {
    for (const mission of MISSIONS) {
      assert.ok(Object.hasOwn(MISSION_STANDARDS, mission.id), `missing standards map for ${mission.id}`);
      assert.deepEqual(mission.standards, MISSION_STANDARDS[mission.id], mission.id);
      for (const question of mission.questions) {
        const expectedStandards = question.isReview && question.reviewMissionId
          ? MISSION_STANDARDS[question.reviewMissionId]
          : mission.standards;
        assert.deepEqual(question.standards, expectedStandards, question.id);
      }
      for (const problem of getWorksheet(mission.id)) assert.deepEqual(problem.standards, mission.standards);
    }
    const generatedMission = MISSIONS.find(mission => hasGenerator(mission.id));
    assert.ok(generatedMission);
    const generated = generateQuestions(generatedMission.id, generatedMission.questions.map(question => question.id), 81, 3);
    for (const question of generated) assert.deepEqual(question.standards, generatedMission.standards);
    for (const questions of Object.values(CHALLENGES)) {
      for (const question of questions) {
        assert.ok(question.standards?.length, question.id);
        for (const step of question.steps ?? []) assert.deepEqual(step.standards, question.standards);
      }
    }
  });

  it('builds fresh, 12-item model-and-typed-answer checks for every unit and grade benchmark', () => {
    const definitions = getAssessmentDefinitions();
    assert.ok(definitions.some(item => item.kind === 'pre'));
    assert.ok(definitions.some(item => item.kind === 'mid'));
    assert.ok(definitions.some(item => item.kind === 'end'));
    assert.equal(definitions.filter(item => item.grade !== undefined).length, 9);
    for (const definition of definitions) {
      const items = buildAssessmentItems(definition, 173);
      assert.equal(items.length, 12, definition.id);
      assert.ok(items.every(item => item.standards.length > 0 && item.standards.every(id => definition.standards.includes(id))), definition.id);
      assert.ok(items.every(item => item.problem.model || item.problem.areaTask || item.problem.rulerTask || item.problem.linePlotTask || item.problem.scaleTask || item.visualFractions), definition.id);
    }
    const unitOne = definitions.find(item => item.id === 'unit-1-end')!;
    assert.notDeepEqual(
      buildAssessmentItems(unitOne, 173).map(item => item.prompt),
      buildAssessmentItems(unitOne, 174).map(item => item.prompt),
      'retakes with a new seed should vary their questions',
    );
  });

  it('keeps placement and lesson gates separate from all check-in results', () => {
    const definition = getAssessmentDefinitions().find(item => item.id === 'unit-1-pre')!;
    const items = buildAssessmentItems(definition, 2);
    const attempt: AssessmentAttempt = {
      assessmentId: definition.id,
      seed: 2,
      startedAt: 1,
      completedAt: 2,
      responses: items.map(item => assessmentResponse(item, true, item.answer)),
    };
    const before = isMissionUnlocked(EMPTY_PROGRESS, MISSIONS[1].id);
    const after = isMissionUnlocked(saveAssessmentAttempt(EMPTY_PROGRESS, attempt), MISSIONS[1].id);
    assert.equal(after, before);
    assert.equal(after, false);
  });

  for (const id of ['unit-1-end', 'unit-15-end']) it(`saves only assessment evidence and safely reloads the completed check-in (${id})`, () => {
    const definition = getAssessmentDefinitions().find(item => item.id === id)!;
    const items = buildAssessmentItems(definition, 37);
    const attempt: AssessmentAttempt = {
      assessmentId: definition.id, seed: 37, startedAt: 10, completedAt: 20,
      responses: items.map(item => assessmentResponse(item, true, item.answer)),
    };
    const storage = new Map<string, string>();
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } },
    });
    try {
      const saved = saveAssessmentAttempt(EMPTY_PROGRESS, attempt);
      assert.equal(saveProgress(saved), true);
      assert.deepEqual(loadProgress().assessments, [attempt]);
      const encoded = [...storage.values()][0];
      assert.ok(!encoded.includes('"answer"'), 'raw answers are not needed for the adult report');
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete (globalThis as typeof globalThis & { window?: unknown }).window;
    }
  });

  it('excludes diagnostic pre-checks and requires repeated independent evidence for mastery', () => {
    const makeAttempt = (assessmentId: string, correct: boolean, completedAt: number): AssessmentAttempt => ({
      assessmentId, seed: completedAt, startedAt: completedAt - 1, completedAt,
      responses: Array.from({ length: 12 }, (_, index) => ({
        itemId: `${assessmentId}-${index}`,
        standards: index < 3 ? ['3.NF.1'] : ['3.NF.3d'],
        modelBuilt: true,
        correct: index < 3 ? correct : false,
      })),
    });
    const pre = makeAttempt('unit-1-pre', true, 1);
    const first = makeAttempt('unit-1-end', true, 2);
    const second = makeAttempt('grade-3-middle', true, 86_400_002);
    const mastery = summarizeStandardMastery([pre, first, second]).find(row => row.standard === '3.NF.1')!;
    assert.equal(mastery.status, 'mastered');
    assert.equal(mastery.attempted, 6);
    const replaced = makeAttempt('unit-1-end', false, 4);
    const afterRetake = summarizeStandardMastery([pre, first, second, replaced]).find(row => row.standard === '3.NF.1')!;
    assert.equal(afterRetake.status, 'developing');
    assert.equal(afterRetake.attempted, 6);
    const diagnosticOnly = summarizeStandardMastery([pre]).find(row => row.standard === '3.NF.1')!;
    assert.equal(diagnosticOnly.status, 'not-yet');
    assert.equal(diagnosticOnly.attempted, 0);
  });
});
