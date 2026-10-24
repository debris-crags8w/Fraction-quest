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
