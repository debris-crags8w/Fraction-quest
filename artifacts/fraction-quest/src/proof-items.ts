/* Every question the app can ask, as proof-engine items. Shared by proof.test.ts and the audit script. */
import { MISSIONS, type ModelSpec } from './game';
import { getWorksheet, getBuildChecks, getBuildPracticeChecks, getReviewCheck, type WorksheetProblem } from './learning-content';
import { generateQuestions, getExtraPractice } from './practice-bank';
import { lessonCheckpoint } from './checkpoint';
import { getAssessmentDefinitions, buildAssessmentItems } from './assessments';
import { placementItems, PLACEMENT_UNITS } from './placement';
import { CHALLENGES } from './challenges';
import { PROP_THEMES, STORY_PROBLEMS, withName } from './story';
import { LESSON_INTROS } from './lesson-intros';
import { WAR_ROUNDS, compareFractions, lineUpInOrder, lineUpRound, type FractionModel } from './concept-games';
import { frogRound, positionName, FROG_ROUNDS } from './frog-hop';
import { correctGap, towerRound, TOWER_ROUNDS, type TowerBlock } from './stack-tower';
import type { ProofItem, ProofPicture } from './proof';

const sheetItem = (source: string, lesson: string, p: WorksheetProblem): ProofItem => ({
  source, lesson, prompt: p.prompt, answer: p.answer,
  pictures: [p.model, p.area && { kind: 'area', ...p.area }, p.picture].filter(Boolean) as ProofPicture[],
  ...(p.rulerTask ? { rulerEnd: { end: p.rulerTask.end, denominator: p.rulerTask.denominator } } : {}),
  ...(p.linePlotTask ? { linePlot: { values: p.linePlotTask.values, denominator: p.linePlotTask.denominator } } : {}),
});
const choiceItem = (source: string, lesson: string, q: { prompt: string; choices: string[]; correctChoice: number; model?: ModelSpec }): ProofItem => ({
  source, lesson, prompt: q.prompt, choices: q.choices, correct: q.correctChoice, pictures: q.model ? [q.model as ProofPicture] : [],
});

export function allProofItems({ sheets = 8, seeds = 10, checkInSeeds = [1, 2, 999_999_999] } = {}): ProofItem[] {
  const items: ProofItem[] = [];
  for (const m of MISSIONS) {
    for (let v = 0; v < sheets; v++) for (const p of getWorksheet(m.id, v)) items.push(sheetItem(`worksheet ${v}`, m.id, p));
    for (const q of m.questions) items.push(choiceItem('lesson question', m.id, q));
    for (const q of m.ideaQuestions ?? []) items.push(choiceItem('idea practice', m.id, q));
    const ids = m.questions.map((q) => q.id);
    for (const q of lessonCheckpoint(m)) items.push(choiceItem('lesson checkpoint', m.id, q));
    for (const q of getExtraPractice(m.id, ids)) items.push(choiceItem('Practice more', m.id, q));
    for (let s = 1; s <= seeds; s++) for (const q of generateQuestions(m.id, ids, s, 12)) items.push(choiceItem(`practice set ${s}`, m.id, q));
    const builds = [...getBuildChecks(m.id), ...getBuildPracticeChecks(m.id, 0), ...[0, 1, 2].map((r) => getReviewCheck(m.id, r))];
    for (const c of builds) items.push({ source: 'build', lesson: m.id, prompt: c.prompt, target: c.target });
    // Story mode: the lesson's last question told in its chapter, with every season's props.
    const story = STORY_PROBLEMS[m.id]; const last = m.questions[m.questions.length - 1];
    if (story) for (const theme of PROP_THEMES) items.push(choiceItem(`story (${theme})`, m.id,
      { ...last, prompt: withName(story.prompt, null, theme), choices: (story.choices ?? last.choices).map((c) => withName(c, null, theme)) }));
  }
  for (const d of getAssessmentDefinitions()) for (const s of checkInSeeds) for (const i of buildAssessmentItems(d, s)) items.push(sheetItem(`Check-in ${d.id}`, i.missionId, i.problem));
  for (let u = 1; u <= PLACEMENT_UNITS; u++) for (const s of [1, 2, 3, 4, 5]) for (const i of placementItems(u, s)) items.push(sheetItem('Find my level', i.missionId, i.problem));
  for (const [u, qs] of Object.entries(CHALLENGES)) for (const q of qs) {
    items.push({ source: 'challenge', lesson: `unit ${u}`, prompt: q.prompt, choices: q.choices, correct: q.correct, pictures: q.figure ? [q.figure as ProofPicture] : [] });
    for (const s of q.steps ?? []) items.push({ source: 'challenge step', lesson: `unit ${u}`, prompt: s.prompt, choices: s.choices, correct: s.correct });
  }
  for (const m of MISSIONS) {
    // The worked example: its question, the answer it shows, and its picture.
    items.push({ source: 'worked example', lesson: m.id, prompt: m.example.prompt, answer: exampleAnswer(m.example.prompt, m.example.answer), pictures: m.example.model ? [m.example.model as ProofPicture] : [] });
  }
  items.push(...gameProofItems());
  return items;
}

/** A worked example writes its answer as a sentence ("1/3 is bigger.", "7/4, or 1 and 3/4.", "12 of 20"): the bare answer. */
export function exampleAnswer(prompt: string, answer: string): string {
  let a = answer.trim().replace(/\.$/, '');
  a = a.split(', or ')[0];
  a = a.replace(/^(.+) is (?:bigger|smaller)$/, '$1').replace(/^A little (less|more) than/, (_m, w: string) => `${w.charAt(0).toUpperCase()}${w.slice(1)} than`);
  const of = /^(\d+) of (\d+)$/.exec(a);
  if (of) a = `${of[1]}/${of[2]}`;
  // "Fill the blank: 2/3 = ?/6" shows the whole fraction; the blank is its numerator.
  const blank = /\?\/(\d+)$/.exec(prompt); const whole = /^(\d+)\/(\d+)$/.exec(a);
  if (blank && whole && whole[2] === blank[1]) a = whole[1];
  return a;
}

const name = (f: FractionModel) => `${f.n}/${f.d}`;
/** The games work out their answers in code; each round becomes the question it asks, with the game's answer. */
export function gameProofItems(seeds = [1, 2, 3, 4, 5]): ProofItem[] {
  const items: ProofItem[] = [];
  // Fraction War: the bigger fraction wins (or they are equal).
  for (const [a, b] of WAR_ROUNDS) {
    const order = compareFractions(a, b);
    items.push({ source: 'Fraction War', lesson: 'games', prompt: `Which is bigger, ${name(a)} or ${name(b)}?`, choices: [name(a), name(b), 'They are equal'], correct: order === 1 ? 0 : order === -1 ? 1 : 2 });
  }
  // Fraction Line-Up: the order the game accepts.
  const orders = (cards: FractionModel[]): FractionModel[][] => cards.length <= 1 ? [cards]
    : cards.flatMap((card, i) => orders([...cards.slice(0, i), ...cards.slice(i + 1)]).map((rest) => [card, ...rest]));
  for (const mode of ['same-denominator', 'same-numerator', 'mixed'] as const) for (const seed of seeds) for (let i = 0; i < 6; i++) {
    const round = lineUpRound(mode, seed, i);
    const accepted = orders(round.cards).filter((order) => lineUpInOrder(order, round.direction));
    items.push({ source: 'Fraction Line-Up', lesson: 'games', prompt: `Put ${round.cards.map(name).join(', ')} in order, ${round.direction} first.`,
      answer: accepted.length === 1 ? accepted[0].map(name).join(', ') : `${accepted.length} orders accepted` });
  }
  // Frog Hop: the goal's name, in jumps of 1/denominator.
  for (const seed of seeds) for (let i = 0; i < FROG_ROUNDS; i++) {
    const round = frogRound(seed, i);
    items.push({ source: 'Frog Hop', lesson: 'games', prompt: `Each jump is 1/${round.denominator}. What is ${round.goal} jumps from 0?`, answer: positionName(round.goal, round.denominator) });
  }
  // Stack Tower: every block goes in the gap the game says, so the finished tower is biggest at the bottom.
  for (const seed of seeds) for (let i = 0; i < TOWER_ROUNDS; i++) {
    const round = towerRound(seed, i);
    const tower: TowerBlock[] = [round.first];
    for (const block of round.arriving) tower.splice(correctGap(tower, block), 0, block);
    const blocks = [round.first, ...round.arriving];
    items.push({ source: 'Stack Tower', lesson: 'games', prompt: `Put ${blocks.map(name).join(', ')} in order, biggest first.`, answer: tower.map(name).join(', ') });
  }
  return items;
}

/** Every explanation, hint and feedback line the app writes, for the written-sum check (falseClaims). */
export function allWrittenTexts({ sheets = 8, seeds = 10 } = {}): { where: string; text: string }[] {
  const texts: { where: string; text: string }[] = [];
  const add = (where: string, text: string | undefined) => { if (text) texts.push({ where, text }); };
  for (const m of MISSIONS) {
    add(`${m.id} worked example`, m.example.explanation);
    const ids = m.questions.map((q) => q.id);
    const questions = [...m.questions, ...(m.ideaQuestions ?? []), ...lessonCheckpoint(m), ...getExtraPractice(m.id, ids), ...Array.from({ length: seeds }, (_, s) => generateQuestions(m.id, ids, s + 1, 12)).flat()];
    for (const q of questions) { add(`${m.id} hint`, q.hint); add(`${m.id} feedback`, q.retryFeedback); }
    for (let v = 0; v < sheets; v++) for (const p of getWorksheet(m.id, v)) { add(`${m.id} worksheet hint`, p.hint); add(`${m.id} worksheet why`, p.why); }
    for (const c of [...getBuildChecks(m.id), ...getBuildPracticeChecks(m.id, 0), ...[0, 1, 2].map((r) => getReviewCheck(m.id, r))]) add(`${m.id} build`, c.explanation);
    const intro = LESSON_INTROS[m.id];
    if (intro) for (const line of [intro.goal, ...intro.steps, intro.why]) add(`${m.id} intro`, line);
    const story = STORY_PROBLEMS[m.id];
    if (story) { add(`${m.id} story`, story.setup); add(`${m.id} story`, story.result); }
  }
  for (const [u, qs] of Object.entries(CHALLENGES)) for (const q of qs) add(`challenge unit ${u}`, q.explanation);
  return texts;
}
