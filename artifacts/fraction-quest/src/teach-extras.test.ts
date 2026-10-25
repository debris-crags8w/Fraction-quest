import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MISSIONS } from './game';
import { getBuildChecks, getWorksheet } from './learning-content';
import { LESSON_INTROS } from './lesson-intros';
import { getExtraPractice } from './practice-bank';
import { TAUGHT_IN, TEACH_EXTRAS } from './teach-extras';
import type { SceneRow } from './teach-scenes';

const pictures = (row: SceneRow): SceneRow[] => (row.kind === 'pair' ? row.items : [row]);
const lessonIndex = (id: string) => MISSIONS.findIndex((mission) => mission.id === id);

/** Everything a child is asked or told while practising a lesson: questions (with hints and retry help), extra
    practice, builds and the worksheet. The worked example and Teach first are teaching, not practice. */
function practiceText(missionId: string): string[] {
  const mission = MISSIONS[lessonIndex(missionId)]!;
  const questions = [...mission.questions, ...getExtraPractice(missionId, mission.questions.map((question) => question.id))];
  return [
    ...questions.flatMap((question) => [question.prompt, ...(question.choices ?? []), question.hint ?? '', question.retryFeedback ?? '']),
    ...getBuildChecks(missionId).flatMap((check) => [check.prompt, ...check.reasons, check.explanation]),
    ...getWorksheet(missionId).flatMap((problem) => [problem.prompt, problem.answer, problem.hint, problem.why ?? '']),
  ].filter(Boolean);
}

test('every extra belongs to a real lesson, and every worked example ends on a picture with its words', () => {
  for (const [id, extras] of Object.entries(TEACH_EXTRAS)) {
    assert.ok(lessonIndex(id) >= 0, `${id} is a lesson`);
    for (const example of extras.examples ?? []) {
      const last = example.picture[example.picture.length - 1]!.rows;
      assert.ok(last.some((row) => row.kind !== 'text'), `${id}: "${example.title}" needs a picture`);
      assert.ok(last.some((row) => row.kind === 'text' && !row.hidden), `${id}: "${example.title}" ends on its sentence`);
    }
    for (const word of extras.words ?? []) assert.match(word.meaning, /[.”]$/, `${id}: "${word.term}" is a sentence`);
  }
});

test('a fraction an extra picture names matches its shaded parts', () => {
  for (const [id, extras] of Object.entries(TEACH_EXTRAS)) {
    const scenes = [...(extras.examples ?? []).map((example) => example.picture), ...(extras.words ?? []).flatMap((word) => (word.picture ? [word.picture] : []))];
    for (const scene of scenes) {
      for (const row of scene[scene.length - 1]!.rows.flatMap(pictures)) {
        const named = row.kind === 'bar' && row.label ? /^(\d+)\/(\d+)$/.exec(row.label) : null;
        if (!named || row.kind !== 'bar') continue;
        assert.equal(row.parts.length, Number(named[2]), `${id}: ${row.label} parts`);
        assert.equal(row.shaded?.length ?? 0, Number(named[1]), `${id}: ${row.label} shaded`);
      }
    }
  }
});

test('teach before practice: no lesson practises a word or symbol before the lesson that teaches it', () => {
  for (const { term, pattern, lesson } of TAUGHT_IN) {
    const taughtAt = lessonIndex(lesson);
    assert.ok(taughtAt >= 0, `${term}: ${lesson} is a lesson`);
    // The lesson that teaches it really does: in its Words to know, or its Teach first.
    const intro = LESSON_INTROS[lesson]!;
    const teaching = [...(TEACH_EXTRAS[lesson]?.words ?? []).map((word) => word.meaning), intro.goal, ...intro.steps, intro.why].join(' ');
    assert.match(teaching, pattern, `${lesson} teaches ${term}`);
  }
  const early = TAUGHT_IN.flatMap(({ term, pattern, lesson }) => MISSIONS.slice(0, lessonIndex(lesson)).flatMap((mission) =>
    practiceText(mission.id).filter((text) => pattern.test(text)).map((text) => `${mission.id} uses ${term} before ${lesson}: "${text}"`)));
  assert.deepEqual([...new Set(early)], []);
});
