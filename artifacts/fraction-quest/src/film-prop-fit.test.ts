import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChapterEndPicture, LESSON_PROPS, LessonProp, PROP_DEFS } from './film-props';
import { OpenerBars, OpenerCake } from './film-food';
import { MISSIONS } from './game';
import { seasonOn } from './seasons';
import { CHAPTERS, PROP_THEMES, PROPS, chapterEnd, chapterFor, lessonComic, propTheme, withName, type PropTheme } from './story';

Object.assign(globalThis, { React });

/* A lesson film's object agrees with the friend's line: the line names the object (or what it holds), so a child
   never hears "I collected leaves" while looking at pebbles. Each prop lists the words it can stand for; the scene
   line must use one of them, in every theme. The words are the object's own name, never a loose word that many lines
   share ("screen", "whole", "left", "part"). A new prop needs its words here. */

const PROP_WORDS: Record<string, string[]> = {
  // Chapters 1 to 6
  'a-tray': ['shapes'], 'a-slice': ['slice'], 'a-piping': ['slices of my'], 'a-twocakes': ['same-size'],
  flag: ['hill'], 'a-hike': ['climb'],
  'a-plank': ['bridge'], 'a-house': ['house'], 'a-reed': ['reed'], 'a-pebbles': ['pebble'],
  'a-crate': ['tower'],
  'a-shelf': ['shelf'], 'a-skep': ['label'], 'a-torn': ['label'],
  // Chapters 7 and 8
  'b-bracket': ['slot'], 'b-spool': ['wire'], 'b-labeler': ['write'],
  jar: ['jar'], 'b-jars': ['jars'], 'b-emptyjars': ['jars'],
  note: ['note', 'read the next line'], 'b-boot': ['boots'], 'b-screen': ['two decimals'], 'b-batteries': ['grid'],
  'b-strap': ['strap'], 'b-coins': ['dimes', 'pennies'], 'b-pie': ['pie'], 'b-tray': ['sandwich'],
  // Chapters 9 to 11
  'c-signpost': ['sign'], 'c-compass': ['routes'], 'c-scrolls': ['routes'], leaves: ['leaves'],
  'c-pincushion': ['pins'], 'c-jug': ['jug'], 'c-flour': ['bake', 'recipe'], 'c-dispenser': ['jug'],
  'c-pie': ['pie'], 'c-sandwiches': ['sandwiches'], 'c-lunchbox': ['boxes'],
  'c-hopper': ['bolts'], 'c-nutpile': ['nut pile'], 'c-plankgate': ['plank'], 'c-lasercutter': ['panel'],
  'c-toolbox': ['bolt box'], 'c-gauge': ['dial'],
  // Chapters 12 to 15
  'd-boards': ['boards'], 'd-cups': ['cups of'], barrel: ['rain barrel'], 'd-nails': ['nails'],
  'd-sandbag': ['sandbag'], loaves: ['loaf', 'loaves'], 'd-rope': ['rope'], 'd-cake': ['part of the'], 'd-paint': ['paint'],
  'd-clay': ['clay'], 'd-plot': ['plot'], 'd-flowers': ['flower bed'],
  'd-dial': ['dial'], 'd-chest': ['dial'], 'd-scroll': ['riddle'], 'd-jug': ['scoops of'],
};

/** Lines that name no object at all ("I ate some. Oops."): nothing in them can disagree with the picture. Each is
    pinned here, so a line that later names something has to list its words above instead. */
const NAMES_NO_OBJECT: Record<string, string> = {
  'b-rods': 'Now I have more than one whole.',
  'b-donut': 'I ate some. Oops.',
  'c-raygun': 'bigger, smaller or the same?',
  'd-snacks': 'Part goes, then part of what is left.',
};

/** The themed blanks a film line can hold (story.ts PROPS), each a food the picture has to show. */
const TOKENS = ['cake', 'cakes', 'pie', 'drink', 'snack', 'snacks', 'bar', 'bars'];

/** Every theme a child can see: the everyday words, and the theme of each of the 12 months. */
const MONTH_THEMES = Array.from({ length: 12 }, (_, month) => propTheme(seasonOn(new Date(2026, month, 15, 10))?.id));
const THEMES: PropTheme[] = [...new Set<PropTheme>([...PROP_THEMES, ...MONTH_THEMES])];

const rawSceneLine = (id: string) => {
  const mission = MISSIONS.find((item) => item.id === id)!;
  const chapter = chapterFor(mission.unit)!;
  const index = MISSIONS.filter((item) => item.unit === mission.unit).indexOf(mission);
  return lessonComic(chapter, mission, index)[0]!.text;
};
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const says = (line: string, word: string) => new RegExp(`\\b${escape(word)}`, 'i').test(line);
const labelOf = (html: string) => (/aria-label="([^"]*)"/.exec(html)?.[1] ?? '').replace(/&#x27;|&#39;/g, '\'').replace(/&amp;/g, '&');
/** The food words a line holds in a theme: "{cake}" is "pumpkin pie" at Halloween. */
const themedWords = (raw: string, theme: PropTheme, only = TOKENS) =>
  [...raw.matchAll(/\{(\w+)\}/g)].map(([, key]) => key!).filter((key) => only.includes(key)).map((key) => PROPS[theme][key]!);
const lessonProp = (lesson: string, theme: PropTheme) => renderToStaticMarkup(createElement(LessonProp, { prop: LESSON_PROPS[lesson]!, scene: 'den', beat: 0, theme }));
const lessonLabel = (lesson: string, theme: PropTheme) => labelOf(lessonProp(lesson, theme));

test('every month has a theme, and every one is checked here', () => {
  assert.equal(MONTH_THEMES.filter((theme) => theme !== 'everyday').length, 12, 'seasonal themes cover all 12 months');
  assert.ok(THEMES.includes('halloween') && THEMES.includes('christmas') && THEMES.includes('everyday'));
});

test('every lesson film object is named in the friend\'s line, in every theme', () => {
  const wrong: string[] = [];
  for (const theme of THEMES) for (const [lesson, prop] of Object.entries(LESSON_PROPS)) {
    const line = withName(rawSceneLine(lesson), null, theme);
    if (NAMES_NO_OBJECT[prop]) {
      if (!line.includes(NAMES_NO_OBJECT[prop]!)) wrong.push(`${lesson}: "${line}" is listed as naming no object, but it changed`);
      continue;
    }
    const words = PROP_WORDS[prop];
    assert.ok(words, `${prop} (${lesson}) has its words listed here`);
    if (!words.some((word) => says(line, word))) wrong.push(`${theme} ${lesson}: "${line}" shows ${prop} (${lessonLabel(lesson, theme)})`);
  }
  assert.deepEqual(wrong, []);
});

test('a seasonal food word in a lesson film line is the food the prop shows, in every theme and every month', () => {
  const wrong: string[] = [];
  let checked = 0;
  for (const theme of THEMES) for (const lesson of Object.keys(LESSON_PROPS)) {
    for (const word of themedWords(rawSceneLine(lesson), theme)) {
      checked += 1;
      const label = lessonLabel(lesson, theme);
      if (!says(label, word)) wrong.push(`${theme} ${lesson}: the line says "${word}", the picture is "${label}"`);
    }
  }
  assert.ok(checked >= 8 * THEMES.length, `the themed lines were found (${checked})`);
  assert.deepEqual(wrong, []);
});

test('the chapter 1 and 2 openers and the chapter 1 ending draw the food their lines name, in every theme', () => {
  const [ch1, ch2] = CHAPTERS;
  const wrong: string[] = [];
  for (const theme of THEMES) {
    const cake = labelOf(renderToStaticMarkup(createElement(OpenerCake, { theme, fair: false, beat: 0 })));
    for (const panel of ch1!.intro) for (const word of themedWords(panel.text, theme)) if (!says(cake, word)) wrong.push(`${theme} ch 1 opener: "${word}" over "${cake}"`);
    const endHtml = renderToStaticMarkup(createElement(ChapterEndPicture, { unit: 1, beat: 2, backdrop: null, theme }));
    const end = labelOf(endHtml.slice(endHtml.indexOf('data-prop="end-1"')));
    for (const panel of chapterEnd(ch1!)) for (const word of themedWords(panel.text, theme)) if (!says(end, word)) wrong.push(`${theme} ch 1 ending: "${word}" over "${end}"`);
    const bars = labelOf(renderToStaticMarkup(createElement(OpenerBars, { theme, compared: false })));
    for (const panel of ch2!.intro) for (const word of themedWords(panel.text, theme, ['bar', 'bars'])) if (!says(bars, word)) wrong.push(`${theme} ch 2 opener: "${word}" over "${bars}"`);
  }
  assert.deepEqual(wrong, []);
});

test('a themed prop is redrawn, not just renamed: its picture changes with the food', () => {
  const art = (lesson: string, theme: PropTheme) => lessonProp(lesson, theme).replace(/aria-label="[^"]*"/, '');
  for (const lesson of ['line-plot-leveling', 'divide-fractions', 'compare-same-numerator', 'unit-fraction-divided-whole', 'fraction-of-area', 'add-unlike-fractions', 'unit-fraction-multiples', 'subtract-like-denominators']) {
    assert.notEqual(art(lesson, 'halloween'), art(lesson, 'everyday'), `${lesson}: the Halloween picture differs from the everyday one`);
  }
  assert.notEqual(art('line-plot-leveling', 'christmas'), art('line-plot-leveling', 'june'), 'hot cocoa and coconut water look different');
  const cake = (theme: PropTheme) => renderToStaticMarkup(createElement(OpenerCake, { theme, fair: true, beat: 2 })).replace(/aria-label="[^"]*"/, '');
  assert.notEqual(cake('halloween'), cake('february'), 'a pumpkin pie and a strawberry cake look different');
});

test('the props that disagreed with their lines now show what the friend talks about', () => {
  const label = (lesson: string) => lessonLabel(lesson, 'everyday').toLowerCase();
  assert.match(label('plot-in-eighths'), /lea(f|ves)/);
  assert.match(label('line-plot-totals'), /rain barrel/);
  assert.match(label('mixed-unlike-operations'), /sandwich/);
  assert.match(label('add-mixed-numbers'), /jars/);
  assert.match(label('subtract-mixed-numbers'), /jar/);
  assert.match(label('line-plot-leveling'), /lemonade/);
  assert.match(label('decimal-fraction-equivalence'), /boot/);
  assert.match(label('compare-decimals'), /two decimals/);
  assert.match(label('compare-decimals-grid'), /grid/);
  assert.match(label('multi-step-fraction-stories'), /dial/);
  for (const prop of [...Object.keys(PROP_WORDS), ...Object.keys(NAMES_NO_OBJECT)]) assert.ok(PROP_DEFS[prop], `${prop} is still drawn (drop its words if it goes)`);
});
