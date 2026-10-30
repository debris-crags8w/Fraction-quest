import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { openFoldedSections, printPage } from './lib/print';

/* In the iPhone app the page's HTML is sent to the phone's print sheet. The browser's "beforeprint" is not fired
   there, so the folded parts of the report (unit tables, other grades, "Show all" skills) have to be opened first. */
const host = globalThis as unknown as Record<string, unknown>;
const saved = { window: host.window, document: host.document, ReactNativeWebView: host.ReactNativeWebView };
afterEach(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete host[key]; else host[key] = value; } });

describe('printing from the app', () => {
  it('sends the page after the folded parts were opened', async () => {
    let folded = true;
    const target = new EventTarget();
    target.addEventListener('beforeprint', () => { folded = false; });
    host.window = target;
    host.document = {
      baseURI: 'https://example.test/',
      documentElement: { cloneNode: () => ({ querySelectorAll: () => [], querySelector: () => null, get outerHTML() { return folded ? '<details>' : '<details open>'; } }) },
    };
    const sent: { type: string; html: string }[] = [];
    host.ReactNativeWebView = { postMessage: (message: string) => sent.push(JSON.parse(message)) };
    await printPage('Fraction Quest progress report');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].type, 'print');
    assert.match(sent[0].html, /<details open>/);
  });

  it('opens every folded section and leaves open ones open', () => {
    const items = [{ open: false }, { open: true }, { open: false }];
    const seen: string[] = [];
    openFoldedSections({ querySelectorAll: (selector: string) => { seen.push(selector); return items; } } as unknown as ParentNode);
    assert.deepEqual(items.map((item) => item.open), [true, true, true]);
    assert.match(seen[0], /fq-parent-report details/);
  });
});

describe('printing the report in a browser', () => {
  it('keeps the colour of the week bars and the skill step boxes, which are backgrounds', () => {
    const css = readFileSync(new URL('./parent-glance.css', import.meta.url), 'utf8');
    const printRules = [...css.matchAll(/@media print \{([\s\S]*?)\n\}/g)].map((match) => match[1]).join('\n');
    for (const selector of ['.fq-parent-bar i', '.fq-skill-steps i']) {
      const rule = printRules.split('}').find((part) => part.includes(selector) && part.includes('print-color-adjust'));
      assert.ok(rule && /print-color-adjust:\s*exact/.test(rule), `${selector} needs print-color-adjust: exact`);
    }
  });
});
