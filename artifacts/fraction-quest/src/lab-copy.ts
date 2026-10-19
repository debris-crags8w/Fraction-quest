/* What the lesson page's section Listen buttons read (LearningLab, LessonTeachingSupport). Kept here so the voice
   pack's sentence list (scripts/voice-sentences.ts) lists the same words and they play from the pack. */
import type { Mission } from './game';
import type { guideForUnit } from './teaching-guide-data';

type Guide = NonNullable<ReturnType<typeof guideForUnit>>;

export const LAB_SECTION_SPEECH = {
  redo: 'Do it again. Want more practice? Try a part again with new numbers. Your lesson stays finished.',
  buildPractice: 'More build practice. Try 10 new, optional questions with this lesson’s ideas. Extra practice does not change lesson completion.',
  reteach: 'Make this idea clearer. One idea has been tricky more than once: use each new model, then enter the answer. These extra checks help make the idea stick.',
};

export const worksheetSpeech = (questions: number) =>
  `Worksheet. Answer all ${questions} questions to finish the lesson. Print the worksheet to hand in, then enter your answers here or with Check my paper.`;

/** The warm-up panel's cards, as read aloud. */
export const supportSpeech = (guide: Guide, mission: Pick<Mission, 'explainPrompt'>) => ({
  warmup: `Quick warm-up. ${guide.warmup.prompt}`,
  words: `Words to know. ${guide.vocabulary.map(({ term, meaning }) => `${term}: ${meaning}`).join(' ')}`,
  explain: `Explain your thinking. ${mission.explainPrompt ?? guide.explainFrame}`,
  teacher: `Be the teacher. ${guide.errorAnalysis.claim}`,
  stretch: `Stretch your thinking. ${guide.enrichment}`,
});
