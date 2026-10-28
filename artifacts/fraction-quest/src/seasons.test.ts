import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { activeSeason, nextCostume, seasonLessonCount, seasonLine, seasonOn, unlockedCostumes } from './seasons';
import { MONTH_THEMES } from './month-themes';
import { recordSeasonLesson, type FunState } from './lib/fun';
import { COSTUME_ART, costumeLayer, MonthRewardIcon, type CostumeLayer } from './costume-art';
import { FunContext, Mascot, SeasonBanner, SeasonReward } from './fun-ui';

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

/** The ten months' costumes, in the order the user approved: [first at 3 lessons, second at 5]. */
const MONTH_COSTUME_NAMES: Record<string, [string, string]> = {
  january: ['mittens', 'a pom-pom beanie'],
  february: ['heart glasses', 'a friendship bracelet'],
  march: ['a kite tail', 'pilot goggles'],
  april: ['rain boots', 'a rainbow umbrella'],
  may: ['a flower crown', 'bumblebee wings'],
  june: ['sunglasses', 'a sun hat'],
  july: ['a camp hat', 'a star lantern'],
  august: ['a snorkel', 'diving fins'],
  september: ['a backpack', 'an apple hat'],
  november: ['a leaf cape', 'an acorn cap'],
};

test('every month theme has exactly two costumes, at 3 and 5 lessons, with the approved names and unique ids', () => {
  const ids: string[] = [];
  for (const theme of MONTH_THEMES) {
    const season = seasonOn(new Date(2026, theme.month, 9))!;
    assert.equal(season.costumes.length, 2, `${theme.id} has two costumes`);
    assert.deepEqual(season.costumes.map((item) => item.lessons), [3, 5]);
    assert.deepEqual(season.costumes.map((item) => item.name), MONTH_COSTUME_NAMES[theme.id], theme.id);
    for (const item of season.costumes) {
      assert.match(item.id, /^[a-z]+(-[a-z]+)*$/);
      assert.ok(item.label.trim().length > 0 && item.name === item.label, `${item.id} has a name Numi can be described with`);
      assert.doesNotMatch(item.name, /\d/);
      ids.push(item.id);
    }
  }
  assert.deepEqual(Object.keys(MONTH_COSTUME_NAMES).sort(), MONTH_THEMES.map((theme) => theme.id).sort());
  // Twenty different costumes, none shared with a holiday or with another month.
  const holiday = [...seasonOn(october)!.costumes, ...seasonOn(new Date(2026, 11, 5))!.costumes].map((item) => item.id);
  assert.equal(ids.length, 20);
  assert.equal(new Set([...ids, ...holiday]).size, 24);
});

test('every costume has a drawing: pieces that sit on Numi, with no text and no accessible name of their own', () => {
  assert.deepEqual(Object.keys(COSTUME_ART).sort(), MONTH_THEMES.flatMap((theme) => theme.costumes.map((item) => item.id)).sort());
  for (const [id, layers] of Object.entries(COSTUME_ART)) {
    const names = Object.keys(layers);
    assert.ok(names.length > 0 && names.every((layer) => ['back', 'face', 'hands', 'front', 'feet', 'head'].includes(layer)), `${id}: known layers`);
    for (const layer of names) {
      const markup = renderToStaticMarkup(createElement('svg', null, costumeLayer([id], layer as CostumeLayer)));
      assert.match(markup, new RegExp(`fq-costume-${id}`), `${id} draws into ${layer}`);
      assert.ok((markup.match(/<(path|circle|ellipse|rect)\b/g) ?? []).length >= 3, `${id}/${layer} is a real drawing`);
      assert.doesNotMatch(markup, /<text|<title|aria-label|role=/, `${id}/${layer} is decorative`);
    }
  }
  assert.deepEqual(costumeLayer(['bat-wings', 'scarf'], 'head'), [null, null], 'the holidays draw their own costumes');
  // Each month's reward icon is a decorative drawing too.
  for (const theme of MONTH_THEMES) {
    const markup = renderToStaticMarkup(createElement(MonthRewardIcon, { id: theme.id }));
    assert.match(markup, /aria-hidden="true"/);
    assert.match(markup, /<(path|circle|g)\b/);
  }
});

/** Runs `render` as if today were `day` (the mascot, banner and reward read the device date). */
function onDay<T>(day: Date, render: () => T): T {
  const RealDate = Date;
  const fixed = day.getTime();
  class FixedDate extends RealDate {
    constructor(...args: unknown[]) { if (args.length) super(...(args as [number])); else super(fixed); }
    static override now() { return fixed; }
  }
  globalThis.Date = FixedDate as DateConstructor;
  try { return render(); } finally { globalThis.Date = RealDate; }
}
const withFun = (fun: Partial<FunState>, node: ReturnType<typeof createElement>) =>
  createElement(FunContext.Provider, { value: { fun: fun as FunState, setFun: () => {} } }, node);
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
const lessonsIn = (key: string, count: number) => ({ seasonLessons: { [key]: Array.from({ length: count }, (_, at) => `lesson-${at}`) } });

test('in a month with no holiday, the first costume comes after 3 lessons and the second after 5', () => {
  const march = seasonOn(new Date(2026, 2, 9))!;
  assert.deepEqual(unlockedCostumes(march, 0), []);
  assert.deepEqual(unlockedCostumes(march, 2), []);
  assert.deepEqual(unlockedCostumes(march, 3).map((item) => item.id), ['kite-tail']);
  assert.deepEqual(unlockedCostumes(march, 4).map((item) => item.id), ['kite-tail']);
  assert.deepEqual(unlockedCostumes(march, 5).map((item) => item.id), ['kite-tail', 'pilot-goggles']);
  assert.deepEqual(unlockedCostumes(march, 9).map((item) => item.id), ['kite-tail', 'pilot-goggles']);
  assert.equal(nextCostume(march, 0)?.id, 'kite-tail');
  assert.equal(nextCostume(march, 3)?.id, 'pilot-goggles');
  assert.equal(nextCostume(march, 5), null);
  // Counted per month and year through the saved lessons, each lesson once.
  let fun = {} as FunState;
  for (const lesson of ['unit-fractions', 'unit-fractions', 'equal-shares', 'equal-parts']) fun = recordSeasonLesson(fun, march.key, lesson);
  assert.equal(seasonLessonCount(fun, march), 3);
  assert.deepEqual(unlockedCostumes(march, seasonLessonCount(fun, march)).map((item) => item.id), ['kite-tail']);
  assert.deepEqual(Object.keys(fun.seasonLessons ?? {}), ['march-2026']);
});

test('costumes are earned fresh each year, and a new year starts with none, across the December to January boundary', () => {
  // Five lessons in December 2026 earn Christmas costumes only; January 2027 starts from nothing.
  let fun = {} as FunState;
  const christmas = seasonOn(new Date(2026, 11, 31))!;
  for (let at = 0; at < 5; at++) fun = recordSeasonLesson(fun, christmas.key, `lesson-${at}`);
  const january = seasonOn(new Date(2027, 0, 1))!;
  assert.equal(january.id, 'january');
  assert.equal(january.key, 'january-2027');
  assert.equal(seasonLessonCount(fun, christmas), 5);
  assert.equal(seasonLessonCount(fun, january), 0);
  assert.deepEqual(unlockedCostumes(january, seasonLessonCount(fun, january)), []);
  // Three January lessons earn the mittens; five earn the beanie too.
  for (let at = 0; at < 3; at++) fun = recordSeasonLesson(fun, january.key, `lesson-${at}`);
  assert.deepEqual(unlockedCostumes(january, seasonLessonCount(fun, january)).map((item) => item.id), ['mittens']);
  for (let at = 3; at < 5; at++) fun = recordSeasonLesson(fun, january.key, `lesson-${at}`);
  assert.deepEqual(unlockedCostumes(january, seasonLessonCount(fun, january)).map((item) => item.id), ['mittens', 'pom-pom-beanie']);
  // The same month a year later starts fresh again, and last January's lessons stay saved under their own key.
  const nextJanuary = seasonOn(new Date(2028, 0, 20))!;
  assert.equal(seasonLessonCount(fun, nextJanuary), 0);
  assert.deepEqual(unlockedCostumes(nextJanuary, 0), []);
  assert.equal(fun.seasonLessons?.['january-2027']?.length, 5);
  // The same holds for every month: this year's lessons never count toward next year's costumes.
  for (const theme of MONTH_THEMES) {
    const saved = lessonsIn(`${theme.id}-2026`, 5) as FunState;
    assert.equal(seasonLessonCount(saved, seasonOn(new Date(2026, theme.month, 9))!), 5);
    assert.equal(seasonLessonCount(saved, seasonOn(new Date(2027, theme.month, 9))!), 0);
  }
});

test('the mascot wears what has been earned, says so to a screen reader, and stays plain when themes are off', () => {
  const day = new Date(2026, 8, 12);
  const mascot = (fun: Partial<FunState>, named = true) => onDay(day, () => renderToStaticMarkup(withFun(fun, createElement(Mascot, { mood: 'happy', size: 84, named }))));
  const none = mascot(lessonsIn('september-2026', 2));
  assert.doesNotMatch(none, /fq-costume|data-costume|aria-label|role="img"/);
  assert.match(none, /aria-hidden="true"/);
  const first = mascot(lessonsIn('september-2026', 3));
  assert.match(first, /data-costume="backpack"/);
  assert.match(first, /aria-label="Numi with a backpack"/);
  assert.match(first, /role="img"/);
  assert.doesNotMatch(first, /aria-hidden="true"/);
  const both = mascot(lessonsIn('september-2026', 5));
  assert.match(both, /data-costume="backpack apple-hat"/);
  assert.match(both, /aria-label="Numi with a backpack and an apple hat"/);
  // Everywhere else the mascot is decorative: no name, but still dressed.
  const small = mascot(lessonsIn('september-2026', 5), false);
  assert.match(small, /aria-hidden="true"/);
  assert.doesNotMatch(small, /aria-label/);
  assert.match(small, /fq-costume-apple-hat/);
  // Last September's lessons do not dress this September's Numi.
  assert.doesNotMatch(mascot(lessonsIn('september-2025', 5)), /fq-costume/);
  // A grown-up's switch takes every costume off, and the plain mascot stays decorative.
  const off = mascot({ ...lessonsIn('september-2026', 5), displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false } });
  assert.doesNotMatch(off, /fq-costume|data-costume|aria-label/);
  assert.match(off, /aria-hidden="true"/);
  // Every month's mascot names both costumes, and the names agree with the table.
  for (const theme of MONTH_THEMES) {
    const [one, two] = theme.costumes;
    const dressed = onDay(new Date(2026, theme.month, 9), () => renderToStaticMarkup(withFun(lessonsIn(`${theme.id}-2026`, 5), createElement(Mascot, { named: true }))));
    assert.ok(dressed.includes(`aria-label="Numi with ${one.label} and ${two.label}"`), `${theme.id}: ${dressed.match(/aria-label="[^"]*"/)?.[0]}`);
    assert.ok(dressed.includes(`fq-costume-${one.id}`) && dressed.includes(`fq-costume-${two.id}`), `${theme.id} draws both`);
  }
  // The holidays keep their own look and are named the same way.
  const witch = onDay(october, () => renderToStaticMarkup(withFun(lessonsIn('halloween-2026', 3), createElement(Mascot, { named: true }))));
  assert.match(witch, /data-costume="witch-hat bat-wings"/);
  assert.match(witch, /aria-label="Numi with a witch hat and bat wings"/);
  const santa = onDay(new Date(2026, 11, 5), () => renderToStaticMarkup(withFun(lessonsIn('christmas-2026', 5), createElement(Mascot, { named: true }))));
  assert.match(santa, /aria-label="Numi with a Santa hat, a striped scarf and a twinkling Santa hat"/);
});

test('the banner and reward card say the right thing for every month, and only count lessons', () => {
  /** The lesson counts are the only digits a sentence may hold ("3 more lessons", "2 of 5"): never an answer. */
  const withoutCounts = (text: string) => text.replace(/\b\d+ more lessons?\b/g, '').replace(/\b\d+ of \d+\b/g, '');
  for (const theme of MONTH_THEMES) {
    const [one, two] = theme.costumes;
    const day = new Date(2026, theme.month, 9);
    const key = `${theme.id}-2026`;
    const banner = (count: number) => textOf(onDay(day, () => renderToStaticMarkup(withFun(lessonsIn(key, count), createElement(SeasonBanner)))));
    const reward = (count: number) => textOf(onDay(day, () => renderToStaticMarkup(withFun(lessonsIn(key, count), createElement(SeasonReward, { missionId: `lesson-${count - 1}` })))));
    const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
    // The map banner: how far to the next costume, then every costume earned, then the greeting.
    assert.ok(banner(0).includes(`Finish 3 more lessons to unlock ${one.name}.`), banner(0));
    assert.ok(banner(1).includes(`Finish 2 more lessons to unlock ${one.name}.`), banner(1));
    assert.ok(banner(2).includes(`Finish 1 more lesson to unlock ${one.name}.`), banner(2));
    assert.ok(banner(3).includes(`Finish 2 more lessons to unlock ${two.name}.`), banner(3));
    assert.ok(banner(4).includes(`Finish 1 more lesson to unlock ${two.name}.`), banner(4));
    assert.ok(banner(5).includes(`You earned every costume. ${theme.greeting}`), banner(5));
    assert.ok(banner(7).includes(`You earned every costume. ${theme.greeting}`), banner(7));
    // The reward after a lesson: nothing earned yet, the first costume, the second, and no card once both are earned.
    assert.ok(reward(1).includes(`${theme.name} costume 2 more lessons for ${one.name}`), reward(1));
    assert.ok(reward(2).includes(`1 more lesson for ${one.name}`), reward(2));
    assert.ok(reward(3).includes(`Costume unlocked ${cap(one.name)} 2 more lessons for ${two.name}.`), reward(3));
    assert.ok(reward(4).includes(`1 more lesson for ${two.name}`), reward(4));
    assert.ok(reward(5).includes(`Costume unlocked ${cap(two.name)}`) && !/more lesson/.test(reward(5)), reward(5));
    assert.equal(reward(6), '', 'no card after both costumes are earned and a later lesson');
    for (const text of [banner(0), banner(3), banner(5), reward(1), reward(3), reward(5)]) {
      assert.doesNotMatch(withoutCounts(text), /\d|\//, `${theme.id}: only lesson counts: ${text}`);
    }
  }
  // The card shows the month's own icon, and the banner's Numi is named.
  const september = onDay(new Date(2026, 8, 9), () => renderToStaticMarkup(withFun(lessonsIn('september-2026', 3), createElement(SeasonReward, { missionId: 'lesson-2' }))));
  assert.match(september, /fq-month-reward-icon/);
  assert.match(onDay(new Date(2026, 8, 9), () => renderToStaticMarkup(withFun(lessonsIn('september-2026', 3), createElement(SeasonBanner)))), /aria-label="Numi with a backpack"/);
  // The holidays keep their own reward icons and sentences.
  const halloween = textOf(onDay(october, () => renderToStaticMarkup(withFun(lessonsIn('halloween-2026', 3), createElement(SeasonReward, { missionId: 'lesson-2' })))));
  assert.equal(halloween, "Costume unlocked Numi's bat wings 2 more lessons for the glow-in-the-dark hat.");
});

test('turning seasonal themes off shows no banner, no reward card and no costume in any month', () => {
  const off = { displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false } };
  for (let month = 0; month < 12; month++) {
    const key = `${seasonOn(new Date(2026, month, 9))!.id}-2026`;
    const fun = { ...lessonsIn(key, 5), ...off };
    const day = new Date(2026, month, 9);
    assert.equal(onDay(day, () => renderToStaticMarkup(withFun(fun, createElement(SeasonBanner)))), '');
    assert.equal(onDay(day, () => renderToStaticMarkup(withFun(fun, createElement(SeasonReward, { missionId: 'lesson-4' })))), '');
    assert.doesNotMatch(onDay(day, () => renderToStaticMarkup(withFun(fun, createElement(Mascot, { named: true })))), /fq-costume|data-costume|aria-label/);
  }
});

test('month reward cards stay readable: white text on the month’s dark shade, its icon colour on the dark tile', () => {
  for (const theme of MONTH_THEMES) {
    const { edge, node } = theme.map;
    const full = edge.length === 4 ? `#${[...edge.slice(1)].map((c) => c + c).join('')}` : edge;
    const card = `#${[1, 3, 5].map((at) => Math.round(parseInt(full.slice(at, at + 2), 16) * 0.55).toString(16).padStart(2, '0')).join('')}`;
    assert.ok(contrast('#fff', card) >= 4.5, `${theme.id}: white on ${card} is ${contrast('#fff', card).toFixed(2)}`);
    assert.ok(contrast(node, card) >= 4.5, `${theme.id}: the small label (${node}) on ${card}`);
  }
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
