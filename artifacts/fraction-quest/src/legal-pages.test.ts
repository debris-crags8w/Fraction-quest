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

/* Rescore 5 (value): the legal pages send grown-ups to a place in the app; that place must have that name. */
describe('the legal pages\' directions into the app', () => {
  const settings = readFileSync(new URL('./ParentView.tsx', import.meta.url), 'utf8');
  const rows = [...settings.matchAll(/<SettingsRow title="([^"]+)"/g)].map((match) => match[1]);
  for (const page of ['privacy.html', 'terms.html']) {
    it(`${page} names a real Grown-ups settings row`, () => {
      const html = readFileSync(new URL(`../public/${page}`, import.meta.url), 'utf8');
      const places = [...html.matchAll(/Grown-ups › ([^<]+)</g)].map((match) => match[1].trim());
      assert.ok(places.length > 0);
      for (const place of places) assert.ok(rows.includes(place), `"${place}" is not one of: ${rows.join(', ')}`);
    });
  }
});
