/* Which lesson first says a part name the Words screen doesn't teach (fifths, tenths, twelfths, hundredths, ninths,
   fifteenths): that lesson's page opens with a one-line "New word" card. A name said earlier, in an idea's practice, is
   taught first on a word card on that idea's Learn page (ideas/helpers.ts `newWord`), and the lesson page then skips
   its card. teach-extras.test.ts checks that no screen says a name before its card, so a new name needs a row here. */
import { LESSON_IDEAS } from './lesson-ideas';
import { PART_NAMES } from './intro-copy';

/** The lesson whose page shows each name's card (denominator, then lesson id), in course order. */
export const NEW_WORD_LESSON: Readonly<Record<number, string>> = {
  5: 'benchmarks-zero-one', // its idea 2 asks "How many fifths are missing?"
  10: 'build-equivalents', // builds: "Show it in tenths"
  12: 'build-equivalents', // its builds use twelfths
  100: 'tenths-decimals', // its story line looks ahead to hundredths
  9: 'add-related-fractions', // "Change 1/3 into ninths first."
  15: 'add-unlike-fractions', // "use fifteenths"
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
