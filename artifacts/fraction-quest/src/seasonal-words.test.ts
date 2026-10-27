import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS } from './game';
import { getBuildChecks, getWorksheet } from './learning-content';
import { PART_FINDER_LESSONS, partFinderRoundsFor } from './part-finder';
import { getExtraPractice } from './practice-bank';
import { seasonalWords } from './seasonal-words';
import { MONTH_THEMES } from './month-themes';
import type { SeasonId } from './seasons';

const ALL_SEASONS: SeasonId[] = ['halloween', 'christmas', ...MONTH_THEMES.map((theme) => theme.id)];

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
  for (const season of ALL_SEASONS) {
    let changed = 0;
    for (const text of texts) {
      const themed = seasonalWords(text, season);
      if (themed !== text) changed++;
      assert.equal(numbersIn(themed), numbersIn(text), `${season}: numbers in "${text}"`);
      assert.equal(seasonalWords(themed, season), themed, `${season}: applying twice changes "${text}"`);
      // No plain pizza is left (a month's own "heart pizza" is its swap), and only the two holidays change bread.
      const month = MONTH_THEMES.find((theme) => theme.id === season);
      const own = month?.foods.pizza.endsWith('pizza') ? month.foods.pizza : null;
      assert.doesNotMatch(own ? themed.replace(new RegExp(`${own}s?`, 'gi'), '') : themed, /\bpizzas?\b/i, `${season}: "${themed}"`);
      if (!month) assert.doesNotMatch(themed, /\bloaf of bread\b/i, `${season}: "${themed}"`);
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

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Undo a month's swaps: its food phrases back to pizza, cake and juice (and "an" back to "a" before them). */
function unswap(text: string, foods: { pizza: string; cake: string; juice: string }) {
  let out = text;
  for (const [word, phrase] of [['pizza', foods.pizza], ['cake', foods.cake], ['juice', foods.juice]] as const) {
    const back = (found: string, plain: string) => (/^[A-Z]/.test(found) ? plain[0].toUpperCase() + plain.slice(1) : plain);
    out = out.replace(new RegExp(`\\b${escapeRegExp(phrase)}s\\b`, 'gi'), (found) => back(found, `${word}s`));
    out = out.replace(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi'), (found) => back(found, word));
  }
  return out.replace(/\b(an) (?=(pizzas?|cakes?|juice)\b)/gi, (found) => (found[0] === 'A' ? 'A ' : 'a '));
}

test('every month swaps only pizza, cake and juice: nothing else in a question, answer or choice changes', () => {
  const texts = lessonStrings();
  for (const theme of MONTH_THEMES) {
    // The same text never changes length in numbers, and undoing the swaps gives the original back exactly.
    const plainFoods = (text: string) => /\b(pizzas?|cakes?|juice)\b/i.test(text);
    let swapped = 0;
    for (const text of texts) {
      const themed = seasonalWords(text, theme.id);
      if (themed !== text) swapped++;
      if (plainFoods(text) || themed !== text) {
        // Text that already holds a month's own phrase ("ice cream cake") cannot be un-swapped uniquely: skip those.
        if (Object.values(theme.foods).some((phrase) => text.toLowerCase().includes(phrase.toLowerCase()))) continue;
        assert.equal(unswap(themed, theme.foods), text, `${theme.id}: "${text}" became "${themed}"`);
      } else {
        assert.equal(themed, text, `${theme.id}: no food word, so "${text}" stays`);
      }
    }
    assert.ok(swapped > 20, `${theme.id} swaps the foods in many lesson lines (${swapped})`);
  }
});

test('the month foods read naturally: plurals, capitals, and a before a vowel becomes an', () => {
  const words = (text: string, month: string) => seasonalWords(text, month as SeasonId);
  assert.equal(words('Pizza slices: 3 pizzas are shared fairly by 4 friends.', 'february'), 'Heart pizza slices: 3 heart pizzas are shared fairly by 4 friends.');
  assert.equal(words('Pizza slices: 3 pizzas are shared fairly by 4 friends.', 'january'), 'Giant pancake slices: 3 giant pancakes are shared fairly by 4 friends.');
  assert.equal(words('A pizza is cut into 8 equal pieces.', 'september'), 'An apple pie is cut into 8 equal pieces.');
  assert.equal(words('Mia ate half a pizza.', 'september'), 'Mia ate half an apple pie.');
  assert.equal(words('4 friends share this square cake.', 'june'), '4 friends share this square ice cream cake.');
  assert.equal(words('Cut a cake into 4 pieces.', 'june'), 'Cut an ice cream cake into 4 pieces.');
  assert.equal(words('Cut a cake into 4 pieces.', 'august'), 'Cut an ocean cake into 4 pieces.');
  assert.equal(words('Cut a cake into 4 pieces.', 'july'), 'Cut a s’mores cake into 4 pieces.');
  assert.equal(words('2 cakes are the same size.', 'may'), '2 honey cakes are the same size.');
  assert.equal(words('A jug of juice is 3/4 full.', 'november'), 'A jug of warm cider is 3/4 full.');
  assert.equal(words('A jug of juice is 3/4 full.', 'january'), 'A jug of hot cocoa is 3/4 full.');
  assert.equal(words('A pizza is shared.', 'june'), 'A watermelon is shared.');
  assert.equal(words('3 pizzas are shared.', 'june'), '3 watermelons are shared.');
  assert.equal(words('Pizza is cut.', 'march'), 'Picnic pie is cut.');
  // A text already in the month's words, or with no food in it, is left alone.
  assert.equal(words('Cut an ice cream cake.', 'june'), 'Cut an ice cream cake.');
  assert.equal(words('Cut a heart pizza.', 'february'), 'Cut a heart pizza.');
  assert.equal(words('Half of the pan of brownies is gone.', 'april'), 'Half of the pan of brownies is gone.');
  // No food word, no article before a vowel in themed lesson text that was not there before.
  const vowelA = /\ba [aeiou]/gi;
  for (const theme of MONTH_THEMES) {
    for (const text of lessonStrings()) {
      const themed = seasonalWords(text, theme.id);
      assert.equal((themed.match(vowelA) ?? []).length, (text.match(vowelA) ?? []).length, `${theme.id}: "a" before a vowel in "${themed}"`);
    }
  }
});
