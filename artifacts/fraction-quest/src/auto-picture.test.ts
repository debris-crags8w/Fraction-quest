import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoPicture } from './auto-picture';
test('a story that adds the same amount again draws it twice', () => {
  const picture = autoPicture('1/4 of a garden is planted. Then 1/4 more is planted. How much is planted?');
  assert.equal(picture?.kind === 'bars' ? picture.bars.length : 0, 2);
});
