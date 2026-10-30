import assert from 'node:assert/strict';
import test from 'node:test';
import { buildErrors } from './lab-copy';
import { getBuildChecks, getBuildPracticeChecks, getWorksheet } from './learning-content';
import { LESSON_INTROS } from './lesson-intros';
import { REASON_SLIPS } from './reason-slips';
import { generateQuestions, getExtraPractice } from './practice-bank';
import { ideaPracticeQuestions } from './lesson-ideas';
import { lessonCheckpoint } from './checkpoint';
import { MISSIONS } from './game';

test('builds where an area or a remainder can be named more than one way accept any equal fraction', () => {
  const [area] = getBuildChecks('fractional-side-area');
  assert.equal(area.target.n / area.target.d, 1 / 2);
  // 6/12, the worked example's own answer, is right; 5/12 is not.
  assert.deepEqual(buildErrors('bar', area.target, { d: 12, count: 6, wholes: 1 }).msgs, []);
  assert.notDeepEqual(buildErrors('bar', area.target, { d: 12, count: 5, wholes: 1 }).msgs, []);
  for (const check of getBuildPracticeChecks('fraction-of-remainder', 0)) {
    const { n, d } = check.target;
    assert.deepEqual(buildErrors('bar', check.target, { d: d * 2, count: n * 2, wholes: check.target.wholes }).msgs, [], check.prompt);
  }
});

test('in naming lessons, a build still has to use the parts asked for', () => {
  const [check] = getBuildChecks('build-equivalents');
  const { n, d } = check.target;
  assert.notDeepEqual(buildErrors('bar', check.target, { d: d * 2, count: n * 2, wholes: check.target.wholes }).msgs, []);
});

test('no wrong "why" choice is a true idea from its own lesson', () => {
  assert.ok(!REASON_SLIPS['compare-same-denominator'].includes('Same denominator means same size'));
  for (const id of ['add-related-fractions', 'add-unlike-fractions', 'subtract-unlike-fractions', 'mixed-unlike-operations']) {
    assert.ok(!REASON_SLIPS[id].includes('Rename only one fraction'), id);
  }
});

test('"You can\'t tell" is only the answer when the bigger share is of the smaller pizza', () => {
  const mission = MISSIONS.find((m) => m.id === 'compare-decimals-grid')!;
  for (let round = 0; round < 40; round++) {
    for (const q of getExtraPractice(mission.id, mission.questions.map((x) => `${x.id}-${round}`))) {
      const m = /eats (0\.\d+) of a small pizza\. \w+ eats (0\.\d+) of a big pizza/.exec(q.prompt);
      if (!m) continue;
      assert.ok(Number(m[1]) > Number(m[2]), q.prompt);
    }
  }
});

test('adding unlike fractions: the child does the renaming; no question anywhere hands it over', () => {
  // "Rename: 1/2 = 3/6 and 1/3 = 2/6. Then …" does the key step for the child. Every place a question can come from:
  // the lesson's own questions, its ideas, its checkpoint, its worksheets (and redo sheets) and Practice more.
  const handover = /Rename:|\d+\/\d+ = \d+\/\d+[^?]*\. Then /;
  const found: string[] = [];
  for (const lesson of MISSIONS) {
    const deep = lesson.id === 'add-unlike-fractions' || lesson.id === 'mixed-unlike-operations';
    const prompts = [
      ...lesson.questions.map((q) => ['lesson', q.prompt]),
      ...ideaPracticeQuestions(lesson).filter((q) => q.prompt).map((q) => ['idea ' + q.id, q.prompt]),
      ...lessonCheckpoint(lesson).map((q) => ['checkpoint', q.prompt]),
      ...Array.from({ length: deep ? 13 : 2 }, (_, v) => getWorksheet(lesson.id, v).map((row) => ['worksheet ' + v, row.prompt])).flat(),
      ...Array.from({ length: deep ? 10 : 2 }, (_, s) => generateQuestions(lesson.id, lesson.questions.map((q) => q.id), s + 1, 12).map((q) => ['practice more', q.prompt])).flat(),
    ];
    for (const [where, prompt] of prompts) if (handover.test(prompt)) found.push(`${lesson.id} ${where}: ${prompt}`);
  }
  assert.deepEqual(found.slice(0, 10), [], `${found.length} prompts hand over the renaming`);
  for (const id of ['add-unlike-fractions', 'mixed-unlike-operations']) {
    // Later rows still ask the child to find the shared denominator alone.
    for (const row of getWorksheet(id).slice(6)) assert.match(row.hint, /List multiples/, `${id}: ${row.hint}`);
  }
});

test('the lessons the review found teaching too little now show each step before asking', () => {
  assert.ok(LESSON_INTROS['fraction-of-length'].steps.some((step) => /12 ÷ 4/.test(step)));
  assert.ok(LESSON_INTROS['ruler-measurement'].steps.some((step) => /Past 1 inch/.test(step)));
  const [length] = getBuildChecks('fraction-of-length');
  assert.equal(length.target.kind, 'set');
  assert.equal(length.target.total, 12);
});

test('grade 3 and 4 lessons ask on-grade questions (teacher review, grade fit)', () => {
  // Grade 3 compares with half; adding to or taking from half (1/2 + 1/8) is grade 5.
  for (const id of ['benchmark-half', 'fraction-magnitude']) for (const variant of [0, 1, 2]) for (const row of getWorksheet(id, variant)) {
    assert.doesNotMatch(row.prompt, /more than 1\/2\?$|less than 1\/2\?$|reach half/, `${id}: ${row.prompt}`);
  }
  // Grade 3 measures in halves and fourths of an inch, never eighths or sixteenths.
  for (const id of ['ruler-measurement', 'build-line-plots']) {
    const prompts = [...getWorksheet(id).map((row) => row.prompt), ...getBuildChecks(id).map((check) => check.prompt),
      ...getBuildPracticeChecks(id, 0).map((check) => check.prompt), ...getExtraPractice(id, []).flatMap((q) => [q.prompt, ...q.choices])];
    for (const text of prompts) assert.doesNotMatch(text, /\/(8|16)\b/, `${id}: ${text}`);
  }
  // Grade 4 adds and subtracts like denominators only; unlike ones are grade 5.
  // Only the sum asked about (left of =): a spot-the-mistake claim's wrong answer may have a wrong denominator on purpose.
  const unlike = (text: string) => { const bottoms = [...text.split('=')[0].matchAll(/\d+\/(\d+)/g)].map((m) => m[1]); return new Set(bottoms).size > 1; };
  for (const id of ['add-mixed-numbers', 'subtract-mixed-numbers', 'spot-the-mistake']) {
    for (const check of getBuildChecks(id)) assert.ok(!unlike(check.prompt), `${id}: ${check.prompt}`);
    for (const row of getWorksheet(id)) if (/[+−]/.test(row.prompt)) assert.ok(!unlike(row.prompt), `${id}: ${row.prompt}`);
  }
  // Adding unlike fractions only adds: taking away is the next lesson.
  for (const row of getWorksheet('add-unlike-fractions')) assert.doesNotMatch(row.prompt, /−/);
  // Grade 3 counts past one whole; naming mixed numbers is grade 4.
  for (const q of MISSIONS.find((m) => m.id === 'improper-fractions')!.questions) assert.doesNotMatch(q.prompt, /wholes and a fraction|\d and \d/);
});

test('find the whole is 5.NF.7b, its practice questions use unit fractions, and the other rows are marked stretch', () => {
  const lesson = MISSIONS.find((m) => m.id === 'find-the-whole')!;
  assert.deepEqual(lesson.standards, ['5.NF.7b']);
  for (const q of lesson.questions.filter((q) => !q.prompt.startsWith('Quick review'))) assert.match(q.prompt, / 1\/\d+ of /, q.prompt);
  for (const row of getWorksheet('find-the-whole')) {
    if (!/ 1\/\d+ of /.test(row.prompt)) assert.match(row.hint, /^A stretch question!/, row.prompt);
  }
});

test('ruler questions show a ruler with the blue strip they talk about', () => {
  for (const q of MISSIONS.find((m) => m.id === 'ruler-measurement')!.questions.filter((q) => /blue/.test(q.prompt))) {
    assert.equal(q.model.kind, 'ruler', q.prompt);
  }
});

test('practice reaches each lesson’s own skill (teacher review, PR 4)', () => {
  // Fractions in shapes: equal parts with different shapes are practised, not only identical pieces.
  assert.ok(getWorksheet('fraction-of-area').some((row) => row.area?.cut === 'fourths-mixed'));
  // Build a line plot: the child places the Xs in the lesson questions, and the builds stay on the line.
  for (const q of MISSIONS.find((m) => m.id === 'build-line-plots')!.questions.filter((q) => /^Plot /.test(q.prompt))) {
    assert.ok(q.model.kind === 'lineplot' && q.model.plotTask, q.prompt);
  }
  for (const check of getBuildPracticeChecks('build-line-plots', 0)) assert.equal(check.target.kind, 'line', check.prompt);
  // Read a line plot: the values are only in the plot.
  for (const row of getWorksheet('read-line-plots')) {
    assert.equal(row.picture?.kind, 'lineplot', row.prompt);
    assert.doesNotMatch(row.prompt.replace(/(?:are|all the) \d+\/8 inch/, ''), /\d\/8/, row.prompt);
  }
  // Break apart: another way, and unit fractions.
  assert.ok(MISSIONS.find((m) => m.id === 'decompose-fractions')!.questions.some((q) => /another way/.test(q.prompt)));
  // A fraction of a number is written with × too.
  assert.ok(MISSIONS.find((m) => m.id === 'fraction-of-quantity')!.questions.some((q) => /^\d+\/\d+ × \d+ = \?$/.test(q.prompt)));
  // Estimates: never a sum the benchmarks can't decide (one part above 1/2, the other below).
  for (const variant of [0, 1, 2]) for (const row of getWorksheet('estimate-fraction-operations', variant)) {
    const m = /compare (\d+)\/(\d+) \+ (\d+)\/(\d+) with 1/.exec(row.prompt);
    if (m) assert.ok((Number(m[1]) / Number(m[2]) - 0.5) * (Number(m[3]) / Number(m[4]) - 0.5) >= 0, row.prompt);
  }
  // Mixed numbers with unlike parts: the builds have mixed numbers.
  assert.ok(getBuildPracticeChecks('mixed-unlike-operations', 0).every((check) => /\d \d+\/\d+/.test(check.prompt)));
  // Find the whole: builds check the total.
  for (const check of getBuildChecks('find-the-whole')) assert.ok(check.target.kind === 'set' && check.target.total, check.prompt);
  // Two-step stories have more than one shape.
  const shapes = new Set(getWorksheet('multi-step-fraction-stories').map((row) => /jug|farther|left|empty/.exec(row.prompt)?.[0]));
  assert.ok(shapes.has('jug') && shapes.has('farther'));
});

test('a bar step fits its question: "how many equal parts make one whole?" counts every part, it does not copy the shading', () => {
  for (const mission of MISSIONS) for (const variant of [0, 1, 2, 3]) for (const problem of getWorksheet(mission.id, variant)) {
    if (!/how many equal parts make one whole/i.test(problem.prompt) || !problem.task) continue;
    const parts = problem.model && 'd' in problem.model ? (problem.model as { d: number; wholes: number }).d * (problem.model as { d: number; wholes: number }).wholes : 0;
    assert.deepEqual([problem.task.kind, problem.task.n], ['count', parts], `${mission.id} ${problem.id} (variant ${variant}): ${problem.prompt}`);
  }
});

test('no question tells the child how many parts to color and then asks what fraction is colored (that gives the answer away)', async () => {
  const { STORY_PROBLEMS } = await import('./story');
  const giveaway = /\bColou?r (\d+|one|two|three)\b(?! of the square)[^.]*\.[^?]*What fraction[^?]*(colou?red|did you colou?r)\?/i;
  const prompts: [string, string][] = [];
  for (const mission of MISSIONS) {
    for (const question of mission.questions) prompts.push([`${mission.id} practice`, question.prompt]);
    for (const variant of [0, 1, 2, 3]) for (const problem of getWorksheet(mission.id, variant)) prompts.push([`${mission.id} ${problem.id} v${variant}`, problem.prompt]);
  }
  for (const [id, problem] of Object.entries(STORY_PROBLEMS)) prompts.push([`story ${id}`, (problem as { prompt: string }).prompt]);
  assert.deepEqual(prompts.filter(([, prompt]) => giveaway.test(prompt)).map(([where, prompt]) => `${where}: ${prompt}`), []);
});
