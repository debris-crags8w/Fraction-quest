/* Seasonal lesson words: during a season, the treats in lesson text follow it (a pizza becomes a pumpkin pie at
   Halloween, a giant sugar cookie at Christmas). Only treat nouns change: never a number, an answer or a model,
   and outside a season the text is exactly as written. Rules are phrase-specific so other words stay put, and applying them twice changes nothing. */

import type { SeasonId } from './seasons';

type Rule = [RegExp, string];

const RULES: Record<SeasonId, Rule[]> = {
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
