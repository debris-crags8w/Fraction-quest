/* Storyline guards (rescore package N): what the story says must match the lesson it comes before, the ending must be
   reachable by the normal flow, and a returning child has something new after it. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS, type Mission } from './game';
import { LESSON_IDEAS } from './lesson-ideas';
import { SECRETS, dailySecret, lanternCard, mysteryAnswer, mysteryOfTheWeek, riddleSetup } from './riddles';
import { BOARD_CASES, CHAPTERS, EPILOGUE, PROP_THEMES, STORY_PROBLEMS, STONE_PIECES, chapterEnd, chapterFor, endingAfterChapter, lessonCliff, lessonComic, stoneQuestion, storyLessonTitle, thanksFor, withName, type Chapter, type CharacterId } from './story';

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
  assert.notEqual(thanksFor(chapterFor(3)!, 0), thanksFor(chapterFor(3)!, 1), 'a jug and a plant are thanked differently');
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

/* ---------- Package D: story fit (rescore 2) ---------- */
const lessonStory = () => CHAPTERS.flatMap((chapter) => lessonsIn(chapter.unit).map((mission, index, all) => {
  const problem = STORY_PROBLEMS[mission.id]!;
  const last = index === all.length - 1;
  return { chapter, mission, index, last, problem, scene: index === 0 ? null : plain(lessonComic(chapter, mission, index)[0]!.text), cliff: last ? null : plain(chapter.cliffs[index]!), thanks: last ? plain(chapter.done) : plain(thanksFor(chapter, index)) };
}));
const STOP = new Set('this that with from have your what when then they them their there here just some more much very into over only also about which would could will were been does like help okay let’s lets it’s i’m can’t don’t'.split(' '));
const stems = (text: string) => new Set((text.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((word) => !STOP.has(word)).map((word) => word.replace(/^slices?$/, 'piece').replace(/(ies|es|s)$/, '')));

test('the friend\'s scene is about the lesson it comes before: it shares a noun with the story problem, and is not the problem\'s own setup line', () => {
  for (const { mission, scene, problem } of lessonStory()) {
    if (scene === null) continue;
    const told = stems(`${plain(problem.setup)} ${plain(problem.prompt)} ${plain(problem.result)}`);
    assert.ok([...stems(scene)].some((word) => told.has(word)), `${mission.id}: the scene "${scene}" names nothing the question is about`);
    assert.notEqual(scene, plain(problem.setup), `${mission.id}: the scene repeats the setup word for word`);
  }
  // The area lesson's cake is round (its scene said "tray"); the benchmark lesson's question is about a sunflower on the hill.
  const area = lessonStory().find(({ mission }) => mission.id === 'fraction-of-area')!;
  assert.doesNotMatch(`${area.scene} ${area.problem.setup}`, /tray/i);
});

test('a friend\'s thanks line is not the same sentence more than 3 times in a chapter', () => {
  for (const chapter of CHAPTERS) {
    const lines = lessonsIn(chapter.unit).slice(0, -1).map((_, index) => plain(thanksFor(chapter, index)));
    const counts = new Map<string, number>();
    for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1);
    for (const [line, times] of counts) assert.ok(times <= 3, `${chapter.title}: "${line}" is said ${times} times`);
  }
});

test('no cliff contradicts the result it follows, and the story never settles a thread early', () => {
  for (const { mission, index, last, chapter, problem, cliff } of lessonStory()) {
    const result = plain(problem.result);
    // A jug that is 1/4 full is not "full"; a pair of boots fixed in the result do not still need a part in the cliff.
    if (cliff && /\d\/\d full/.test(plain(problem.prompt))) assert.doesNotMatch(cliff, /\bfull\b/, `${mission.id}: ${cliff}`);
    if (cliff && /fixed/i.test(result)) assert.doesNotMatch(cliff, /needs? a new part|costs? money/i, `${mission.id}: ${cliff}`);
    if (cliff && /\bone plank to go\b|\b5\/6\b/.test(result)) assert.doesNotMatch(cliff, /halfway/i, `${mission.id}: ${cliff}`);
    // Arriving home happens once, at the chapter's end (lessons 12 and 14 both said it).
    if (!last) for (const text of [result, cliff ?? '']) assert.doesNotMatch(text, /\b(is|got|made it|gets) home\b/i, `${mission.id}: ${text}`);
    // The stone piece is found at the chapter's last lesson, not in a cliff before it.
    if (cliff) assert.doesNotMatch(cliff, /stone piece[^.!]*\b(free|pops? out|drops? out|dug up|digs? up|lands? right on)\b|\b(digs? up|wiggles?|lands? right on)\b[^.!]*stone piece/i, `${mission.id}: the piece is found early: ${cliff}`);
    void index; void chapter;
  }
  // A result that says the jug "needs to hold more" is answered by the chapter's end.
  const portions = lessonStory().find(({ mission }) => mission.id === 'party-portions')!;
  assert.match(portions.problem.result, /more than 2 liters/);
  assert.match(plain(portions.chapter.done), /bigger jug/i);
  // "How much is left" with a sum needs two things left over.
  const estimate = lessonStory().find(({ mission }) => mission.id === 'estimate-fraction-operations')!;
  assert.match(`${estimate.problem.setup} ${estimate.problem.prompt}`, /leftover|in all/i);
});

test('the last stone piece, the chapter 9, 10, 14 and 15 pieces are placed where the story says they were found', () => {
  for (const unit of [4, 7, 8, 9, 10, 11, 12, 13, 14, 15]) assert.match(plain(chapterFor(unit)!.done), /piece/i, `chapter ${unit}'s last line holds the stone piece`);
  assert.match(plain(chapterFor(15)!.done), /under the stage/i, 'chapter 15 says where the last piece was');
});

test('a mystery of the week is answered the next Monday, in words, and the answer is not the question', () => {
  const monday = (week: number) => new Date(Date.UTC(2026, 9, 26) + week * 7 * 86_400_000).toISOString().slice(0, 10);
  const answers = new Set<string>();
  for (let week = 0; week < 24; week++) {
    const day = monday(week);
    const answer = mysteryAnswer(day);
    assert.equal(mysteryAnswer(new Date(Date.parse(day) + 6 * 86_400_000).toISOString().slice(0, 10)), answer, 'the same answer all week');
    assert.notEqual(answer, mysteryOfTheWeek(day));
    assert.ok(answer.length <= 130 && !/\d/.test(answer), answer);
    assert.match(answer, /^Last week/);
    answers.add(answer);
  }
  assert.equal(answers.size, 12, 'one answer for each of the twelve mysteries');
  // Next Monday answers this week\'s mystery: the question asked in week w is the one answered in week w + 1.
  const reveals = Array.from({ length: 12 }, (_, week) => mysteryAnswer(monday(week + 1)));
  assert.equal(new Set(reveals).size, 12);
  for (let week = 0; week < 12; week++) assert.equal(mysteryAnswer(monday(week + 1)), mysteryAnswer(monday(week + 1)));
});

test('an everyday secret does not name Bolt\'s rocket boots before chapter 5 brings them in', () => {
  for (let i = 0; i < 90; i++) assert.doesNotMatch(dailySecret(new Date(Date.UTC(2026, 9, 29) + i * 86_400_000).toISOString().slice(0, 10), false), /rocket boots|\bboots\b/i);
});

/* ---------- Storyline rescore 3 (wave 4) ---------- */

/** A number a story line can name: a mixed number, a fraction, a decimal or a whole number, as an exact-enough value. */
const NUMBER = String.raw`\d+ \d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?`;
const valueOf = (text: string): number => {
  const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(text);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = /^(\d+)\/(\d+)$/.exec(text);
  return fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(text);
};
/** "5/6 + 1/2", "2 3/5 − 1 1/2" or "3/4 × 20", left to right (story lines use one operation at a time). */
const evaluate = (expression: string): number => {
  const parts = expression.split(/\s*([+−×÷])\s*/);
  let total = valueOf(parts[0]!);
  for (let i = 1; i < parts.length; i += 2) {
    const next = valueOf(parts[i + 1]!);
    total = parts[i] === '+' ? total + next : parts[i] === '−' ? total - next : parts[i] === '×' ? total * next : total / next;
  }
  return total;
};
const EXPRESSION = String.raw`(?:${NUMBER})(?:\s*[+−×÷]\s*(?:${NUMBER}))*`;
const RELATION = String.raw`\s*(=|>|<|is more than|is less than)\s*`;
/** Every claim a line makes between two numbers ("5/6 is more than 1/2", "0.8 > 0.75 > 0.09", "1/2 + 1/2 = 1"). */
function claims(text: string): { left: string; relation: string; right: string; at: number }[] {
  const found: { left: string; relation: string; right: string; at: number }[] = [];
  const chain = new RegExp(`(?<![\\d/.])${EXPRESSION}(?:${RELATION}${EXPRESSION})+`, 'g');
  for (const match of text.matchAll(chain)) {
    const pieces = match[0].split(new RegExp(RELATION));
    for (let i = 0; i + 2 < pieces.length; i += 2) found.push({ left: pieces[i]!, relation: pieces[i + 1]!, right: pieces[i + 2]!, at: match.index! });
  }
  return found;
}
const holds = ({ left, relation, right }: { left: string; relation: string; right: string }) => {
  const a = evaluate(left); const b = evaluate(right);
  return relation === '=' ? Math.abs(a - b) < 1e-9 : relation === '>' || relation === 'is more than' ? a > b : a < b;
};

test('every comparison a result states is true, and a "so" names the fact it rests on (5/6 > 1/2 alone does not make 5/6 + 1/2 > 1)', () => {
  let checked = 0;
  for (const [id, problem] of Object.entries(STORY_PROBLEMS)) {
    const result = plain(problem.result);
    for (const claim of claims(result)) { checked++; assert.ok(holds(claim), `${id}: "${claim.left} ${claim.relation} ${claim.right}" is not true in "${result}"`); }
    // "A, so B + C is more than N": the reason before "so" must reach N, with a fact that equals it.
    for (const sentence of result.split(/(?<=[.!?])\s+/)) {
      const [reason, conclusion] = sentence.split(/,? so /);
      if (!conclusion) continue;
      for (const claim of claims(conclusion)) {
        if (!/[+−]/.test(claim.left) || claim.relation === '=') continue;
        const bound = evaluate(claim.right);
        assert.ok(claims(reason!).some((fact) => fact.relation === '=' && Math.abs(evaluate(fact.right) - bound) < 1e-9),
          `${id}: "${sentence}" says ${claim.left} ${claim.relation} ${claim.right} without a reason that reaches ${claim.right}`);
      }
    }
  }
  assert.ok(checked >= 15, `only ${checked} comparisons checked`);
  assert.ok(holds(claims('0.8 > 0.75 > 0.09')[1]!));
  assert.equal(holds({ left: '5/6 + 1/2', relation: 'is less than', right: '1' }), false);
});

test('a friend never names themself in the third person (the friend\'s own face is on the panel)', () => {
  const ownName = (speaker: string, text: string) => new RegExp(`\\b${speaker.charAt(0).toUpperCase()}${speaker.slice(1)}\\b`).test(text.replace(/Team Chomp/g, '').replace(/^I’m \w+/, ''));
  for (const chapter of CHAPTERS) {
    const said: [string, string][] = [
      ...chapter.intro.map((panel): [string, string] => [panel.speaker, panel.text]),
      ...chapter.choice.map((option): [string, string] => [option.reply.speaker, option.reply.text]),
      ...[...chapter.scenes, ...chapter.asks, ...[chapter.thanks].flat(), chapter.done].map((text): [string, string] => [chapter.character, text]),
      ...lessonsIn(chapter.unit).map((mission): [string, string] => [chapter.character, STORY_PROBLEMS[mission.id]!.setup]),
    ];
    for (const [speaker, text] of said) assert.ok(!ownName(speaker, text), `chapter ${chapter.unit}: ${speaker} says "${text}"`);
  }
  // The riddle screen is Chomp's too ("Chomp: ..."): his set-ups, secrets and each mystery of the week and its ending.
  const weeks = Array.from({ length: 12 }, (_, week) => new Date(Date.UTC(2026, 10, 2 + week * 7)).toISOString().slice(0, 10));
  const riddleLines = [...[0, 1, 2, 3, 4].map((index) => riddleSetup(index, 5)), ...SECRETS, ...weeks.flatMap((day) => [mysteryOfTheWeek(day), mysteryAnswer(day)])];
  for (const text of riddleLines) assert.ok(!ownName('chomp', text), `riddles: chomp says "${text}"`);
});

test('the story matches its lessons: one missing number, one last line, a strap then a different part, pie on the picnic, one loaf', () => {
  const sceneBefore = (missionId: string) => {
    const mission = MISSIONS.find((item) => item.id === missionId)!;
    const index = lessonsIn(mission.unit).indexOf(mission);
    return plain(lessonComic(chapterFor(mission.unit)!, mission, index).map((panel) => panel.text).join(' '));
  };
  const cliffAfter = (missionId: string) => {
    const mission = MISSIONS.find((item) => item.id === missionId)!;
    return plain(chapterFor(mission.unit)!.cliffs[lessonsIn(mission.unit).indexOf(mission)]!);
  };
  const thanksAfter = (missionId: string) => {
    const mission = MISSIONS.find((item) => item.id === missionId)!;
    return plain(thanksFor(chapterFor(mission.unit)!, lessonsIn(mission.unit).indexOf(mission)));
  };
  // D3: every question in this lesson has one missing number.
  for (const question of MISSIONS.find((mission) => mission.id === 'equivalent-missing-both')!.questions) assert.doesNotMatch(question.prompt, /\?.*\?/);
  assert.doesNotMatch(`${sceneBefore('equivalent-missing-both')} ${thanksAfter('equivalent-missing-both')}`, /two numbers|both numbers|find both/i);
  // D4: Bolt's note has one last line, read after the riddle lesson.
  const note = chapterFor(8)!;
  const lastLines = [...note.scenes, ...note.cliffs].filter((line) => /\blast line\b/i.test(line));
  assert.deepEqual(lastLines, [note.cliffs[note.cliffs.length - 1]]);
  // D5: the strap is fixed in its own lesson; the part that costs money is something else, named.
  assert.match(cliffAfter('compare-decimals-grid'), /strap/i);
  assert.match(cliffAfter('add-tenths-hundredths'), /spring/i);
  assert.doesNotMatch(cliffAfter('add-tenths-hundredths'), /\bthe part\b/i);
  // D9: the picnic packs pie; the stage crew has one loaf; the lights have a reason to need rain; the stone glows whole only at the end.
  assert.match(plain(chapterFor(10)!.intro[0].text), /\bpie\b/);
  assert.match(sceneBefore('fractional-sharing'), /loaves/, 'the scene agrees with the cliff before it and the lesson: loaves');
  assert.match(cliffAfter('two-step-conversions'), /loaves/);
  assert.doesNotMatch(`${sceneBefore('line-plot-totals')} ${plain(STORY_PROBLEMS['line-plot-totals']!.setup)}`, /lights need water/i);
  assert.doesNotMatch(plain(STORY_PROBLEMS['divide-fractions']!.result), /whole again/i);
});

test('chapter 1 says where its stone piece went: dug out of the crumbs', () => {
  assert.match(plain(chapterFor(1)!.done), /piece/i);
  assert.match(plain(chapterFor(1)!.done), /crumbs|dug/i);
});

test('no friend says the same thanks more than twice in a chapter', () => {
  for (const chapter of CHAPTERS) {
    const counts = new Map<string, number>();
    for (const line of lessonsIn(chapter.unit).slice(0, -1).map((_, index) => plain(thanksFor(chapter, index)))) counts.set(line, (counts.get(line) ?? 0) + 1);
    for (const [line, times] of counts) assert.ok(times <= 2, `${chapter.title}: "${line}" is said ${times} times`);
  }
});

test('each chapter asks its own stone question, with plausible mix-ups and no empty stone', () => {
  const questions = new Set<string>();
  for (let found = 1; found <= STONE_PIECES; found++) {
    const { question, choices, correct } = stoneQuestion(found);
    assert.equal(choices[correct], `${found}/${STONE_PIECES}`);
    assert.equal(new Set(choices).size, 4);
    for (const choice of choices) assert.doesNotMatch(choice, /^0\//, `${found}: ${choices.join(' ')}`);
    assert.match(question, /Whole Stone|stone/);
    assert.match(question, /\?$/);
    assert.doesNotMatch(question, /\d|\blast\b|\bfirst\b|\ball\b|\bevery\b/i, 'the words do not count the pieces for the child');
    assert.ok(question.split(' ').length <= 15, question);
    questions.add(question);
  }
  assert.equal(questions.size, STONE_PIECES, 'a different sentence for every chapter');
});

test('an after-ending secret does not move the stone out of its glass case', () => {
  for (const secret of SECRETS) assert.doesNotMatch(secret, /glass case[^.]*\bholds\b(?![^.]*stone)/i, secret);
});

/* ---------- rescore 4 (storyline S2 to S7): who is where, thanks that fit, no beat said twice ---------- */

const missionById = (id: string) => MISSIONS.find((mission) => mission.id === id)!;
const indexIn = (id: string) => lessonsIn(missionById(id).unit).indexOf(missionById(id));
const sceneOf = (id: string) => plain(lessonComic(chapterFor(missionById(id).unit)!, missionById(id), indexIn(id))[0]!.text);
const cliffOf = (id: string) => { const m = missionById(id); const c = chapterFor(m.unit)!; return plain(lessonCliff(c, indexIn(id), lessonsIn(m.unit).length)); };
const thanksOf = (id: string) => plain(thanksFor(chapterFor(missionById(id).unit)!, indexIn(id)));

/** Things that belong to one friend: the chapter friend never calls them "my" unless they are theirs. */
const OWNED: Record<CharacterId, string[]> = {
  bolt: ['boot', 'boots', 'boot meter', 'rocket boots', 'battery', 'batteries', 'machine', 'workshop', 'water wheel', 'parts box', 'robot'],
  chomp: ['tower', 'den', 'snack jar', 'teeth', 'riddle', 'riddles'],
  pip: ['pond', 'lily pad', 'pond party'],
  tilly: ['race map', 'shell'],
  bea: ['honey', 'honey jars', 'hive', 'flower bed', 'honey shop', 'garden'],
};
test('a friend never says "my" about another friend\'s thing (Chomp\'s "my boot meter" is Bolt\'s)', () => {
  const bad: string[] = [];
  for (const chapter of CHAPTERS) {
    const said = [...chapter.scenes, ...chapter.asks, ...[chapter.thanks].flat(), chapter.done, chapter.intro[0].text,
      ...lessonsIn(chapter.unit).map((mission) => STORY_PROBLEMS[mission.id]!.setup)].map(plain);
    for (const [owner, things] of Object.entries(OWNED) as [CharacterId, string[]][]) {
      if (owner === chapter.character) continue;
      for (const line of said) for (const thing of things) {
        if (new RegExp(`\\bmy (?:\\w+ )?${thing}\\b`, 'i').test(line)) bad.push(`ch${chapter.unit} (${chapter.character}) says "my ${thing}", which is ${owner}'s: "${line}"`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test('Bolt is hiding in chapter 8: he talks through his note, and never brings or does anything at the den', () => {
  for (const mission of lessonsIn(8)) {
    const problem = STORY_PROBLEMS[mission.id]!;
    for (const text of [problem.setup, problem.prompt, problem.result]) {
      assert.doesNotMatch(plain(text), /\bBolt (?:brought|brings|adds|picks|checks|puts|says|comes)\b/, `${mission.id}: "${text}"`);
    }
  }
});

test('a thanks line fits the result it sits above (no "fair share" after unequal pieces, no "where I am" after a jug)', () => {
  const bad: string[] = [];
  for (const chapter of CHAPTERS) lessonsIn(chapter.unit).slice(0, -1).forEach((mission, index) => {
    const thanks = plain(thanksFor(chapter, index));
    const problem = STORY_PROBLEMS[mission.id]!;
    const told = plain(`${problem.prompt} ${problem.result}`);
    if (/\bfair/i.test(thanks) && !/fair|equal|each|share/i.test(told)) bad.push(`${mission.id}: "${thanks}" after "${problem.result}"`);
    if (/where I am/i.test(thanks) && !/halfway|way up|top|path/i.test(told)) bad.push(`${mission.id}: "${thanks}" after "${problem.result}"`);
    if (/dial/i.test(thanks) && /dial/i.test(plain(problem.result))) bad.push(`${mission.id}: the dial is told twice: "${thanks}" and "${problem.result}"`);
  });
  assert.deepEqual(bad, []);
});

test('after a lesson the payoff tells each beat once, and the next checkpoint is not answered by it (ch14 dials)', () => {
  // One payoff box: the thanks, the result and the cliff say "the dial turns" once between them.
  const payoff = `${thanksOf('fractions-to-percent')} ${plain(STORY_PROBLEMS['fractions-to-percent']!.result)} ${cliffOf('fractions-to-percent')}`;
  assert.ok((payoff.match(/dial (?:turns|turned)/gi) ?? []).length <= 1, payoff);
  // A percent the next lesson's checkpoint asks about is not stated in the result just before it.
  for (const chapter of CHAPTERS) {
    const lessons = lessonsIn(chapter.unit);
    lessons.slice(1).forEach((next, i) => {
      const asked = next.questions.at(-1)!.prompt.match(/\d+%/g) ?? [];
      const before = plain(STORY_PROBLEMS[lessons[i]!.id]!.result);
      for (const percent of asked) assert.ok(!before.includes(percent), `${lessons[i]!.id} result "${before}" answers ${next.id}'s ${percent}`);
    });
  }
});

test('the boards and chapters 9, 10 and 13 do not repeat or blur a beat', () => {
  // S4: chapter 8 already told why Bolt is sorry (the boots bumped the stone), so board 3 does not ask it again.
  assert.doesNotMatch(BOARD_CASES[3]!.right, /why is he so sorry/i);
  // S6: the picnic's first sum is not a basket; the cliff after it is the intro's basket (1/2 + 1/4).
  assert.doesNotMatch(plain(STORY_PROBLEMS['add-related-fractions']!.result), /basket/i);
  assert.match(cliffOf('add-related-fractions'), /1\/2 \+ 1\/4/);
  for (const chapter of CHAPTERS) for (const panel of chapter.intro) assert.ok(panel.text.split(/\s+/).length <= 20, `ch${chapter.unit} intro: "${panel.text}"`);
  // S7: one robot bolt on the race trail; the case is shut, not snapping shut again; who ate the sandwiches.
  assert.ok(chapterFor(9)!.cliffs.filter((line) => /robot bolt/i.test(line)).length <= 1);
  assert.doesNotMatch(chapterFor(13)!.cliffs.join(' '), /snapped shut/i);
  assert.match(plain(STORY_PROBLEMS['subtract-unlike-fractions']!.prompt), /The team ate/);
  assert.doesNotMatch(sceneOf('subtract-unlike-fractions'), /\bI ate\b/);
  // S7: a scene is about the lesson's own problem (boot charge, Chomp's pie), not only the note.
  assert.match(sceneOf('tenths-decimals'), /boot|charge/i);
  assert.doesNotMatch(sceneOf('unit-fraction-multiples'), /riddle/i);
  // L67: loaves are loaves, not "loaves, starting with one loaf"; the one loaf is the story problem's own.
  assert.ok(!(/loaves/i.test(sceneOf('fractional-sharing')) && /one loaf/i.test(sceneOf('fractional-sharing'))), sceneOf('fractional-sharing'));
});

test('every mystery of the week asks a question it can answer, and no secret names an event the story never had', () => {
  for (let week = 0; week < 12; week++) {
    const day = new Date(Date.UTC(2026, 10, 2 + week * 7)).toISOString().slice(0, 10);
    const ask = mysteryOfTheWeek(day);
    assert.match(ask, /\?$/, ask);
    assert.doesNotMatch(ask, /has clues/i, `${ask}: no clues are shown`);
  }
  for (const secret of SECRETS) assert.doesNotMatch(secret, /festival race/i, secret);
});

/** Everything a child reads around one lesson in story mode: the comic panels, the setup, the thanks (or the chapter's
    last words) and the cliffhanger. */
function lessonLines(mission: Mission) {
  const chapter = chapterFor(mission.unit)!;
  const index = lessonsIn(mission.unit).indexOf(mission);
  const last = index === lessonsIn(mission.unit).length - 1;
  return { chapter, index, last, comic: lessonComic(chapter, mission, index).map((panel) => panel.text), setup: STORY_PROBLEMS[mission.id]!.setup,
    thanks: last ? chapter.done : thanksFor(chapter, index), cliff: lessonCliff(chapter, index, lessonsIn(mission.unit).length) };
}

test('no line opener is said more than twice in one lesson\'s scene, setup and thanks ("Okay, okay" three times is a tic)', () => {
  const repeats: string[] = [];
  MISSIONS.forEach((mission, n) => {
    const { index, comic, setup, thanks } = lessonLines(mission);
    const lines = [...(index === 0 ? [] : [comic[0]!]), setup, thanks].map(plain);
    const counts = new Map<string, number>();
    for (const line of lines) {
      const openers = new Set(line.split(/(?<=[.!?…])\s+/).map((sentence) => sentence.split(/[,.!?…:]/)[0]!.trim().toLowerCase()).filter(Boolean));
      for (const opener of openers) counts.set(opener, (counts.get(opener) ?? 0) + 1);
    }
    for (const [opener, count] of counts) if (count > 2) repeats.push(`L${n + 1} ${mission.id}: "${opener}" ${count} times`);
  });
  assert.deepEqual(repeats, []);
});

test('no lesson-panel line runs over 22 words, in any theme (comic panels, setup, thanks, cliffhanger)', () => {
  const long = new Map<string, number>();
  MISSIONS.forEach((mission, n) => {
    const { comic, setup, thanks, cliff } = lessonLines(mission);
    for (const theme of PROP_THEMES) for (const line of [...comic, setup, thanks, cliff]) {
      const words = withName(line, null, theme).split(/\s+/).filter(Boolean).length;
      const key = `L${n + 1} ${mission.id}: ${line}`;
      if (words > 22) long.set(key, Math.max(words, long.get(key) ?? 0));
    }
  });
  assert.deepEqual([...long].map(([line, words]) => `${line} (${words} words)`), []);
});

test('chapter 14\'s last box says the case opens once, and Hoot credits the story dial too', () => {
  const chapter = chapterFor(14)!;
  const mission = lessonsIn(14)[lessonsIn(14).length - 1]!;
  const box = [chapter.done, STORY_PROBLEMS[mission.id]!.result, chapter.clue, chapter.won, chapter.cliff].map(plain);
  assert.equal(box.filter((line) => /case opens|opened the case|case is open/i.test(line)).length, 1, box.join(' | '));
  assert.match(chapter.won, /story|step/i, 'the last dial was a two-step story problem');
  // No four-word run is said in three lines of any chapter's last box.
  for (const ch of CHAPTERS) {
    const lastMission = lessonsIn(ch.unit)[lessonsIn(ch.unit).length - 1]!;
    const lines = [ch.done, STORY_PROBLEMS[lastMission.id]!.result, ch.clue, ch.won, ch.cliff].map((line) => plain(line).toLowerCase().replace(/[^a-z0-9/ ]/g, ' ').split(/\s+/).filter(Boolean));
    const seen = new Map<string, number>();
    for (const words of lines) for (const run of new Set(words.slice(0, -3).map((_, i) => words.slice(i, i + 4).join(' ')))) seen.set(run, (seen.get(run) ?? 0) + 1);
    for (const [run, count] of seen) assert.ok(count <= 2, `ch${ch.unit}: "${run}" in ${count} lines`);
  }
});

test('story continuity: Bolt\'s gone sandwich, Pip\'s stage, and the wet-paint footprints paid off in chapter 13', () => {
  // N3: Bolt's saved sandwich is gone (L49), so the picnic's later result saves him another one, not "a sandwich".
  assert.match(chapterFor(10)!.cliffs[1]!, /sandwich is gone/);
  assert.doesNotMatch(plain(STORY_PROBLEMS['mixed-unlike-operations']!.result), /\ba sandwich left for Bolt/i);
  assert.match(plain(STORY_PROBLEMS['mixed-unlike-operations']!.result), /another|new|one more/i);
  // N3: the stage is Pip's problem in chapter 12, so chapter 11 neither gives it to Bea nor solves it first.
  const stageLines = [...chapterFor(11)!.cliffs, chapterFor(11)!.cliff].filter((line) => /stage/i.test(line));
  for (const line of stageLines) {
    assert.doesNotMatch(line, /\bBea\b/, line);
    assert.doesNotMatch(line, /just right|sizes the parts/i, line);
  }
  // N6: the board 4 footprints (chapter 12's wet paint) are explained in chapter 13's story for a child who skips the board.
  const ch13 = chapterFor(13)!;
  const told = [...ch13.intro.map((panel) => panel.text), ...ch13.scenes, ...ch13.cliffs, ch13.cliff, ch13.done].join(' ');
  assert.match(told, /Pip[^.!?]*paint|paint[^.!?]*Pip/, 'chapter 13 says the wet-paint prints were Pip\'s');
});
