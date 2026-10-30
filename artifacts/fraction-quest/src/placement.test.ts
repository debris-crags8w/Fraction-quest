import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS, PLACEMENT_UNITS } from './game';
import { answerMatches, getWorksheet } from './learning-content';
import { PER_UNIT, placementItems } from './placement';
import { PLACEMENT_BLENDS, PLACEMENT_EXTRAS } from './placement-extras';
import { prove } from './proof';
import { standardsForMission } from './standard-catalog';

const unitOf = (id: string) => MISSIONS.find((mission) => mission.id === id)!.unit;
const SEEDS = 40;

describe('Find my level asks about every part of units 1–12', () => {
  it('asks every standard taught in units 1–12 across quizzes, and most lessons', () => {
    const lessons = new Set<string>(); const standards = new Set<string>();
    for (let unit = 1; unit <= PLACEMENT_UNITS; unit++) for (let seed = 1; seed <= SEEDS; seed++) for (const item of placementItems(unit, seed)) {
      lessons.add(item.missionId); standardsForMission(item.missionId).forEach((standard) => standards.add(standard));
    }
    const taught = new Set(MISSIONS.filter((mission) => mission.unit <= PLACEMENT_UNITS).flatMap((mission) => standardsForMission(mission.id)));
    assert.deepEqual([...taught].filter((standard) => !standards.has(standard)), [], 'standards the quiz never asks');
    // 5.NF.4b and 5.NF.6 are only taught in units 13–15, which open after unit 12 whatever the quiz says.
    assert.ok(lessons.size >= 60, `only ${lessons.size} of ${MISSIONS.filter((m) => m.unit <= PLACEMENT_UNITS).length} lessons are ever asked`);
  });

  it('keeps 3 questions per unit, spread over the start, middle and end of it, and the same seed gives the same quiz', () => {
    for (let unit = 1; unit <= PLACEMENT_UNITS; unit++) {
      const lessons = MISSIONS.filter((mission) => mission.unit === unit);
      for (let seed = 1; seed <= 12; seed++) {
        const items = placementItems(unit, seed);
        assert.equal(items.length, PER_UNIT);
        assert.deepEqual(placementItems(unit, seed).map((item) => item.problem.prompt), items.map((item) => item.problem.prompt));
        if (lessons.length >= 6) {
          // A unit with six or more lessons: one question from each third of it.
          const at = items.map((item) => lessons.findIndex((mission) => mission.id === item.missionId));
          at.forEach((index, third) => assert.ok(index >= Math.floor((third * lessons.length) / 3) - 3 && index < Math.ceil(((third + 1) * lessons.length) / 3) + 3,
            `unit ${unit} seed ${seed}: question ${third + 1} is lesson ${index + 1} of ${lessons.length}`));
        }
      }
    }
  });

  it('does not always pick the same lessons: different quizzes ask different lessons of a unit', () => {
    for (const unit of [8, 9, 11, 12]) {
      const picked = new Set<string>();
      for (let seed = 1; seed <= 12; seed++) placementItems(unit, seed).forEach((item) => picked.add(item.missionId));
      assert.ok(picked.size >= 5, `unit ${unit}: only ${picked.size} different lessons in 12 quizzes`);
    }
  });

  it('asks the ruler and line plot standards with questions the quiz can show, and each has a right answer', () => {
    assert.deepEqual(Object.keys(PLACEMENT_EXTRAS).sort(), ['line-plot-totals', 'read-line-plots', 'ruler-measurement']);
    for (const [id, rows] of Object.entries(PLACEMENT_EXTRAS)) {
      assert.ok(unitOf(id) <= PLACEMENT_UNITS);
      for (const problem of rows) {
        assert.ok(answerMatches(problem, problem.answer), `${id}: ${problem.prompt}`);
        assert.ok(!problem.rulerTask && !problem.linePlotTask && !/line plot|use the ruler/i.test(problem.prompt), `${id} needs a tool the quiz does not show`);
        const result = prove({ source: 'Find my level', lesson: id, prompt: problem.prompt, answer: problem.answer, pictures: problem.model ? [problem.model as never] : [] });
        assert.ok(result?.ok, `${id}: ${problem.prompt}: ${result && !result.ok ? result.why : 'no proof rule'}`);
        assert.ok(problem.standards!.every((standard) => standardsForMission(id).includes(standard)), `${id} row tagged with a standard the lesson does not teach`);
      }
    }
    // Those lessons have no worksheet row the quiz can show, which is why they need their own.
    for (const id of Object.keys(PLACEMENT_EXTRAS)) {
      assert.equal(getWorksheet(id).filter((p) => !p.rulerTask && !p.linePlotTask && !/line plot|use the ruler/i.test(p.prompt)).length, 0, id);
    }
  });

  it('units 8 and 12 (13 and 11 lessons, 8 and 10 standards) ask more of their standards in each 3-question quiz', () => {
    const perQuiz = (unit: number) => {
      let total = 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const items = placementItems(unit, seed);
        assert.equal(items.length, PER_UNIT, 'the quiz keeps its length');
        total += new Set(items.flatMap((item) => item.problem.standards ?? standardsForMission(item.missionId))).size;
      }
      return total / SEEDS;
    };
    // Before: about 3.6 for unit 8 and 4.4 for unit 12.
    assert.ok(perQuiz(8) >= 4.5, `unit 8: ${perQuiz(8).toFixed(2)} standards per quiz`);
    assert.ok(perQuiz(12) >= 5, `unit 12: ${perQuiz(12).toFixed(2)} standards per quiz`);
  });

  it('a row that asks two standards at once really tests both, has a right answer, and its lesson or an earlier one of its unit teaches each', () => {
    const order = MISSIONS.map((mission) => mission.id);
    for (const [id, rows] of Object.entries(PLACEMENT_BLENDS)) {
      const unit = unitOf(id);
      const taughtBy = new Set(MISSIONS.filter((mission) => mission.unit === unit && order.indexOf(mission.id) <= order.indexOf(id)).flatMap((mission) => standardsForMission(mission.id)));
      for (const problem of rows) {
        assert.ok(problem.standards!.length >= 2, `${id}: ${problem.prompt}`);
        assert.ok(problem.standards!.includes(standardsForMission(id)[0]), `${id}: ${problem.prompt} asks its own lesson's standard`);
        for (const standard of problem.standards!) assert.ok(taughtBy.has(standard), `${id}: ${standard} is not taught by then`);
        assert.ok(answerMatches(problem, problem.answer), `${id}: ${problem.prompt}`);
        const result = prove({ source: 'Find my level', lesson: id, prompt: problem.prompt, answer: problem.answer, pictures: [] });
        assert.ok(result?.ok, `${id}: ${problem.prompt}: ${result && !result.ok ? result.why : 'no proof rule'}`);
      }
    }
  });
});
