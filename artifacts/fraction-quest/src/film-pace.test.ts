import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { holdAfterTypingMs, readingMs, READ_REST_MS, typingMs } from './lib/film-pace';

/* With the voice off, a film caption stays up long enough for a young reader: about 12 characters a second plus a
   2-second rest (it used to type at 31 characters a second and hold for only 1.1 s, about 3 s for a 60-character line). */

test('a caption with no voice stays up about 12 characters a second plus a 2-second rest', () => {
  assert.equal(readingMs(0), 2000);
  assert.equal(readingMs(60), 7000);
  assert.equal(readingMs(120), 12000);
  for (const length of [1, 10, 24, 37, 60, 85, 120, 160]) {
    const onScreen = typingMs(length) + holdAfterTypingMs(length);
    assert.ok(onScreen >= readingMs(length), `${length} characters: on screen ${onScreen} ms, reading needs ${readingMs(length)} ms`);
    assert.ok(onScreen <= readingMs(length) + READ_REST_MS, `${length} characters: not held far longer than needed (${onScreen} ms)`);
    assert.ok(holdAfterTypingMs(length) >= READ_REST_MS, `${length} characters: at least the 2-second rest after typing`);
    // A grade-3 reader needs 5 to 7 seconds for a 60-character line.
    if (length === 60) assert.ok(onScreen >= 5000 && onScreen <= 8000, `60 characters: ${onScreen} ms`);
  }
});

test('the film uses the reading pace whenever no voice reads the line, and a tap on the picture moves on', () => {
  const source = readFileSync(new URL('./story-cinema.tsx', import.meta.url), 'utf8');
  assert.match(source, /from '\.\/lib\/film-pace'/, 'story-cinema.tsx takes its pace from lib/film-pace');
  // The timers that move a voiceless film on all wait for the reading time of the line on screen.
  const timers = [...source.matchAll(/later\(\(\) => showBeat\([^)]*\+ 1\), ([^;]+)\);/g)].map((match) => match[1]!);
  assert.ok(timers.length >= 3, `found the timers that move the film on (${timers.length})`);
  for (const wait of timers) assert.match(wait, /holdAfterTypingMs|VOICED_PAUSE_MS|600/, `a timer waits ${wait}`);
  assert.ok(timers.filter((wait) => wait.includes('holdAfterTypingMs')).length >= 3, 'the voiceless timers hold for the reading time');
  assert.doesNotMatch(source, /PAUSE_MS = 1100/, 'the old 1.1 s pause is gone');
  // Tap to continue: a tap on a finished caption moves to the next shot (a tap while typing still finishes the line).
  assert.match(source, /data-testid="story-next-hint"/, 'a finished caption shows that a tap moves on');
  assert.match(source, /const tapScreen = /, 'the picture has its own tap handler');
});
