/* What the end-of-lesson screen tells the learner about what comes next. Kept apart from the screen so every
   state (the middle of the course, the last lesson of a unit, a unit still closed, the last lesson of the
   course, lessons that need the app) can be checked in a unit test. */
import { getNextMission, isMissionUnlocked, MISSIONS, type Progress } from './game';

export type LessonEnd = 'next-open' | 'unit-closed' | 'more-waiting' | 'course-done' | 'needs-grown-up';

export const LESSON_END_NOTE: Record<LessonEnd, string> = {
  'next-open': 'The next lesson is open!',
  'unit-closed': 'Finish the other lessons in this unit to open the next unit.',
  'more-waiting': 'That was the last lesson. A few earlier lessons are still waiting for you.',
  'course-done': 'You finished the whole course! Replay any lesson to practice again.',
  'needs-grown-up': 'The next lesson is waiting for you. Ask a grown-up to unlock it.',
};

/** `lessonsLocked`: the lessons after the first need the app or its subscription (see App's `locked`). */
export function lessonEnd(progress: Progress, missionId: string, lessonsLocked = false): LessonEnd {
  const following = MISSIONS[MISSIONS.findIndex((item) => item.id === missionId) + 1];
  if (following && lessonsLocked) return 'needs-grown-up';
  // Nothing left to open anywhere (the last lesson, or a replay once the course is done).
  if (!getNextMission(progress)) return 'course-done';
  // The last lesson, with a lesson from earlier still waiting (one added later, say).
  if (!following) return 'more-waiting';
  // Units 9 and on open only after every lesson of the unit before is done.
  return isMissionUnlocked(progress, following.id) ? 'next-open' : 'unit-closed';
}
