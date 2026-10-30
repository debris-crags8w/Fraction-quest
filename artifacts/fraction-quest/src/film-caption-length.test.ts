import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { chapterFor, lessonComic } from './story';

// A film caption longer than this runs past five lines on a phone and covers the chapter friend.
const MAX_CAPTION = 150;

describe('lesson film captions', () => {
  it(`keeps every line at ${MAX_CAPTION} characters or fewer`, () => {
    const long: string[] = [];
    for (const mission of MISSIONS) {
      const chapter = chapterFor(mission.unit);
      if (!chapter) continue;
      const index = MISSIONS.filter((item) => item.unit === mission.unit).indexOf(mission);
      lessonComic(chapter, mission, index).forEach((beat, at) => {
        if (beat.text.length > MAX_CAPTION) long.push(`${mission.id} shot ${at + 1}: ${beat.text.length} characters`);
      });
    }
    assert.deepEqual(long, []);
  });
});
