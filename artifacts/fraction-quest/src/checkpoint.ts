/* The end-of-lesson checkpoint: after the last idea's practices and before "Put it together", 3 mixed questions with NEW
   numbers. They come from the lesson's own question generator (practice-bank.ts), so each has its picture, four choices,
   the real slips as wrong choices and the same guards as "Practice more" (taught part names, leak checks, the proof
   engine). None repeats a question the child already met in the lesson (an idea practice, a lesson question, the story
   problem), whatever its choices. The same lesson always gets the same three, so a reload or a resumed lesson shows the
   same questions. Pure; checked by checkpoint.test.ts. */
import { MISSIONS, type Mission, type PracticeQuestion } from './game';
import { generateQuestions } from './practice-bank';
import { LESSON_IDEAS, ideaQuestion, isRound } from './lesson-ideas';
import { STORY_PROBLEMS } from './story';
import { workedWhy } from './checkpoint-why';

export const CHECKPOINT_COUNT = 3;
/** The generator seeds the checkpoint draws from (the proof engine and the vocabulary tests cover these sets). */
const CHECKPOINT_SEEDS = 10;

const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const words = (prompt: string) => prompt.toLowerCase().replace(/[^a-z0-9/.\s]/g, ' ').replace(/\s+/g, ' ').trim();
/** The numbers a question uses (fractions whole), in any order: two questions with the same numbers are the same question. */
const numbersOf = (prompt: string) => (prompt.match(/\d+\s*\/\s*\d+|\d+(?:\.\d+)?/g) ?? []).map((n) => n.replace(/\s+/g, '')).sort().join(' ');
/** What kind of question it is: its picture and how it opens (so the three do not all ask the same thing). */
export const checkpointKind = (question: PracticeQuestion) => `${question.model.kind}:${words(question.prompt).replace(/[0-9/.]+/g, '#').split(' ').slice(0, 3).join(' ')}`;

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

const rightAnswer = (question: PracticeQuestion) => question.choices[question.correctChoice];
const fractionsIn = (prompt: string) => new Set((prompt.match(/\d+\s*\/\s*\d+/g) ?? []).map((n) => n.replace(/\s+/g, '')));
/** Two questions that may sit in one checkpoint: different questions, numbers and right answers. */
const fitTogether = (a: PracticeQuestion, b: PracticeQuestion) => identity(a) !== identity(b) && rightAnswer(a) !== rightAnswer(b)
  && (numbersOf(a.prompt) === '' || numbersOf(a.prompt) !== numbersOf(b.prompt));
const sharesFraction = (a: PracticeQuestion, b: PracticeQuestion) => { const mine = fractionsIn(a.prompt); return [...fractionsIn(b.prompt)].some((x) => mine.has(x)); };

/** How well three questions mix: most ideas, then most kinds of question, then fewest fractions shared between two of them. */
function mixScore(mission: Mission, picked: PracticeQuestion[]): number[] {
  const ideas = new Set(picked.map((question) => checkpointIdea(mission, question)).filter((idea) => idea >= 0)).size;
  const kinds = new Set(picked.map(checkpointKind)).size;
  let shared = 0;
  picked.forEach((question, i) => picked.slice(i + 1).forEach((other) => { if (sharesFraction(question, other)) shared++; }));
  return [picked.length, ideas, kinds, -shared];
}
const better = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };

/** What a right answer says: the generator's explanation, or a worked why (checkpoint-why.ts) where that is only the hint again. */
function explained(mission: Mission, question: PracticeQuestion): string {
  const bare = question.retryFeedback.trim().replace(/\s*So the answer is [^.]*\.?$/, '').trim();
  return bare === question.hint.trim() ? workedWhy(mission.id, question) ?? question.retryFeedback : question.retryFeedback;
}

const CACHE = new Map<string, PracticeQuestion[]>();
/** The checkpoint: three questions from the pool that never share numbers or a right answer, drawn from as many of the lesson's
    ideas and kinds of question as the pool offers. Each start in the pool (in seed order) is completed greedily; the best mix wins,
    the earliest on a tie, so the same lesson always gets the same three. */
export function lessonCheckpoint(mission: Mission): PracticeQuestion[] {
  const cached = CACHE.get(mission.id);
  if (cached) return cached;
  const pool = checkpointPool(mission);
  let best: PracticeQuestion[] = [];
  let bestScore = [-1];
  for (const start of pool.slice(0, 40)) {
    const picked = [start];
    while (picked.length < CHECKPOINT_COUNT) {
      let next: PracticeQuestion | undefined; let nextScore = [-1];
      for (const question of pool) {
        if (!picked.every((other) => fitTogether(question, other))) continue;
        const score = mixScore(mission, [...picked, question]);
        if (better(score, nextScore)) { next = question; nextScore = score; }
      }
      if (!next) break;
      picked.push(next);
    }
    const score = mixScore(mission, picked);
    if (better(score, bestScore)) { best = picked; bestScore = score; }
  }
  // Only if the pool cannot give three that fit together (no lesson today): fill from the pool as it comes.
  for (const question of pool) if (best.length < CHECKPOINT_COUNT && !best.some((other) => identity(other) === identity(question))) best.push(question);
  const out = best.map((question, index) => ({ ...question, retryFeedback: explained(mission, question), id: `${mission.id}-cp${index + 1}`, isCheckpoint: true, isMastery: false }));
  CACHE.set(mission.id, out);
  return out;
}

/** Every question the checkpoint may ask: the generator's questions over the checkpoint seeds with four real choices, a picture
    that is not just a sum written out, and not met in the lesson (same words, or the same numbers asked another way). */
export function checkpointPool(mission: Mission): PracticeQuestion[] {
  const met = metBefore(mission);
  const baseIds = mission.questions.map((question) => question.id);
  const first = hash(mission.id) % CHECKPOINT_SEEDS;
  const pool: PracticeQuestion[] = [];
  const ids = new Set<string>();
  for (let turn = 0; turn < CHECKPOINT_SEEDS; turn++) {
    for (const question of generateQuestions(mission.id, baseIds, 1 + ((first + turn) % CHECKPOINT_SEEDS), 12)) {
      if (question.choices.length !== 4 || question.model.kind === 'equation' || met.identities.has(identity(question))
        || (numbersOf(question.prompt) !== '' && met.numbers.has(numbersOf(question.prompt))) || ids.has(identity(question))) continue;
      ids.add(identity(question));
      pool.push(question);
    }
  }
  return pool;
}

/** Which of the lesson's ideas a question practises: the first idea with a practice of the same kind (picture and opening words),
    or -1 when none has. */
export function checkpointIdea(mission: Mission, question: PracticeQuestion): number {
  const kind = checkpointKind(question);
  return (LESSON_IDEAS[mission.id] ?? []).findIndex((idea) => idea.practice.some((item) => {
    if (isRound(item)) return false;
    const practice = ideaQuestion(mission, item.question);
    return !!practice && checkpointKind(practice) === kind;
  }));
}

/** Every lesson's checkpoint (for the proof engine and the tests). */
export const allCheckpoints = (): { mission: Mission; questions: PracticeQuestion[] }[] =>
  MISSIONS.map((mission) => ({ mission, questions: lessonCheckpoint(mission) }));
