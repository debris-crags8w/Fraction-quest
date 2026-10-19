import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS } from './game';
import { SECRETS } from './riddles';
import { recordStory, type FunState } from './lib/fun';
import { CHAPTERS, CHAPTER_SCENES, CHARACTERS, EPILOGUE, PROLOGUE, chapterEnd, PROPS, REACTIONS, STONE_PIECES, STORY_PROBLEMS, WHOLE_STONE_OPENING, chapterFor, lessonCliff, lessonComic, stoneQuestion, storyAsk, storyReaction, withName, type PropTheme } from './story';

const lessonsIn = (unit: number) => MISSIONS.filter((mission) => mission.unit === unit);

test('one chapter per unit, one stone piece per chapter', () => {
  const units = [...new Set(MISSIONS.map((mission) => mission.unit))].sort((a, b) => a - b);
  assert.deepEqual(CHAPTERS.map((chapter) => chapter.unit), units);
  assert.equal(CHAPTERS.length, STONE_PIECES);
  assert.deepEqual(Object.keys(CHAPTER_SCENES).map(Number), units);
});

test('every lesson has a scene and a cliffhanger, and every chapter a full script', () => {
  for (const chapter of CHAPTERS) {
    const lessons = lessonsIn(chapter.unit).length;
    assert.equal(chapter.scenes.length, lessons - 1, `${chapter.title}: a scene for each lesson after the first`);
    assert.equal(chapter.cliffs.length, lessons - 1, `${chapter.title}: a cliffhanger for each lesson before the last`);
    assert.equal(chapter.intro[0].speaker, chapter.character, `${chapter.title}: the friend opens the comic`);
    assert.equal(chapter.choice.length, 2);
    const lines = [chapter.title, chapter.cliff, chapter.clue, chapter.thanks, chapter.done, chapter.card.title, chapter.card.blurb,
      ...chapter.scenes, ...chapter.cliffs, ...chapter.intro.map((panel) => panel.text),
      ...chapter.choice.flatMap((option) => [option.label, option.detail, option.reply.text])];
    for (const text of lines) {
      assert.ok(text.length > 0 && text.length <= 120, `${chapter.title}: "${text}" is short`);
      assert.doesNotMatch(text, /\s{2}/);
    }
    for (const option of chapter.choice) assert.ok(option.label.split(' ').length <= 6, `${option.label}: 6 words or fewer`);
    assert.ok(CHARACTERS[chapter.character]);
  }
});

test('question lines set the scene without numbers, so they cannot hint at an answer', () => {
  for (const chapter of CHAPTERS) for (const line of chapter.asks) {
    assert.doesNotMatch(line, /\d/, `${chapter.title}: ${line}`);
    assert.ok(line.length <= 90);
  }
  assert.equal(storyAsk(chapterFor(1)!, 'q-7'), storyAsk(chapterFor(1)!, 'q-7'));
});

test('the mystery: clues point at Chomp, chapter 8 reveals Bolt, chapter 11 Bolt owns up', () => {
  assert.match(CHAPTERS.slice(0, 5).map((chapter) => chapter.clue).join(' '), /footprints|teeth|boots/i);
  assert.match(chapterFor(8)!.intro.map((panel) => panel.text).join(' '), /boots.*Bolt|Bolt.*boots/);
  assert.match(chapterFor(11)!.intro[0].text, /sorry/i);
  assert.match(chapterFor(15)!.done, /whole again/i);
});

test('the story opening explains the cracked-stone quest without spoiling the mystery', () => {
  assert.match(WHOLE_STONE_OPENING, /Whole Stone/);
  assert.match(WHOLE_STONE_OPENING, /15 equal pieces/);
  assert.match(WHOLE_STONE_OPENING, /scatter across town/);
  assert.match(WHOLE_STONE_OPENING, /discover who cracked it/);
  assert.doesNotMatch(WHOLE_STONE_OPENING, /Bolt/);
  assert.match(withName(WHOLE_STONE_OPENING, 'Sam'), /Sam, the Whole Stone/);
  assert.match(withName(WHOLE_STONE_OPENING, null), /Friend, the Whole Stone/);
});

test('comics: the intro opens a chapter; later lessons get the friend, the lesson and its idea', () => {
  const chapter = chapterFor(1)!;
  const [first, second, third] = lessonsIn(1);
  assert.equal(lessonComic(chapter, first, 0), chapter.intro);
  const panels = lessonComic(chapter, second, 1);
  assert.deepEqual(panels.map((panel) => panel.speaker), ['chomp', 'numi', 'hoot']);
  assert.equal(panels[0].text, chapter.scenes[0]);
  assert.equal(panels[2].text, second.skill);
  assert.equal(lessonComic(chapter, third, 2)[0].text, chapter.scenes[1]);
});

test('cliffhangers: each lesson’s own, then the chapter’s at the end', () => {
  const chapter = chapterFor(1)!;
  assert.equal(lessonCliff(chapter, 0, 3), chapter.cliffs[0]);
  assert.equal(lessonCliff(chapter, 1, 3), chapter.cliffs[1]);
  assert.equal(lessonCliff(chapter, 2, 3), chapter.cliff);
});

test('the child’s name goes into the story, with a kind fallback', () => {
  assert.equal(withName(PROLOGUE[PROLOGUE.length - 1].text, 'Sam').startsWith('Sam, we need you!'), true);
  assert.equal(withName(PROLOGUE[PROLOGUE.length - 1].text, '  ').startsWith('Friend, we need you!'), true);
  assert.equal(withName('No name here.', 'Sam'), 'No name here.');
});

test('story progress saves the prologue and each chapter’s choice, and drops bad data', () => {
  let fun = { story: { choices: { '1': 1, x: 0, '2': 5 } } } as unknown as FunState;
  fun = recordStory(fun, { prologueSeen: true });
  fun = recordStory(fun, { unit: 3, choice: 0 });
  assert.deepEqual(fun.story, { prologueSeen: true, choices: { '1': 1, '3': 0 } });
});

test('friend reactions cheer or encourage with words only, for every chapter friend', () => {
  for (const chapter of CHAPTERS) {
    const lines = REACTIONS[chapter.character];
    assert.ok(lines.right.length >= 2 && lines.retry.length >= 2, chapter.character);
    for (const line of [...lines.right, ...lines.retry]) {
      assert.doesNotMatch(line, /\d/, line);
      assert.ok(line.length <= 40, line);
    }
  }
  assert.ok(REACTIONS.chomp.right.includes(storyReaction('chomp', 'correct', 'q-1')));
  assert.ok(REACTIONS.chomp.retry.includes(storyReaction('chomp', 'retry', 'q-1')));
  assert.equal(storyReaction('bea', 'retry', 'q-9'), storyReaction('bea', 'retry', 'q-9'));
});

const numbersIn = (text: string) => (text.match(/\d+/g) ?? []).sort();
const everyStoryLine = () => [
  WHOLE_STONE_OPENING,
  ...PROLOGUE.map((panel) => panel.text),
  ...CHAPTERS.flatMap((chapter) => [chapter.title, chapter.cliff, chapter.clue, chapter.thanks, chapter.done, chapter.card.title, chapter.card.blurb,
    ...chapter.scenes, ...chapter.cliffs, ...chapter.asks, ...chapter.intro.map((panel) => panel.text),
    ...chapter.choice.flatMap((option) => [option.label, option.detail, option.reply.text])]),
  ...Object.values(STORY_PROBLEMS).flatMap((problem) => [problem.setup, problem.prompt, problem.result, ...(problem.choices ?? [])]),
  ...SECRETS,
];

test('seasonal props fill every blank in every theme, and only nouns change', () => {
  const keys = Object.keys(PROPS.everyday).sort();
  for (const theme of Object.keys(PROPS) as PropTheme[]) {
    assert.deepEqual(Object.keys(PROPS[theme]).sort(), keys, `${theme} has every prop`);
    for (const value of Object.values(PROPS[theme])) assert.doesNotMatch(value, /\d/);
    for (const line of everyStoryLine()) {
      const filled = withName(line, 'Sam', theme);
      assert.doesNotMatch(filled, /[{}]/, `${theme}: "${line}"`);
      assert.deepEqual(numbersIn(filled), numbersIn(line), `${theme}: numbers stay the same in "${line}"`);
    }
  }
  assert.equal(withName('I cut the festival {cake}.', null, 'halloween'), 'I cut the festival pumpkin pie.');
  assert.equal(withName('Share the {snacks}, {name}!', 'Sam', 'everyday'), 'Share the snacks, Sam!');
});

test('story problems keep the lesson checkpoint: same numbers, same answer, words only before it', () => {
  for (const [missionId, problem] of Object.entries(STORY_PROBLEMS)) {
    const mission = MISSIONS.find((item) => item.id === missionId);
    assert.ok(mission, `${missionId} is a lesson`);
    assert.ok(chapterFor(mission.unit), `${missionId} is in a chapter`);
    const checkpoint = mission.questions[mission.questions.length - 1];
    assert.deepEqual(numbersIn(problem.prompt), numbersIn(checkpoint.prompt), `${missionId}: the prompt keeps every number`);
    if (problem.choices) {
      assert.equal(problem.choices.length, checkpoint.choices.length);
      problem.choices.forEach((choice, index) => assert.deepEqual(numbersIn(choice), numbersIn(checkpoint.choices[index]), `${missionId}: choice ${index}`));
    }
    assert.doesNotMatch(problem.setup, /\d/, `${missionId}: the setup line cannot hint`);
    for (const text of [problem.setup, problem.result]) assert.ok(text.length <= 120, text);
    assert.ok(problem.prompt.length <= 140, problem.prompt);
  }
  // Every lesson in every chapter ends with a story problem.
  for (const mission of MISSIONS) assert.ok(STORY_PROBLEMS[mission.id], `${mission.id} has a story problem`);
});

test('the stone question: the right fraction once, with three mix-ups, for every chapter', () => {
  for (let found = 1; found <= STONE_PIECES; found++) {
    const { choices, correct } = stoneQuestion(found);
    assert.equal(choices.length, 4);
    assert.equal(new Set(choices).size, 4);
    assert.equal(choices[correct], `${found}/${STONE_PIECES}`);
  }
});

test('the storyline holds together: the opening sets up the case and pieces, every chapter ends with a piece and a clue, and the ending pays it off', () => {
  const opening = PROLOGUE.map((panel) => panel.text).join(' ');
  assert.match(opening, /15 equal pieces/);
  assert.match(opening, /glass case/);
  assert.match(opening, /Numi/);
  assert.match(opening, /Hoot/);
  assert.equal(CHAPTERS.length, STONE_PIECES);
  CHAPTERS.forEach((chapter, index) => {
    assert.equal(chapter.unit, index + 1);
    const end = chapterEnd(chapter);
    assert.equal(end.length, 3);
    assert.equal(end[0].speaker, chapter.character);
    assert.match(end[1].text, new RegExp(chapter.clue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  // The glass case snapped shut in the prologue, so chapters 13 and 14 open it to put the pieces back.
  assert.match(chapterFor(13)!.cliff, /glass case/);
  assert.match(chapterFor(14)!.intro[0].text, /glass case/);
  // Pip crosses the broken bridge in chapter 4; Bolt's machine fixes it for good in chapter 11.
  assert.match(chapterFor(4)!.done, /still needs new planks/);
  assert.ok(chapterFor(11)!.cliffs.some((line) => /bridge is fixed/.test(line)));
  const ending = EPILOGUE.map((panel) => panel.text).join(' ');
  assert.match(ending, /glows again/);
  assert.match(ending, /Keeper of the Whole Stone/);
  assert.ok(EPILOGUE.some((panel) => panel.speaker === 'bolt'), 'Bolt says sorry at the festival');
});
