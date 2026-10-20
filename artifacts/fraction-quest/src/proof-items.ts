/* Every question the app can ask, as proof-engine items. Shared by proof.test.ts and the audit script. */
import { MISSIONS, type ModelSpec } from './game';
import { getWorksheet, getBuildChecks, getBuildPracticeChecks, getReviewCheck, type WorksheetProblem } from './learning-content';
import { generateQuestions, getExtraPractice } from './practice-bank';
import { getAssessmentDefinitions, buildAssessmentItems } from './assessments';
import { placementItems, PLACEMENT_UNITS } from './placement';
import { CHALLENGES } from './challenges';
import { STORY_PROBLEMS, withName } from './story';
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
    const ids = m.questions.map((q) => q.id);
    for (const q of getExtraPractice(m.id, ids)) items.push(choiceItem('Practice more', m.id, q));
    for (let s = 1; s <= seeds; s++) for (const q of generateQuestions(m.id, ids, s, 12)) items.push(choiceItem(`practice set ${s}`, m.id, q));
    const builds = [...getBuildChecks(m.id), ...getBuildPracticeChecks(m.id, 0), ...[0, 1, 2].map((r) => getReviewCheck(m.id, r))];
    for (const c of builds) items.push({ source: 'build', lesson: m.id, prompt: c.prompt, target: c.target });
    // Story mode: the lesson's last question told in its chapter, with every season's props.
    const story = STORY_PROBLEMS[m.id]; const last = m.questions[m.questions.length - 1];
    if (story) for (const theme of ['everyday', 'halloween', 'christmas'] as const) items.push(choiceItem(`story (${theme})`, m.id,
      { ...last, prompt: withName(story.prompt, null, theme), choices: (story.choices ?? last.choices).map((c) => withName(c, null, theme)) }));
  }
  for (const d of getAssessmentDefinitions()) for (const s of checkInSeeds) for (const i of buildAssessmentItems(d, s)) items.push(sheetItem(`Check-in ${d.id}`, i.missionId, i.problem));
  for (let u = 1; u <= PLACEMENT_UNITS; u++) for (const s of [1, 2, 3, 4, 5]) for (const i of placementItems(u, s)) items.push(sheetItem('Find my level', i.missionId, i.problem));
  for (const [u, qs] of Object.entries(CHALLENGES)) for (const q of qs) {
    items.push({ source: 'challenge', lesson: `unit ${u}`, prompt: q.prompt, choices: q.choices, correct: q.correct, pictures: q.figure ? [q.figure as ProofPicture] : [] });
    for (const s of q.steps ?? []) items.push({ source: 'challenge step', lesson: `unit ${u}`, prompt: s.prompt, choices: s.choices, correct: s.correct });
  }
  return items;
}
