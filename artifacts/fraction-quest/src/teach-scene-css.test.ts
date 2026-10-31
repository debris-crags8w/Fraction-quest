import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/* Rescore 5: on a phone the Learn picture rule (`.fq-ts-card .fq-ts-stage`, padding 16px 12px 12px) also reached the small
   pictures inside word cards, so ruler-measurement's two pictured cards (inch, quarter) made its first Learn page 28px
   taller than any other and the lesson header scrolled off. A word card's picture keeps a small frame on a phone. */
test('on a phone, a word card picture keeps its small frame', () => {
  const css = readFileSync(new URL('./teach-scene.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const phone = css.slice(css.indexOf('@media (max-width: 430px)'));
  const block = phone.slice(phone.indexOf('{') + 1);
  const rules = [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.trim(), body: m[2]! }));
  const words = rules.find((rule) => rule.selector.split(',').some((part) => /\.fq-ts-words\s+\.fq-ts-stage$/.test(part.trim())));
  assert.ok(words, 'the phone rules give word-card pictures their own padding');
  const [top = 0, , bottom = top] = words.body.match(/padding:\s*([^;]+)/)![1]!.trim().split(/\s+/).map((v) => parseFloat(v));
  assert.ok(top + bottom <= 12, `a word card picture has ${top + bottom}px of padding above and below on a phone`);
  assert.ok(parseFloat(words.body.match(/gap:\s*([\d.]+)/)?.[1] ?? '99') <= 6);
});
