/* Storyline guards (rescore package N): what the story says must match the lesson it comes before, the ending must be
   reachable by the normal flow, and a returning child has something new after it. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS, type Mission } from './game';
import { LESSON_IDEAS } from './lesson-ideas';
import { SECRETS, dailySecret, lanternCard, mysteryOfTheWeek } from './riddles';
import { CHAPTERS, EPILOGUE, STORY_PROBLEMS, STONE_PIECES, chapterEnd, chapterFor, endingAfterChapter, lessonComic, stoneQuestion, storyLessonTitle, thanksFor, withName, type Chapter } from './story';

const lessonsIn = (unit: number) => MISSIONS.filter((mission) => mission.unit === unit);
const plain = (text: string) => withName(text, null, 'everyday');

/** The story problem a child meets at the end of a lesson in story mode: its setup, question, choices and result. */
function storyProblemText(mission: Mission): string {
  const problem = STORY_PROBLEMS[mission.id]!;
  const checkpoint = mission.questions[mission.questions.length - 1]!;
  return plain([problem.setup, problem.prompt, ...(problem.choices ?? checkpoint.choices), problem.result].join(' ')).toLowerCase();
}

/** The things a scene can name: props the lesson's story problem has to show too (stems, so "leaf" matches "leaves"). */
const PROPS: [string, RegExp][] = [
  ['pebbles', /pebble/], ['leaves', /\bleaf\b|\bleaves\b/], ['beakers', /beaker/], ['rain barrel', /barrel/], ['ribbon', /ribbon/], ['sand', /\bsand/],
  ['loaves', /\bloaf\b|\bloaves\b/], ['pie', /\bpies?\b/], ['cake', /\bcakes?\b/], ['jars', /\bjars?\b/], ['jug', /\bjug\b/], ['wire', /\bwire\b/],
  ['reed', /\breed\b/], ['boards', /\bboards?\b/], ['cups', /\bcups?\b/], ['rope', /\brope\b/], ['paint', /\bpaint/], ['nails', /\bnails?\b/],
  ['sandwiches', /sandwich/], ['nuts', /\bnuts?\b/], ['planks', /\bplanks?\b/], ['batteries', /batter/], ['seeds', /\bseeds?\b/], ['clay', /\bclay\b/],
  ['honey', /\bhoney\b/], ['tower', /\btower\b/], ['recipe', /\brecipe\b/], ['drinks', /\bdrinks?\b|lemonade|juice|cocoa/], ['snacks', /\bsnacks?\b|\bcandy\b|\bcandies\b/],
];
/** A scene may name something only the lesson page shows (a pet name of the machine, say): none today. */
const SCENE_ONLY: Record<string, string[]> = {};

test('a lesson scene names only things its story problem shows (no pebbles scene before a leaves question)', () => {
  const bad: string[] = [];
  for (const chapter of CHAPTERS) lessonsIn(chapter.unit).forEach((mission, index) => {
    if (index === 0) return;
    const scene = plain(chapter.scenes[index - 1]!).toLowerCase();
    const problem = storyProblemText(mission);
    for (const [name, pattern] of PROPS) {
      if (pattern.test(scene) && !pattern.test(problem) && !(SCENE_ONLY[mission.id] ?? []).includes(name)) bad.push(`ch${chapter.unit} lesson ${index + 1} (${mission.id}): the scene says ${name}, the story problem does not: "${chapter.scenes[index - 1]}"`);
    }
  });
  assert.deepEqual(bad, []);
});

test('the story problem and the lesson agree in the same lesson (ch8 pie, ch7 split, ch9 leaves, ch12 rain barrel, sand and loaves)', () => {
  const scene = (id: string) => { const m = MISSIONS.find((item) => item.id === id)!; const c = chapterFor(m.unit)!; return plain(lessonComic(c, m, lessonsIn(m.unit).indexOf(m))[0]!.text).toLowerCase(); };
  const cliffAfter = (id: string) => { const m = MISSIONS.find((item) => item.id === id)!; const c = chapterFor(m.unit)!; const i = lessonsIn(m.unit).indexOf(m); return plain(i >= lessonsIn(m.unit).length - 1 ? c.cliff : c.cliffs[i]!).toLowerCase(); };
  assert.match(scene('plot-in-eighths'), /leaves/); assert.doesNotMatch(scene('plot-in-eighths'), /pebble/);
  assert.doesNotMatch(cliffAfter('plot-in-eighths'), /pebble/, 'the cliff after the leaves lesson is about leaves');
  assert.match(scene('line-plot-totals'), /barrel/); assert.doesNotMatch(cliffAfter('line-plot-totals'), /beaker/);
  assert.match(scene('two-step-conversions'), /sand|curtain/); assert.doesNotMatch(scene('two-step-conversions') + cliffAfter('two-step-conversions'), /ribbon/);
  assert.match(scene('fractional-sharing'), /loaf|loaves/); assert.match(storyProblemText(MISSIONS.find((m) => m.id === 'fractional-sharing')!), /loaf/);
  assert.doesNotMatch(storyProblemText(MISSIONS.find((m) => m.id === 'fractional-sharing')!), /ribbon/, 'choices say loaf, so the question must too');
  assert.match(scene('unit-fraction-multiples'), /pie/); assert.doesNotMatch(scene('unit-fraction-multiples'), /beep/);
  assert.doesNotMatch(scene('decompose-fractions'), /split this whole/, 'the lesson breaks a fraction apart');
});

/** A lesson's checkpoint: the numbers it asks about and the right answer. */
const checkpoint = (mission: Mission) => {
  const last = mission.questions[mission.questions.length - 1]!;
  return `${(last.prompt.match(/\d+/g) ?? []).join(',')} => ${plain(last.choices[last.correctChoice]!)}`;
};

test('no two lessons in a chapter in a row end on the same checkpoint (ch8 hundredths and tenths-to-decimals)', () => {
  const same: string[] = [];
  for (const chapter of CHAPTERS) {
    const lessons = lessonsIn(chapter.unit);
    lessons.slice(1).forEach((mission, i) => { if (checkpoint(mission) === checkpoint(lessons[i]!)) same.push(`ch${chapter.unit}: ${lessons[i]!.id} and ${mission.id} both end on ${checkpoint(mission)}`); });
  }
  assert.deepEqual(same, []);
});

test('a "Hundredths" lesson ends on a hundredths question', () => {
  const mission = MISSIONS.find((item) => item.id === 'hundredths-decimals')!;
  assert.match(STORY_PROBLEMS[mission.id]!.prompt, /\/100|hundredths/);
  assert.match(mission.questions.at(-1)!.prompt, /\/100|hundredths/, 'the lesson\'s own checkpoint, not only its story words');
});

const every = (text: string) => plain(text).toLowerCase();
const numbersAndFractions = (text: string) => [...new Set(text.match(/\d+\/\d+|\d+/g) ?? [])];
/** Everything a chapter's lessons put on a child's screen as math: questions, examples, story problems. */
function chapterMath(chapter: Chapter): string {
  return lessonsIn(chapter.unit).flatMap((mission) => [
    ...mission.questions, ...(mission.ideaQuestions ?? []),
  ].flatMap((q) => [q.prompt, ...q.choices]).concat(mission.example.prompt, mission.example.answer, mission.example.explanation,
    STORY_PROBLEMS[mission.id]?.prompt ?? '', STORY_PROBLEMS[mission.id]?.result ?? '',
    ...(LESSON_IDEAS[mission.id] ?? []).flatMap((idea) => idea.learn.map((page) => ('text' in page ? page.text : ''))))).map(every).join(' ');
}

test('the numbers in every chapter\'s "How the math won it" line appear in that chapter\'s lessons or its opening', () => {
  const missing: string[] = [];
  for (const chapter of CHAPTERS) {
    const math = `${chapterMath(chapter)} ${chapter.intro.map((panel) => every(panel.text)).join(' ')}`;
    for (const token of numbersAndFractions(every(chapter.won))) if (!new RegExp(`(^|[^\\d/])${token.replace('/', '\\/')}($|[^\\d/])`).test(math)) missing.push(`ch${chapter.unit}: "${chapter.won}" has ${token}, the lessons do not`);
  }
  assert.deepEqual(missing, []);
});

test('chapter 8\'s won line says what the money lesson found (38/100 of a dollar), not one whole dollar', () => {
  assert.match(chapterFor(8)!.won, /38\/100|38 hundredths/);
  assert.doesNotMatch(chapterFor(8)!.won, /1 whole dollar/);
  assert.match(STORY_PROBLEMS['dimes-and-pennies']!.result, /38\/100/);
});

test('chapter 3 keeps one timeline: the cliff after lesson 2 does not reach the top before lesson 3 is "exactly halfway"', () => {
  const ch3 = chapterFor(3)!;
  assert.doesNotMatch(ch3.cliffs[1]!, /top|stone piece/i, 'lesson 2 ends before the top');
  assert.match(STORY_PROBLEMS['fraction-magnitude']!.result, /halfway/);
  assert.match(ch3.cliff, /top/, 'the top is reached after the last lesson');
  assert.match(ch3.cliff, /stone piece/);
  assert.doesNotMatch(ch3.cliffs[0]!, /^Halfway up/, 'halfway comes in lesson 3');
});

test('the first-choice path tells every clue a chapter puts in the notebook (green tail, pointy teeth, matching teeth marks, Chomp\'s writing)', () => {
  const told = (chapter: Chapter) => plain([...chapter.intro.map((p) => p.text), ...chapter.scenes, ...chapter.cliffs, chapter.cliff, chapter.done].join(' ')).toLowerCase();
  assert.match(told(chapterFor(2)!), /green tail/);
  assert.match(told(chapterFor(3)!), /pointy teeth|teeth marks/);
  assert.match(told(chapterFor(4)!), /teeth marks/);
  assert.match(told(chapterFor(4)!), /match|same/);
  assert.match(told(chapterFor(6)!), /chomp.s writing|writing is chomp/);
});

test('chapters 8, 9 and 12 thank the child differently after each lesson, and each line fits its lesson', () => {
  for (const unit of [8, 9, 12]) {
    const chapter = chapterFor(unit)!;
    const lessons = lessonsIn(unit);
    const lines = lessons.slice(0, -1).map((_, index) => thanksFor(chapter, index));
    assert.equal(new Set(lines).size, lines.length, `chapter ${unit}: no thank-you repeats`);
    for (const line of lines) assert.ok(line.length > 0 && line.length <= 90, line);
  }
  // A chapter with a single line still thanks the same way every time.
  assert.equal(thanksFor(chapterFor(2)!, 0), chapterFor(2)!.thanks);
  assert.equal(thanksFor(chapterFor(1)!, 1), chapterFor(1)!.thanks);
});

test('chapter 12 lessons 4 to 11 and chapter 9 lessons 7 to 9 each carry a thread: a deadline, a missing piece or something at stake', () => {
  const THREAD = /tomorrow|before the show|deadline|noon|missing|gone|snap|loose|creak|flicker|dark|stuck|only|last|left|oil|sniff|trail|disappear|swinging|wind|torn|runs? off|in time|late|hungry|stolen|ruined|wobbl/i;
  const weak: string[] = [];
  const check = (unit: number, from: number, to: number) => {
    const chapter = chapterFor(unit)!;
    for (let lesson = from; lesson <= to; lesson++) {
      const cliff = lesson === lessonsIn(unit).length ? chapter.cliff : chapter.cliffs[lesson - 1]!;
      const scene = chapter.scenes[lesson - 2]!;
      if (!THREAD.test(plain(cliff)) && !THREAD.test(plain(scene))) weak.push(`ch${unit} lesson ${lesson}: "${scene}" / "${cliff}"`);
    }
  };
  check(12, 4, 11);
  check(9, 7, 9);
  assert.deepEqual(weak, []);
  // And no two of those cliffs say the same thing.
  const cliffs = [...chapterFor(12)!.cliffs.slice(3), chapterFor(9)!.cliffs[6]!, chapterFor(9)!.cliffs[7]!];
  assert.equal(new Set(cliffs).size, cliffs.length);
});

test('clue cards tell a clue, not a status (ch12 to 14)', () => {
  assert.doesNotMatch(chapterFor(12)!.clue, /is ready/);
  assert.doesNotMatch(chapterFor(14)!.clue, /^The case is open$/);
});

test('"Bonus" lessons that the story needs are not called Bonus in story mode', () => {
  const needed = MISSIONS.filter((mission) => mission.enrichment && chapterFor(mission.unit));
  assert.deepEqual(needed.map((mission) => mission.id), ['fraction-probability', 'fractions-to-percent', 'percent-to-fraction', 'divide-fractions']);
  for (const mission of needed) {
    assert.doesNotMatch(storyLessonTitle(mission.title, true), /bonus/i);
    assert.doesNotMatch(storyLessonTitle(mission.shortTitle, true), /bonus/i);
    assert.match(storyLessonTitle(mission.title, false), /^Bonus/, 'with the story off the title is untouched');
    const chapter = chapterFor(mission.unit)!;
    assert.doesNotMatch(lessonComic(chapter, mission, lessonsIn(mission.unit).indexOf(mission)).map((panel) => panel.text).join(' '), /bonus/i);
  }
  assert.equal(storyLessonTitle('Bonus: Chance as a fraction', true), 'Chance as a fraction');
  assert.equal(storyLessonTitle('Two-step stories', true), 'Two-step stories');
});

test('later lessons do not all open their comic with the same "Let’s help! Today’s lesson is" line', () => {
  const lines = CHAPTERS.flatMap((chapter) => lessonsIn(chapter.unit).slice(1).map((mission, i) => lessonComic(chapter, mission, i + 1)[1]!.text));
  const stems = new Set(lines.map((line) => line.split(' ').slice(0, 3).join(' ')));
  assert.ok(stems.size >= 3, [...stems].join(' | '));
  for (const line of lines) { assert.ok(line.length <= 110, line); assert.doesNotMatch(line, /[?!.]\./, 'no double stop ("parts fit?.")'); }
});

/* ---------- the ending ---------- */

test('the ending is reachable by the normal flow: each chapter\'s film comes after its stone piece, and the last one plays the finale once', () => {
  assert.equal(CHAPTERS.at(-1)!.unit, MISSIONS.at(-1)!.unit, 'the last lesson is in the last chapter');
  for (let found = 1; found < STONE_PIECES; found++) {
    assert.equal(endingAfterChapter({ piecesFound: found, epilogueSeen: false }), 'chapter-end');
    assert.equal(endingAfterChapter({ piecesFound: found, epilogueSeen: true }), 'chapter-end');
  }
  assert.equal(stoneQuestion(STONE_PIECES).choices[stoneQuestion(STONE_PIECES).correct], '15/15', 'the last stone question can be answered');
  assert.equal(endingAfterChapter({ piecesFound: STONE_PIECES, epilogueSeen: false }), 'epilogue', 'plays by itself the first time');
  assert.equal(endingAfterChapter({ piecesFound: STONE_PIECES, epilogueSeen: true }), 'chapter-end', 'a child who has seen it is not forced to watch it again');
  assert.equal(endingAfterChapter({ piecesFound: 0, epilogueSeen: false }), null);
});

test('the epilogue keeps its beats, with line counts that stay modest for the voice pack', () => {
  assert.ok(EPILOGUE.length >= 5 && EPILOGUE.length <= 7);
  assert.ok(EPILOGUE.some((panel) => panel.speaker === 'bolt' && /sorry/.test(panel.text)));
  assert.ok(EPILOGUE.some((panel) => panel.speaker === 'chomp' && /brave/.test(panel.text)));
  assert.ok(EPILOGUE.some((panel) => /Keeper of the Whole Stone/.test(panel.text)));
  assert.match(EPILOGUE.at(-1)!.text, /riddle/);
  for (const chapter of CHAPTERS) assert.equal(chapterEnd(chapter).length, 4);
});

/* ---------- after the ending ---------- */

test('there are 80 or more secrets and no secret repeats within 80 days', () => {
  assert.ok(SECRETS.length >= 80, `${SECRETS.length} secrets`);
  assert.equal(new Set(SECRETS).size, SECRETS.length, 'no secret is written twice');
  const start = Date.UTC(2026, 9, 29);
  const days = Array.from({ length: 80 }, (_, i) => new Date(start + i * 86_400_000).toISOString().slice(0, 10));
  for (const afterEnding of [false, true]) {
    const seen = days.map((day) => dailySecret(day, afterEnding));
    // The ending's pool is the bigger one; before the ending the pool is smaller but still never repeats within its own length.
    const window = afterEnding ? 80 : Math.min(30, new Set(seen).size);
    for (let i = 0; i + window <= seen.length; i++) assert.equal(new Set(seen.slice(i, i + window)).size, window, `${afterEnding ? 'after' : 'before'} the ending, day ${i}`);
  }
});

test('after the ending, Chomp has a mystery of the week tied to the lantern, and it changes weekly', () => {
  const hook = (day: string) => mysteryOfTheWeek(day);
  assert.equal(hook('2026-10-26'), hook('2026-11-01'), 'the same all week (Monday to Sunday)');
  assert.notEqual(hook('2026-10-26'), hook('2026-11-02'));
  const weeks = new Set(Array.from({ length: 12 }, (_, i) => hook(new Date(Date.UTC(2026, 9, 26) + i * 7 * 86_400_000).toISOString().slice(0, 10))));
  assert.ok(weeks.size >= 12, 'twelve different weeks before one repeats');
  for (const week of weeks) { assert.match(week, /lantern/i); assert.ok(week.length <= 120, week); assert.doesNotMatch(week, /\d/); }
});

test('a secret before the ending never gives the ending away', () => {
  for (let i = 0; i < 40; i++) {
    const day = new Date(Date.UTC(2026, 9, 29) + i * 86_400_000).toISOString().slice(0, 10);
    assert.doesNotMatch(dailySecret(day, false), /Keeper|festival night|whole again|cracked it|forgave/i);
  }
});

test('before chapter 7 teaches fractions bigger than one whole, the stone question has none among its choices', () => {
  const improper = (choice: string) => { const [n, d] = choice.split('/').map(Number); return n! > d!; };
  for (let found = 1; found <= 6; found++) {
    const { choices, correct } = stoneQuestion(found);
    assert.deepEqual(choices.filter(improper), [], `chapter ${found}: ${choices.join(' ')}`);
    assert.equal(choices[correct], `${found}/${STONE_PIECES}`);
    assert.equal(new Set(choices).size, 4);
  }
  assert.ok(stoneQuestion(7).choices.some(improper), 'from chapter 7 on, the mix-up 15/7 is fair');
});

test('the lantern card points to Chomp\'s mystery of the week only after the ending, and only in story mode', () => {
  const base = { streak: 3, oil: 1, litToday: false, dailyDone: false };
  assert.deepEqual(lanternCard({ ...base, storyOn: true }).notes, []);
  assert.deepEqual(lanternCard({ ...base, storyOn: true, afterEnding: true }).notes, ['Chomp’s mystery of the week is waiting.']);
  assert.match(lanternCard({ ...base, storyOn: true, afterEnding: true }).spoken, /mystery of the week/);
  assert.deepEqual(lanternCard({ ...base, storyOn: false, afterEnding: true }).notes, []);
});
