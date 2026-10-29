import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as React from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChapterEndPicture, hasChapterEndPicture, LESSON_PROPS, LessonProp, lessonPropFor, type PropId } from './film-props';
import { MISSIONS } from './game';
import { CHAPTER_SCENES } from './story';

// Characters and Numi are drawn by files that rely on the classic JSX runtime when rendered outside Vite.
Object.assign(globalThis, { React });
const css = readFileSync(new URL('./film-props.css', import.meta.url), 'utf8');
const cinemaCss = readFileSync(new URL('./story-cinema.css', import.meta.url), 'utf8');
const props = [...new Set(Object.values(LESSON_PROPS))] as PropId[];
const render = (prop: PropId, beat = 0, scene: Parameters<typeof LessonProp>[0]['scene'] = 'den') => renderToStaticMarkup(createElement(LessonProp, { prop, scene, beat }));

test('every lesson with a film prop is a real lesson after its chapter opener (openers keep their own art)', () => {
  for (const id of Object.keys(LESSON_PROPS)) {
    const mission = MISSIONS.find((item) => item.id === id);
    assert.ok(mission, `${id} is a lesson`);
    const first = MISSIONS.find((item) => item.unit === mission.unit);
    assert.notEqual(first?.id, id, `${id} is a chapter opener, which has its own film art`);
  }
  assert.equal(lessonPropFor('benchmarks-zero-one'), 'flag');
  assert.equal(lessonPropFor('fraction-names'), null);
  assert.equal(lessonPropFor(undefined), null);
});

test('the sample lessons each get their own object', () => {
  assert.deepEqual(
    ['benchmarks-zero-one', 'subtract-like-denominators', 'hundredths-decimals', 'line-plot-totals', 'fractional-sharing', 'plot-in-eighths'].map(lessonPropFor),
    ['flag', 'jar', 'note', 'beakers', 'loaves', 'pebbles'],
  );
});

test('a prop shows the object only: no text, no numbers in its label and no filters or images', () => {
  for (const prop of props) {
    const html = render(prop);
    assert.match(html, new RegExp(`data-prop="${prop}"`));
    assert.match(html, /role="img"/);
    assert.ok(!/<text|<tspan|<image|<foreignObject|<filter/.test(html), `${prop}: drawn with shapes only`);
    const label = /aria-label="([^"]*)"/.exec(html)?.[1] ?? '';
    assert.ok(label.length > 8, `${prop} has a label`);
    assert.ok(!/\d/.test(label), `${prop}: the label has no number`);
  }
});

test('a prop is light: a few dozen shapes at most, with the same shapes at every beat', () => {
  for (const prop of props) {
    const shapes = (html: string) => (html.match(/<(path|rect|circle|ellipse|g|line)\b/g) ?? []).length;
    assert.ok(shapes(render(prop)) <= 70, `${prop} has ${shapes(render(prop))} shapes`);
    assert.equal(shapes(render(prop, 0)), shapes(render(prop, 2)), `${prop}: the beat only moves shapes, it adds none`);
  }
});

test('the prop is under fq-cine-move, so both Reduce motion rules hold it still, and its resting style is its finished one', () => {
  for (const prop of props) assert.match(render(prop), /class="fq-fp fq-cine-move /);
  assert.match(cinemaCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.fq-cine-move, \.fq-cine-move \* \{ animation: none !important; transition: none !important; \}/);
  assert.match(cinemaCss, /:root\.fq-reduced-motion \.fq-cine-move, :root\.fq-reduced-motion \.fq-cine-move \* \{ animation: none !important; transition: none !important; \}/);
  // Every moving part is under .fq-fp (nothing in this file animates outside it), and nothing is costly to paint.
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector!.trim(), body: body! }));
  const moving = rules.filter(({ body }) => /(^|[\s;])(animation|transition):/.test(body));
  assert.ok(moving.length >= 10, 'the moving parts were found');
  for (const { selector } of moving) assert.ok(selector.split(',').every((part) => part.trim().startsWith('.fq-fp')), `${selector} is under .fq-fp`);
  assert.ok(!/filter:|backdrop-filter|mix-blend-mode|box-shadow|url\(/.test(css), 'no filters, blends, shadows or images');
  assert.ok(!/infinite/.test(css), 'nothing loops forever: a loop keeps a phone repainting');
  // A still picture is complete: the resting style of the hidden parts is not hidden (only the drip, which has no still).
  assert.ok(!/\.fq-fp-(cookie|lens|pebble|loaf|flag)\s*\{[^}]*opacity: *0/.test(css));
});

test('the beat adds a class, and the end pictures exist for the sample chapters only (the rest keep the generic ending)', () => {
  assert.match(render('jar', 0), /class="fq-fp fq-cine-move is-jar "/);
  assert.match(render('jar', 1), /class="fq-fp fq-cine-move is-jar is-on"/);
  assert.deepEqual([1, 2, 3, 8, 12, 15].map(hasChapterEndPicture), [false, false, true, true, true, false]);
});

test('a chapter ending shows the chapter key prop with its stone piece, found from the second line on', () => {
  for (const unit of [3, 8, 12]) {
    const draw = (beat: number) => renderToStaticMarkup(createElement(ChapterEndPicture, { unit, beat, speaker: 'hoot', backdrop: null }));
    const before = draw(0), found = draw(1);
    assert.match(before, new RegExp(`data-prop="end-${unit}"`));
    assert.ok(!before.includes('is-found') && found.includes('is-found'), `chapter ${unit}: the piece is found on the second line`);
    assert.match(found, /fq-fp-stone/);
    assert.match(found, /data-testid="story-end-friend"/); // Hoot speaks, so the chapter friend stays beside the prop
    assert.ok(!/<text/.test(found));
    assert.ok(CHAPTER_SCENES[unit]);
  }
});
