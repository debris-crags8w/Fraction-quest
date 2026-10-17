import assert from 'node:assert/strict';
import test from 'node:test';
import { activeSeason, nextCostume, seasonLessonCount, seasonLine, seasonOn, unlockedCostumes } from './seasons';
import { recordSeasonLesson, type FunState } from './lib/fun';

const october = new Date(2026, 9, 17);
const november = new Date(2026, 10, 1);

test('Halloween runs through October and is keyed by year', () => {
  assert.equal(seasonOn(new Date(2026, 8, 30)), null);
  assert.equal(seasonOn(new Date(2026, 9, 1))?.id, 'halloween');
  assert.equal(seasonOn(new Date(2026, 9, 31))?.key, 'halloween-2026');
  assert.equal(seasonOn(november), null);
  assert.equal(seasonOn(new Date(2027, 9, 5))?.key, 'halloween-2027');
});

test('a grown-up can turn seasonal themes off', () => {
  assert.equal(activeSeason({ displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false } }, october)?.id, 'halloween');
  assert.equal(activeSeason({ displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false } }, october), null);
  assert.equal(activeSeason(null, october)?.id, 'halloween');
});

test('costumes unlock after 3 and 5 lessons finished this season', () => {
  const season = seasonOn(october)!;
  assert.deepEqual(unlockedCostumes(season, 2), []);
  assert.deepEqual(unlockedCostumes(season, 3).map((c) => c.id), ['bat-wings']);
  assert.deepEqual(unlockedCostumes(season, 5).map((c) => c.id), ['bat-wings', 'glow-hat']);
  assert.equal(nextCostume(season, 0)?.id, 'bat-wings');
  assert.equal(nextCostume(season, 4)?.id, 'glow-hat');
  assert.equal(nextCostume(season, 5), null);
});

test('each finished lesson counts once per season, and odd saved data is ignored', () => {
  const season = seasonOn(october)!;
  let fun = { seasonLessons: { 'halloween-2025': ['old-lesson'], 'Bad Key': ['x'] } } as unknown as FunState;
  fun = recordSeasonLesson(fun, season.key, 'unit-fractions');
  fun = recordSeasonLesson(fun, season.key, 'unit-fractions');
  fun = recordSeasonLesson(fun, season.key, 'equal-shares');
  assert.equal(seasonLessonCount(fun, season), 2);
  assert.deepEqual(fun.seasonLessons?.['halloween-2025'], ['old-lesson']);
  assert.equal(fun.seasonLessons?.['Bad Key'], undefined);
  assert.equal(recordSeasonLesson(fun, 'not a key', 'x'), fun);
});

test('story lines fit the picture, repeat for the same question, and never mention answers', () => {
  const season = seasonOn(october)!;
  assert.match(seasonLine(season, 'line', 'q1'), /frog|path/i);
  assert.match(seasonLine(season, 'set', 'q2'), /count|group/i);
  assert.equal(seasonLine(season, 'bars', 'abc'), seasonLine(season, 'bars', 'abc'));
  assert.ok(seasonLine(season, undefined, 'x').length > 0);
  for (const kind of ['bars', 'partition', 'area', 'line', 'set', 'decimal', 'equation'] as const) {
    for (const id of ['a', 'b', 'c', 'd']) assert.doesNotMatch(seasonLine(season, kind, id), /\d/);
  }
});

test('Christmas runs through December with its own costumes, points and lines', () => {
  assert.equal(seasonOn(new Date(2026, 10, 30)), null);
  const christmas = seasonOn(new Date(2026, 11, 1))!;
  assert.equal(christmas.id, 'christmas');
  assert.equal(christmas.key, 'christmas-2026');
  assert.equal(seasonOn(new Date(2026, 11, 31))?.id, 'christmas');
  assert.equal(seasonOn(new Date(2027, 0, 1)), null);
  assert.equal(christmas.points, 'candy canes');
  assert.deepEqual(unlockedCostumes(christmas, 5).map((costume) => costume.id), ['scarf', 'twinkle-hat']);
  assert.equal(nextCostume(christmas, 0)?.id, 'scarf');
  for (const kind of ['bars', 'partition', 'area', 'line', 'set', 'decimal', 'equation', undefined] as const) {
    const line = seasonLine(christmas, kind, 'q-1');
    assert.ok(line.length > 0 && line.length <= 90, line);
    assert.doesNotMatch(line, /\d|pumpkin|witch|ghost|Halloween/i, line);
  }
  // Each season names itself in the banner, the reward heading and the last costume line.
  const halloween = seasonOn(october)!;
  assert.deepEqual([halloween.name, halloween.cheer, christmas.name, christmas.cheer], ['Halloween', 'Spooky good!', 'Christmas', 'Merry and bright!']);
});
