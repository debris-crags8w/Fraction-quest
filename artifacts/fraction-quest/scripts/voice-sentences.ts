/* Lists every fixed sentence the app can read aloud, for the pre-made voice pack. It walks the lesson and story
   content in each season's words, splits it the way Listen does, and prints [{ key, text }] as JSON. Run with tsx:
   tsx scripts/voice-sentences.ts > sentences.json. Not part of the app bundle. */

import { MISSIONS } from '../src/game';
import { getBuildChecks, getBuildPracticeChecks, getReviewCheck, getWorksheet } from '../src/learning-content';
import { getExtraPractice } from '../src/practice-bank';
import { partFinderRoundsFor, PART_FINDER_ROUNDS } from '../src/part-finder';
import { getAssessmentDefinitions } from '../src/assessments';
import { CHAPTER_SCENES, CHAPTERS, DETECTIVE_NOTES, EPILOGUE, HANDS_ON_ASKS, PROLOGUE, SUSPECTS, WHOLE_STONE_OPENING, chapterEnd, choiceNotes, suspectReply, REACTIONS, STORY_PROBLEMS, lessonComic, storyScript, withName, type Panel, type PropTheme } from '../src/story';
import { seasonalWords } from '../src/seasonal-words';
import { sentences, spokenText } from '../src/lib/voice';
import { cleanSentence, voiceKey } from '../src/lib/voice-pack';
import { BUILD_ERROR_HEADINGS, LAB_SECTION_SPEECH, buildErrors, buildHints, foldSpeech, numberLineDescription, sectionsScript, supportSpeech, worksheetSpeech } from '../src/lab-copy';
import { getModelFeedback, type LearningModel } from '../src/learning-content';
import { CHALLENGES } from '../src/challenges';
import { OPENERS, SLIPS } from '../src/wrong-answer';
import { goal, sprintTargets } from '../src/code-quest';
import { dailyBuildSpeech } from '../src/daily-practice';
import { introSpeech } from '../src/intro-copy';
import { guideForUnit } from '../src/teaching-guide-data';

const THEMES: PropTheme[] = ['everyday', 'halloween', 'christmas'];
const EXTRA = [
  'Hi there! I can read your fraction lessons to you.',
  'A fraction shows equal parts of one whole. First look at the whole. Then split it into equal pieces and share them fairly.',
  'Let\'s make it simpler.', 'Not yet.', 'Hint.', 'Choose yes or no.', 'Build it.', 'On your own.', 'Apply it.',
  'Pick the sentence that matches your model.', 'Good try. Look at the models and choose again.', 'Your reason is right! Now fix the model above.',
  ...OPENERS, ...Object.values(SLIPS),
];

/** Prose worth reading, once said in words ("1/6 + 2/6 = ?" counts): has letters and a space, and isn't an id, a
    path or a color. */
const isProse = (value: string) => !/^[\w-]+$/.test(value) && !/^#|^https?:/.test(value) && /[a-z]/i.test(spokenText(value)) && /\s/.test(value.trim());

function collect(value: unknown, out: Set<string>, seen = new Set<unknown>()) {
  if (typeof value === 'string') { if (isProse(value)) out.add(value); return; }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const item of Array.isArray(value) ? value : Object.values(value)) collect(item, out, seen);
}

const safe = <T,>(make: () => T): T | null => { try { return make(); } catch { return null; } };

/** What the Lab can say about one Build: its model feedback, its two hints and each "not yet" line. */
function addBuildSpeech(target: LearningModel, out: Set<string>) {
  const kinds: LearningModel['kind'][] = target.kind === 'set' ? ['set'] : ['bar', 'line'];
  for (const kind of kinds) {
    out.add(getModelFeedback(target, kind));
    buildHints(target, kind).forEach((line) => out.add(line));
    const wrong = [{ d: 0, count: 0, wholes: 1 }, { d: target.d + 1, count: target.n, wholes: target.wholes }, { d: target.d, count: target.n + 1, wholes: target.wholes + 1 }];
    if (kind === 'set') for (let d = 2; d <= 12; d++) wrong.push({ d, count: 0, wholes: 1 });
    for (const state of wrong) buildErrors(kind, target, state).msgs.forEach((line) => out.add(line));
  }
}

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
  collect(CHALLENGES, lesson);
  for (const mission of MISSIONS) {
    // Lesson page: the whole example and the ordering steps, read as one ("Question. …"), and the order number line.
    lesson.add(sectionsScript([
      { heading: 'Question', text: mission.example.prompt },
      { heading: 'Worked answer', text: mission.example.answer },
      { heading: 'Explanation', text: mission.example.explanation },
    ]));
    if (mission.learningIntro) lesson.add(sectionsScript([
      { heading: 'Goal', text: mission.learningIntro.goal },
      { heading: 'Process', text: mission.learningIntro.process },
      { heading: 'Why it works', text: mission.learningIntro.why },
    ]));
    const line = mission.example.numberLine;
    if (line) lesson.add(numberLineDescription(line.points, line.benchmark, line.equivalentNames));
    // Lab: model feedback, hints and what is still wrong, for each Build's targets.
    const builds = [...(safe(() => getBuildChecks(mission.id)) ?? []), ...(safe(() => getBuildPracticeChecks(mission.id, 0)) ?? [])];
    for (let round = 0; round < 3; round++) { const check = safe(() => getReviewCheck(mission.id, round)); if (check) builds.push(check); }
    for (const check of builds) addBuildSpeech(check.target, lesson);
    for (const target of safe(() => sprintTargets(mission.id)) ?? []) lesson.add(`Make the robot ${goal(target)}.`);
  }
  BUILD_ERROR_HEADINGS.forEach((line) => lesson.add(line));
  // Daily practice builds n/d (d up to 12) with a bar or a number line; the paper strip opens into 2s and 3s.
  for (let d = 2; d <= 12; d++) for (let n = 1; n <= d; n++) for (const bar of [true, false]) lesson.add(dailyBuildSpeech(n, d, bar));
  for (const pieces of [2, 3, 4, 6, 8, 9, 12, 16]) for (let folds = 1; folds <= 4; folds++) lesson.add(foldSpeech(folds, pieces));
  collect(getAssessmentDefinitions(), lesson);
  EXTRA.forEach((line) => lesson.add(line));
  // The lesson page's section Listen buttons, and the model intros (how to build, how a number line works).
  [...introSpeech('builder'), ...introSpeech('line')].forEach((line) => lesson.add(line));
  Object.values(LAB_SECTION_SPEECH).forEach((line) => lesson.add(line));
  for (const mission of MISSIONS) {
    lesson.add(worksheetSpeech(safe(() => getWorksheet(mission.id))?.length ?? 0));
    const guide = guideForUnit(mission.unit);
    if (guide) Object.values(supportSpeech(guide, mission)).forEach((line) => lesson.add(line));
  }

  const story = new Set<string>();
  collect([WHOLE_STONE_OPENING, PROLOGUE, CHAPTERS, STORY_PROBLEMS, REACTIONS, DETECTIVE_NOTES, HANDS_ON_ASKS, CHAPTERS.map(choiceNotes)], story);
  // The choice Listen button reads "label. detail." for each option.
  for (const chapter of CHAPTERS) for (const option of chapter.choice) story.add(`${option.label}. ${option.detail}.`);
  for (const board of [1, 2] as const) for (const suspect of SUSPECTS[board]) story.add(suspectReply(board, suspect).text);
  // Plain comics read "Hoot says: ..."; filmed comics read only the lines.
  const scripts: Panel[][] = [];
  const filmed: Panel[][] = [PROLOGUE, EPILOGUE, ...CHAPTERS.map(chapterEnd)];
  for (const chapter of CHAPTERS) {
    const lessons = MISSIONS.filter((mission) => mission.unit === chapter.unit);
    lessons.forEach((mission, index) => (index === 0 && CHAPTER_SCENES[chapter.unit] ? filmed : scripts).push(lessonComic(chapter, mission, index)));
    scripts.push(chapter.choice.map((option) => option.reply));
  }

  const texts = new Set<string>();
  const add = (text: string) => { for (const part of sentences(spokenText(text))) { const clean = cleanSentence(part); if (/[a-z]{2}/i.test(clean)) texts.add(clean); } };
  for (const theme of THEMES) {
    const season = theme === 'everyday' ? null : theme;
    for (const text of lesson) add(seasonalWords(text, season));
    for (const text of story) add(withName(text, null, theme));
    for (const panels of scripts) add(storyScript(panels, theme));
    for (const panels of filmed) for (const panel of panels) add(withName(panel.text, null, theme));
  }
  return [...texts].sort().map((text) => ({ key: voiceKey(text), text }));
}

if (process.argv[1]?.endsWith('voice-sentences.ts')) process.stdout.write(`${JSON.stringify(voiceSentences(), null, 0)}\n`);
