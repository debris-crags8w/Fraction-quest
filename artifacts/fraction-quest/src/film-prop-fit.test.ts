import assert from 'node:assert/strict';
import test from 'node:test';
import { LESSON_PROPS, PROP_DEFS } from './film-props';
import { MISSIONS } from './game';
import { chapterFor, lessonComic, withName } from './story';

/* A lesson film's object agrees with the friend's line: the line names the object (or what it holds), so a child
   never hears "I collected leaves" while looking at pebbles. Each prop lists the words it can stand for; the scene
   line (everyday props, no seasonal theme) must use one of them. A new prop needs its words here. */

const PROP_WORDS: Record<string, string[]> = {
  // Chapters 1 to 6
  'a-tray': ['shape', 'share'], 'a-slice': ['slice'], 'a-piping': ['cake'], 'a-twocakes': ['cake'],
  flag: ['hill'], 'a-hike': ['climb', 'path', 'step'],
  'a-plank': ['bridge', 'land'], 'a-house': ['house'], 'a-reed': ['reed'], 'a-pebbles': ['pebble'],
  'a-crate': ['tower', 'treat'],
  'a-shelf': ['shelf', 'jar'], 'a-skep': ['label'], 'a-torn': ['label'],
  // Chapters 7 and 8
  'b-bracket': ['slot', 'part'], 'b-spool': ['wire'], 'b-rods': ['whole'], 'b-labeler': ['write'],
  jar: ['jar'], 'b-jars': ['jar'], 'b-emptyjars': ['jar', 'ate'],
  note: ['note', 'line'], 'b-boot': ['boot'], 'b-screen': ['screen'], 'b-batteries': ['battery'],
  'b-strap': ['strap', 'boot'], 'b-coins': ['dime', 'pennies', 'money'], 'b-pie': ['pie'], 'b-tray': ['sandwich'],
  // Chapters 9 to 11
  'c-signpost': ['sign'], 'c-compass': ['route'], 'c-scrolls': ['route'], leaves: ['leaves', 'leaf'],
  'c-pincushion': ['pin'], 'c-jug': ['jug', 'drink'], 'c-flour': ['bake', 'recipe'], 'c-dispenser': ['jug', 'drink'],
  'c-pie': ['pie'], 'b-donut': ['ate', 'bite'], 'c-sandwiches': ['sandwich'], 'c-lunchbox': ['box', 'food'],
  'c-hopper': ['bolt'], 'c-nutpile': ['nut'], 'c-plankgate': ['plank'], 'c-lasercutter': ['panel', 'cut'],
  'c-toolbox': ['bolt box', 'box'], 'c-gauge': ['dial'], 'c-raygun': ['bigger', 'smaller'],
  // Chapters 12 to 15
  'd-boards': ['board'], 'd-cups': ['lemonade', 'cup'], barrel: ['rain barrel', 'barrel'], 'd-nails': ['nail'],
  'd-sandbag': ['sandbag'], loaves: ['loaf', 'loaves'], 'd-rope': ['rope'], 'd-cake': ['cake'], 'd-paint': ['paint', 'scoop'],
  'd-clay': ['clay', 'bag'], 'd-plot': ['plot', 'garden'], 'd-flowers': ['flower'],
  'd-dial': ['dial'], 'd-chest': ['hides', 'puzzle'], 'd-scroll': ['riddle'], 'd-snacks': ['left', 'part'], 'd-jug': ['lemonade', 'scoop'],
};

const sceneLine = (id: string) => {
  const mission = MISSIONS.find((item) => item.id === id)!;
  const chapter = chapterFor(mission.unit)!;
  const index = MISSIONS.filter((item) => item.unit === mission.unit).indexOf(mission);
  return withName(lessonComic(chapter, mission, index)[0]!.text, null, 'everyday').toLowerCase();
};
const says = (line: string, word: string) => new RegExp(`\\b${word}`, 'i').test(line);

test('every lesson film object is named in the friend\'s line', () => {
  const wrong: string[] = [];
  for (const [lesson, prop] of Object.entries(LESSON_PROPS)) {
    const words = PROP_WORDS[prop];
    assert.ok(words, `${prop} (${lesson}) has its words listed here`);
    const line = sceneLine(lesson);
    if (!words.some((word) => says(line, word))) wrong.push(`${lesson}: "${line}" shows ${prop} (${PROP_DEFS[prop]!.label})`);
  }
  assert.deepEqual(wrong, []);
});

test('the props that disagreed with their lines now show what the friend talks about', () => {
  const shows = (lesson: string) => PROP_DEFS[LESSON_PROPS[lesson]!]!.label.toLowerCase();
  assert.match(shows('plot-in-eighths'), /lea(f|ves)/);
  assert.match(shows('line-plot-totals'), /rain barrel/);
  assert.match(shows('mixed-unlike-operations'), /sandwich/);
  assert.match(shows('add-mixed-numbers'), /jars/);
  assert.match(shows('subtract-mixed-numbers'), /jar/);
  assert.match(shows('line-plot-leveling'), /lemonade/);
  assert.match(shows('decimal-fraction-equivalence'), /boot/);
  for (const prop of Object.keys(PROP_WORDS)) assert.ok(PROP_DEFS[prop], `${prop} is still drawn (drop its words if it goes)`);
});
