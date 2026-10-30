import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAPTERS } from './story';

/* A chapter opening plays before the chapter's first Learn page, so it may pose a sum but never give its result: a
   line with "1/2 + 1/4" must not also name 3/4 (or any other way of writing the total) anywhere in that opening. */

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

test('no chapter opening gives away the result of a sum it poses', () => {
  const leaks: string[] = [];
  for (const chapter of CHAPTERS) {
    const opening = chapter.intro.map((panel) => panel.text).join(' ');
    for (const [, a, b, c, d] of opening.matchAll(/(\d+)\/(\d+)\s*\+\s*(\d+)\/(\d+)/g)) {
      const den = Number(b) * Number(d), num = Number(a) * Number(d) + Number(c) * Number(b);
      const g = gcd(num, den);
      const totals = new Set([`${num}/${den}`, `${num / g}/${den / g}`]);
      for (const total of totals) if (new RegExp(`(^|[^\\d/])${total}(?![\\d/])`).test(opening)) leaks.push(`chapter ${chapter.unit}: ${a}/${b} + ${c}/${d} and ${total}`);
    }
  }
  assert.deepEqual(leaks, []);
});
