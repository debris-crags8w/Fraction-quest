import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EMPTY_PROGRESS, MISSIONS } from './game';
import { answerMatches, getBuildChecks, getWorksheet } from './learning-content';
import {
  checkWorksheet, editWorksheet, emptyLearningRecord, hasLearningGate, targetedPracticeCount,
  targetedPracticePlans, updateLearning, type LearningRecord,
} from './learning';
import { GRADE_PACING, UNIT_TEACHING_GUIDES, pacingSessionTotal } from './teaching-guide-data';

describe('family teaching guides', () => {
  it('covers all 15 units and gives realistic, correctly totaled grade pacing', () => {
    assert.deepEqual(UNIT_TEACHING_GUIDES.map((guide) => guide.unit), Array.from({ length: 15 }, (_, index) => index + 1));
    assert.ok(MISSIONS.every((mission) => UNIT_TEACHING_GUIDES.some((guide) => guide.unit === mission.unit)));
    assert.deepEqual(GRADE_PACING.map((plan) => [plan.grade, plan.totalSessions, pacingSessionTotal(plan)]), [
      [3, 35, 35], [4, 45, 45], [5, 45, 45],
    ]);
    for (const guide of UNIT_TEACHING_GUIDES) {
      assert.ok(guide.performanceTask.rubric.length >= 3, `Unit ${guide.unit} has a printable rubric`);
      assert.ok(guide.mastery.length >= 2, `Unit ${guide.unit} includes observable mastery evidence`);
    }
  });

  it('requires three fresh targeted answers before finishing after the same misconception repeats', () => {
    const mission = MISSIONS[0];
    const repeatedIdea = 'Counting pieces, groups or jumps';
    const base = emptyLearningRecord();
    const record: LearningRecord = {
      ...base,
      practiceDone: true,
      checks: Object.fromEntries(getBuildChecks(mission.id).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
      worksheet: Object.fromEntries(getWorksheet(mission.id).map((problem) => [problem.id, {
        draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false,
      }])),
      misconceptions: { [repeatedIdea]: 2 },
    };
    const plans = targetedPracticePlans(mission.id, record);
    assert.equal(plans.length, 1);
    assert.equal(plans[0].problems.length, 3);
    assert.equal(new Set(plans[0].problems.map((problem) => problem.id)).size, 3);
    assert.equal(targetedPracticeCount(mission.id, record).done, 0);
    assert.equal(hasLearningGate(updateLearning(EMPTY_PROGRESS, mission.id, record), mission.id), false);

    let practiced = record;
    for (const problem of plans[0].problems) {
      practiced = editWorksheet(practiced, problem.id, problem.answer);
      practiced = checkWorksheet(practiced, problem, false);
      assert.equal(answerMatches(problem, practiced.worksheet[problem.id].checkedValue ?? ''), true);
    }
    assert.deepEqual(practiced.misconceptions, record.misconceptions, 'targeted practice does not recursively create more remediation');
    assert.equal(targetedPracticeCount(mission.id, practiced).done, 3);
    assert.equal(hasLearningGate(updateLearning(EMPTY_PROGRESS, mission.id, practiced), mission.id), true);
  });
});
