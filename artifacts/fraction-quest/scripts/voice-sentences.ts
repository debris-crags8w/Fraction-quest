/* Lists every fixed sentence the app can read aloud, for the pre-made voice pack. It walks the lesson and story
   content in each season's words, splits it the way Listen does, and prints [{ key, text }] as JSON. Run with tsx:
   tsx scripts/voice-sentences.ts > sentences.json. Not part of the app bundle. */

import { MISSIONS } from '../src/game';
import { LESSON_INTROS, lessonIntroScript } from '../src/lesson-intros';
import { LESSON_SCENES, sceneSentences, teachPageScript } from '../src/teach-scenes';
import { TEACH_EXTRAS, wordsScript } from '../src/teach-extras';
import { LESSON_IDEAS, learnScript } from '../src/lesson-ideas';
import { getBuildChecks, getBuildPracticeChecks, getReviewCheck, getWorksheet } from '../src/learning-content';
import { getExtraPractice } from '../src/practice-bank';
import { partFinderRoundsFor, PART_FINDER_ROUNDS } from '../src/part-finder';
import { getAssessmentDefinitions } from '../src/assessments';
import { CHAPTER_SCENES, CHAPTERS, DETECTIVE_NOTES, EPILOGUE, HANDS_ON_ASKS, PROLOGUE, SUSPECTS, WHOLE_STONE_OPENING, chapterEnd, choiceNotes, suspectReply, REACTIONS, STORY_PROBLEMS, lessonComic, storyScript, withName, PROP_THEMES, type Panel, type PropTheme } from '../src/story';
import { LANTERN_CARD_SPOKEN } from '../src/riddles';
import { PICKED_FOR_YOU_SPOKEN } from '../src/game';
import { seasonalWords } from '../src/seasonal-words';
import { sentences, spokenText } from '../src/lib/voice';
import { cleanSentence, voiceKey } from '../src/lib/voice-pack';
import { HEART_VOICE, speakerVoice } from '../src/lib/cast-voices';
import { BUILD_ERROR_HEADINGS, LAB_SECTION_SPEECH, PART_CHECK_OPENERS, buildErrors, buildHints, foldSpeech, numberLineDescription, sectionsScript, supportSpeech, worksheetSpeech } from '../src/lab-copy';
import { getModelFeedback, type LearningModel } from '../src/learning-content';
import { CHALLENGES } from '../src/challenges';
import { OPENERS, SLIPS } from '../src/wrong-answer';
import { WHY } from '../src/slip-reasons';
import { getCodeLevels, goal, sprintTargets } from '../src/code-quest';
import { dailyBuildSpeech } from '../src/daily-practice';
import { NEW_WORD_LESSON } from '../src/new-words';
import { HELPER_PICK_SPEECH, fractionWordsSpeech, introSpeech, newWordSpeech, whatIsAFractionSpeech } from '../src/intro-copy';
import { guideForUnit } from '../src/teaching-guide-data';
import { TIME_UP_SPEECH } from '../src/time-up-copy';

export const VOICE_SENTENCE_THEMES: readonly PropTheme[] = PROP_THEMES;
export const VOICE_SENTENCE_SOURCES = ['lesson', 'worksheet', 'practice', 'games', 'story', 'shared'] as const;
export type VoiceSentenceSource = (typeof VOICE_SENTENCE_SOURCES)[number];
export type VoiceSentenceTheme = (typeof VOICE_SENTENCE_THEMES)[number];
/** One sentence. `voice` is set for a story friend's film line, also made in that friend's voice; unset means Heart. */
export type VoiceSentenceEntry = { key: string; text: string; voice?: string };
export type VoiceSentenceGroup = {
  source: VoiceSentenceSource;
  theme: VoiceSentenceTheme;
  sentences: VoiceSentenceEntry[];
};

const EXTRA_BY_SOURCE: Record<VoiceSentenceSource, string[]> = {
  lesson: [
    'A fraction shows equal parts of one whole. First look at the whole. Then split it into equal pieces and share them fairly.',
    'Build it.', 'On your own.', 'Apply it.',
    'Build each fraction before deciding which amount is greater. Each bar is one same-size whole.',
  ],
  worksheet: [],
  practice: [
    'Pick the sentence that matches your model.', 'Good try. Look at the models and choose again.',
    'Your reason is right! Now fix the model above.', ...OPENERS, ...Object.values(SLIPS), ...Object.values(WHY),
  ],
  games: [
    'Every symbol card has a bar card partner. Match by the amount shaded, not by the printed numbers.',
    'Choose equal spaces from 0 to 1, then tap the tick that lands on the target fraction.',
    'Fraction Line-Up. Drag four fractions into order. Pick a kind of line-up.',
    'Put them in order: smallest first.', 'Put them in order: biggest first.',
    'All the denominators match.', 'All the numerators match.', 'Drag a card, or use the arrows.',
    'Make it. See it. Then name it. Pick a game. Games are for fun and practice: they never change lesson progress.',
    'Pick a jump card, then press Hop. Land exactly on the lily pad in as few hops as you can.',
    'Stack the tower. Put the biggest fraction at the bottom. Tap a gap, then press Place.',
    'Move the cards up or down. The first card should be the smallest.',
    'Move the cards up or down. The first card should be the biggest.',
    'Tap a friend, then tap their pieces. Tap a piece again to take it back.',
    'Tap or click pieces to select them. Use Tab, then Enter or Space.',
    'Who gets the next pieces you tap?', 'That fits!', 'Almost there.',
  ],
  story: [
    'How much of the Whole Stone is back?',
    'Good try! Count the gold pieces. Then count all the pieces in the whole stone.',
    'Because you solved the story problem:',
  ],
  shared: [
    'Hi there! I can read your fraction lessons to you.',
    'Let\'s make it simpler.', 'Not yet.', 'Hint.', 'Choose yes or no.',
    ...HELPER_PICK_SPEECH, TIME_UP_SPEECH,
  ],
};

/** Prose worth reading, once said in words ("1/6 + 2/6 = ?" counts): has letters and a space, and isn't an id, a
    path or a color. */
const isProse = (value: string) => !/^[\w-]+$/.test(value) && !/^#|^https?:/.test(value) && /[a-z]/i.test(spokenText(value)) && /\s/.test(value.trim());

function collect(value: unknown, out: Set<string>, seen = new Set<unknown>()) {
  if (typeof value === 'string') {
    if (!isProse(value)) return;
    out.add(value);
    // A review question's Listen reads it without its "Quick review · Topic:" tag (see promptListenText in fun-ui).
    const untagged = /^Quick review · [^:]+:\s+(.+)$/s.exec(value)?.[1];
    if (untagged) out.add(untagged);
    return;
  }
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

export function voiceSentenceGroups(): VoiceSentenceGroup[] {
  const content = Object.fromEntries(
    VOICE_SENTENCE_SOURCES.map((source) => [source, new Set<string>()]),
  ) as Record<VoiceSentenceSource, Set<string>>;
  const add = (source: VoiceSentenceSource, value: unknown) => collect(value, content[source]);
  const addLine = (source: VoiceSentenceSource, line: string) => content[source].add(line);

  for (const mission of MISSIONS) {
    add('lesson', mission);
    add('lesson', safe(() => getBuildChecks(mission.id)));
    add('practice', safe(() => getBuildPracticeChecks(mission.id, 0)));
    for (let variant = 0; variant < 3; variant++) add('worksheet', safe(() => getWorksheet(mission.id, variant)));
    for (let round = 0; round < 3; round++) add('practice', safe(() => getReviewCheck(mission.id, round)));
    add('practice', safe(() => getExtraPractice(mission.id, mission.questions.map((q) => q.id))));
    add('games', safe(() => partFinderRoundsFor(mission.id)));
  }
  add('games', PART_FINDER_ROUNDS);
  add('games', CHALLENGES);

  for (const mission of MISSIONS) {
    // Lesson page: the whole example and the ordering steps, read as one ("Question. …"), and the order number line.
    addLine('lesson', sectionsScript([
      { heading: 'Question', text: mission.example.prompt },
      { heading: 'Worked answer', text: mission.example.answer },
      { heading: 'Explanation', text: mission.example.explanation },
    ]));
    // The Teach first screen (and "How it works"): the goal, the steps and why, read as one.
    const intro = LESSON_INTROS[mission.id];
    if (intro) addLine('lesson', lessonIntroScript(intro));
    // The animated Teach first reads each page with the sentences under its picture.
    const scene = LESSON_SCENES[mission.id];
    if (intro && scene) for (let page = 0; page <= intro.steps.length; page++) addLine('lesson', teachPageScript(intro, scene, page));
    // Teach before practice: Words to know (said after the goal) and each extra worked example.
    const extras = TEACH_EXTRAS[mission.id];
    if (intro && extras?.words?.length) addLine('lesson', `${intro.goal} ${wordsScript(extras.words)}`);
    for (const example of extras?.examples ?? []) addLine('lesson', [`${example.title}.`, ...sceneSentences(example.picture)].join(' '));
    // Learn one idea, practise it three times: each Learn page (the first idea's first page also says the goal).
    (LESSON_IDEAS[mission.id] ?? []).forEach((idea, i) => idea.learn.forEach((page, p) => {
      addLine('lesson', i === 0 && p === 0 && intro ? `${intro.goal} ${learnScript(page)}` : learnScript(page));
    }));
    const line = mission.example.numberLine;
    if (line) addLine('lesson', numberLineDescription(line.points, line.benchmark, line.equivalentNames));
    // Lab: model feedback, hints and what is still wrong, for each required and optional Build target.
    for (const check of safe(() => getBuildChecks(mission.id)) ?? []) addBuildSpeech(check.target, content.lesson);
    for (const check of safe(() => getBuildPracticeChecks(mission.id, 0)) ?? []) addBuildSpeech(check.target, content.practice);
    for (let round = 0; round < 3; round++) {
      const check = safe(() => getReviewCheck(mission.id, round));
      if (check) addBuildSpeech(check.target, content.practice);
    }
    for (const target of safe(() => sprintTargets(mission.id)) ?? []) addLine('games', `Make the robot ${goal(target)}.`);
    for (const level of safe(() => getCodeLevels(mission.id)) ?? []) addLine('games', `${level.goal} ${level.tip}`);
  }
  BUILD_ERROR_HEADINGS.forEach((line) => addLine('lesson', line));
  Object.values(PART_CHECK_OPENERS).forEach((line) => addLine('lesson', line));
  // Daily practice builds n/d (d up to 12) with a bar or a number line; the paper strip opens into 2s and 3s.
  for (let d = 2; d <= 12; d++) for (let n = 1; n <= d; n++) for (const bar of [true, false]) addLine('practice', dailyBuildSpeech(n, d, bar));
  for (const pieces of [2, 3, 4, 6, 8, 9, 12, 16]) for (let folds = 1; folds <= 4; folds++) addLine('practice', foldSpeech(folds, pieces));
  add('practice', getAssessmentDefinitions());
  for (const [source, lines] of Object.entries(EXTRA_BY_SOURCE) as [VoiceSentenceSource, string[]][]) {
    lines.forEach((line) => addLine(source, line));
  }
  // The lesson page's section Listen buttons, and the model intros (how to build, how a number line works).
  [...introSpeech('builder'), ...introSpeech('line')].forEach((line) => addLine('lesson', line));
  [...whatIsAFractionSpeech(), ...fractionWordsSpeech(), ...Object.keys(NEW_WORD_LESSON).map((d) => newWordSpeech(Number(d)))].forEach((line) => addLine('lesson', line));
  Object.values(LAB_SECTION_SPEECH).forEach((line) => addLine('lesson', line));
  for (const mission of MISSIONS) {
    addLine('worksheet', worksheetSpeech(safe(() => getWorksheet(mission.id))?.length ?? 0));
    const guide = guideForUnit(mission.unit);
    if (guide) Object.values(supportSpeech(guide, mission)).forEach((line) => addLine('lesson', line));
  }

  const story = content.story;
  collect([WHOLE_STONE_OPENING, PROLOGUE, CHAPTERS, STORY_PROBLEMS, REACTIONS, DETECTIVE_NOTES, HANDS_ON_ASKS, CHAPTERS.map(choiceNotes)], story);
  // Tonight's lantern on the map: every line its Listen button can read.
  for (const line of LANTERN_CARD_SPOKEN) story.add(line);
  // The map's "Picked for you" card.
  story.add(PICKED_FOR_YOU_SPOKEN);
  // The choice Listen button reads "label. detail." for each option.
  for (const chapter of CHAPTERS) for (const option of chapter.choice) story.add(`${option.label}. ${option.detail}.`);
  for (const board of [1, 2] as const) for (const suspect of SUSPECTS[board]) story.add(suspectReply(board, suspect).text);
  // Plain comics read "Hoot says: ..."; filmed comics read only the lines.
  const scripts: Panel[][] = [];
  const filmed: Panel[][] = [PROLOGUE, EPILOGUE, ...CHAPTERS.map(chapterEnd)];
  for (const chapter of CHAPTERS) {
    const lessons = MISSIONS.filter((mission) => mission.unit === chapter.unit);
    // A chapter with a scene films every lesson's comic (later lessons in the chapter's place), so each reads just its lines.
    lessons.forEach((mission, index) => (CHAPTER_SCENES[chapter.unit] ? filmed : scripts).push(lessonComic(chapter, mission, index)));
    scripts.push(chapter.choice.map((option) => option.reply));
  }

  const grouped = new Map<string, Map<string, VoiceSentenceEntry>>();
  const addSpoken = (source: VoiceSentenceSource, theme: VoiceSentenceTheme, text: string, voice?: string) => {
    const groupKey = `${source}/${theme}`;
    let group = grouped.get(groupKey);
    if (!group) { group = new Map(); grouped.set(groupKey, group); }
    for (const part of sentences(spokenText(text))) {
      const clean = cleanSentence(part);
      if (/[a-z]{2}/i.test(clean)) {
        const key = voiceKey(clean);
        group.set(`${voice ?? ''}/${key}`, voice ? { key, text: clean, voice } : { key, text: clean });
      }
    }
  };
  for (const theme of VOICE_SENTENCE_THEMES) {
    const season = theme === 'everyday' ? null : theme;
    for (const source of VOICE_SENTENCE_SOURCES) {
      if (source === 'story') continue;
      for (const text of content[source]) addSpoken(source, theme, seasonalWords(text, season));
    }
    for (const text of story) addSpoken('story', theme, withName(text, null, theme));
    for (const panels of scripts) addSpoken('story', theme, storyScript(panels, theme));
    for (const panels of filmed) for (const panel of panels) {
      // Every film line in Heart (the fallback), and a friend's lines in their own voice too.
      const line = withName(panel.text, null, theme);
      addSpoken('story', theme, line);
      const voice = speakerVoice(panel.speaker);
      if (voice !== HEART_VOICE) addSpoken('story', theme, line, voice);
    }
  }
  return VOICE_SENTENCE_SOURCES.flatMap((source) => VOICE_SENTENCE_THEMES.map((theme) => {
    const sentences = [...(grouped.get(`${source}/${theme}`)?.values() ?? [])].sort(byVoiceAndText);
    return { source, theme, sentences };
  }));
}

export function voiceSentences(): VoiceSentenceEntry[] {
  const all = new Map<string, VoiceSentenceEntry>();
  for (const group of voiceSentenceGroups()) {
    for (const sentence of group.sentences) all.set(`${sentence.voice ?? ''}/${sentence.key}`, sentence);
  }
  return [...all.values()].sort(byVoiceAndText);
}

/** Heart's sentences first (by text), then each friend's. */
function byVoiceAndText(left: VoiceSentenceEntry, right: VoiceSentenceEntry): number {
  const [a, b] = [left.voice ?? '', right.voice ?? ''];
  if (a !== b) return a < b ? -1 : 1;
  return left.text < right.text ? -1 : left.text > right.text ? 1 : 0;
}

if (process.argv[1]?.endsWith('voice-sentences.ts')) process.stdout.write(`${JSON.stringify(voiceSentences(), null, 0)}\n`);
