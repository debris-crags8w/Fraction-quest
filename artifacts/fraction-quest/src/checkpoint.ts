/* The end-of-lesson checkpoint: after the last idea's practices and before "Put it together", 3 mixed questions with NEW
   numbers. They come from the lesson's own question generator (practice-bank.ts), so each has its picture, four choices,
   the real slips as wrong choices and the same guards as "Practice more" (taught part names, leak checks, the proof
   engine). None repeats a question the child already met in the lesson (an idea practice, a lesson question, the story
   problem), whatever its choices. The same lesson always gets the same three, so a reload or a resumed lesson shows the
   same questions. Pure; checked by checkpoint.test.ts. */
import { MISSIONS, type Mission, type PracticeQuestion } from './game';
import { generateQuestions } from './practice-bank';
import { STORY_PROBLEMS } from './story';

export const CHECKPOINT_COUNT = 3;
/** The generator seeds the checkpoint draws from (the proof engine and the vocabulary tests cover these sets). */
const CHECKPOINT_SEEDS = 10;

const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const words = (prompt: string) => prompt.toLowerCase().replace(/[^a-z0-9/.\s]/g, ' ').replace(/\s+/g, ' ').trim();
/** The numbers a question uses (fractions whole), in any order: two questions with the same numbers are the same question. */
const numbersOf = (prompt: string) => (prompt.match(/\d+\s*\/\s*\d+|\d+(?:\.\d+)?/g) ?? []).map((n) => n.replace(/\s+/g, '')).sort().join(' ');
/** What kind of question it is: its picture and how it opens (so the three do not all ask the same thing). */
const kindOf = (question: PracticeQuestion) => `${question.model.kind}:${words(question.prompt).replace(/[0-9/.]+/g, '#').split(' ').slice(0, 3).join(' ')}`;

/** A question's picture without its labels (the same picture drawn with and without number labels is the same picture). */
const pictureKey = (question: PracticeQuestion) => JSON.stringify(question.model, (key, value) => (['hideLabels', 'label', 'labels', 'caption', 'named'].includes(key) ? undefined : value));
/** What makes a question this question: its words and its picture, whatever its choices (a lesson like "What fraction is at the dot?" asks the same
    words about many pictures), and, when it has numbers, those numbers. */
const identity = (question: PracticeQuestion) => `${words(question.prompt)}|${pictureKey(question)}`;

/** Every question the child has already met in this lesson. */
function metBefore(mission: Mission): { identities: Set<string>; numbers: Set<string> } {
  const story = STORY_PROBLEMS[mission.id];
  const asked = [...mission.questions, ...(mission.ideaQuestions ?? [])];
  const texts = asked.map((question) => question.prompt).concat(story ? [story.prompt] : []);
  return { identities: new Set(asked.map(identity)), numbers: new Set(texts.map(numbersOf).filter(Boolean)) };
}

export function lessonCheckpoint(mission: Mission): PracticeQuestion[] {
  const met = metBefore(mission);
  const baseIds = mission.questions.map((question) => question.id);
  const first = hash(mission.id) % CHECKPOINT_SEEDS;
  const picked: PracticeQuestion[] = [];
  const kinds = new Set<string>();
  const spare: PracticeQuestion[] = [];
  for (let turn = 0; turn < CHECKPOINT_SEEDS && picked.length < CHECKPOINT_COUNT; turn++) {
    for (const question of generateQuestions(mission.id, baseIds, 1 + ((first + turn) % CHECKPOINT_SEEDS), 12)) {
      if (picked.length >= CHECKPOINT_COUNT) break;
      const same = (other: PracticeQuestion) => identity(other) === identity(question);
      // Four real choices, a picture that is not just a sum written out, and not a question met in the lesson (same words,
      // or the same numbers asked another way) or already picked.
      if (question.choices.length !== 4 || question.model.kind === 'equation'
        || met.identities.has(identity(question)) || (numbersOf(question.prompt) !== '' && met.numbers.has(numbersOf(question.prompt)))
        || picked.some(same) || spare.some(same)) continue;
      // A question like one already picked waits: the three should cover different things when the generator can.
      if (kinds.has(kindOf(question))) { spare.push(question); continue; }
      kinds.add(kindOf(question));
      picked.push(question);
    }
  }
  for (const question of spare) if (picked.length < CHECKPOINT_COUNT) picked.push(question);
  return picked.map((question, index) => ({ ...question, id: `${mission.id}-cp${index + 1}`, isCheckpoint: true, isMastery: false }));
}

/** Every lesson's checkpoint (for the proof engine and the tests). */
export const allCheckpoints = (): { mission: Mission; questions: PracticeQuestion[] }[] =>
  MISSIONS.map((mission) => ({ mission, questions: lessonCheckpoint(mission) }));
