import { MISSIONS, type AssessmentAttempt, type AssessmentResponse, type ModelSpec, type Progress } from './game';
import { answerMatches, getWorksheet, type LearningModel, type WorksheetProblem } from './learning-content';
import { FRACTION_STANDARDS, MISSION_STANDARDS, type StandardId, standardsForMission } from './standard-catalog';
import { execAll } from './lib/regexp';

export const ASSESSMENT_ITEM_COUNT = 12;
export const MIN_ASSESSMENT_ITEMS = 10;
export const RETENTION_GAP_MS = 24 * 60 * 60 * 1000;

export type AssessmentKind = 'pre' | 'mid' | 'end' | 'grade-beginning' | 'grade-middle' | 'grade-end';
export type AssessmentDefinition = {
  id: string;
  title: string;
  description: string;
  kind: AssessmentKind;
  standards: StandardId[];
  unit?: number;
  grade?: 3 | 4 | 5;
};
export type AssessmentItem = {
  id: string;
  missionId: string;
  prompt: string;
  answer: string;
  standards: StandardId[];
  problem: WorksheetProblem;
  visualFractions?: { n: number; d: number; wholes: number }[];
};
export type StandardMastery = {
  standard: StandardId;
  title: string;
  grade: 3 | 4 | 5;
  status: 'mastered' | 'developing' | 'not-yet';
  correct: number;
  attempted: number;
  accuracy: number | null;
  assessmentCount: number;
};

const missionStandards = new Set(Object.values(MISSION_STANDARDS).flat());
const taughtStandards = FRACTION_STANDARDS.filter(item => missionStandards.has(item.id));

/** A form asks 12 questions, or one per standard when it covers more than 12 (Grade 4 End has 14), so every standard is asked. */
export const assessmentItemCount = (definition: Pick<AssessmentDefinition, 'standards'>): number =>
  Math.max(ASSESSMENT_ITEM_COUNT, definition.standards.length);

export function getAssessmentDefinitions(): AssessmentDefinition[] {
  const definitions: AssessmentDefinition[] = [];
  const units = [...new Set(MISSIONS.map(mission => mission.unit))].sort((a, b) => a - b);
  for (const unit of units) {
    const unitMissions = MISSIONS.filter(mission => mission.unit === unit && !mission.enrichment);
    const standards = [...new Set(unitMissions.flatMap(mission => standardsForMission(mission.id)))];
    if (!standards.length) continue;
    const unitTitle = unitMissions[0]?.title ?? `Unit ${unit}`;
    definitions.push({
      id: `unit-${unit}-pre`, title: `Unit ${unit} · Before you start`,
      description: `A no-pressure check for ${unitTitle}. It never skips or unlocks lessons.`,
      kind: 'pre', unit, standards,
    });
    if (unitMissions.length >= 4) definitions.push({
      id: `unit-${unit}-mid`, title: `Unit ${unit} · Mid-unit check`,
      description: `Check the ideas so far in ${unitTitle}. Lessons still unlock in order.`,
      kind: 'mid', unit, standards,
    });
    definitions.push({
      id: `unit-${unit}-end`, title: `Unit ${unit} · End-of-unit check`,
      description: `Show what you can build and explain from ${unitTitle}.`,
      kind: 'end', unit, standards,
    });
  }
  for (const grade of [3, 4, 5] as const) {
    const standards = taughtStandards.filter(item => item.grade === grade).map(item => item.id);
    if (!standards.length) continue;
    const cuts = [Math.max(1, Math.ceil(standards.length * 0.45)), Math.max(1, Math.ceil(standards.length * 0.72))];
    const stages: { kind: AssessmentKind; label: string; standards: StandardId[] }[] = [
      { kind: 'grade-beginning', label: 'Beginning of year', standards: standards.slice(0, cuts[0]) },
      { kind: 'grade-middle', label: 'Middle of year', standards: standards.slice(0, cuts[1]) },
      { kind: 'grade-end', label: 'End of year', standards },
    ];
    for (const stage of stages) definitions.push({
      id: `grade-${grade}-${stage.kind.slice('grade-'.length)}`,
      title: `Grade ${grade} · ${stage.label}`,
      description: 'A mixed check with a model and a tile answer for every question. It does not change lesson access.',
      kind: stage.kind, grade, standards: stage.standards,
    });
  }
  return definitions;
}

const mix = (value: string): number => {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

/** What a Check-in question shows above the bar the child copies ("Copy the bar above"): the picture of what the question compares
    when it has one (two decimals), otherwise the bar itself, as the worksheet shows it. Counting and shading need none: the bar
    they tap is the picture. */
export function copyReference(problem: WorksheetProblem):
  { kind: 'picture'; model: ModelSpec } | { kind: 'bar'; model: LearningModel } | undefined {
  if (problem.model?.kind !== 'bar' || problem.task?.kind !== 'copy') return undefined;
  return problem.picture ? { kind: 'picture', model: problem.picture } : { kind: 'bar', model: problem.model };
}

function hasInteractiveModel(problem: WorksheetProblem): boolean {
  return !!problem.model || !!(problem.area && problem.areaTask) || !!problem.rulerTask
    || !!problem.linePlotTask || !!problem.scaleTask;
}

function promptFractions(prompt: string): { n: number; d: number; wholes: number }[] {
  return execAll(prompt, /(\d+)\s*\/\s*(\d+)/g)
    .map(match => {
      const n = Number(match[1]); const d = Number(match[2]);
      return { n, d, wholes: Math.max(1, Math.ceil(n / d)) };
    })
    .filter(fraction => Number.isSafeInteger(fraction.n) && Number.isSafeInteger(fraction.d) && fraction.n >= 0 && fraction.d > 0 && fraction.d <= 100)
    .slice(0, 4);
}

/** Build a deterministic, varied 12-item form. A different seed changes both worksheet variants and selection. */
export function buildAssessmentItems(definition: AssessmentDefinition, seed: number): AssessmentItem[] {
  const count = assessmentItemCount(definition);
  const eligibleMissions = MISSIONS.filter(mission => {
    if (mission.enrichment) return false;
    if (definition.unit !== undefined) return mission.unit === definition.unit;
    if (definition.grade === undefined) return false;
    return mission.standards?.some(standard => definition.standards.includes(standard as StandardId));
  });
  const pool = new Map<string, AssessmentItem>();
  for (const [missionIndex, mission] of eligibleMissions.entries()) {
    for (let variantIndex = 0; variantIndex < 5; variantIndex++) {
      const variant = 1 + (Math.abs(seed) % 1_000_000) + missionIndex * 71 + variantIndex * 997;
      for (const problem of getWorksheet(mission.id, variant)) {
        const standards = (problem.standards ?? mission.standards ?? [])
          .filter((standard): standard is StandardId => definition.standards.includes(standard as StandardId));
        const fractions = !hasInteractiveModel(problem) ? promptFractions(problem.prompt) : [];
        const visualFractions = fractions.length ? fractions : undefined;
        // A shape or a decimal grid with no task is read, not built: it still counts. Other pictures stay out (a bar of 6/10 beside
        // "Write 0.6 as a fraction" would draw the answer).
        if (!standards.length || (!hasInteractiveModel(problem) && !visualFractions && !problem.area && problem.picture?.kind !== 'area')) continue;
        const id = `${mission.id}:${problem.id}:${variant}`;
        pool.set(id, {
          id, missionId: mission.id, prompt: problem.prompt, answer: problem.answer, standards, problem,
          ...(visualFractions ? { visualFractions } : {}),
        });
      }
    }
  }

  const candidates = [...pool.values()];
  const byStandard = new Map<StandardId, AssessmentItem[]>();
  for (const standard of definition.standards) {
    byStandard.set(standard, candidates.filter(item => item.standards.includes(standard))
      .sort((a, b) => mix(`${seed}:${a.id}`) - mix(`${seed}:${b.id}`)));
  }

  const selected: AssessmentItem[] = [];
  const selectedIds = new Set<string>();
  const askedPrompts = new Set<string>(); // the same question twice in one check-in is wasted
  const fresh = (candidate: AssessmentItem) => !selectedIds.has(candidate.id) && !askedPrompts.has(candidate.prompt);
  // Round-robin by standard so a check samples the whole scope instead of one lesson.
  for (let round = 0; selected.length < count && round < candidates.length; round++) {
    for (const standard of definition.standards) {
      const candidate = byStandard.get(standard)?.[round];
      if (!candidate || !fresh(candidate)) continue;
      selectedIds.add(candidate.id); askedPrompts.add(candidate.prompt);
      selected.push({ ...candidate, id: `${definition.id}:${seed}:${selected.length + 1}` });
      if (selected.length >= count) break;
    }
  }
  if (selected.length < count) {
    for (const candidate of [...candidates].sort((a, b) => mix(`${seed}:fill:${a.id}`) - mix(`${seed}:fill:${b.id}`))) {
      if (!fresh(candidate)) continue;
      selectedIds.add(candidate.id); askedPrompts.add(candidate.prompt);
      selected.push({ ...candidate, id: `${definition.id}:${seed}:${selected.length + 1}` });
      if (selected.length >= count) break;
    }
  }
  if (selected.length < MIN_ASSESSMENT_ITEMS) {
    throw new Error(`Assessment ${definition.id} has only ${selected.length} model-based items; at least ${MIN_ASSESSMENT_ITEMS} are required.`);
  }
  return selected;
}

export function saveAssessmentAttempt(progress: Progress, attempt: AssessmentAttempt): Progress {
  const valid = (progress.assessments ?? []).filter(item => item.assessmentId !== attempt.assessmentId);
  return { ...progress, assessments: [...valid, attempt].slice(-90) };
}

/** Pre-checks are diagnostic only. Mastery uses the latest attempt for each mid/end/benchmark form. */
export function summarizeStandardMastery(attempts: AssessmentAttempt[] = []): StandardMastery[] {
  const latest = new Map<string, AssessmentAttempt>();
  for (const attempt of attempts) {
    if (!attempt || /-pre$/.test(attempt.assessmentId)) continue;
    const current = latest.get(attempt.assessmentId);
    if (!current || attempt.completedAt >= current.completedAt) latest.set(attempt.assessmentId, attempt);
  }
  const evidence = new Map<StandardId, { responses: AssessmentResponse[]; forms: Set<string>; dates: number[] }>();
  for (const attempt of latest.values()) for (const response of attempt.responses ?? []) {
    if (!response.modelBuilt) continue;
    for (const standard of response.standards) {
      if (!taughtStandards.some(item => item.id === standard)) continue;
      const entry = evidence.get(standard as StandardId) ?? { responses: [], forms: new Set<string>(), dates: [] };
      entry.responses.push(response);
      entry.forms.add(attempt.assessmentId);
      entry.dates.push(attempt.completedAt);
      evidence.set(standard as StandardId, entry);
    }
  }
  return taughtStandards.map(info => {
    const entry = evidence.get(info.id);
    const attempted = entry?.responses.length ?? 0;
    const correct = entry?.responses.filter(response => response.correct).length ?? 0;
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : null;
    const dates = entry?.dates ?? [];
    const delayedEvidence = dates.length > 1 && Math.max(...dates) - Math.min(...dates) >= RETENTION_GAP_MS;
    const status: StandardMastery['status'] = !attempted
      ? 'not-yet'
      : correct >= 3 && (entry?.forms.size ?? 0) >= 2 && delayedEvidence && (accuracy ?? 0) >= 80
        ? 'mastered'
        : 'developing';
    return {
      standard: info.id, title: info.title, grade: info.grade, status, correct, attempted, accuracy,
      assessmentCount: entry?.forms.size ?? 0,
    };
  });
}

export function assessmentResponse(item: AssessmentItem, modelBuilt: boolean, answer: string): AssessmentResponse {
  return {
    itemId: item.id, standards: [...item.standards], modelBuilt,
    correct: modelBuilt && answerMatches(item.problem, answer),
  };
}
