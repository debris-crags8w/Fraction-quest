import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/* A finished film stands still: every loop in story-cinema.css (an `infinite` animation) is paused by one rule when the
   film is done (`.fq-cine-comic.is-done`), so the end screen does not keep a phone repainting. A loop added later fails
   here until it is listed. The waiting dots, the typing caret and the talking bob only exist while a film plays. */

const css = readFileSync(new URL('./story-cinema.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const STOPS_BY_ITSELF = ['.fq-cine-wait-dots i', '.fq-cine-face.is-talking', '.fq-cine-caret'];

const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({ selector: match[1]!.trim(), body: match[2]! }));
const pausedRule = rules.find((rule) => /animation-play-state:\s*paused\s*!important/.test(rule.body) && rule.selector.includes('.is-done'));

test('a finished film pauses every looping animation in the cinema css', () => {
  assert.ok(pausedRule, 'a rule pauses the loops when the film is done');
  const paused = new Set(pausedRule.selector.split(',').map((part) => part.trim()));
  const loops = rules.filter((rule) => /\binfinite\b/.test(rule.body) && !rule.body.includes('paused'));
  assert.ok(loops.length >= 20, `the css still has its ambient loops (${loops.length})`);
  const missing: string[] = [];
  for (const rule of loops) {
    for (const part of rule.selector.split(',').map((one) => one.trim())) {
      if (STOPS_BY_ITSELF.includes(part)) continue;
      if (!paused.has(`.fq-cine-comic.is-done ${part}`)) missing.push(part);
    }
  }
  assert.deepEqual(missing, [], 'every loop is paused once the film is done');
});
