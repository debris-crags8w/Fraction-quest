/* Seasonal lesson words: during a season, the treats in lesson text follow it (a pizza becomes a pumpkin pie at
   Halloween, a giant sugar cookie at Christmas, a heart pizza in February). Only treat nouns change: never a number, an answer or a model,
   and outside a season the text is exactly as written. Rules are phrase-specific so other words stay put, and applying them twice changes nothing. */

import { MONTH_THEMES, type MonthTheme } from './month-themes';
import type { SeasonId } from './seasons';

type Rule = [RegExp, string];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const startsWithVowel = (text: string) => /^[aeiou]/i.test(text);

/** A month's rules, from its foods: pizza, cake and juice swap for the month's treats. A swap that still holds its own
    word ("heart pizza", "snowball cake") is skipped when already there, so applying twice changes nothing, and
    "a" becomes "an" before a vowel ("a pizza" is "an apple pie"). */
function monthRules({ foods }: MonthTheme): Rule[] {
  const rules: Rule[] = [];
  const swap = (word: string, next: string, plural: boolean) => {
    const own = next.endsWith(word) ? next.slice(0, next.length - word.length) : '';
    const guard = own ? `(?<!${escape(own)})` : '';
    if (plural) {
      if (startsWithVowel(next)) rules.push([new RegExp(`\\b(a) (?=${word}s\\b)`, 'gi'), 'an ']);
      rules.push([new RegExp(`${guard}\\b${word}s\\b`, 'gi'), `${next}s`]);
    }
    if (startsWithVowel(next)) rules.push([new RegExp(`\\b(a) (?=${word}\\b)`, 'gi'), 'an ']);
    rules.push([new RegExp(`${guard}\\b${word}\\b`, 'gi'), next]);
  };
  swap('pizza', foods.pizza, true);
  swap('cake', foods.cake, true);
  swap('juice', foods.juice, false);
  return rules;
}

const RULES: Record<SeasonId, Rule[]> = {
  ...Object.fromEntries(MONTH_THEMES.map((theme) => [theme.id, monthRules(theme)])) as Record<MonthTheme['id'], Rule[]>,
  halloween: [
    [/\bloaf of bread\b/gi, 'loaf of pumpkin bread'],
    [/\bloaves of bread\b/gi, 'loaves of pumpkin bread'],
    [/(?<!pumpkin )\bloaves\b(?! of)/gi, 'pumpkin loaves'],
    [/(?<!pumpkin )\bloaf\b(?! of)/gi, 'pumpkin loaf'],
    [/\bpizzas\b/gi, 'pumpkin pies'],
    [/\bpizza\b/gi, 'pumpkin pie'],
    [/(?<!pumpkin |honey |Christmas )\bcakes\b/gi, 'pumpkin cakes'],
    [/(?<!pumpkin |honey |Christmas )\bcake\b/gi, 'pumpkin cake'],
    [/\bpan of brownies\b/gi, 'pan of pumpkin brownies'],
    [/(?<!pumpkin )\bpancake recipe\b/gi, 'pumpkin pancake recipe'],
    [/(?<!pumpkin )\bjuice\b/gi, 'pumpkin juice'],
    [/\bA sandwich is cut\b/g, 'A candy bar is cut'],
  ],
  christmas: [
    [/\bloaf of bread\b/gi, 'loaf of gingerbread'],
    [/\bloaves of bread\b/gi, 'loaves of gingerbread'],
    [/(?<!gingerbread )\bloaves\b(?! of)/gi, 'gingerbread loaves'],
    [/(?<!gingerbread )\bloaf\b(?! of)/gi, 'gingerbread loaf'],
    [/\bpizzas\b/gi, 'giant sugar cookies'],
    [/\bpizza\b/gi, 'giant sugar cookie'],
    [/(?<!pumpkin |honey |Christmas )\bcakes\b/gi, 'Christmas cakes'],
    [/(?<!pumpkin |honey |Christmas )\bcake\b/gi, 'Christmas cake'],
    [/\bpan of brownies\b/gi, 'pan of fudge brownies'],
    [/(?<!gingerbread )\bpancake recipe\b/gi, 'gingerbread pancake recipe'],
    [/(?<!apple )\bjuice\b/gi, 'apple cider'],
    [/\bA sandwich is cut\b/g, 'A peppermint bar is cut'],
  ],
};

/** Keep a capital at the start of a replaced word ("Pizza is…" → "Pumpkin pie is…"). */
const matchCase = (found: string, next: string) => (/^[A-Z]/.test(found) && /^[a-z]/.test(next) ? next[0].toUpperCase() + next.slice(1) : next);

export function seasonalWords(text: string, seasonId: SeasonId | null | undefined): string {
  if (!seasonId || !text) return text;
  return RULES[seasonId].reduce((out, [pattern, next]) => out.replace(pattern, (found) => matchCase(found, next)), text);
}
