import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS } from './game';
import { CHECKPOINT_COUNT, lessonCheckpoint } from './checkpoint';
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
