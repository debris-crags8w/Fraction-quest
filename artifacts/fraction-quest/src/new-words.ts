/* Which lesson first uses a part name the Words screen doesn't teach (fifths, tenths, twelfths, hundredths): that
   lesson opens with a one-line "New word" card. Read from each lesson's builds and worksheet answers, in course order. */
import { MISSIONS } from './game';
import { getBuildChecks, getWorksheet } from './learning-content';

export const NEW_WORD_DENOMINATORS = [5, 10, 12, 100] as const;

let firstLesson: Map<number, string> | null = null;

function denominatorsIn(missionId: string): Set<number> {
  const found = new Set<number>(getBuildChecks(missionId).map((check) => check.target.d));
  const mission = MISSIONS.find((item) => item.id === missionId);
  const text = [
    ...getWorksheet(missionId).map((problem) => `${problem.answer} ${problem.prompt}`),
    // A question's prompt, its right answer and its picture (wrong choices don't count: they aren't taught).
    ...(mission?.questions ?? []).map((question) => {
      const q = question as { prompt?: string; choices?: string[]; correctChoice?: number; model?: unknown };
      return `${q.prompt ?? ''} ${q.choices?.[q.correctChoice ?? -1] ?? ''} ${JSON.stringify(q.model ?? {})}`;
    }),
    JSON.stringify(mission?.example ?? {}),
  ].join(' ');
  for (const match of text.matchAll(/\b\d+\/(\d+)\b|"denominator":(\d+)/g)) found.add(Number(match[1] ?? match[2]));
  return found;
}

/** The new part names a lesson introduces ([5] for fifths), in order. */
export function newWordsFor(missionId: string): number[] {
  if (!firstLesson) {
    firstLesson = new Map();
    for (const mission of MISSIONS) {
      const used = denominatorsIn(mission.id);
      for (const d of NEW_WORD_DENOMINATORS) if (used.has(d) && !firstLesson.has(d)) firstLesson.set(d, mission.id);
    }
  }
  return NEW_WORD_DENOMINATORS.filter((d) => firstLesson!.get(d) === missionId);
}
