import { isMissionUnlocked, MISSIONS, type DailyPracticeQuestion, type DailyPracticeSession, type Progress } from './game';

export const DAILY_PRACTICE_LENGTH = 5;

export function dailyPracticeDay(now = Date.now()): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function hash(value: string): number {
  return [...value].reduce((result, character) => Math.imul(result ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
}

function targetFor(missionId: string, day: string, round = 0): Pick<DailyPracticeQuestion, 'numerator' | 'denominator'> {
  const mission = MISSIONS.find((item) => item.id === missionId);
  const source = mission?.questions[hash(`${day}:${missionId}${round ? `:${round}` : ''}`) % (mission?.questions.length ?? 1)];
  const model = source?.model;
  let numerator = 0;
  let denominator = 0;

  if (model?.kind === 'bars') {
    numerator = model.bars[0]?.numerator ?? 0;
    denominator = model.bars[0]?.denominator ?? 0;
  } else if (model?.kind === 'line') {
    numerator = model.numerator;
    denominator = model.denominator;
  } else if (model?.kind === 'set' && model.selected > 0) {
    numerator = model.selected;
    denominator = model.total;
  } else if (model?.kind === 'partition') {
    numerator = 1;
    denominator = model.parts.length;
  } else if (model?.kind === 'decimal' && model.tenths > 0) {
    numerator = model.tenths;
    denominator = 10;
  }

  if (Number.isInteger(numerator) && numerator > 0 && Number.isInteger(denominator) && denominator >= numerator && denominator <= 12) {
    return { numerator, denominator };
  }

  const index = Math.max(0, MISSIONS.findIndex((item) => item.id === missionId));
  denominator = 2 + (index % 7);
  numerator = 1 + (hash(`${missionId}:${day}:fallback${round ? `:${round}` : ''}`) % denominator);
  return { numerator, denominator };
}

/** Small fractions (halves to eighths) used when a repeated lesson runs out of new examples. */
const BEGINNER_FRACTIONS: [number, number][] = [2, 3, 4, 5, 6, 8].flatMap((d) => Array.from({ length: d - 1 }, (_, i): [number, number] => [i + 1, d]));

/** Deterministic for the day so returning learners resume the same five topics and values. */
export function createDailyPractice(progress: Progress, now = Date.now()): DailyPracticeSession {
  const day = dailyPracticeDay(now);
  const due = progress.reviewQueue
    .filter((item) => item.dueAt <= now)
    .sort((first, second) => first.dueAt - second.dueAt)
    .map((item) => item.missionId);

  const misconceptionTopics = Object.entries(progress.learning ?? {})
    .map(([missionId, record]) => ({
      missionId,
      misses: Object.values(record.misconceptions ?? {}).reduce((sum, count) => sum + count, 0),
    }))
    .filter((item) => item.misses > 0)
    .sort((first, second) => second.misses - first.misses)
    .map((item) => item.missionId);

  const learnerEvidence = Object.entries(progress.learning ?? {})
    .filter(([missionId, record]) =>
      !progress.completedMissionIds.includes(missionId)
      && !record.completedAt
      && (record.practiceDone || Object.keys(record.checks ?? {}).length > 0 || Object.keys(record.worksheet ?? {}).length > 0),
    )
    .sort((first, second) => {
      const firstRecord = progress.learning?.[first[0]];
      const secondRecord = progress.learning?.[second[0]];
      const firstEvidence = Object.keys(firstRecord?.worksheet ?? {}).length + Object.keys(firstRecord?.checks ?? {}).length;
      const secondEvidence = Object.keys(secondRecord?.worksheet ?? {}).length + Object.keys(secondRecord?.checks ?? {}).length;
      return secondEvidence - firstEvidence;
    })
    .map(([missionId]) => missionId);

  const completed = MISSIONS
    .filter((mission) => progress.completedMissionIds.includes(mission.id))
    .sort((first, second) =>
      (progress.learning?.[first.id]?.completedAt ?? 0) - (progress.learning?.[second.id]?.completedAt ?? 0),
    );
  if (completed.length > 1) {
    const rotation = hash(day) % completed.length;
    completed.push(...completed.splice(0, rotation));
  }

  // Lessons the child has worked on come first; the rest is filled only from lessons they can open,
  // never from lessons that are still locked. A new learner repeats their open lesson with new numbers.
  const orderedIds = [...new Set([
    ...due,
    ...misconceptionTopics,
    ...learnerEvidence,
    ...completed.map((mission) => mission.id),
    ...MISSIONS.filter((mission) => isMissionUnlocked(progress, mission.id)).map((mission) => mission.id),
  ])].filter((missionId) => MISSIONS.some((mission) => mission.id === missionId));
  const pool = orderedIds.length ? orderedIds : [MISSIONS[0].id];
  const picks = Array.from({ length: DAILY_PRACTICE_LENGTH }, (_, index) => pool[index % pool.length]);
  const seen: string[] = [];
  const questions = picks.map((missionId, index) => {
    const mission = MISSIONS.find((item) => item.id === missionId)!;
    const round = picks.slice(0, index).filter((id) => id === missionId).length;
    let target = targetFor(missionId, day, round);
    // Repeated lessons get a fraction not already used today.
    for (let tries = 1; seen.includes(`${target.numerator}/${target.denominator}`) && tries < 12; tries++) target = targetFor(missionId, day, round + tries * 7);
    if (seen.includes(`${target.numerator}/${target.denominator}`)) {
      const fresh = BEGINNER_FRACTIONS.filter(([n, d]) => !seen.includes(`${n}/${d}`));
      const [n, d] = fresh[hash(`${day}:${index}`) % fresh.length];
      target = { numerator: n, denominator: d };
    }
    seen.push(`${target.numerator}/${target.denominator}`);
    const { numerator, denominator } = target;
    const modelKind = (index + hash(day)) % 2 === 0 ? 'bar' as const : 'number-line' as const;
    return {
      id: round ? `daily-${day}-${missionId}-${round + 1}` : `daily-${day}-${missionId}`,
      missionId,
      topicTitle: mission.shortTitle,
      modelKind,
      numerator,
      denominator,
      explanation: modelKind === 'bar'
        ? `${denominator} equal parts make one whole. ${numerator} ${numerator === 1 ? 'part is' : 'parts are'} shaded, so the fraction is ${numerator}/${denominator}.`
        : `The line from 0 to 1 has ${denominator} equal spaces. ${numerator} jump${numerator === 1 ? '' : 's'} land at ${numerator}/${denominator}.`,
    };
  });

  return { day, startedAt: now, questions, index: 0, attempts: {} };
}
