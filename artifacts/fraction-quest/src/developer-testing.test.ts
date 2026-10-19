import assert from 'node:assert/strict';
import test from 'node:test';
import { developerCodeMatches } from './DeveloperTesting';

test('the developer code opens developer testing only when a code is set and it matches', () => {
  assert.equal(developerCodeMatches('Quest-42', 'quest-42'), true);
  assert.equal(developerCodeMatches('  quest-42 ', 'quest-42'), true);
  assert.equal(developerCodeMatches('quest-41', 'quest-42'), false);
  assert.equal(developerCodeMatches('', 'quest-42'), false);
  // A build without a code never accepts one, so nothing can be guessed open.
  assert.equal(developerCodeMatches('anything', ''), false);
});
