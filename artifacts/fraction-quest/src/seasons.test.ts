import assert from 'node:assert/strict';
import test from 'node:test';
import { activeSeason, nextCostume, seasonLessonCount, seasonLine, seasonOn, unlockedCostumes } from './seasons';
import { MONTH_THEMES } from './month-themes';
import { recordSeasonLesson, type FunState } from './lib/fun';

const october = new Date(2026, 9, 17);

test('Halloween runs through October and is keyed by year', () => {
  assert.equal(seasonOn(new Date(2026, 8, 30))?.id, 'september');
  assert.equal(seasonOn(new Date(2026, 9, 1))?.id, 'halloween');
  assert.equal(seasonOn(new Date(2026, 9, 31))?.key, 'halloween-2026');
  assert.equal(seasonOn(new Date(2026, 10, 1))?.id, 'november');
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
  assert.equal(seasonOn(new Date(2026, 10, 30))?.id, 'november');
  const christmas = seasonOn(new Date(2026, 11, 1))!;
  assert.equal(christmas.id, 'christmas');
  assert.equal(christmas.key, 'christmas-2026');
  assert.equal(seasonOn(new Date(2026, 11, 31))?.id, 'christmas');
  assert.equal(seasonOn(new Date(2027, 0, 1))?.id, 'january');
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

/** WCAG contrast ratio of two #rgb / #rrggbb colours. */
function contrast(a: string, b: string) {
  const light = (hex: string) => {
    const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
    const [r, g, b2] = [1, 3, 5].map((at) => parseInt(full.slice(at, at + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [high, low] = [light(a), light(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test('every month has a theme: January to December by the device date, keyed by year', () => {
  const ids = Array.from({ length: 12 }, (_, month) => seasonOn(new Date(2026, month, 15))?.id);
  assert.deepEqual(ids, ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'halloween', 'november', 'christmas']);
  assert.equal(new Set(ids).size, 12);
  // The first and last day of each month belong to that month, whatever the year.
  for (let month = 0; month < 12; month++) {
    assert.equal(seasonOn(new Date(2027, month, 1))?.id, ids[month]);
    assert.equal(seasonOn(new Date(2027, month + 1, 0))?.id, ids[month]);
  }
  assert.equal(seasonOn(new Date(2027, 2, 5))?.key, 'march-2027');
  assert.equal(seasonOn(new Date(2028, 8, 5))?.key, 'september-2028');
  assert.equal(MONTH_THEMES.length, 10);
});

test('the one grown-up switch turns every month off, and on is the default', () => {
  const off = { displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false } } as const;
  const on = { displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: true } } as const;
  for (let month = 0; month < 12; month++) {
    const day = new Date(2026, month, 12);
    assert.equal(activeSeason(off, day), null, `month ${month + 1} is plain when themes are off`);
    assert.equal(activeSeason(on, day)?.id, seasonOn(day)?.id);
    assert.equal(activeSeason(null, day)?.id, seasonOn(day)?.id);
  }
});

test('each month theme has every part: colours, greeting, points name, foods and one story line', () => {
  for (const theme of MONTH_THEMES) {
    const season = seasonOn(new Date(2026, theme.month, 9))!;
    assert.equal(season.id, theme.id);
    assert.equal(season.key, `${theme.id}-2026`);
    assert.equal(season.name, theme.name);
    assert.equal(season.title, theme.title);
    assert.equal(season.greeting, theme.greeting);
    assert.equal(season.cheer, theme.greeting);
    assert.equal(season.points, theme.points);
    for (const text of [theme.name, theme.title, theme.greeting, theme.points, theme.line, ...Object.values(theme.foods)]) assert.ok(text.trim().length > 0, `${theme.id} has no empty parts`);
    assert.match(theme.points, /^[a-z]+$/, `${theme.id}: points are one plural word, so "10 ${theme.points}" reads well`);
    assert.ok(theme.points.length <= 12, `${theme.id}: ${theme.points} fits the top bar`);
    assert.ok(theme.title.length <= 20 && theme.greeting.length <= 28 && theme.line.length <= 60, `${theme.id}: short enough for a phone`);
    for (const color of [theme.map.from, theme.map.to, theme.map.node, theme.map.edge, ...(theme.map.text ? [theme.map.text] : [])]) assert.match(color, /^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    assert.deepEqual(Object.keys(theme.foods).sort(), ['cake', 'juice', 'pizza']);
    assert.doesNotMatch(theme.line, /\d/);
  }
  assert.deepEqual(MONTH_THEMES.map((theme) => theme.points), ['snowflakes', 'hearts', 'kites', 'raindrops', 'flowers', 'shells', 'marshmallows', 'starfish', 'apples', 'acorns']);
});

test('month theme colours stay readable: banner text on its colour, node icons on the node fill', () => {
  for (const theme of MONTH_THEMES) {
    const { from, node, edge, text } = theme.map;
    // The banner text sits on the "from" colour (the fade into "to" is behind the dots below it).
    assert.ok(contrast(text ?? '#fff', from) >= 4.5, `${theme.id}: banner text on ${from} is ${contrast(text ?? '#fff', from).toFixed(2)}`);
    // The node icon is a dark shade of the edge (season.css mixes it 55% with black): readable on the fill, and the
    // finished node (that shade as its fill) shows the fill colour as its icon.
    const shade = (hex: string) => {
      const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
      return `#${[1, 3, 5].map((at) => Math.round(parseInt(full.slice(at, at + 2), 16) * 0.55).toString(16).padStart(2, '0')).join('')}`;
    };
    assert.ok(contrast(shade(edge), node) >= 4.5, `${theme.id}: icon on the node fill`);
    assert.ok(contrast(node, shade(edge)) >= 4.5, `${theme.id}: icon on a finished node`);
  }
});

test('month themes have no costumes yet: nothing to unlock, no costume banner line, and lessons still count', () => {
  for (const theme of MONTH_THEMES) {
    const season = seasonOn(new Date(2026, theme.month, 9))!;
    assert.deepEqual(season.costumes, []);
    assert.deepEqual(unlockedCostumes(season, 9), []);
    assert.equal(nextCostume(season, 0), null);
  }
  // Each finished lesson is still counted per month and year, for the costumes that come later.
  const march = seasonOn(new Date(2026, 2, 9))!;
  let fun = {} as FunState;
  fun = recordSeasonLesson(fun, march.key, 'unit-fractions');
  fun = recordSeasonLesson(fun, march.key, 'unit-fractions');
  fun = recordSeasonLesson(fun, march.key, 'equal-shares');
  assert.equal(seasonLessonCount(fun, march), 2);
  assert.deepEqual(Object.keys(fun.seasonLessons ?? {}), ['march-2026']);
});

test('a month theme has one story line for every kind of question, the same for the same question, and never a hint', () => {
  for (const theme of MONTH_THEMES) {
    const season = seasonOn(new Date(2026, theme.month, 9))!;
    for (const kind of ['bars', 'partition', 'area', 'line', 'set', 'decimal', 'equation', undefined] as const) {
      for (const id of ['a', 'q-1', 'zz']) assert.equal(seasonLine(season, kind, id), theme.line);
    }
    assert.doesNotMatch(theme.line, /\d|pumpkin|witch|ghost|Halloween|Christmas|answer|the right/i);
  }
  assert.equal(seasonLine(seasonOn(new Date(2026, 6, 9))!, 'set', 'x'), 'Let’s count the stars over the tent.');
});
