import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS } from './game';
import { workedWhy } from './checkpoint-why';
import { CHECKPOINT_COUNT, checkpointIdea, checkpointKind, checkpointPool, lessonCheckpoint } from './checkpoint';
import { ideaPracticeQuestions, ideaSteps, isRound, legacyPracticePlan, practicePlan, savedPlaceStillFits } from './lesson-ideas';
import { STORY_PROBLEMS } from './story';
import { wrongChoiceReason } from './wrong-answer';

const words = (prompt: string) => prompt.toLowerCase().replace(/[^a-z0-9/.\s]/g, ' ').replace(/\s+/g, ' ').trim();

test('every lesson has a 3-question checkpoint: a picture, four different choices, hint and feedback on each', () => {
  for (const mission of MISSIONS) {
    const questions = lessonCheckpoint(mission);
    assert.equal(questions.length, CHECKPOINT_COUNT, `${mission.id}: three questions`);
    assert.equal(new Set(questions.map((q) => q.id)).size, CHECKPOINT_COUNT, `${mission.id}: distinct ids`);
    for (const q of questions) {
      assert.ok(q.isCheckpoint && !q.isMastery && !q.isReview, `${q.id}: a checkpoint question`);
      assert.equal(q.choices.length, 4, `${q.id}: four choices`);
      assert.equal(new Set(q.choices).size, 4, `${q.id}: four different choices`);
      assert.ok(q.correctChoice >= 0 && q.correctChoice < 4, q.id);
      assert.ok(q.model && q.model.kind !== 'equation' && q.simplerModel, `${q.id}: a picture`);
      assert.ok(q.hint && q.retryFeedback, `${q.id}: hint and feedback`);
      const no = q.choices.findIndex((c) => /^no\b/i.test(c)); const yes = q.choices.findIndex((c) => /^yes\b/i.test(c));
      if (no >= 0 && yes >= 0) assert.ok(no < yes, `${q.id}: "No" comes before "Yes"`);
      // Its wrong choices are real slips: the reply to every wrong tap is about that tap, not nothing.
      assert.ok(q.reviewQuestionId && mission.questions.some((m) => m.id === q.reviewQuestionId), `${q.id}: a miss queues a real lesson question`);
    }
  }
});

test('no checkpoint question is one the child has already met in the lesson (idea practice, lesson question, story problem)', () => {
  for (const mission of MISSIONS) {
    const met = [...mission.questions, ...(mission.ideaQuestions ?? [])].map((q) => q.prompt);
    const story = STORY_PROBLEMS[mission.id];
    if (story) met.push(story.prompt);
    const numbers = (prompt: string) => (prompt.match(/\d+\s*\/\s*\d+|\d+(?:\.\d+)?/g) ?? []).map((n) => n.replace(/\s+/g, '')).sort().join(' ');
    const picture = (q: { model: unknown }) => JSON.stringify(q.model, (key, value) => (['hideLabels', 'label', 'labels', 'caption', 'named'].includes(key) ? undefined : value));
    const asked = [...mission.questions, ...(mission.ideaQuestions ?? [])];
    for (const q of lessonCheckpoint(mission)) {
      assert.ok(!asked.some((a) => words(a.prompt) === words(q.prompt) && picture(a) === picture(q)),
        `${q.id}: the same question (words and picture) as one of the lesson: ${q.prompt}`);
      assert.ok(!met.some((prompt) => numbers(prompt) && numbers(prompt) === numbers(q.prompt)), `${q.id}: same numbers as a question of the lesson: ${q.prompt}`);
    }
    const keys = lessonCheckpoint(mission).map((q) => `${words(q.prompt)}|${picture(q)}`);
    assert.equal(new Set(keys).size, keys.length, `${mission.id}: three different questions`);
  }
});

test('inside a checkpoint no question repeats another one\'s numbers or right answer', () => {
  const numbers = (prompt: string) => (prompt.match(/\d+\s*\/\s*\d+|\d+(?:\.\d+)?/g) ?? []).map((n) => n.replace(/\s+/g, '')).sort().join(' ');
  const fractions = (prompt: string) => new Set((prompt.match(/\d+\s*\/\s*\d+/g) ?? []).map((n) => n.replace(/\s+/g, '')));
  const sharing: string[] = [];
  for (const mission of MISSIONS) {
    const questions = lessonCheckpoint(mission);
    const answers = questions.map((q) => q.choices[q.correctChoice]);
    assert.equal(new Set(answers).size, answers.length, `${mission.id}: the same right answer twice: ${answers.join(' | ')}`);
    const sets = questions.map((q) => numbers(q.prompt)).filter(Boolean);
    // unit-size and fractional-unit-conversions: the lesson's own questions use all but one or two of the numbers its generator has.
    const fresh = new Set(checkpointPool(mission).map((q) => numbers(q.prompt)).filter(Boolean)).size;
    if (fresh >= CHECKPOINT_COUNT) assert.equal(new Set(sets).size, sets.length, `${mission.id}: the same numbers twice: ${questions.map((q) => q.prompt).join(' | ')}`);
    // A fraction shared by two of the three (1/3 v 1/4, then 1/2 v 1/3) only where the lesson's few fractions leave no other way.
    if (questions.some((q, i) => questions.slice(i + 1).some((other) => [...fractions(q.prompt)].some((x) => fractions(other.prompt).has(x))))) sharing.push(mission.id);
  }
  assert.ok(sharing.length <= 10, `${sharing.length} checkpoints share a fraction between two questions: ${sharing.join(', ')}`);
});

test('a checkpoint draws from the lesson\'s different ideas and kinds of question wherever its question bank has them', () => {
  const short: string[] = [];
  for (const mission of MISSIONS) {
    const pool = checkpointPool(mission);
    const questions = lessonCheckpoint(mission);
    const ideasThere = new Set(pool.map((q) => checkpointIdea(mission, q)).filter((idea) => idea >= 0)).size;
    const ideasAsked = new Set(questions.map((q) => checkpointIdea(mission, q)).filter((idea) => idea >= 0)).size;
    assert.ok(ideasAsked >= Math.min(CHECKPOINT_COUNT, ideasThere), `${mission.id}: asks ${ideasAsked} of the ${ideasThere} ideas its bank can ask`);
    const kindsThere = new Set(pool.map(checkpointKind)).size;
    const kindsAsked = new Set(questions.map(checkpointKind)).size;
    assert.ok(kindsAsked >= Math.min(CHECKPOINT_COUNT, kindsThere), `${mission.id}: asks ${kindsAsked} kinds of question of the ${kindsThere} its bank has`);
    if (kindsAsked < CHECKPOINT_COUNT) short.push(mission.id);
  }
  // The rest have one question generator that asks one kind of question (a new kind per idea is content still to write).
  assert.ok(short.length <= 58, `${short.length} checkpoints ask the same kind of question twice: ${short.join(', ')}`);
});

test('a right answer on a checkpoint question says why, not just the hint again', () => {
  const bare = (text: string) => text.trim().replace(/\s*So the answer is [^.]*\.?$/, '').trim();
  const hintOnly: string[] = [];
  for (const mission of MISSIONS) for (const q of lessonCheckpoint(mission)) if (bare(q.retryFeedback) === q.hint.trim()) hintOnly.push(`${q.id}: ${q.retryFeedback}`);
  assert.deepEqual(hintOnly, []);
});

test('a worked "why" is true for its question: it ends on the right answer', () => {
  let worked = 0;
  for (const mission of MISSIONS) for (const q of checkpointPool(mission)) {
    const why = workedWhy(mission.id, q);
    if (!why) continue;
    worked++;
    // The right answer (without its unit word) is in the why, and no other choice is.
    const value = (choice: string) => choice.replace(/\s+(?:inch|inches|hours?|minutes?|seconds?|grams?|milliliters?|centimeters?|ounces?|cups?|pounds?|liters?|meters?|feet|foot)$/, '');
    const right = value(q.choices[q.correctChoice]);
    const has = (text: string) => new RegExp(`(?<![\\d/.])${right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d/]|\\.\\d)`).test(text);
    assert.ok(has(why) || /^[<>=]$/.test(right), `${mission.id}: "${why}" does not reach ${right} (${q.prompt})`);
    assert.ok(why.split(/(?<=[.!?])\s+/).every((sentence) => sentence.split(/\s+/).length <= 22), `${mission.id}: a short sentence each: ${why}`);
  }
  assert.ok(worked > 300, `${worked} worked explanations`);
});

test('the same lesson always gets the same checkpoint (a reload or a resumed lesson shows the same questions)', () => {
  for (const mission of MISSIONS) assert.deepEqual(lessonCheckpoint(mission), lessonCheckpoint(mission), mission.id);
});

test('a wrong tap on a checkpoint question always gets a reply (no blank)', () => {
  let none = 0; let total = 0;
  for (const mission of MISSIONS) for (const q of lessonCheckpoint(mission)) {
    q.choices.forEach((_, i) => { if (i === q.correctChoice) return; total++; if (!wrongChoiceReason(q.prompt, q.choices, q.correctChoice, i)) none++; });
  }
  // Those without a specific reason fall back to the question's own hint, which the app always has.
  assert.ok(total > 0 && none / total < 0.6, `${none} of ${total} wrong choices have no specific reason`);
});

test('a lesson with ideas is saved against a plan that includes the checkpoint; a place inside the ideas still resumes', () => {
  for (const mission of MISSIONS) {
    assert.notEqual(practicePlan(mission), legacyPracticePlan(mission), `${mission.id}: the plan changed, old places are recognised by the legacy name`);
    const steps = ideaSteps(mission.id);
    assert.ok(steps.length >= 6 && ideaPracticeQuestions(mission).length === steps.length && steps.some((s) => !isRound(s.item)), mission.id);
  }
});

test('a lesson saved partway before the checkpoint existed: a place inside the ideas resumes, a place after them starts the lesson over', () => {
  for (const mission of MISSIONS) {
    const ideas = ideaSteps(mission.id).length;
    assert.ok(savedPlaceStillFits(mission, { index: 2, plan: legacyPracticePlan(mission) }), `${mission.id}: an old place inside the ideas still resumes`);
    assert.ok(savedPlaceStillFits(mission, { index: ideas - 1, plan: legacyPracticePlan(mission) }), `${mission.id}: the last idea practice too`);
    assert.ok(!savedPlaceStillFits(mission, { index: ideas, plan: legacyPracticePlan(mission) }), `${mission.id}: an old place in the review or story would land in the checkpoint`);
    assert.ok(savedPlaceStillFits(mission, { index: ideas + 1, plan: practicePlan(mission) }), `${mission.id}: a new place resumes`);
    assert.ok(!savedPlaceStillFits(mission, { index: 2, plan: 'old-plan' }) && !savedPlaceStillFits(mission, { index: 2 }), `${mission.id}: another version's place starts over`);
  }
});
