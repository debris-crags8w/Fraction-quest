import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
    assert.ok(speech.includes('Three fourths.'));
    assert.ok(speech.every((line) => !/\d\/\d/.test(line)), 'no slash fractions in what is read');
  });

  it('opens a "New word" card in the first lesson to use fifths, tenths, twelfths or hundredths, and only there', async () => {
    const { MISSIONS } = await import('./game');
    const { newWordsFor } = await import('./new-words');
    const shown = MISSIONS.flatMap((mission) => newWordsFor(mission.id).map((d) => ({ id: mission.id, d })));
    assert.deepEqual(shown.map((item) => item.d).sort((a, b) => a - b), [5, 10, 12, 100], 'each new name once');
    assert.deepEqual(newWordsFor('equal-parts'), [], 'lesson 1 has the Words screen instead');
    const first = (d: number) => MISSIONS.findIndex((mission) => mission.id === shown.find((item) => item.d === d)!.id);
    assert.ok(first(10) <= first(100), 'tenths come before hundredths');
  });

  it('explains what a fraction is first, saying the fraction in words', async () => {
    const { WHAT_IS_A_FRACTION, whatIsAFractionSpeech } = await import('./intro-copy');
    assert.match(WHAT_IS_A_FRACTION.rule, /names part of a whole/);
    const speech = whatIsAFractionSpeech();
    assert.ok(speech.includes('So one fourth means 1 of 4 equal parts.'));
    assert.ok(speech.every((line) => !/\d\/\d|numerator|denominator/.test(line)), 'no slash fractions or lesson 2 words');
  });
});
