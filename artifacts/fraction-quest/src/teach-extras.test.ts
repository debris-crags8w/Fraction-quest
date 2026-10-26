import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MISSIONS } from './game';
import { FRACTION_WORDS, PART_NAMES } from './intro-copy';
import { getBuildChecks, getBuildPracticeChecks, getReviewCheck, getWorksheet } from './learning-content';
import { LESSON_IDEAS, type LearnPage } from './lesson-ideas';
import { LESSON_INTROS } from './lesson-intros';
import { newWordsFor } from './new-words';
import { getExtraPractice } from './practice-bank';
import { chapterFor, lessonCliff, lessonComic, storyProblemFor } from './story';
import { TAUGHT_IN, TEACH_EXTRAS } from './teach-extras';
import { LESSON_SCENES, type SceneRow } from './teach-scenes';

const pictures = (row: SceneRow): SceneRow[] => (row.kind === 'pair' ? row.items : [row]);
const lessonIndex = (id: string) => MISSIONS.findIndex((mission) => mission.id === id);

/** Everything a child is asked or told while practising a lesson: questions (with hints and retry help), extra
    practice, builds and the worksheet. The worked example and Teach first are teaching, not practice. */
function practiceText(missionId: string): string[] {
  const mission = MISSIONS[lessonIndex(missionId)]!;
  const questions = [...mission.questions, ...(mission.ideaQuestions ?? []), ...getExtraPractice(missionId, mission.questions.map((question) => question.id))];
  return [
    ...questions.flatMap((question) => [question.prompt, ...(question.choices ?? []), question.hint ?? '', question.retryFeedback ?? '']),
    ...getBuildChecks(missionId).flatMap((check) => [check.prompt, ...check.reasons, check.explanation]),
    ...getWorksheet(missionId).flatMap((problem) => [problem.prompt, problem.answer, problem.hint, problem.why ?? '']),
  ].filter(Boolean);
}

/** The words a picture shows: its sentences, labels, brackets and units. A ruler writes "in" for inch under each whole
    inch, so a ruler counts as saying "inch". */
function pictureText(picture: unknown): string[] {
  const json = JSON.stringify(picture ?? {});
  const fields = [...json.matchAll(/"(text|label|bracket|unit|pointLabel|caption|title)":"([^"]*)"/g)].map((match) => match[2]!);
  return /"ruler":true|"kind":"ruler"|"rulerTask"/.test(json) ? [...fields, 'inch'] : fields;
}
const learnText = (page: LearnPage): string[] => [page.text, ...('words' in page ? page.words.flatMap((word) => [word.term, word.meaning, ...pictureText(word.picture)]) : pictureText(page.scene))];

/** Everything a child meets in one idea: its Learn pages, then its practices (question, choices, hint, help, picture). */
function ideaScreens(missionId: string): { learn: string[]; practice: string[] }[] {
  const mission = MISSIONS[lessonIndex(missionId)]!;
  const questions = [...mission.questions, ...(mission.ideaQuestions ?? [])];
  return (LESSON_IDEAS[missionId] ?? []).map((idea) => ({
    learn: idea.learn.flatMap(learnText),
    practice: idea.practice.flatMap((item) => {
      if (!('question' in item)) return [];
      const q = questions.find((question) => question.id === item.question)!;
      return [q.prompt, ...q.choices, q.hint, q.retryFeedback, ...pictureText(q.model), ...pictureText(q.simplerModel)];
    }),
  }));
}

/** Every screen of a lesson, not only its practice: the ideas' Learn pages and practices, the lesson's own and review
    questions, its story problem and the chapter's story lines around it, Practice more, the lesson page (How it works,
    the worked example, Build it steps and extra builds, the worksheet and redo sheets, later reviews). */
function lessonText(missionId: string): string[] {
  const mission = MISSIONS[lessonIndex(missionId)]!;
  const questions = [...mission.questions, ...(mission.ideaQuestions ?? []), ...getExtraPractice(missionId, mission.questions.map((question) => question.id))];
  const story = storyProblemFor(missionId);
  const chapter = chapterFor(mission.unit);
  const unitLessons = MISSIONS.filter((item) => item.unit === mission.unit);
  const at = unitLessons.findIndex((item) => item.id === missionId);
  const intro = LESSON_INTROS[missionId];
  const scenes = LESSON_SCENES[missionId];
  const builds = [...getBuildChecks(missionId), ...[0, 1, 2].flatMap((batch) => getBuildPracticeChecks(missionId, batch)), ...[0, 1, 2, 3, 4, 5].map((round) => getReviewCheck(missionId, round))];
  return [
    ...ideaScreens(missionId).flatMap(({ learn, practice }) => [...learn, ...practice]),
    ...questions.flatMap((question) => [question.prompt, ...(question.choices ?? []), question.hint ?? '', question.retryFeedback ?? '', ...pictureText(question.model), ...pictureText(question.simplerModel)]),
    ...(story ? [story.setup, story.prompt, ...(story.choices ?? []), story.result] : []),
    ...(chapter ? [...lessonComic(chapter, mission, at).map((panel) => panel.text), lessonCliff(chapter, at, unitLessons.length), ...chapter.asks,
      ...(at === unitLessons.length - 1 ? [chapter.won, chapter.done] : [])] : []),
    ...(intro ? [intro.goal, ...intro.steps, intro.why] : []), ...(scenes ? [...scenes.steps, scenes.why].flatMap(pictureText) : []),
    mission.example.prompt, mission.example.answer, mission.example.explanation, ...pictureText(mission.example.model),
    ...builds.flatMap((check) => [check.prompt, ...check.reasons, check.explanation]),
    ...[0, 1, 2, 3].flatMap((variant) => getWorksheet(missionId, variant)).flatMap((problem) => [problem.prompt, problem.answer, problem.hint, problem.why ?? '', ...pictureText(problem.picture)]),
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
    for (const word of extras.words ?? []) assert.match(word.meaning, /[.?”]$/, `${id}: "${word.term}" is a sentence`);
  }
});

test('a fraction an extra picture names matches its shaded parts', () => {
  for (const [id, extras] of Object.entries(TEACH_EXTRAS)) {
    const scenes = [...(extras.examples ?? []).map((example) => example.picture), ...(extras.words ?? []).flatMap((word) => (word.picture ? [word.picture] : []))];
    for (const scene of scenes) {
      for (const row of scene[scene.length - 1]!.rows.flatMap(pictures)) {
        const named = row.kind === 'bar' && row.label ? /^(\d+)\/(\d+)$/.exec(row.label) : null;
        if (!named || row.kind !== 'bar') continue;
        // A bar showing every `group`-th cut reads as parts.length / group parts.
        const group = row.group ?? 1;
        assert.equal(row.parts.length, Number(named[2]) * group, `${id}: ${row.label} parts`);
        assert.equal(row.shaded?.length ?? 0, Number(named[1]) * group, `${id}: ${row.label} shaded`);
      }
    }
  }
});

test('teach before practice: no lesson practises a word or symbol before the lesson that teaches it', () => {
  for (const { term, pattern, lesson } of TAUGHT_IN) {
    const taughtAt = lessonIndex(lesson);
    assert.ok(taughtAt >= 0, `${term}: ${lesson} is a lesson`);
    // The lesson that teaches it really does: in its Words to know, its Teach first, or a Learn page of one of its ideas.
    const intro = LESSON_INTROS[lesson]!;
    const teaching = [...(TEACH_EXTRAS[lesson]?.words ?? []).map((word) => word.meaning), intro.goal, ...intro.steps, intro.why,
      ...(LESSON_IDEAS[lesson] ?? []).flatMap((idea) => idea.learn.flatMap(learnText))].join(' ');
    assert.match(teaching, pattern, `${lesson} teaches ${term}`);
  }
  const early = TAUGHT_IN.flatMap(({ term, pattern, lesson }) => MISSIONS.slice(0, lessonIndex(lesson)).flatMap((mission) =>
    practiceText(mission.id).filter((text) => pattern.test(text)).map((text) => `${mission.id} uses ${term} before ${lesson}: "${text}"`)));
  assert.deepEqual([...new Set(early)], []);
});

/** Units of measure and their facts: each is taught (Words to know or a Learn page) where a child first meets it. */
const UNITS_TAUGHT = TAUGHT_IN.filter((row) => row.unit);

test('a unit of measure (or ÷ or +) is taught before any screen uses it: not in an earlier lesson, nor an earlier idea of its lesson', () => {
  assert.ok(UNITS_TAUGHT.length >= 15, 'the units and unit facts are listed');
  const early = UNITS_TAUGHT.flatMap(({ term, pattern, lesson }) => MISSIONS.slice(0, lessonIndex(lesson)).flatMap((mission) =>
    lessonText(mission.id).filter((text) => pattern.test(text)).map((text) => `${mission.id} uses ${term} before ${lesson}: "${text}"`)));
  assert.deepEqual([...new Set(early)], []);
  // In the lesson that teaches it: the first idea to use it teaches it on a Learn page, before its practices.
  for (const { term, pattern, lesson } of UNITS_TAUGHT) {
    const ideas = ideaScreens(lesson);
    const first = ideas.findIndex(({ learn, practice }) => [...learn, ...practice].some((text) => pattern.test(text)));
    assert.ok(first >= 0, `${lesson} uses ${term} in an idea`);
    assert.ok(ideas[first]!.learn.some((text) => pattern.test(text)), `${lesson} idea ${first + 1} teaches ${term} on a Learn page before it practises it`);
  }
});

test('no screen writes a unit as a short symbol the course never teaches (m, km, cm, kg, g, L, mL)', () => {
  const symbol = /\b\d+(?:\/\d+)? ?(?:km|cm|kg|mL|m|g|L)\b(?!['’])|^(?:km|cm|kg|mL|m|g|L)$/;
  const found = MISSIONS.flatMap((mission) => lessonText(mission.id).filter((text) => symbol.test(text)).map((text) => `${mission.id}: "${text}"`));
  assert.deepEqual([...new Set(found)], []);
});

/** Every part name a lesson says (not the numbers: "24ths" is a number with "ths"). Lessons write names three ways:
    in their ideas (Learn pages and practices), on the lesson page and in the story around it. */
const PART_NAME_WORD = /\b(?:halves|quarters?|[a-z]*(?:fif|six|seven|eigh|nin|ten|elev|twelf|hundred|thousand|teen|ieth|four)[a-z]*ths?|\d+ths)\b/gi;

test('a part name the first-lesson Words screen does not teach (fifths, tenths …) is on a New word card, or a word card, before the screen that first says it', () => {
  const wordsTaught = new Set(FRACTION_WORDS.rows.map((row) => row.d));
  const names = Object.entries(PART_NAMES).filter(([d]) => !wordsTaught.has(Number(d))).map(([d, name]) => ({ d: Number(d), one: name.one, many: name.many }));
  // Where each name is first said: [lesson, idea]. The lesson page, story and Practice more come after the ideas (idea = 99).
  const AFTER_IDEAS = 99;
  const said = new Map<string, [number, number, string]>();
  const note = (name: string, at: [number, number], text: string) => { if (!said.has(name)) said.set(name, [at[0], at[1], text]); };
  MISSIONS.forEach((mission, lesson) => {
    ideaScreens(mission.id).forEach(({ learn, practice }, idea) => [...learn, ...practice].forEach((text) => {
      for (const match of text.matchAll(PART_NAME_WORD)) note(match[0].toLowerCase(), [lesson, idea], text);
    }));
    // The lesson page and the rest, with more rounds than lessonText reads (a build, a worksheet or a review can name another part).
    const more = [...[4, 5, 6, 7].flatMap((variant) => getWorksheet(mission.id, variant)).flatMap((problem) => [problem.prompt, problem.answer, problem.hint, problem.why ?? '']),
      ...[3, 4, 5].flatMap((batch) => getBuildPracticeChecks(mission.id, batch)).flatMap((check) => [check.prompt, ...check.reasons, check.explanation]),
      ...[6, 7, 8, 9].map((round) => getReviewCheck(mission.id, round)).flatMap((check) => [check.prompt, ...check.reasons, check.explanation])];
    [...lessonText(mission.id), ...more].forEach((text) => {
      for (const match of text.matchAll(PART_NAME_WORD)) note(match[0].toLowerCase(), [lesson, AFTER_IDEAS], text);
    });
  });
  // Every spelled-out name is one the course teaches: the Words screen's, or a New word card's.
  const known = new Set([...FRACTION_WORDS.rows.flatMap((row) => [PART_NAMES[row.d]!.one, PART_NAMES[row.d]!.many]), ...names.flatMap((name) => [name.one, name.many]), 'quarter', 'quarters']);
  const unknown = [...said].filter(([name]) => !known.has(name) && !/^\d+ths$/.test(name)).map(([name, [lesson, , text]]) => `${name} (lesson ${lesson + 1}): "${text}"`);
  assert.deepEqual(unknown, [], 'a part name with no entry in PART_NAMES');
  for (const { d, one, many } of names) {
    const first = [one, many].map((name) => said.get(name)).filter((use): use is [number, number, string] => !!use)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    if (!first) continue;
    // Taught by: a Learn page of an idea (a word card for "one fifth"), or the New word card at the top of a lesson page.
    const ideaCard = MISSIONS.flatMap((mission, lesson) => (LESSON_IDEAS[mission.id] ?? []).flatMap((idea, k) =>
      idea.learn.some((page) => 'words' in page && page.words.some((word) => word.term === `one ${one}`)) ? [[lesson, k] as [number, number]] : []));
    const labCard = MISSIONS.flatMap((mission, lesson) => (newWordsFor(mission.id).includes(d) ? [[lesson, AFTER_IDEAS - 1] as [number, number]] : []));
    const taught = [...ideaCard, ...labCard].sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    assert.ok(taught, `${many}: said in lesson ${first[0] + 1} ("${first[2]}"), but no card teaches it`);
    assert.ok(taught[0] < first[0] || (taught[0] === first[0] && taught[1] <= first[1]),
      `${many}: first said in lesson ${first[0] + 1}${first[1] < AFTER_IDEAS ? ` idea ${first[1] + 1}` : ''} ("${first[2]}"), but taught only in lesson ${taught[0] + 1}${taught[1] < AFTER_IDEAS - 1 ? ` idea ${taught[1] + 1}` : ' (lesson page)'}`);
  }
});
