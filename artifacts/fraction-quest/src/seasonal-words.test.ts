import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS } from './game';
import { getBuildChecks, getWorksheet } from './learning-content';
import { PART_FINDER_LESSONS, partFinderRoundsFor } from './part-finder';
import { getExtraPractice } from './practice-bank';
import { seasonalWords } from './seasonal-words';

/** Every string in the lesson content: questions, examples, builds, worksheets, practice and the Make fair shares game. */
function lessonStrings(): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  for (const mission of MISSIONS) {
    walk(mission);
    walk(getWorksheet(mission.id));
    walk(getBuildChecks(mission.id));
    walk(getExtraPractice(mission.id, mission.questions.map((question) => question.id)));
    if (PART_FINDER_LESSONS.has(mission.id)) walk(partFinderRoundsFor(mission.id));
  }
  return [...new Set(out)];
}
const numbersIn = (text: string) => (text.match(/\d+/g) ?? []).join(' ');

test('outside a season, lesson text is exactly as written', () => {
  for (const text of lessonStrings()) assert.equal(seasonalWords(text, null), text);
});

test('in a season only treat words change: numbers stay, and a second pass changes nothing', () => {
  const texts = lessonStrings();
  for (const season of ['halloween', 'christmas'] as const) {
    let changed = 0;
    for (const text of texts) {
      const themed = seasonalWords(text, season);
      if (themed !== text) changed++;
      assert.equal(numbersIn(themed), numbersIn(text), `${season}: numbers in "${text}"`);
      assert.equal(seasonalWords(themed, season), themed, `${season}: applying twice changes "${text}"`);
      assert.doesNotMatch(themed, /\bpizzas?\b|\bloaf of bread\b/i, `${season}: "${themed}"`);
    }
    assert.ok(changed > 20, `${season} changes the treat words in many lesson lines (${changed})`);
  }
});

test('the treats read naturally in each season', () => {
  assert.equal(seasonalWords('A sandwich is cut into 4 equal pieces. What is 1 piece?', 'halloween'), 'A candy bar is cut into 4 equal pieces. What is 1 piece?');
  assert.equal(seasonalWords('Pizza slices: 3 pizzas are shared fairly by 4 friends.', 'christmas'), 'Giant sugar cookie slices: 3 giant sugar cookies are shared fairly by 4 friends.');
  assert.equal(seasonalWords('4 friends share this square cake.', 'halloween'), '4 friends share this square pumpkin cake.');
  assert.equal(seasonalWords('Cut each loaf into 4 pieces.', 'christmas'), 'Cut each gingerbread loaf into 4 pieces.');
  // Story props that are already seasonal are left alone.
  assert.equal(seasonalWords('I cut the festival Christmas cake.', 'christmas'), 'I cut the festival Christmas cake.');
  assert.equal(seasonalWords('A jug of pumpkin juice.', 'halloween'), 'A jug of pumpkin juice.');
});
