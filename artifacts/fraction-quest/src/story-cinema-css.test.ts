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

/* Rescore 5: in December the chapter 2 bars are red-and-white peppermint stripes, and the white 1/3 and 1/8 on them
   could not be read. The labels sit on their own dark backing, so they read on every theme's bars. */
test('the chapter 2 bar labels read on every theme\'s bars', async () => {
  const { BARS } = await import('./film-food');
  const hex = (text: string) => [...text.matchAll(/#([0-9a-f]{6})\b/gi)].map(([, h]) => [0, 2, 4].map((i) => parseInt(h!.slice(i, i + 2), 16)));
  const lum = ([r, g, b]: number[]) => [r!, g!, b!].map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
  const contrast = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
  const label = rules.find((rule) => rule.selector === '.fq-cine-cutbar-label')!;
  const ink = hex(label.body.replace(/text-shadow:[^;]*;/, '').replace(/#fff\b/i, '#ffffff'))[0]!;
  const backing = rules.find((rule) => rule.selector === '.fq-cine-cutbar-label .fq-cine-frac' && /background:/.test(rule.body));
  const behind = backing ? hex(backing.body.match(/background:[^;]*/)![0]) : Object.values(BARS).flatMap((look) => hex(look.fill));
  assert.ok(behind.length > 0);
  for (const colour of behind) assert.ok(contrast(ink, colour) >= 4.5, `the label (rgb ${ink}) on rgb ${colour}: ${contrast(ink, colour).toFixed(2)}:1`);
});
