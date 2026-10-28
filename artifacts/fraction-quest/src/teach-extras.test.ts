import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHALLENGES } from './challenges';
import { MISSIONS } from './game';
import { FRACTION_WORDS, PART_NAMES } from './intro-copy';
import { getBuildChecks, getBuildPracticeChecks, getReviewCheck, getWorksheet } from './learning-content';
import { LESSON_IDEAS, type LearnPage } from './lesson-ideas';
import { LESSON_INTROS } from './lesson-intros';
import { sayFraction } from './lib/voice';
import { newWordsFor } from './new-words';
import { generateQuestions, getExtraPractice, hasGenerator } from './practice-bank';
import { chapterFor, lessonCliff, lessonComic, storyProblemFor } from './story';
import { TAUGHT_IN, TEACH_EXTRAS } from './teach-extras';
import { LESSON_SCENES, type SceneRow } from './teach-scenes';

const pictures = (row: SceneRow): SceneRow[] => (row.kind === 'pair' ? row.items : [row]);
const lessonIndex = (id: string) => MISSIONS.findIndex((mission) => mission.id === id);

/** A unit's Unit challenge (it unlocks when the unit's last lesson is done): puzzles, their steps and explanations. */
const challengeText = (unit: number): string[] => (CHALLENGES[unit] ?? []).flatMap((item) => [item.prompt, ...item.choices, item.explanation,
  ...(item.steps ?? []).flatMap((step) => [step.prompt, ...step.choices])]);

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
  // Teach first on the lesson page: its Words to know cards and extra worked examples (a card or example is teaching
  // for its own lesson, but a screen of the lessons before it).
  const extras = TEACH_EXTRAS[missionId];
  const challenge = at === unitLessons.length - 1 ? challengeText(mission.unit) : [];
  const builds = [...getBuildChecks(missionId), ...[0, 1, 2].flatMap((batch) => getBuildPracticeChecks(missionId, batch)), ...[0, 1, 2, 3, 4, 5].map((round) => getReviewCheck(missionId, round))];
  return [
    mission.shortTitle, // the lesson's header, and the "Quick review" tag on later reviews of it
    ...ideaScreens(missionId).flatMap(({ learn, practice }) => [...learn, ...practice]),
    ...questions.flatMap((question) => [question.prompt, ...(question.choices ?? []), question.hint ?? '', question.retryFeedback ?? '', ...pictureText(question.model), ...pictureText(question.simplerModel)]),
    ...(story ? [story.setup, story.prompt, ...(story.choices ?? []), story.result] : []),
    ...(chapter ? [...lessonComic(chapter, mission, at).map((panel) => panel.text), lessonCliff(chapter, at, unitLessons.length), ...chapter.asks,
      ...(at === 0 ? chapter.choice.flatMap((option) => [option.label, option.detail, option.reply.text]) : []), chapter.thanks,
      ...(at === unitLessons.length - 1 ? [chapter.won, chapter.done, chapter.clue, chapter.card.title, chapter.card.blurb] : [])] : []),
    ...challenge,
    ...(extras?.words ?? []).flatMap((word) => [word.term, word.meaning, ...pictureText(word.picture)]),
    ...(extras?.examples ?? []).flatMap((item) => [item.title, ...pictureText(item.picture)]),
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
    // Also: lesson 1's Words screen ("also: one quarter") and the lesson page's New word card for a part name.
    const wordsScreen = lesson === MISSIONS[0]!.id ? FRACTION_WORDS.rows.map((row) => `${row.word} ${row.also ?? ''}`) : [];
    const newWordCards = newWordsFor(lesson).map((d) => `${PART_NAMES[d]!.one} ${PART_NAMES[d]!.many}`);
    const teaching = [...(TEACH_EXTRAS[lesson]?.words ?? []).map((word) => word.meaning), ...wordsScreen, ...newWordCards, intro.goal, ...intro.steps, intro.why,
      ...(LESSON_IDEAS[lesson] ?? []).flatMap((idea) => idea.learn.flatMap(learnText))].join(' ');
    assert.match(teaching, pattern, `${lesson} teaches ${term}`);
  }
  const early = TAUGHT_IN.flatMap(({ term, pattern, lesson }) => MISSIONS.slice(0, lessonIndex(lesson)).flatMap((mission) =>
    practiceText(mission.id).filter((text) => pattern.test(text)).map((text) => `${mission.id} uses ${term} before ${lesson}: "${text}"`)));
  assert.deepEqual([...new Set(early)], []);
});

/** Units of measure and their facts: each is taught (Words to know or a Learn page) where a child first meets it. */
const UNITS_TAUGHT = TAUGHT_IN.filter((row) => row.unit);

test('nothing is taught after a screen uses it: no screen of an earlier lesson (not only practice) uses a taught term, and a unit is taught on a Learn page before its lesson practises it', () => {
  assert.ok(UNITS_TAUGHT.length >= 15, 'the units and unit facts are listed');
  const early = TAUGHT_IN.flatMap(({ term, pattern, lesson }) => MISSIONS.slice(0, lessonIndex(lesson)).flatMap((mission) =>
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
const PART_NAME_WORD = /\b(?:halves|quarters?|twentieths?|thirty-seconds?|[a-z]*(?:fif|six|seven|eigh|nin|ten|elev|twelf|hundred|thousand|teen|ieth|four)[a-z]*ths?|\d+ths)\b/gi;

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
  const late: string[] = [];
  for (const { d, one, many } of names) {
    const first = [one, many].map((name) => said.get(name)).filter((use): use is [number, number, string] => !!use)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    if (!first) continue;
    // Taught by: a Learn page of an idea (a word card for "one fifth"), or the New word card at the top of a lesson page.
    const ideaCard = MISSIONS.flatMap((mission, lesson) => (LESSON_IDEAS[mission.id] ?? []).flatMap((idea, k) =>
      idea.learn.some((page) => 'words' in page && page.words.some((word) => word.term === `one ${one}`)) ? [[lesson, k] as [number, number]] : []));
    const labCard = MISSIONS.flatMap((mission, lesson) => (newWordsFor(mission.id).includes(d) ? [[lesson, AFTER_IDEAS - 1] as [number, number]] : []));
    const taught = [...ideaCard, ...labCard].sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    if (!taught) { late.push(`${many}: said in lesson ${first[0] + 1} ("${first[2]}"), but no card teaches it`); continue; }
    if (!(taught[0] < first[0] || (taught[0] === first[0] && taught[1] <= first[1]))) {
      late.push(`${many}: first said in lesson ${first[0] + 1}${first[1] < AFTER_IDEAS ? ` idea ${first[1] + 1}` : ''} ("${first[2]}"), but taught only in lesson ${taught[0] + 1}${taught[1] < AFTER_IDEAS - 1 ? ` idea ${taught[1] + 1}` : ' (lesson page)'}`);
    }
  }
  assert.deepEqual(late, []);
});

/** Words to know: a term here that no TAUGHT_IN row covers must still not be used earlier, as a word, on any screen. */
const WORD_EXEMPT: Readonly<Record<string, string>> = {
  '×': 'whole-number times facts (3 × 2 = 6) are grade 3 and used to rename fractions; the card teaches a fraction × a number, which has its own TAUGHT_IN row',
};

test('a Words-to-know term no TAUGHT_IN row covers is not used on any screen of an earlier lesson', () => {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const early: string[] = [];
  let checked = 0;
  for (const [id, extras] of Object.entries(TEACH_EXTRAS)) {
    for (const word of extras.words ?? []) {
      // Covered: a row at this lesson or earlier names it (symbols are matched with their spaces: " = ").
      const covered = TAUGHT_IN.some((row) => lessonIndex(row.lesson) <= lessonIndex(id) && (row.pattern.test(word.term) || row.pattern.test(` ${word.term} `)));
      if (covered || word.term in WORD_EXEMPT) continue;
      checked += 1;
      const pattern = /^\w/.test(word.term) && /\w$/.test(word.term) ? new RegExp(`\\b${escape(word.term)}\\b`, 'i') : new RegExp(`(?<![\\w])${escape(word.term)}(?![\\w])`);
      for (const mission of MISSIONS.slice(0, lessonIndex(id))) {
        for (const text of lessonText(mission.id)) if (pattern.test(text)) early.push(`${mission.id} uses "${word.term}" before ${id}: "${text}"`);
      }
    }
  }
  assert.ok(checked >= 1, 'a word card with no TAUGHT_IN row of its own is checked here (multiples)');
  assert.deepEqual([...new Set(early)], []);
});

/** Every fraction a/d (d of 2 or more) written on a screen whose denominator Listen can name ("1/16" is read "one
    sixteenth"): each denominator is taught by a card (the first-lesson Words screen, a word card on an idea's Learn page
    or the lesson page's New word card) at or before the first screen that writes it. Screens are read in the order a
    child meets them: the Words screen, then each idea (Learn pages one by one, then its practices), then the rest of the
    lesson page (a New word card sits at its top). */
const WRITTEN_FRACTION = /(\d+)\s*\/\s*(\d+)/g;
type Place = [lesson: number, idea: number, page: number];
const WORDS_SCREEN: Place = [0, -1, 0];
const LAB_CARD_IDEA = 98;
const REST_OF_LESSON = 99;
const PRACTICE_PAGE = 1000;
const before = (a: Place, b: Place) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Denominators Listen names with a part name rather than "over". */
const namedByListen = (d: number) => d >= 2 && !sayFraction(1, d).includes(' over ');

/** Every write of a denominator Listen names, in the order a child meets the screens (the same fraction twice on one
    screen is one write). */
function writtenFractionUses(): Array<{ d: number; at: Place; text: string; source: string }> {
  const uses: Array<{ d: number; at: Place; text: string; source: string }> = [];
  const seen = new Set<string>();
  let source = '';
  const note = (text: string, at: Place) => {
    for (const match of text.matchAll(WRITTEN_FRACTION)) {
      const d = Number(match[2]);
      if (!namedByListen(d)) continue;
      const key = `${d}|${at.join('.')}|${source}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uses.push({ d, at, text, source });
    }
  };
  MISSIONS.forEach((mission, lesson) => {
    const ideas = LESSON_IDEAS[mission.id] ?? [];
    const questions = [...mission.questions, ...(mission.ideaQuestions ?? [])];
    ideas.forEach((idea, k) => {
      source = 'Learn page';
      idea.learn.forEach((page, j) => learnText(page).forEach((text) => note(text, [lesson, k, j])));
      source = 'idea practice';
      idea.practice.forEach((item) => {
        if (!('question' in item)) return;
        const q = questions.find((question) => question.id === item.question)!;
        [q.prompt, ...q.choices, q.hint, q.retryFeedback, ...pictureText(q.model), ...pictureText(q.simplerModel)].forEach((text) => note(text ?? '', [lesson, k, PRACTICE_PAGE]));
      });
    });
    // The rest of the lesson page and everything generated for it: more of every kind than a child sees in one sitting.
    const rest: Array<[string, string]> = [];
    const add = (label: string, ...texts: string[]) => texts.forEach((text) => rest.push([label, text]));
    add('lesson page, story or Practice more', ...lessonText(mission.id));
    const seeds = hasGenerator(mission.id) ? Array.from({ length: 150 }, (_, seed) => seed) : [];
    for (const seed of seeds) {
      for (const q of generateQuestions(mission.id, mission.questions.map((question) => question.id), seed, 12)) {
        add(`Practice more (seed ${seed})`, q.prompt, ...q.choices, q.hint ?? '', q.retryFeedback ?? '', ...pictureText(q.model), ...pictureText(q.simplerModel));
      }
    }
    for (let variant = 0; variant <= 24; variant++) {
      for (const problem of getWorksheet(mission.id, variant)) add(`worksheet sheet ${variant}`, problem.prompt, problem.answer, problem.hint, problem.why ?? '', ...pictureText(problem.picture));
    }
    for (let batch = 0; batch < 6; batch++) {
      for (const check of getBuildPracticeChecks(mission.id, batch)) add(`Build it practice ${batch}`, check.prompt, ...check.reasons, check.explanation);
    }
    for (let round = 0; round < 12; round++) {
      const check = getReviewCheck(mission.id, round);
      add(`review round ${round}`, check.prompt, ...check.reasons, check.explanation);
    }
    rest.forEach(([label, text]) => { source = label; note(text, [lesson, REST_OF_LESSON, 0]); });
  });
  return uses;
}

/** Where each denominator's card is: the earliest of the Words screen, an idea's Learn page, the lesson page's card. */
function cardPlaces(d: number): Place[] {
  const name = PART_NAMES[d];
  if (!name) return [];
  const places: Place[] = [];
  if (FRACTION_WORDS.rows.some((row) => row.d === d)) places.push(WORDS_SCREEN);
  MISSIONS.forEach((mission, lesson) => {
    (LESSON_IDEAS[mission.id] ?? []).forEach((idea, k) => idea.learn.forEach((page, j) => {
      if ('words' in page && page.words.some((word) => word.term === `one ${name.one}`)) places.push([lesson, k, j]);
    }));
    if (newWordsFor(mission.id).includes(d)) places.push([lesson, LAB_CARD_IDEA, 0]);
  });
  return places.sort(before);
}

/** Lessons whose own content writes a part name before its card, and that nothing has decided yet: a question, a Unit
    challenge puzzle or a worked sum that is about the part ("Which is bigger, 1/5 or 1/3?"). Generic wrong choices (a
    part count one more, or doubled: 1/5, 1/12, 7/15) never need one: they use only parts taught by then (taught-parts.ts),
    so a "Practice more" question is never listed here. Fixing one of these means a card in an earlier lesson or
    another example, then deleting the lesson from its list (each listed lesson must still write the name early). */
const CONTENT_BEFORE_ITS_CARD: Readonly<Record<number, readonly number[]>> = {
  5: [4, 5, 6, 7], // Unit 1 challenge "1/5 of a toy train"; lesson 5 "1/5 or 1/3" and "1/2 or 1/5"; the Unit 2 challenge "3/5 or 3/8" and "2/3, 2/9, 2/5"; lesson 7 "3/5 more or less than 1/2"
  9: [6, 16, 47], // the Unit 2 challenge "2/3, 2/9, 2/5"; the Unit 5 challenge "smallest: 2/9, 2/7, 2/4, 2/5"; the Unit 9 challenge "NOT the same as 1/2: 4/9"
  10: [16, 19], // the Unit 5 challenge "biggest: 3/10, 5/10, 7/10, 6/10"; lesson 19's first idea (its New word card sits after the ideas)
  12: [19], // lesson 19's first idea
};

test('every written fraction whose denominator Listen names is taught by a card at or before the screen that writes it', () => {
  const late: string[] = [];
  const uses = writtenFractionUses();
  const early = new Map<string, { d: number; lesson: number; text: string; source: string; card?: number }>();
  for (const use of uses) {
    const card = cardPlaces(use.d)[0];
    if (card && before(card, use.at) <= 0) continue;
    const lesson = use.at[0] + 1;
    const key = `${use.d}|${lesson}|${use.source.replace(/\(seed \d+\)/, '')}`;
    if (!early.has(key)) early.set(key, { d: use.d, lesson, text: use.text, source: use.source, card: card?.[0] });
  }
  for (const { d, lesson, text, source, card } of early.values()) {
    const where = `lesson ${lesson}${source.startsWith('Learn') || source === 'idea practice' ? '' : ` (${source})`}`;
    if (card === undefined) late.push(`${d}: written in ${where} ("${text}", ${source}), but no card teaches it`);
    else if (source.startsWith('Practice more') || !CONTENT_BEFORE_ITS_CARD[d]?.includes(lesson)) late.push(`${d}: written in ${where} ("${text}", ${source}), but its card is in lesson ${card + 1}`);
  }
  assert.deepEqual(late, []);
  // A listed lesson still writes its name before the card; otherwise it comes off the list.
  for (const [d, lessons] of Object.entries(CONTENT_BEFORE_ITS_CARD)) {
    for (const lesson of lessons) {
      assert.ok([...early.values()].some((use) => use.d === Number(d) && use.lesson === lesson), `${d}: lesson ${lesson} no longer writes it before its card: delete it from CONTENT_BEFORE_ITS_CARD`);
    }
  }
  // The scan really reads the screens that write part names: it finds the denominators the course uses.
  const found = new Set(uses.map((use) => use.d));
  for (const d of [3, 7, 16, 32, 50, 100]) assert.ok(found.has(d), `${d} is written somewhere`);
});

test('Listen and the New word cards name the same parts: every denominator Listen can name has a part name that matches', () => {
  const named = Array.from({ length: 300 }, (_, i) => i).filter(namedByListen);
  assert.deepEqual(named.filter((d) => !PART_NAMES[d]), [], 'a part name Listen says that no card teaches');
  assert.ok(named.length >= 20, 'Listen names the common denominators');
  for (const d of Object.keys(PART_NAMES).map(Number)) {
    assert.equal(sayFraction(1, d), `one ${PART_NAMES[d]!.one}`, `${d}: one part`);
    assert.equal(sayFraction(3, d), `three ${PART_NAMES[d]!.many}`, `${d}: parts`);
  }
});
