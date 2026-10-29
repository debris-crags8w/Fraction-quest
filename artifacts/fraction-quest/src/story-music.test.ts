import assert from 'node:assert/strict';
import test from 'node:test';
import { arpeggio, FADE_END_SECONDS, filmMood, MUSIC_DUCKED, MUSIC_LEVEL, MUSIC_PLANS, MUSIC_SAVED, musicGain, musicPlays, nextMusicVolume, noteFrequency, parseMusicVolume, StoryMusic, type MusicVolume } from './lib/story-music';

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

test('the Music button goes normal, soft, off, and round again', () => {
  assert.equal(nextMusicVolume('normal'), 'soft');
  assert.equal(nextMusicVolume('soft'), 'off');
  assert.equal(nextMusicVolume('off'), 'normal');
});

test('the saved choice round-trips, and an old "on" still means normal', () => {
  for (const volume of ['normal', 'soft', 'off'] as MusicVolume[]) assert.equal(parseMusicVolume(MUSIC_SAVED[volume]), volume);
  assert.equal(parseMusicVolume('on'), 'normal');
  assert.equal(parseMusicVolume(null), null);
  assert.equal(parseMusicVolume(undefined), null);
  assert.equal(parseMusicVolume('loud'), null);
});

test('soft is clearly quieter than normal, off is silent, and a voice makes each softer still', () => {
  assert.equal(musicGain('normal', false), MUSIC_LEVEL);
  assert.equal(musicGain('normal', true), MUSIC_DUCKED);
  assert.equal(musicGain('off', false), 0);
  assert.equal(musicGain('off', true), 0);
  assert.ok(musicGain('soft', false) <= musicGain('normal', false) / 2);
  assert.ok(musicGain('soft', false) > 0);
  assert.ok(musicGain('soft', true) < musicGain('soft', false));
  assert.ok(musicGain('soft', true) > 0);
});

test('the music plays only with sounds on, a grown-up allowing it, the child not turning it off, and the film still going', () => {
  const on = { soundOn: true, allowed: true, volume: 'normal' as MusicVolume, finished: false };
  assert.equal(musicPlays(on), true);
  assert.equal(musicPlays({ ...on, volume: 'soft' }), true);
  assert.equal(musicPlays({ ...on, volume: 'off' }), false);
  assert.equal(musicPlays({ ...on, soundOn: false }), false);   // the app's sound is off
  assert.equal(musicPlays({ ...on, allowed: false }), false);   // a grown-up turned the film music off
  assert.equal(musicPlays({ ...on, finished: true }), false);   // it fades out when the film ends, and stops
});

test('a film end fades the music over a couple of seconds, not a cut', () => {
  assert.ok(FADE_END_SECONDS >= 1 && FADE_END_SECONDS <= 4);
});

test('without Web Audio, a volume change and a fade do nothing and never throw', () => {
  const music = new StoryMusic();
  music.start('calm', 'soft'); music.setVolume('normal'); music.setVolume('off'); music.stop(FADE_END_SECONDS);
});
