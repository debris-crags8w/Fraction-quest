import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS } from './game';
import { ideaPracticeQuestions, ideaQuestion, ideaSteps, LESSON_IDEAS, type LessonIdea } from './lesson-ideas';
import { PART_FINDER_ROUNDS } from './part-finder';
import { HANDS_ON_ASKS } from './story';
import { sceneSentences, type SceneRow, type StepScene } from './teach-scenes';
import type { Mission } from './game';

test('each idea teaches on its Learn pages, then has 3 practices that are real questions or cake rounds', () => {
  for (const [id, ideas] of Object.entries(LESSON_IDEAS)) {
    const mission = MISSIONS.find((item) => item.id === id);
    assert.ok(mission, id);
    assert.ok(ideas.length >= 2, `${id}: at least 2 ideas`);
    for (const idea of ideas) {
      assert.match(idea.title, /^[A-Z]/, `${id}: ${idea.title}`);
      assert.ok(idea.learn.length >= 1, `${id}: ${idea.title} has a Learn page`);
      for (const page of idea.learn) assert.ok(page.scene.length >= 1 && page.text.length > 0, `${id}: ${idea.title}`);
      assert.equal(idea.practice.length, 3, `${id}: ${idea.title} has 3 practices`);
      for (const item of idea.practice) {
        if ('handsOn' in item) assert.ok(PART_FINDER_ROUNDS.some((round) => round.id === item.handsOn), `${id}: ${item.handsOn}`);
        else assert.ok(ideaQuestion(mission, item.question), `${id}: ${item.question}`);
      }
    }
  }
});

test('a lesson with ideas uses each of its questions once, and every idea question it wrote', () => {
  for (const id of Object.keys(LESSON_IDEAS)) {
    const mission = MISSIONS.find((item) => item.id === id)!;
    const used = ideaSteps(id).flatMap(({ item }) => ('question' in item ? [item.question] : []));
    assert.equal(new Set(used).size, used.length, `${id}: no question twice`);
    for (const question of mission.ideaQuestions ?? []) assert.ok(used.includes(question.id), `${id}: ${question.id} is practised`);
    const list = ideaPracticeQuestions(mission);
    assert.equal(list.length, ideaSteps(id).length);
    assert.ok(list.every((question) => !question.isMastery), `${id}: no checkpoint in the middle of the ideas`);
  }
});

test('idea questions are four-choice questions with a picture, written like the lesson questions', () => {
  for (const mission of MISSIONS) {
    for (const question of mission.ideaQuestions ?? []) {
      assert.equal(question.choices.length, 4, question.id);
      assert.ok(question.correctChoice >= 0 && question.correctChoice < 4, question.id);
      assert.equal(new Set(question.choices).size, 4, `${question.id}: no repeated choice`);
      assert.ok(question.model && question.simplerModel, question.id);
      assert.ok(question.hint && question.retryFeedback, question.id);
      // No before Yes.
      const no = question.choices.findIndex((choice) => /^No\b/.test(choice));
      const yes = question.choices.findIndex((choice) => /^Yes\b/.test(choice));
      if (no >= 0 && yes >= 0) assert.ok(no < yes, `${question.id}: No comes before Yes`);
    }
  }
});

test('lesson 1: the ideas come in the order of the approved plan, and shapes come before the pumpkin cake', () => {
  const ideas = LESSON_IDEAS['equal-parts']!;
  assert.deepEqual(ideas.map((idea) => idea.title), ['Equal parts are the same size', 'Count the equal parts to name one part', 'Equal parts can be different shapes', 'Share fairly']);
  const steps = ideaSteps('equal-parts');
  const at = (round: string) => steps.findIndex(({ item }) => 'handsOn' in item && item.handsOn === round);
  assert.ok(at('match') < at('sort-cake'), 'different shapes are taught and practised before sharing a cake cut into different shapes');
  // The Learn page for sharing says the numbers it deals.
  assert.match(sceneSentences(ideas[3]!.learn[0]!.scene).join(' '), /Each friend gets 2 pieces/);
});

/** Every word on an idea's screens: its Learn pages (line, picture labels and sentences) and its practices (question,
    choices, hint, feedback and picture labels, or the cake round's title, task and the friend's ask). */
function ideaText(mission: Mission, idea: LessonIdea): { learn: string[]; practice: string[] } {
  const rowText = (row: SceneRow): string[] => row.kind === 'text' ? [row.text] : row.kind === 'pair' ? row.items.flatMap(rowText)
    : [('label' in row && row.label) || '', ('bracket' in row && row.bracket) || ''];
  const sceneText = (scene: StepScene) => scene.flatMap((frame) => frame.rows.flatMap(rowText));
  const modelText = (model: unknown) => JSON.stringify(model).match(/"(caption|label|text)":"[^"]*"/g) ?? [];
  const learn = idea.learn.flatMap((page) => [page.text, ...sceneText(page.scene)]);
  const practice = idea.practice.flatMap((item) => {
    if ('handsOn' in item) {
      const round = PART_FINDER_ROUNDS.find((r) => r.id === item.handsOn)!;
      return [round.title, round.prompt, round.targetLabel, HANDS_ON_ASKS[round.id] ?? ''];
    }
    const q = ideaQuestion(mission, item.question)!;
    return [q.prompt, ...q.choices, q.hint, q.retryFeedback, ...modelText(q.model), ...modelText(q.simplerModel)];
  });
  return { learn: learn.filter(Boolean), practice: practice.filter(Boolean) };
}

test('each screen sticks to its idea: nothing an idea teaches shows up in an earlier idea, and its own Learn page teaches it', () => {
  for (const [id, ideas] of Object.entries(LESSON_IDEAS)) {
    const mission = MISSIONS.find((item) => item.id === id)!;
    ideas.forEach((idea, i) => {
      const { learn } = ideaText(mission, idea);
      for (const term of idea.terms ?? []) assert.ok(learn.some((text) => term.pattern.test(text)), `${id} idea ${i + 1} teaches ${term.term} on its Learn page`);
      for (const later of ideas.slice(i + 1)) {
        for (const term of later.terms ?? []) {
          const { learn: l, practice: p } = ideaText(mission, idea);
          for (const text of [...l, ...p]) assert.doesNotMatch(text, term.pattern, `${id} idea ${i + 1} uses ${term.term} (taught in "${later.title}"): ${text}`);
        }
      }
    });
  }
});

test('lesson 1 asks only about one part until lesson 2 teaches counting more than one (no 3/4 among the choices)', () => {
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  for (const idea of LESSON_IDEAS['equal-parts']!) {
    for (const text of ideaText(mission, idea).practice) assert.doesNotMatch(text, /\b([2-9]|\d{2,})\/\d+\b/, text);
  }
});
