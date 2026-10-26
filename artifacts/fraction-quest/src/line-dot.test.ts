import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { lineHasPoint, MISSIONS, type ModelSpec } from './game';
import { lessonIdeas, ideaQuestion } from './lesson-ideas';
import { LESSON_SCENES, type SceneRow } from './teach-scenes';

const lesson = MISSIONS.find((mission) => mission.id === 'number-line-points')!;
const line = (model: ModelSpec) => (model.kind === 'line' ? model : null);

test('a number line with numerator 0 marks no point: nothing is named, so no dot suggests "0"', () => {
  assert.equal(lineHasPoint({ numerator: 0 }), false);
  assert.equal(lineHasPoint({ numerator: 1 }), true);
  assert.equal(lineHasPoint({ numerator: 12 }), true);
});

test('the question picture draws its dot, jump arcs and readout only when it has a point', () => {
  const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  assert.match(app, /pointShown && <span className="fq-numberline-marker"/);
  assert.match(app, /labelled && pointShown && <div className="fq-line-readout">/);
});

test('lesson 11 idea 1 (count the spaces): every practice picture is a line with no point', () => {
  const idea = lessonIdeas(lesson.id)![0]!;
  const models = idea.practice.map((item) => ('question' in item ? line(ideaQuestion(lesson, item.question)!.model) : null));
  assert.equal(models.length, 3);
  for (const model of models) {
    assert.ok(model, 'a number line');
    assert.equal(lineHasPoint(model), false, 'no point to name on a counting-the-spaces picture');
  }
});

test('lesson 11 idea 2 (count the jumps): every practice picture still has its point', () => {
  const idea = lessonIdeas(lesson.id)![1]!;
  for (const item of idea.practice) {
    const model = 'question' in item ? line(ideaQuestion(lesson, item.question)!.model) : null;
    assert.ok(model && lineHasPoint(model), 'a point to count the jumps to');
  }
});

test('lesson 11 idea 1 Learn pictures show no dot at 0 unless a point is named', () => {
  const scene = LESSON_SCENES['number-line-points']!;
  const lastRows = (step: typeof scene.steps[number]) => step[step.length - 1]!.rows;
  // Idea 1's Learn page is the first step: the spaces only.
  for (const frame of scene.steps[0]!) {
    for (const row of frame.rows as SceneRow[]) {
      if (row.kind === 'line') assert.ok(row.point == null || row.point > 0 || !!row.pointLabel, 'a dot at 0 needs a name');
    }
  }
  assert.ok(lastRows(scene.steps[0]!).some((row) => row.kind === 'line'));
});

test('no Learn picture in any lesson draws a dot at 0 without naming it', () => {
  for (const [id, scene] of Object.entries(LESSON_SCENES)) {
    for (const step of [...scene.steps, scene.why]) {
      for (const frame of step) {
        for (const row of frame.rows) {
          if (row.kind === 'line' && row.point === 0) assert.ok(row.pointLabel, `${id}: a dot at 0 with no name`);
        }
      }
    }
  }
});
