import assert from 'node:assert/strict';
import test from 'node:test';
import { AREA_CUTS } from './area-shapes';
import { LESSON_INTROS } from './lesson-intros';
import { LESSON_SCENES, play, sceneLength, type SceneRow, type StepScene } from './teach-scenes';

const pictures = (row: SceneRow): SceneRow[] => (row.kind === 'pair' ? row.items : [row]);

test('play builds frames from a start and its changes, each held before the next', () => {
  const scene = play([{ kind: 'bar', parts: [1, 1] }], [500, { 0: { cut: true } }], [300, { 0: { shaded: [0] } }]);
  assert.deepEqual(scene.map((frame) => frame.ms), [500, 300, 0]);
  assert.equal(scene[0]!.rows[0]!.kind === 'bar' && scene[0]!.rows[0]!.cut, undefined);
  assert.deepEqual(scene[2]!.rows[0], { kind: 'bar', parts: [1, 1], cut: true, shaded: [0] });
  assert.equal(sceneLength(scene), 800);
});

test('every lesson scene matches its Teach first: one picture per step and one for why', () => {
  assert.ok(Object.keys(LESSON_SCENES).length >= 4);
  for (const [id, scene] of Object.entries(LESSON_SCENES)) {
    const intro = LESSON_INTROS[id];
    assert.ok(intro, `${id} has a Teach first`);
    assert.equal(scene.steps.length, intro.steps.length, `${id}: a picture for each step`);
  }
});

test('every picture is short, keeps its rows, ends with everything shown, and points at real parts', () => {
  for (const [id, scene] of Object.entries(LESSON_SCENES)) {
    [...scene.steps, scene.why].forEach((step: StepScene, index) => {
      const where = `${id} ${index < scene.steps.length ? `step ${index + 1}` : 'why'}`;
      assert.ok(step.length >= 1, where);
      // A step plays in under 6.5 seconds, so a child isn't kept waiting before Next.
      assert.ok(sceneLength(step) <= 6500, `${where} is ${sceneLength(step)} ms`);
      const rows = step[0]!.rows.length;
      for (const frame of step) assert.equal(frame.rows.length, rows, `${where}: rows don't come and go between frames`);
      for (const row of step[step.length - 1]!.rows) assert.ok(!row.hidden, `${where}: the last frame shows everything`);
      for (const frame of step) for (const row of frame.rows) for (const picture of pictures(row)) {
        if (picture.kind === 'text') continue;
        if (picture.kind === 'coins') {
          assert.ok(picture.items.length >= 1 && picture.alt.length > 0, `${where}: coins have an alt text`);
          continue;
        }
        if (picture.kind === 'line') {
          const spaces = picture.max * picture.spaces;
          for (const value of [picture.point ?? 0, picture.jumps ?? 0, picture.stretch ?? 0, ...(picture.marks ?? []).map((mark) => mark.at), ...(picture.xs ?? []).map(([at]) => at)]) {
            assert.ok(value >= 0 && value <= spaces, `${where}: ${value} is on a line of ${spaces} spaces`);
          }
          continue;
        }
        if (picture.kind === 'set') {
          const groups = picture.groups ?? 0;
          assert.ok((picture.dealt ?? 0) <= picture.count, `${where}: dealt`);
          if (groups) assert.equal(picture.count % groups, 0, `${where}: ${picture.count} shares equally into ${groups}`);
          for (const list of [picture.shaded, picture.counted, picture.glow]) {
            for (const group of list ?? []) assert.ok(group >= 0 && group < groups, `${where}: group ${group} of ${groups}`);
          }
          continue;
        }
        const count = picture.kind === 'bar' ? picture.parts.length : AREA_CUTS[picture.cut].length;
        for (const list of [picture.shaded, picture.counted, picture.glow, picture.kind === 'bar' ? picture.ticks : undefined]) {
          for (const part of list ?? []) assert.ok(part >= 0 && part < count, `${where}: part ${part} of ${count}`);
        }
        if (picture.kind === 'bar' && picture.checker != null) assert.ok(picture.checker < count, `${where}: checker`);
      }
    });
  }
});

test('a fraction a picture names matches its shaded parts', () => {
  // "One part is 1/6." under a bar with one of six parts shaded, and so on.
  for (const [id, scene] of Object.entries(LESSON_SCENES)) {
    for (const step of [...scene.steps, scene.why]) {
      const last = step[step.length - 1]!.rows;
      const bars = last.flatMap(pictures).filter((row) => row.kind === 'bar');
      for (const row of bars) {
        const named = row.kind === 'bar' && row.label ? /^(\d+)\/(\d+)$/.exec(row.label) : null;
        if (named && row.kind === 'bar') {
          // A bar showing every `group`-th cut reads as parts.length / group parts.
          const group = row.group ?? 1;
          const shaded = (row.shaded?.length ?? 0) + (row.shaded2?.length ?? 0);
          assert.equal(row.parts.length, Number(named[2]) * group, `${id}: ${row.label}`);
          assert.equal(shaded, Number(named[1]) * group, `${id}: ${row.label}`);
        }
      }
    }
  }
});

test('every step and every why has a picture, not just words', () => {
  for (const [id, scene] of Object.entries(LESSON_SCENES)) {
    [...scene.steps, scene.why].forEach((step, index) => {
      const last = step[step.length - 1]!.rows;
      assert.ok(last.some((row) => row.kind !== 'text'), `${id} ${index < scene.steps.length ? `step ${index + 1}` : 'why'} needs a picture`);
    });
  }
});

test('every lesson with a Teach first card plays it as pictures', () => {
  const missing = Object.keys(LESSON_INTROS).filter((id) => !LESSON_SCENES[id]);
  assert.deepEqual(missing, []);
});
