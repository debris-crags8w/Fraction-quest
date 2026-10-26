/* Shared by the lesson idea files (ideas/lessons-*.ts): the idea types and two ways to build a Learn page from a
   lesson's Teach first (one of its animated steps, or one of its extra worked examples). */
import type { FractionOrderRound } from '../game';
import type { PartFinderRound } from '../part-finder';
import { LESSON_SCENES, type StepScene } from '../teach-scenes';
import { PART_NAMES } from '../intro-copy';
import { TEACH_EXTRAS, type WordCard } from '../teach-extras';

/** One Learn page: a short line and its animated picture, or a line and Words to know (each new word or symbol, what
    it means, and its picture). */
export type LearnPage = { text: string; scene: StepScene } | { text: string; words: WordCard[] };
/** A practice: a lesson question (by id: `-q` for the lesson's own, `-p` for one written for its idea), a hands-on cake
    round, or a card-ordering round (by its id in FRACTION_ORDER_ROUNDS). */
export type IdeaPractice = { question: string } | { handsOn: PartFinderRound['id'] } | { sortRound: FractionOrderRound['id'] };
/** A word, symbol or step an idea teaches: no Learn page or practice of an earlier idea may use it
    (lesson-ideas.test.ts), and the idea's own Learn pages must. */
export type IdeaTerm = { term: string; pattern: RegExp };
export type LessonIdea = { title: string; learn: LearnPage[]; practice: IdeaPractice[]; terms?: IdeaTerm[] };

/** A lesson's Teach first scenes (its steps and why). */
export const scenes = (id: string) => {
  const found = LESSON_SCENES[id];
  if (!found) throw new Error(`No Teach first scenes for ${id}`);
  return found;
};
/** One of a lesson's extra worked examples (teach-extras.ts) as a Learn page. */
export const example = (id: string, title: string): LearnPage => {
  const found = TEACH_EXTRAS[id]?.examples?.find((item) => item.title === title);
  if (!found) throw new Error(`No example "${title}" in ${id}`);
  return { text: found.title, scene: found.picture };
};
/** A lesson's Words to know (teach-extras.ts) as a Learn page: the new words come before the idea that uses them. Pass
    `terms` to show only some of them (the others go on the page of the idea that needs them). */
export const wordsToKnow = (id: string, terms?: string[]): LearnPage => {
  const all = TEACH_EXTRAS[id]?.words ?? [];
  const words = terms ? all.filter((word) => terms.includes(word.term)) : all;
  if (!words.length || (terms && words.length !== terms.length)) throw new Error(`No Words to know ${terms?.join(', ') ?? ''} in ${id}`);
  return { text: 'Words to know', words };
};

/** A part name's word card as a Learn page (the same words as the lesson page's New word card): one fifth, with its bar.
    Put it on the first idea whose Learn pages or practices say the name (new-words.ts). */
export const newWord = (d: number): LearnPage => {
  const name = PART_NAMES[d];
  if (!name) throw new Error(`No part name for ${d}`);
  return { text: 'New word', words: [{
    term: `one ${name.one}`,
    meaning: `1 of ${d} equal parts is one ${name.one}. ${d} equal parts are ${name.many}.`,
    picture: [{ rows: [{ kind: 'bar', parts: Array.from({ length: d }, () => 1), cut: true, shaded: [0], label: `1/${d}` }], ms: 0 }],
  }] };
};
