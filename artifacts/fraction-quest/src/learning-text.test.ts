import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
});
