/* Which lesson first writes or says a part name the Words screen doesn't teach (fifths, tenths, sixteenths, hundredths …):
   that lesson's page opens with a one-line "New word" card. A name used earlier, in an idea's practice, is taught first
   on a word card on that idea's Learn page (ideas/helpers.ts `newWord`), and the lesson page then skips its card.
   Listen reads a written fraction with its part name ("1/16" is "one sixteenth"), so teach-extras.test.ts checks that
   no screen says or writes a part before its card; a new name needs a row here and an entry in PART_NAMES. Keep to one
   or two cards per lesson. */
import { LESSON_IDEAS } from './lesson-ideas';
import { PART_NAMES } from './intro-copy';

/** The lesson whose page shows each name's card (denominator, then lesson id), in course order. */
export const NEW_WORD_LESSON: Readonly<Record<number, string>> = {
  5: 'benchmarks-zero-one', // its idea 2 asks "How many fifths are missing?"
  10: 'build-equivalents', // its idea 1 practice and builds use tenths: a Learn page card on idea 1 (ideas/lessons-11-20.ts)
  12: 'build-equivalents', // its idea 1 practice and builds use twelfths: a Learn page card on idea 1
  100: 'tenths-decimals', // its story line looks ahead to hundredths
  9: 'add-related-fractions', // "Change 1/3 into ninths first."
  15: 'add-unlike-fractions', // "use fifteenths"
  // Denominators Listen names that no card taught. Each card is in the lesson that first writes the fraction.
  7: 'unit-fractions', // a Learn page card: idea 1's practice has 1/7 as a wrong choice
  11: 'fraction-of-area', // Practice more: a wrong choice 5/11
  14: 'fraction-of-area', // Practice more: a wrong choice 6/14
  18: 'fraction-magnitude', // the unit 3 challenge: "9/18 is exactly half"
  24: 'build-line-plots', // the unit 4 challenge: 9/24 meter
  16: 'compose-to-one', // a Learn page card: idea 2's practice has 8/16
  20: 'compose-to-one', // Practice more: 7/20
  25: 'mixed-improper', // the unit 7 challenge: 5/25
  28: 'subtract-mixed-numbers', // first written in lesson 31 (a wrong choice 1/28); its card is two lessons up so lesson 31 keeps two cards
  32: 'hundredths-decimals', // Practice more: a wrong choice 1/32
  50: 'hundredths-decimals', // Practice more: a wrong choice 1/50
};

/** Does one of the lesson's ideas teach this name on a Learn page (a word card for "one fifth")? */
const taughtOnLearnPage = (missionId: string, d: number) => (LESSON_IDEAS[missionId] ?? []).some((idea) =>
  idea.learn.some((page) => 'words' in page && page.words.some((word) => word.term === `one ${PART_NAMES[d]!.one}`)));

/** The new part names a lesson page introduces ([5] for fifths), in course order. */
export function newWordsFor(missionId: string): number[] {
  return Object.entries(NEW_WORD_LESSON)
    .filter(([d, lesson]) => lesson === missionId && !taughtOnLearnPage(missionId, Number(d)))
    .map(([d]) => Number(d));
}
