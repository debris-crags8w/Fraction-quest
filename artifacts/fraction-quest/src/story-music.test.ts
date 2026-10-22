import assert from 'node:assert/strict';
import test from 'node:test';
import { arpeggio, filmMood, MUSIC_DUCKED, MUSIC_LEVEL, MUSIC_PLANS, noteFrequency, StoryMusic } from './lib/story-music';

test('the music is in tune: A above middle C is 440 hertz and middle C is about 262', () => {
  assert.equal(noteFrequency(69), 440);
  assert.ok(Math.abs(noteFrequency(60) - 261.63) < 0.01);
});

test('each mood has four three-note chords, slow enough to stay in the background', () => {
  for (const [mood, plan] of Object.entries(MUSIC_PLANS)) {
    assert.equal(plan.chords.length, 4, mood);
    assert.ok(plan.chords.every((chord) => chord.length === 3), mood);
    assert.ok(plan.bpm >= 50 && plan.bpm <= 100, mood);
  }
  // Worried is the slowest and starts in a minor key (A minor); happy is the quickest.
  assert.ok(MUSIC_PLANS.worried.bpm < MUSIC_PLANS.calm.bpm && MUSIC_PLANS.calm.bpm < MUSIC_PLANS.happy.bpm);
  assert.deepEqual(MUSIC_PLANS.worried.chords[0], [57, 60, 64]);
});

test('the arpeggio goes up and back down the chord, an octave higher', () => {
  assert.deepEqual(arpeggio([60, 64, 67]), [72, 76, 79, 76]);
});

test('the film picks the mood: worried when the colours are cold, happy at the end, calm otherwise', () => {
  assert.equal(filmMood({ cold: false, finished: false }), 'calm');
  assert.equal(filmMood({ cold: true, finished: false }), 'worried');
  assert.equal(filmMood({ cold: true, finished: true }), 'happy');
});

test('music stays quiet, and quieter still under a voice', () => {
  assert.ok(MUSIC_LEVEL <= 0.08);
  assert.ok(MUSIC_DUCKED < MUSIC_LEVEL / 2);
});

test('without Web Audio, the music does nothing and never throws', () => {
  const music = new StoryMusic();
  music.start('calm'); music.setMood('happy'); music.duck(true); music.stop();
});
