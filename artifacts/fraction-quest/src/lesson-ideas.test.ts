import assert from 'node:assert/strict';
import test from 'node:test';
import { FRACTION_ORDER_ROUNDS, MISSIONS } from './game';
import { fractionsTaughtBy, ideaPracticeQuestions, ideaQuestion, ideaSteps, LESSON_IDEAS, learnScript, lessonIdeas, practicePlan, type LessonIdea } from './lesson-ideas';
import { PART_FINDER_ROUNDS } from './part-finder';
import { getExtraPractice } from './practice-bank';
import { HANDS_ON_ASKS, storyProblemFor } from './story';
import { TEACH_EXTRAS } from './teach-extras';
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
      for (const page of idea.learn) assert.ok(('words' in page ? page.words.length : page.scene.length) >= 1 && page.text.length > 0, `${id}: ${idea.title}`);
      assert.equal(idea.practice.length, 3, `${id}: ${idea.title} has 3 practices`);
      for (const item of idea.practice) {
        if ('handsOn' in item) assert.ok(PART_FINDER_ROUNDS.some((round) => round.id === item.handsOn), `${id}: ${item.handsOn}`);
        else if ('sortRound' in item) assert.ok(FRACTION_ORDER_ROUNDS.some((round) => round.id === item.sortRound), `${id}: ${item.sortRound}`);
        else assert.ok(ideaQuestion(mission, item.question), `${id}: ${item.question}`);
      }
    }
  }
});

test('every lesson has ideas, so every lesson starts at idea 1 (the app has no other lesson start)', () => {
  assert.deepEqual(MISSIONS.filter((mission) => !lessonIdeas(mission.id)).map((mission) => mission.id), []);
  assert.deepEqual(Object.keys(LESSON_IDEAS).filter((id) => !MISSIONS.some((mission) => mission.id === id)), []);
  for (const mission of MISSIONS) assert.ok(ideaSteps(mission.id).length >= 6, `${mission.id}: at least 2 ideas of 3 practices`);
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

test('lesson 1: equal parts first, then the bottom number, the top number and saying it (the approved plan)', () => {
  assert.equal(MISSIONS[0]!.id, 'fraction-names');
  assert.equal(MISSIONS[0]!.title, 'Fair parts and fraction names');
  assert.deepEqual(LESSON_IDEAS['fraction-names']!.map((idea) => idea.title), ['Equal parts are the same size', 'The bottom number counts all the equal parts',
    'The top number counts the parts we take', 'Say it and write it: 3 out of 4 equal parts']);
  // Idea 2's practices are answered with a count, not a fraction.
  const mission = MISSIONS[0]!;
  for (const { item } of ideaSteps(mission.id).filter(({ idea }) => idea === 1)) {
    const question = ideaQuestion(mission, (item as { question: string }).question)!;
    assert.match(question.choices[question.correctChoice]!, /^\d+$/, question.prompt);
  }
});

test('lesson 2: shapes come before the pumpkin cake, then sharing (the approved plan)', () => {
  assert.equal(MISSIONS[1]!.id, 'equal-parts');
  assert.equal(MISSIONS[1]!.title, 'Fair parts in any shape');
  const ideas = LESSON_IDEAS['equal-parts']!;
  assert.deepEqual(ideas.map((idea) => idea.title), ['Equal parts can be different shapes', 'Share fairly']);
  const steps = ideaSteps('equal-parts');
  const at = (round: string) => steps.findIndex(({ item }) => 'handsOn' in item && item.handsOn === round);
  assert.ok(at('match') < at('sort-cake'), 'different shapes are taught and practised before sharing a cake cut into different shapes');
  // The Learn page for sharing says the numbers it deals.
  const share = ideas[1]!.learn[0]!;
  assert.ok('scene' in share);
  assert.match(sceneSentences(share.scene).join(' '), /Each friend gets 2 pieces/);
});

/** Every word on an idea's screens: its Learn pages (line, picture labels and sentences) and its practices (question,
    choices, hint, feedback and picture labels, or the cake round's title, task and the friend's ask). */
function ideaText(mission: Mission, idea: LessonIdea): { learn: string[]; practice: string[] } {
  const rowText = (row: SceneRow): string[] => row.kind === 'text' ? [row.text] : row.kind === 'pair' ? row.items.flatMap(rowText)
    : [('label' in row && row.label) || '', ('bracket' in row && row.bracket) || ''];
  const sceneText = (scene: StepScene) => scene.flatMap((frame) => frame.rows.flatMap(rowText));
  const modelText = (model: unknown) => JSON.stringify(model).match(/"(caption|label|text)":"[^"]*"/g) ?? [];
  const learn = idea.learn.flatMap((page) => [page.text, ...('words' in page ? page.words.flatMap((word) => [word.term, word.meaning, ...(word.picture ? sceneText(word.picture) : [])]) : sceneText(page.scene))]);
  const practice = idea.practice.flatMap((item) => {
    if ('handsOn' in item) {
      const round = PART_FINDER_ROUNDS.find((r) => r.id === item.handsOn)!;
      return [round.title, round.prompt, round.targetLabel, HANDS_ON_ASKS[round.id] ?? ''];
    }
    if ('sortRound' in item) {
      const round = FRACTION_ORDER_ROUNDS.find((r) => r.id === item.sortRound)!;
      return [round.title, round.strategyHint, round.explanation, ...round.cards.map((card) => `${card.numerator}/${card.denominator}`)];
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

test('no fraction is offered as an answer before the lesson that teaches reading one ("Fair parts and fraction names")', () => {
  const readAt = MISSIONS.findIndex((item) => item.id === 'fraction-names');
  assert.ok(readAt >= 0);
  const offered = MISSIONS.slice(0, readAt).flatMap((mission) => {
    const story = storyProblemFor(mission.id);
    const questions = [...mission.questions, ...(mission.ideaQuestions ?? []), ...getExtraPractice(mission.id, mission.questions.map((question) => question.id))];
    return [
      // Lesson, review, idea and Extra practice questions.
      ...questions.flatMap((question) => question.choices.map((choice) => ({ where: question.id, choice }))),
      // The story problem keeps the last question's choices unless it writes its own.
      ...(story?.choices ?? []).map((choice) => ({ where: `${mission.id} story`, choice })),
    ];
  });
  assert.deepEqual(offered.filter(({ choice }) => /\d+\/\d+/.test(choice)).map(({ where, choice }) => `${where}: ${choice}`), []);
});

test('lesson 1 shows no fraction until its idea that teaches the top number (ideas 1–2 use counts only)', () => {
  const ideas = LESSON_IDEAS['fraction-names']!;
  const at = ideas.findIndex((idea) => idea.terms?.some((term) => term.pattern.test('1/4')));
  assert.equal(at, 2, 'idea 3 owns fraction notation, so the "each screen sticks to its idea" test keeps it off ideas 1 and 2');
  // The Learn page's bar leaves out its "1/4 done" fraction until then.
  assert.deepEqual(ideas.map((_, i) => fractionsTaughtBy('fraction-names', i)), [false, false, true, true]);
  assert.equal(fractionsTaughtBy('equal-parts', 0), true);
  const mission = MISSIONS.find((item) => item.id === 'fraction-names')!;
  for (const idea of ideas.slice(0, at)) {
    const { learn, practice } = ideaText(mission, idea);
    for (const text of [...learn, ...practice]) assert.doesNotMatch(text, /\d+\/\d+/, `${idea.title}: ${text}`);
  }
});

test('a lesson with ideas keeps its Words to know: each word is on a Learn page before the practice that uses it', () => {
  for (const [id, ideas] of Object.entries(LESSON_IDEAS)) {
    const shown = ideas.flatMap((idea) => idea.learn.flatMap((page) => ('words' in page ? page.words.map((word) => word.term) : [])));
    for (const word of TEACH_EXTRAS[id]?.words ?? []) assert.ok(shown.includes(word.term), `${id}: Words to know "${word.term}" is on a Learn page`);
  }
});

test('each lesson names its practice list, and the name changes when its practices change', () => {
  const plans = MISSIONS.map(practicePlan);
  assert.equal(new Set(plans).size, plans.length, 'two lessons share a practice-list name');
  const lesson = MISSIONS[0]!;
  assert.equal(practicePlan(lesson), practicePlan(lesson), 'the same list always has the same name');
  const ideas = LESSON_IDEAS[lesson.id]!;
  const swapped = [{ ...ideas[0]!, practice: [...ideas[0]!.practice].reverse() }, ...ideas.slice(1)];
  LESSON_IDEAS[lesson.id] = swapped;
  try { assert.notEqual(practicePlan(lesson), plans[0], 'reordering practices gives a new name') } finally { LESSON_IDEAS[lesson.id] = ideas; }
});

test('a story problem never asks something new: lessons 2, 39 and 40 practise what their story problem retells', () => {
  // Lessons 39 and 40 retell question 4, so an idea practises question 4 itself.
  for (const id of ['simplify-fractions', 'equivalent-missing-both']) {
    const mission = MISSIONS.find((item) => item.id === id)!;
    const last = mission.questions[mission.questions.length - 1]!;
    assert.ok(storyProblemFor(id)!.prompt.endsWith(last.prompt), `${id}: the story problem retells ${last.id}`);
    assert.ok(ideaSteps(id).some(({ item }) => 'question' in item && item.question === last.id), `${id}: ${last.id} is practised in an idea`);
  }
  // Lesson 2's story problem shares pieces fairly, its idea 2 ("Share fairly"), with a question like its practice.
  const shareIdea = LESSON_IDEAS['equal-parts']![1]!;
  assert.equal(shareIdea.title, 'Share fairly');
  assert.match(storyProblemFor('equal-parts')!.prompt, /share them fairly\. How many pieces does each friend get\?$/);
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  assert.ok(shareIdea.practice.some((item) => 'question' in item && /friends share \d+ equal pieces fairly/.test(ideaQuestion(mission, item.question)!.prompt)));
});

test('lesson 2 asks its own questions (shapes and fair shares), not lesson 1\'s strips, ribbons and sandwich', () => {
  const [first, second] = MISSIONS;
  assert.equal(second!.id, 'equal-parts');
  const lessonOne = new Set([...first!.questions, ...(first!.ideaQuestions ?? [])].map((question) => question.prompt));
  for (const question of second!.questions.filter((item) => !item.isReview)) {
    assert.ok(!lessonOne.has(question.prompt), `${question.id} repeats lesson 1: ${question.prompt}`);
    assert.match(question.prompt, /\bsquare\b|\bfriends share\b/, `${question.id} is about shapes or sharing: ${question.prompt}`);
  }
});

test('lesson 36: a coin page opens idea 1 (a penny, 1¢, what ¢ means) and idea 2 (10 pennies make a dime, 10¢), before the grid pages', () => {
  const ideas = LESSON_IDEAS['dimes-and-pennies']!;
  assert.deepEqual(ideas.map((idea) => idea.title), ['A penny is one hundredth of a dollar', 'A dime is ten hundredths of a dollar', 'Add the dimes and the pennies']);
  const coinRows = (page: (typeof ideas)[number]['learn'][number]) => ('scene' in page ? page.scene[page.scene.length - 1]!.rows.flatMap((row) => (row.kind === 'coins' ? row.items : [])) : []);
  const [penny, dime] = [ideas[0]!.learn[0]!, ideas[1]!.learn[0]!];
  assert.ok('scene' in penny && 'scene' in dime);
  assert.equal(penny.text, 'A penny is 1 cent. We write it 1¢.');
  assert.deepEqual(coinRows(penny), [{ coin: 'penny', big: true }, { sign: '→' }, { sign: '¢' }]);
  assert.equal(sceneSentences(penny.scene).join(' '), 'The ¢ sign means cents. 100 cents make 1 dollar.');
  assert.equal(dime.text, 'A dime is 10 cents: 10¢. 10 pennies make 1 dime.');
  assert.deepEqual(coinRows(dime), [...Array.from({ length: 10 }, () => ({ coin: 'penny' })), { sign: '=' }, { coin: 'dime', big: true }]);
  assert.match(sceneSentences(dime.scene).join(' '), /grid/);
  // The grid pages stay (after the coin page), and each idea still practises 3 times.
  assert.equal(ideas[0]!.learn.length, 3);
  assert.equal(ideas[1]!.learn.length, 3);
  for (const idea of ideas) assert.equal(idea.practice.length, 3, idea.title);
});

test('Listen on a worked-example page reads the sentences under the picture, not the page label ("Write one part")', () => {
  const labels = new Set(Object.values(TEACH_EXTRAS).flatMap((extras) => (extras.examples ?? []).map((item) => item.title)));
  const reads = MISSIONS.flatMap((mission) => (LESSON_IDEAS[mission.id] ?? []).flatMap((idea) => idea.learn
    .filter((page) => 'scene' in page && labels.has(page.text))
    .map((page) => ({ lesson: mission.id, label: page.text, script: learnScript(page), sentences: sceneSentences((page as { scene: StepScene }).scene).join(' ') }))));
  assert.ok(reads.length > 80, 'the worked-example pages are found');
  assert.deepEqual(reads.filter(({ script, sentences }) => script !== sentences).map(({ lesson, label }) => `${lesson}: ${label}`), []);
});

test('every idea question says why after a right answer: more than its hint and "So the answer is …"', () => {
  const plain = (text: string) => text.replace(/\s+/g, ' ').trim();
  const missing: string[] = [];
  for (const mission of MISSIONS) {
    for (const question of ideaPracticeQuestions(mission).filter((item) => item.prompt)) {
      const hint = plain(question.hint);
      let rest = plain(question.retryFeedback);
      if (rest.startsWith(hint)) rest = rest.slice(hint.length).trim();
      rest = rest.replace(/^So the answer is [^.]*\.?/, '').trim();
      if (!rest) missing.push(`${question.id}: ${question.prompt}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('add-unlike idea 1: the child renames the fractions; no prompt hands the renaming over', () => {
  const mission = MISSIONS.find((item) => item.id === 'add-unlike-fractions')!;
  const first = ideaSteps(mission.id).filter(({ idea }) => idea === 0).map(({ item }) => ideaQuestion(mission, (item as { question: string }).question)!);
  for (const question of first) assert.doesNotMatch(question.prompt, /Rename: .*=/, `${question.id} hands over the renaming: ${question.prompt}`);
  // It opens like subtract-unlike idea 1: pick the renamed fraction first.
  assert.match(first[0]!.prompt, /[Ww]hat is \d+\/\d+ in \w+ths\?/);
  assert.ok(first.some((question) => / \+ /.test(question.prompt) && /= \?$/.test(question.prompt)), 'idea 1 still ends with an addition');
});
