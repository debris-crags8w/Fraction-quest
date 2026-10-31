/* Learn one idea, practise it three times, then the next idea. Each lesson with ideas teaches one idea on its Learn
   pages (pictures from its Teach first), then asks 3 practices that use only that idea and the ones before it. After the
   last idea a 3-question checkpoint with new numbers comes (checkpoint.ts), then the lesson's review and story problem
   ("Put it together"), then the lesson page. Pure data, checked by
   lesson-ideas.test.ts (every practice is a real question, cake round or card-ordering round; each idea has 3; each screen
   uses only its idea and earlier ones). Every lesson has ideas (a test checks all of MISSIONS). */
import type { Mission, PracticeQuestion } from './game';
import type { PartFinderRound } from './part-finder';
import { sceneSentences } from './teach-scenes';
import { wordsScript } from './teach-extras';
import { sentences } from './lib/voice';
import type { IdeaPractice, LearnPage, LessonIdea } from './ideas/helpers';
import { IDEAS as LESSONS_01 } from './ideas/lessons-01';
import { IDEAS as LESSONS_02_10 } from './ideas/lessons-02-10';
import { IDEAS as LESSONS_11_20 } from './ideas/lessons-11-20';
import { IDEAS as LESSONS_21_30 } from './ideas/lessons-21-30';
import { IDEAS as LESSONS_31_40 } from './ideas/lessons-31-40';
import { IDEAS as LESSONS_41_50 } from './ideas/lessons-41-50';
import { IDEAS as LESSONS_51_60 } from './ideas/lessons-51-60';
import { IDEAS as LESSONS_61_71 } from './ideas/lessons-61-71';
import { IDEAS as LESSONS_72_81 } from './ideas/lessons-72-81';

export type { IdeaPractice, IdeaTerm, LearnPage, LessonIdea } from './ideas/helpers';

/** Every lesson's ideas, from one file per group of lessons (so the groups can be written side by side). */
export const LESSON_IDEAS: Record<string, LessonIdea[]> = {
  ...LESSONS_01,
  ...LESSONS_02_10,
  ...LESSONS_11_20,
  ...LESSONS_21_30,
  ...LESSONS_31_40,
  ...LESSONS_41_50,
  ...LESSONS_51_60,
  ...LESSONS_61_71,
  ...LESSONS_72_81,
};

export const lessonIdeas = (missionId: string): LessonIdea[] | undefined => LESSON_IDEAS[missionId];

/** Where a practice sits: which idea, and which of its practices. */
export type IdeaStep = { idea: number; practice: number; item: IdeaPractice };
/** Every practice of the lesson's ideas, in order. */
export const ideaSteps = (missionId: string): IdeaStep[] =>
  (LESSON_IDEAS[missionId] ?? []).flatMap((idea, i) => idea.practice.map((item, practice) => ({ idea: i, practice, item })));

/** A lesson's own or idea question, by id. */
export const ideaQuestion = (mission: Mission, id: string): PracticeQuestion | undefined =>
  [...mission.questions, ...(mission.ideaQuestions ?? [])].find((question) => question.id === id);

/** A hands-on or card-ordering round's place in the practice list (the app shows the round there, not this). */
export const handsOnStandIn = (mission: Mission, round: PartFinderRound['id'] | string, kind: 'hands-on' | 'sort' = 'hands-on'): PracticeQuestion => ({
  id: `${mission.id}-${kind}-${round}`, prompt: '', choices: [], correctChoice: 0, hint: '', retryFeedback: '',
  model: { kind: 'partition', parts: [100] }, simplerModel: { kind: 'partition', parts: [100] },
});
/** Is this practice a round (cake or card ordering) rather than a question? */
export const isRound = (item: IdeaPractice): item is Exclude<IdeaPractice, { question: string }> => !('question' in item);

/** The practice list for a lesson with ideas: each idea's 3 practices in order (none is a checkpoint). */
export const ideaPracticeQuestions = (mission: Mission): PracticeQuestion[] =>
  ideaSteps(mission.id).map(({ item }) => ('handsOn' in item ? handsOnStandIn(mission, item.handsOn)
    : 'sortRound' in item ? handsOnStandIn(mission, item.sortRound, 'sort')
      : { ...ideaQuestion(mission, item.question)!, isMastery: false }));

/** A one-sentence hint's nudge: a few words naming the step, with no number (each is its own voice clip). Whole-hint
    patterns, so a generated hint with other numbers fades the same way. */
const NUDGES: [RegExp, string][] = [
  [/^Count the parts, not the cuts\.$/, 'Count the parts.'],
  [/^Count all the equal parts first\.$/, 'Count all the parts.'],
  [/^\d+ tiles? out of \d+\.$/, 'Count the tiles.'],
  [/^A unit fraction has a numerator of 1\.$/, 'Check each numerator.'],
  [/^Count the (\w+) until the whole bar is full\.$/, 'Fill the bar with $1.'],
  [/^Cut the \w+ into one equal part for each friend\.$/, 'One part for each friend.'],
  [/^The bigger part fills more of the bar, so it is closer to the whole bar\.$/, 'Which part fills more?'],
  [/^The smaller part leaves more of the whole bar empty\.$/, 'Which part leaves more empty?'],
  [/^The other half has the same number of pieces\.$/, 'Both halves match.'],
  [/^How many (\w+) make half of \d+ \1\?$/, 'Find half of the $1.'],
  [/^The denominator (?:tells how many equal spaces go from 0 to 1|of \d+\/\d+ tells how many equal spaces|tells the size of the parts|is how many parts make one whole)\.$/, 'Look at the denominator.'],
  [/^(?:Count the spaces, not the tick marks|The denominator is the number of equal spaces from 0 to 1|Each space is 1 of the equal spaces from 0 to 1)\.$/, 'Count the spaces.'],
  [/^(?:Count \d+ jumps from 0|The numerator counts the jumps from 0 to the point)\.$/, 'Count the jumps.'],
  [/^\d+\/(\d+) inch is the same as 1 inch\.$/, 'How many parts fill an inch?'],
  [/^Count all the new (parts|spaces)(?: in the whole| from 0 to 1)\.$/, 'Count the new $1.'],
  [/^Cut each (\w+) into \d+ parts\.$/, 'Cut each $1.'],
  [/^Double the numerator and denominator\.$/, 'Double both numbers.'],
  [/^Do the same thing to the numerator and denominator\.$/, 'Change both the same way.'],
  [/^Can you divide both by the same number\?$/, 'Divide both the same way.'],
  [/^What times \d+ makes \d+\?$/, 'Multiplied by what?'],
  [/^The top number was doubled, \d+ to \d+\.$/, 'Do the same to the bottom.'],
  [/^The numerator was cut in half\.$/, 'Same for the denominator.'],
  [/^\d+ take away \d+ is what\?$/, 'Take away the parts.'],
  [/^\d+\/\d+ means \d+ of \d+ equal parts\.$/, 'Are all the parts shaded?'],
  [/^(?:One whole is all of its equal parts|\d+\/\d+ is all \d+ parts of one whole)\.$/, 'Count the parts in one whole.'],
  [/^\d+\/\d+ is exactly one whole\.$/, 'Compare with one whole.'],
  [/^Count the shaded (\w+) in both bars\.$/, 'Count the shaded $1.'],
  [/^The whole number comes first\.$/, 'Wholes come first.'],
  [/^A mixed number has a whole number and a fraction\.$/, 'Find a whole and a fraction.'],
  [/^Same size parts means the same denominator\.$/, 'Match the denominator.'],
  [/^Add the whole numbers: \d+ and \d+\.$/, 'Add the whole numbers.'],
  [/^Compare the parts: \d+\/\d+ and \d+\/\d+\.$/, 'Compare the parts.'],
  [/^The number right after the decimal point is tenths\.$/, 'Read the tenths place.'],
  [/^Write both numbers as tenths\.$/, 'Use tenths.'],
  [/^Hundredths use 2 places after the decimal point\.$/, 'Use two decimal places.'],
  [/^Multiply top and bottom of \d+\/\d+ by \d+ to make 10 on the bottom\.$/, 'Make tenths first.'],
  [/^(?:Multiply top and bottom of \d+\/\d+ by \d+ to make 100 on the bottom|Rename \d+\/\d+ in hundredths first: [\d ×=]+)\.$/, 'Make hundredths first.'],
  [/^Each tenth is 10 hundredths\.$/, 'Change tenths to hundredths.'],
  [/^Change \d+\/\d+ into (\w+)( first)?\.$/, 'Change to $1$2.'],
  [/^Each penny is 1\/100 of a dollar\.$/, 'Count pennies in a dollar.'],
  [/^Each dime is 10 hundredths of a dollar\.$/, 'Count hundredths for each dime.'],
  [/^Count the copies of \d+\/\d+\.$/, 'Count the copies.'],
  [/^Count the (\w+) from 0 to the [\w’']+ length\.$/, 'Count the $1.'],
  [/^Look for the tallest stack of Xs\.$/, 'Find the tallest stack.'],
  [/^Rename the fraction with the bigger parts into the smaller parts\.$/, 'Rename the bigger parts.'],
  [/^Rename both fractional parts as \w+, then (add|subtract)\.$/, 'Rename the parts first.'],
  [/^Which one has the fewest parts shaded\?$/, 'Fewest parts shaded?'],
  [/^Give one \w+ to each group, again and again, until none are left\.$/, 'Share them out one by one.'],
  [/^Which one has the same top number and bottom number\?$/, 'Top and bottom the same?'],
  [/^Which one has a top number smaller than its bottom number\?$/, 'Top smaller than bottom?'],
  [/^(?:Is the factor \d+\/\d+ less than 1\?|Compare \d+\/\d+ with \d+\/\d+, which is 1\.|How many \w+ make 1 whole\?)$/, 'Compare the factor with one.'],
  [/^Add the (\w+) for every X: [\d +]+\.$/, 'Add all the $1.'],
  [/^Add the amounts in the \w+, then split that total into \d+ equal shares\.$/, 'Add, then share equally.'],
  [/^Look at the unit facts for (\w+)\.$/, 'Check the facts for $1.'],
  [/^Change [\d /]+ \w+ to (\w+) first: an? \w+ is \d+ \w+\.$/, 'Change to $1 first.'],
  [/^How many \d+\/\d+ parts make one whole cup\?$/, 'Count the parts in one cup.'],
  [/^(?:Are you splitting the \w+ among people, or counting how many \w+ fit|Is an amount split among friends, or do you count how many \w+ fit)\?$/, 'Sharing or fitting?'],
  [/^Multiply the whole by the part: [\d ×/]+\.$/, 'Multiply the whole by the part.'],
  [/^Percent means out of 100\.$/, 'Out of how many?'],
  [/^Do only the first step: [^.]+\.$/, 'First step only.'],
  [/^Check the rule: add the numerators, keep the denominator\.$/, 'Check the adding rule.'],
  [/^Check the rule: a whole number times a fraction multiplies only the numerator\.$/, 'Check the multiplying rule.'],
  [/^Divide both by \d+\.$/, 'Divide both.'],
  [/^Make \d+ equal groups\.$/, 'Make equal groups.'],
  [/^Give one piece to each friend, then go around again\.$/, 'Hand out one at a time.'],
];

/** Hint fading: once the child has answered one of an idea's practices right without the hint, its later hints open as a
    shorter nudge: the hint's first sentence (already its own voice clip), or for a one-sentence hint a few words naming the
    step (NUDGES). A wrong answer still brings the full hint back. */
export const hintNudge = (hint: string): string => {
  const parts = sentences(hint);
  if (parts.length > 1) return parts[0]!;
  const rule = NUDGES.find(([pattern]) => pattern.test(hint));
  return rule ? hint.replace(rule[0], rule[1]) : hint;
};

/** Has the child been taught to write a fraction by this idea? Not before the idea whose `terms` own fraction notation
    (lesson 1's idea 3, "The top number counts the parts we take"): until then no screen shows one, the bar's "1/4 done"
    included. */
export const fractionsTaughtBy = (missionId: string, ideaIndex: number): boolean => {
  const at = (LESSON_IDEAS[missionId] ?? []).findIndex((idea) => idea.terms?.some((term) => term.pattern.test('1/4')));
  return at < 0 || ideaIndex >= at;
};

/** A short name for the lesson's practice list: a saved place (practiceAt) only resumes in the list it was saved in.
    When a lesson's ideas or questions change, the old question number points somewhere else, so the lesson starts over. */
const planName = (items: string[]): string => {
  let hash = 5381;
  for (const char of items.join('|')) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return `${items.length}-${hash.toString(36)}`;
};
const planItems = (mission: Mission): string[] => lessonIdeas(mission.id)
  ? ideaSteps(mission.id).map(({ item }) => ('question' in item ? item.question : 'handsOn' in item ? `hands-on:${item.handsOn}` : `sort:${item.sortRound}`))
  : mission.questions.map((question) => question.id);
/** The practice list now: the ideas' practices, then (a lesson with ideas) its checkpoint. */
export const practicePlan = (mission: Mission): string => planName(lessonIdeas(mission.id) ? [...planItems(mission), 'checkpoint'] : planItems(mission));
/** The name before the lesson had a checkpoint: a place saved then, inside the ideas, is still the same place. */
export const legacyPracticePlan = (mission: Mission): string => planName(planItems(mission));

/** Can a place saved in a lesson's practice list still be used? Yes when it was saved in the current list. A place saved before the
    lesson had its checkpoint is still right inside the ideas (the checkpoint comes after them all), but one saved later, in the review
    or the story problem, would now land in the checkpoint, so that lesson starts over. */
export const savedPlaceStillFits = (mission: Mission, at: { index: number; plan?: string }): boolean =>
  at.plan === practicePlan(mission)
  || (lessonIdeas(mission.id) !== undefined && at.plan === legacyPracticePlan(mission) && at.index < ideaSteps(mission.id).length);

/** What Listen reads on a Learn page: its line, then the sentences under the picture. A worked example's title is only a label
    ("Write one part"), and said aloud it sounds like an instruction, so only its sentences are read. */
export const learnScript = (page: LearnPage) => ('words' in page ? wordsScript(page.words) : [...(page.label ? [] : [page.text]), ...sceneSentences(page.scene)].join(' '));
