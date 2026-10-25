/* Learn one idea, practise it three times, then the next idea. Each lesson with ideas teaches one idea on its Learn
   pages (pictures from its Teach first), then asks 3 practices that use only that idea and the ones before it. After the
   last idea the lesson's review and story problem come ("Put it together"), then the lesson page. Pure data, checked by
   lesson-ideas.test.ts (every practice is a real question, cake round or card-ordering round; each idea has 3; each screen
   uses only its idea and earlier ones). Lessons without ideas keep Teach first and then mixed practice. */
import type { Mission, PracticeQuestion } from './game';
import type { PartFinderRound } from './part-finder';
import { sceneSentences } from './teach-scenes';
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

/** What Listen reads on a Learn page: its line, then the sentences under the picture. */
export const learnScript = (page: LearnPage) => [page.text, ...sceneSentences(page.scene)].join(' ');
