/* Learn one idea, practise it three times, then the next idea. Each lesson with ideas teaches one idea on its Learn
   pages (pictures from its Teach first), then asks 3 practices that use only that idea and the ones before it. After the
   last idea the lesson's review and story problem come ("Put it together"), then the lesson page. Pure data, checked by
   lesson-ideas.test.ts (every practice is a real question or hands-on round, each idea has 3). Lessons without ideas
   keep Teach first and then mixed practice. */
import type { Mission, PracticeQuestion } from './game';
import type { PartFinderRound } from './part-finder';
import { LESSON_SCENES, sceneSentences, type StepScene } from './teach-scenes';
import { TEACH_EXTRAS } from './teach-extras';

/** One Learn page: a short line and its animated picture. */
export type LearnPage = { text: string; scene: StepScene };
/** A practice: a lesson question (by id, `-q` for the lesson's own, `-p` for one written for its idea) or a hands-on round. */
export type IdeaPractice = { question: string } | { handsOn: PartFinderRound['id'] };
export type LessonIdea = { title: string; learn: LearnPage[]; practice: IdeaPractice[] };

const scenes = (id: string) => LESSON_SCENES[id]!;
const example = (id: string, title: string): LearnPage => {
  const found = TEACH_EXTRAS[id]?.examples?.find((item) => item.title === title);
  if (!found) throw new Error(`No example "${title}" in ${id}`);
  return { text: found.title, scene: found.picture };
};

export const LESSON_IDEAS: Record<string, LessonIdea[]> = {
  'equal-parts': [
    {
      title: 'Equal parts are the same size',
      learn: [
        { text: 'Look at one whole.', scene: scenes('equal-parts').steps[0]! },
        { text: 'Check that every part is the same size.', scene: scenes('equal-parts').steps[1]! },
        { text: 'If one part is bigger, the parts are not fair shares.', scene: scenes('equal-parts').why },
      ],
      practice: [{ question: 'equal-parts-q3' }, { question: 'equal-parts-q1' }, { question: 'equal-parts-p1' }],
    },
    {
      title: 'Count the equal parts to name one part',
      learn: [
        { text: 'Count the equal parts to name them.', scene: scenes('equal-parts').steps[2]! },
        example('equal-parts', 'Name the parts, not the cuts'),
      ],
      practice: [{ question: 'equal-parts-q2' }, { question: 'equal-parts-q4' }, { question: 'equal-parts-p2' }],
    },
    {
      title: 'Equal parts can be different shapes',
      learn: [example('equal-parts', 'Same space, different shape')],
      practice: [{ question: 'equal-parts-p3' }, { handsOn: 'match' }, { question: 'equal-parts-p4' }],
    },
    {
      title: 'Share fairly',
      learn: [example('equal-parts', 'Share fairly')],
      practice: [{ handsOn: 'sort' }, { handsOn: 'sort-cake' }, { question: 'equal-parts-p5' }],
    },
  ],
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

/** A hands-on round's place in the practice list (the app shows the cake round there, not this). */
export const handsOnStandIn = (mission: Mission, round: PartFinderRound['id']): PracticeQuestion => ({
  id: `${mission.id}-hands-on-${round}`, prompt: '', choices: [], correctChoice: 0, hint: '', retryFeedback: '',
  model: { kind: 'partition', parts: [100] }, simplerModel: { kind: 'partition', parts: [100] },
});

/** The practice list for a lesson with ideas: each idea's 3 practices in order (none is a checkpoint). */
export const ideaPracticeQuestions = (mission: Mission): PracticeQuestion[] =>
  ideaSteps(mission.id).map(({ item }) => ('handsOn' in item
    ? handsOnStandIn(mission, item.handsOn)
    : { ...ideaQuestion(mission, item.question)!, isMastery: false }));

/** What Listen reads on a Learn page: its line, then the sentences under the picture. */
export const learnScript = (page: LearnPage) => [page.text, ...sceneSentences(page.scene)].join(' ');
