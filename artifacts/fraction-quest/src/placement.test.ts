import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS, PLACEMENT_UNITS } from './game';
import { answerMatches, answerValue, getWorksheet } from './learning-content';
import { PER_UNIT, placementItems, placementPicture } from './placement';
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
        const result = prove({ source: 'Find my level', lesson: id, prompt: problem.prompt, answer: problem.answer, pictures: problem.model ? [problem.model as never] : [] });
        assert.ok(result?.ok, `${id}: ${problem.prompt}: ${result && !result.ok ? result.why : 'no proof rule'}`);
      }
    }
  });

  it('draws the picture every question needs: a row that carries its line, grid or coins in `picture` shows it', () => {
    // "What decimal is at the dot?" keeps its number line in `picture` and has no model: the quiz used to show the bare words.
    const needs = /at the dot|shaded|colou?red|picture|shown|grid|pizza|dimes|pennies|beads/i;
    const missing = new Set<string>();
    for (let unit = 1; unit <= PLACEMENT_UNITS; unit++) for (let seed = 1; seed <= 120; seed++) for (const item of placementItems(unit, seed)) {
      const drawn = placementPicture(item.problem);
      if (item.problem.picture && drawn?.kind !== 'picture' && !item.problem.model && !item.problem.area) missing.add(`unit ${unit} ${item.missionId}: ${item.problem.prompt}`);
      if (needs.test(item.problem.prompt) && !drawn) missing.add(`unit ${unit} ${item.missionId}: ${item.problem.prompt} (no picture at all)`);
    }
    assert.deepEqual([...missing].slice(0, 8), [], `${missing.size} questions show no picture`);
  });

  it('draws a line plot for every row that claims a line-plot standard (4.MD.4, 5.MD.2), from the amounts it lists', () => {
    const bare: string[] = [];
    const rows = [...Object.entries(PLACEMENT_EXTRAS), ...Object.entries(PLACEMENT_BLENDS)].flatMap(([id, list]) => list.map((problem) => ({ id, problem })));
    for (const { id, problem } of rows) {
      if (!problem.standards?.some((standard) => standard === '4.MD.4' || standard === '5.MD.2')) continue;
      const picture = placementPicture(problem);
      if (picture?.kind !== 'picture' || picture.picture.kind !== 'lineplot') { bare.push(`${id}: ${problem.prompt}`); continue; }
      const { denominator, values } = picture.picture;
      // The amounts are listed in the first sentence ("Cups hold: 2/8, 2/8, 5/8, 5/8 liter.").
      const listed = (problem.prompt.split(/[.?] /)[0]!.match(/\d+\/\d+/g) ?? []).map((amount) => answerValue(amount));
      assert.deepEqual(values.map((tick) => tick / denominator), listed, `${id}: the plot draws the amounts the question lists`);
    }
    assert.deepEqual(bare, [], 'line-plot rows with no line plot drawn');
  });

  it('asks line plots, groups of a unit fraction, tenths plus hundredths, comparing decimals, dividing with unit fractions, a fraction as a division and measuring with a ruler in most quizzes, counting only what the question shows', () => {
    // Each sits in one or two lessons of a long unit, so a 3-question quiz used to ask them in only a third of quizzes (main: 10-13 of 30).
    // A line-plot standard counts only when a line plot is drawn, and measuring (3.MD.4) only when the ruler's number line or a line plot is.
    const rare = ['4.MD.4', '5.MD.2', '4.NF.4a', '4.NF.5', '4.NF.7', '5.NF.7a', '5.NF.7b', '5.NF.3', '3.MD.4'];
    const shown = (standard: string, item: { problem: Parameters<typeof placementPicture>[0] }) => {
      const picture = placementPicture(item.problem);
      if (standard === '4.MD.4' || standard === '5.MD.2') return picture?.kind === 'picture' && picture.picture.kind === 'lineplot';
      if (standard === '3.MD.4') return (picture?.kind === 'model' && picture.model.kind === 'line') || (picture?.kind === 'picture' && picture.picture.kind === 'lineplot');
      return true;
    };
    const asked = Object.fromEntries(rare.map((standard) => [standard, 0]));
    const QUIZZES = 360; // a whole number of turns of every third's rotation, so the count is not biased by where the seeds start
    for (let seed = 1; seed <= QUIZZES; seed++) {
      const quiz = new Set<string>();
      for (let unit = 1; unit <= PLACEMENT_UNITS; unit++) for (const item of placementItems(unit, seed)) {
        (item.problem.standards ?? standardsForMission(item.missionId)).filter((standard) => shown(standard, item)).forEach((standard) => quiz.add(standard));
      }
      for (const standard of rare) if (quiz.has(standard)) asked[standard]++;
    }
    const thin = rare.filter((standard) => asked[standard] <= QUIZZES / 2).map((standard) => `${standard} in ${asked[standard]} of ${QUIZZES}`);
    assert.deepEqual(thin, []);
  });
});
