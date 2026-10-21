import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/** The rules inside a stylesheet's `@media (prefers-reduced-motion: reduce)` block, as [selector, declarations]. */
function systemRules(css: string): [string, string][] {
  const start = css.indexOf('@media (prefers-reduced-motion: reduce) {');
  assert.ok(start >= 0, 'has a reduced-motion block');
  let depth = 0; let end = -1;
  for (let at = css.indexOf('{', start); at < css.length; at++) {
    if (css[at] === '{') depth++;
    else if (css[at] === '}' && --depth === 0) { end = at; break; }
  }
  return [...css.slice(css.indexOf('{', start) + 1, end).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .flatMap(([, selectors, body]) => selectors.split(',').map((selector) => [selector.trim(), body.trim()] as [string, string]))
    .filter(([selector]) => selector);
}

for (const file of ['story-cinema.css', 'model-intro.css']) {
  test(`${file}: the grown-ups' Reduce motion setting stills everything the system setting stills`, () => {
    const css = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    // Each selector and its rules, as one string (a selector can have more than one rule).
    const appRules = new Set<string>();
    for (const [, selectors, body] of css.matchAll(/([^{}]*:root\.fq-reduced-motion[^{}]*)\{([^{}]*)\}/g)) {
      for (const selector of selectors.split(',')) appRules.add(`${selector.trim()} { ${body.trim()} }`);
    }
    for (const [selector, body] of systemRules(css)) {
      assert.ok(appRules.has(`:root.fq-reduced-motion ${selector} { ${body} }`), `${selector} { ${body} } is held still by the app setting too`);
    }
  });
}
