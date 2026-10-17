/* Lists every fixed sentence the app can read aloud, for the pre-made voice pack. It walks the lesson and story
   content in each season's words, splits it the way Listen does, and prints [{ key, text }] as JSON. Run with tsx:
   tsx scripts/voice-sentences.ts > sentences.json. Not part of the app bundle. */

import { MISSIONS } from '../src/game';
import { getBuildChecks, getBuildPracticeChecks, getReviewCheck, getWorksheet } from '../src/learning-content';
import { getExtraPractice } from '../src/practice-bank';
import { partFinderRoundsFor, PART_FINDER_ROUNDS } from '../src/part-finder';
import { getAssessmentDefinitions } from '../src/assessments';
import { CHAPTERS, DETECTIVE_NOTES, EPILOGUE, HANDS_ON_ASKS, PROLOGUE, SUSPECTS, WHOLE_STONE_OPENING, chapterEnd, choiceNotes, suspectReply, REACTIONS, STORY_PROBLEMS, lessonComic, storyScript, withName, type Panel, type PropTheme } from '../src/story';
import { seasonalWords } from '../src/seasonal-words';
import { sentences, spokenText } from '../src/lib/voice';
import { cleanSentence, voiceKey } from '../src/lib/voice-pack';

const THEMES: PropTheme[] = ['everyday', 'halloween', 'christmas'];
const EXTRA = [
  'Hi there! I can read your fraction lessons to you.',
  'A fraction shows equal parts of one whole. First look at the whole. Then split it into equal pieces and share them fairly.',
  'Good try!', 'Almost!', 'Let’s look together.', 'Keep going!', 'Nice effort!', 'Let\'s make it simpler.',
];

/** Prose worth reading: has letters and a space, and isn't an id, a path or a color. */
const isProse = (value: string) => /[a-z]/i.test(value) && /\s/.test(value.trim()) && !/^[\w-]+$/.test(value) && !/^#|^https?:/.test(value);

function collect(value: unknown, out: Set<string>, seen = new Set<unknown>()) {
  if (typeof value === 'string') { if (isProse(value)) out.add(value); return; }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const item of Array.isArray(value) ? value : Object.values(value)) collect(item, out, seen);
}

const safe = <T,>(make: () => T): T | null => { try { return make(); } catch { return null; } };

export function voiceSentences(): { key: string; text: string }[] {
  const lesson = new Set<string>();
  for (const mission of MISSIONS) {
    collect(mission, lesson);
    collect(safe(() => getBuildChecks(mission.id)), lesson);
    collect(safe(() => getBuildPracticeChecks(mission.id, 0)), lesson);
    for (let variant = 0; variant < 3; variant++) collect(safe(() => getWorksheet(mission.id, variant)), lesson);
    for (let round = 0; round < 3; round++) collect(safe(() => getReviewCheck(mission.id, round)), lesson);
    collect(safe(() => getExtraPractice(mission.id, mission.questions.map((q) => q.id))), lesson);
    collect(safe(() => partFinderRoundsFor(mission.id)), lesson);
  }
  collect(PART_FINDER_ROUNDS, lesson);
  collect(getAssessmentDefinitions(), lesson);
  EXTRA.forEach((line) => lesson.add(line));

  const story = new Set<string>();
  collect([WHOLE_STONE_OPENING, PROLOGUE, CHAPTERS, STORY_PROBLEMS, REACTIONS, DETECTIVE_NOTES, HANDS_ON_ASKS, CHAPTERS.map(choiceNotes)], story);
  for (const board of [1, 2] as const) for (const suspect of SUSPECTS[board]) story.add(suspectReply(board, suspect).text);
  const scripts: Panel[][] = [PROLOGUE, EPILOGUE, ...CHAPTERS.map(chapterEnd)];
  for (const chapter of CHAPTERS) {
    const lessons = MISSIONS.filter((mission) => mission.unit === chapter.unit);
    lessons.forEach((mission, index) => scripts.push(lessonComic(chapter, mission, index)));
    scripts.push(chapter.choice.map((option) => option.reply));
  }

  const texts = new Set<string>();
  const add = (text: string) => { for (const part of sentences(spokenText(text))) { const clean = cleanSentence(part); if (/[a-z]{2}/i.test(clean)) texts.add(clean); } };
  for (const theme of THEMES) {
    const season = theme === 'everyday' ? null : theme;
    for (const text of lesson) add(seasonalWords(text, season));
    for (const text of story) add(withName(text, null, theme));
    for (const panels of scripts) add(storyScript(panels, theme));
  }
  return [...texts].sort().map((text) => ({ key: voiceKey(text), text }));
}

if (process.argv[1]?.endsWith('voice-sentences.ts')) process.stdout.write(`${JSON.stringify(voiceSentences(), null, 0)}\n`);
