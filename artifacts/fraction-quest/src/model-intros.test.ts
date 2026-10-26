import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { recordIntro, replaceFun } from './lib/fun';
import { INTRO_TEXT, introSpeech } from './intro-copy';

describe('model intro steps (Watch, then Try)', () => {
  it('saves Watch and Try apart, and a finished Try never goes back to watched', () => {
    let state = replaceFun({});
    assert.deepEqual(state.introsSeen, {});
    state = recordIntro(state, 'builder', 'watched');
    assert.deepEqual(state.introsSeen, { builder: 'watched' });
    state = recordIntro(state, 'builder', true);
    assert.deepEqual(state.introsSeen, { builder: true });
    state = recordIntro(state, 'builder', 'watched');
    assert.deepEqual(state.introsSeen, { builder: true }, 'watching again from the Helper keeps Try done');
    state = recordIntro(state, 'line');
    assert.deepEqual(state.introsSeen, { builder: true, line: true }, 'a skip marks both steps done');
  });

  it('keeps a watched step when the account copy loads, and drops anything else', () => {
    const state = replaceFun({ introsSeen: { builder: 'watched', line: 'maybe' } as never });
    assert.deepEqual(state.introsSeen, { builder: 'watched' });
  });

  it('reads the demo and the tries aloud, with no "you are ready" card any more', () => {
    for (const kind of ['builder', 'line'] as const) {
      const lines = introSpeech(kind);
      assert.equal(lines[0], INTRO_TEXT[kind].title);
      assert.ok(!lines.some((line) => /You know how|You can read/.test(line)), `${kind}: no ready card`);
    }
  });

  it('says fractions the way lesson 1 teaches them ("3 out of 4"), with no part names: both play on its lesson page', () => {
    const names = /\b(halfs?|halves|thirds?|fourths?|quarters?|fifths?|sixths?|eighths?|tenths?)\b/i;
    for (const kind of ['builder', 'line'] as const) {
      assert.deepEqual(introSpeech(kind).filter((line) => names.test(line)), [], `${kind}: no part names`);
    }
  });
});

describe('fraction words', () => {
  it('saves the Words screen once, keeps it from the account copy, and drops anything else', async () => {
    const { recordFractionWords } = await import('./lib/fun');
    const state = recordFractionWords(replaceFun({}));
    assert.equal(state.fractionWordsSeen, true);
    assert.equal(replaceFun({ fractionWordsSeen: true }).fractionWordsSeen, true);
    assert.equal(replaceFun({ fractionWordsSeen: 'yes' as never }).fractionWordsSeen, undefined);
  });

  it('names one part of each first denominator, in words, and reads them aloud', async () => {
    const { FRACTION_WORDS, fractionWordsSpeech } = await import('./intro-copy');
    assert.deepEqual(FRACTION_WORDS.rows.map((row) => row.word), ['one half', 'one third', 'one fourth', 'one sixth', 'one eighth']);
    const speech = fractionWordsSpeech();
    assert.ok(speech.includes('One third.'));
    assert.ok(speech.includes('One fourth, also called one quarter.'));
    assert.ok(!speech.some((line) => /two thirds|three fourths/i.test(line)), 'names the one part of each, with no counted examples');
    assert.ok(speech.every((line) => !/\d\/\d/.test(line)), 'no slash fractions in what is read');
  });

  it('opens a "New word" card in the first lesson to use fifths, tenths, twelfths or hundredths, and only there', async () => {
    const { MISSIONS } = await import('./game');
    const { newWordsFor } = await import('./new-words');
    const shown = MISSIONS.flatMap((mission) => newWordsFor(mission.id).map((d) => ({ id: mission.id, d })));
    assert.deepEqual(shown.map((item) => item.d).sort((a, b) => a - b), [5, 10, 12, 100], 'each new name once');
    assert.deepEqual(newWordsFor(MISSIONS[0]!.id), [], 'lesson 1 has the Words screen instead');
    const first = (d: number) => MISSIONS.findIndex((mission) => mission.id === shown.find((item) => item.d === d)!.id);
    assert.ok(first(10) <= first(100), 'tenths come before hundredths');
  });

  it('explains what a fraction is first, in words and a bar', async () => {
    const { WHAT_IS_A_FRACTION, whatIsAFractionSpeech } = await import('./intro-copy');
    assert.match(WHAT_IS_A_FRACTION.rule, /names part of a whole/);
    const speech = whatIsAFractionSpeech();
    assert.ok(speech.includes('1 out of 4 equal parts is shaded. We call it one fourth.'));
    assert.ok(speech.every((line) => !/\d\/\d|numerator|denominator/.test(line)), 'no slash fractions or lesson 2 words');
  });
});

describe('lesson 1 and the fraction words screen', () => {
  it('lesson 1 uses only the part names the Words screen teaches (its hints link there): no fifths, sevenths or ninths', async () => {
    const { FRACTION_WORDS, PART_NAMES } = await import('./intro-copy');
    const { MISSIONS } = await import('./game');
    const { LESSON_IDEAS, learnScript } = await import('./lesson-ideas');
    const { getBuildChecks, getReviewCheck, getWorksheet } = await import('./learning-content');
    const { storyProblemFor } = await import('./story');
    const taught = new Set<number>(FRACTION_WORDS.rows.map((row) => row.d));
    const lesson = MISSIONS[0]!;
    assert.equal(lesson.id, 'fraction-names');
    const story = storyProblemFor(lesson.id);
    // Every screen of lesson 1 but Practice more: its Learn pages (with their pictures), every question it asks (each
    // choice too), its story problem, and its lesson page (builds, worksheet, review).
    const screens = [
      ...LESSON_IDEAS[lesson.id]!.flatMap((idea) => idea.learn.map((page) => `${learnScript(page)} ${JSON.stringify(page)}`)),
      ...[...lesson.questions, ...(lesson.ideaQuestions ?? [])].map((question) => JSON.stringify(question)),
      JSON.stringify(story ?? {}), JSON.stringify(lesson.example),
      ...getBuildChecks(lesson.id).map((check) => JSON.stringify(check)),
      ...[0, 1, 2].map((variant) => JSON.stringify(getWorksheet(lesson.id, variant))),
      ...[0, 1, 2].map((round) => JSON.stringify(getReviewCheck(lesson.id, round))),
    ].join(' ');
    const used = new Set<number>();
    for (const match of screens.matchAll(/\b\d+\/(\d+)\b|"(?:denominator|d)":(\d+)/g)) used.add(Number(match[1] ?? match[2]));
    assert.deepEqual([...used].filter((d) => !taught.has(d)).sort((a, b) => a - b), [], 'lesson 1 uses a part the Words screen does not name');
    const untaughtNames = Object.entries(PART_NAMES).filter(([d]) => !taught.has(Number(d))).flatMap(([, name]) => [name.one, name.many]);
    for (const name of untaughtNames) assert.doesNotMatch(screens, new RegExp(`\\b${name}\\b`, 'i'), `lesson 1 says "${name}"`);
  });
});

describe('the first lesson\'s Words screens, before idea 2 and 3 teach the numbers', () => {
  // Lesson 1 teaches the bottom number (idea 2), then the top number and the first written fraction (idea 3). The Words
  // screens come first, so they name the parts with pictures and words only.
  const written = /\d\s*\/\s*\d/;
  const untaught = /numerators?|denominators?|top numbers?|bottom numbers?/i;

  it('has no written fraction and none of the words numerator, denominator, top number, bottom number', async () => {
    const { FRACTION_WORDS, WHAT_IS_A_FRACTION, fractionWordsSpeech, whatIsAFractionSpeech } = await import('./intro-copy');
    const lines = [
      ...Object.values(WHAT_IS_A_FRACTION), ...whatIsAFractionSpeech(),
      FRACTION_WORDS.title, FRACTION_WORDS.rule, ...FRACTION_WORDS.rows.flatMap((row) => [row.word, row.also ?? '']), ...fractionWordsSpeech(),
    ];
    assert.deepEqual(lines.filter((line) => written.test(line) || untaught.test(line)), []);
  });

  it('draws no stacked fraction on either screen (FractionWords shows a bar for each part, not a written fraction)', () => {
    const source = readFileSync(new URL('./model-intro.tsx', import.meta.url), 'utf8');
    const screen = source.slice(source.indexOf('export function FractionWords'), source.indexOf('export function NewWords'));
    assert.ok(screen.includes('FractionWords') && screen.length > 500, 'found the Words screens in the source');
    assert.doesNotMatch(screen, /<Frac\b/);
    assert.doesNotMatch(screen, untaught);
    assert.doesNotMatch(screen, /\b(top|bottom)\b/i);
  });
});
