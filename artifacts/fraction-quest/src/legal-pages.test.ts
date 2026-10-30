import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

/* The privacy page may only describe what the app really does. There is no iCloud copy of a family's progress. */
describe('the privacy page', () => {
  const html = readFileSync(new URL('../public/privacy.html', import.meta.url), 'utf8');
  it('does not promise an iCloud copy that does not exist', () => assert.doesNotMatch(html, /icloud/i));
  it('keeps the owner placeholders for the owner to fill in', () => {
    for (const placeholder of ['[contact email]', '[legal name]', '[country]']) assert.ok(html.includes(placeholder), placeholder);
  });
});
