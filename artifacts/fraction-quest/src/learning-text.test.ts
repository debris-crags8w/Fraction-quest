import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FunContext } from './fun-ui';
import { LearningText } from './LearningText';

describe('learning text wrapping', () => {
  it('keeps punctuation on the same line as a highlighted word ("equal parts." never leaves "." alone)', () => {
    const markup = renderToStaticMarkup(createElement(LearningText, { text: 'Cut a bar into 3 equal parts. Shade 1.' }));
    // The term and the full stop after it sit together in one piece that cannot break.
    assert.match(markup, /<span class="fq-glue"><span class="fq-vocab">.*?equal parts.*?<\/span><\/span>\.<\/span>/);
    const asked = renderToStaticMarkup(createElement(LearningText, { text: 'When are they fourths?', emphasize: true }));
    assert.match(asked, /<span class="fq-glue"><span class="fq-key">fourths<\/span>\?<\/span>/);
  });
  it('leaves a word without punctuation after it as it was', () => {
    const markup = renderToStaticMarkup(createElement(LearningText, { text: 'The equal parts are thirds' }));
    assert.doesNotMatch(markup, /fq-glue/);
  });
  it('never underlines an amount out of the middle of a fraction ("6/3 cups" stays a stacked 6/3)', () => {
    const markup = renderToStaticMarkup(createElement(LearningText, { text: '6/3 cups = 2 cups.', emphasize: true }));
    assert.doesNotMatch(markup, /fq-key">3 cups/);
    assert.match(markup, /fq-key">2 cups/);
  });
  it('an underlined amount follows the season like the words around it ("3 pizzas" at Halloween)', () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-23T12:00:00Z') });
    try {
      const fun = { xp: 0, day: '2026-10-23', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false };
      const markup = renderToStaticMarkup(createElement(FunContext.Provider, { value: { fun, setFun: () => {} } },
        createElement(LearningText, { text: '3 pizzas shared by 4 friends: 3/4 of a pizza each.', emphasize: true })));
      assert.match(markup, /fq-key">3 pumpkin pies/);
      assert.doesNotMatch(markup, /pizza/);
    } finally {
      mock.timers.reset();
    }
  });
});
