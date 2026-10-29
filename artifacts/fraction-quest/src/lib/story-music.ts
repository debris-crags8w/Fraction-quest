/* Quiet music under the story films, made in the browser (no audio files to download): a soft chord pad and a slow
   arpeggio in one of three moods. Calm for most shots, worried when the colours go cold, happy when a piece is found
   or the film ends. It gets softer while a character speaks, and fades out when the film closes. */
import { audioContext } from './fun';

export type MusicMood = 'calm' | 'worried' | 'happy';
type Plan = { bpm: number; chords: number[][]; wave: OscillatorType };

/** Each mood: its tempo, four chords (MIDI notes, root first) played one a bar, and the arpeggio's tone. */
export const MUSIC_PLANS: Record<MusicMood, Plan> = {
  calm: { bpm: 72, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], wave: 'triangle' },      // C, Am, F, G
  worried: { bpm: 58, chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], wave: 'sine' },      // Am, F, Dm, E
  happy: { bpm: 96, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], wave: 'triangle' },    // C, G, Am, F
};
/** How loud the music is, and how loud while someone speaks (gain, out of 1). */
export const MUSIC_LEVEL = 0.06;
export const MUSIC_DUCKED = 0.02;

/** The film's Music button: normal, soft (a third as loud) or off. A grown-up's setting and the app's Sound button still
    decide whether the button is there at all. */
export type MusicVolume = 'normal' | 'soft' | 'off';
const SOFT_SHARE = 0.4;
/** Tapping the button goes normal, soft, off, and round again. */
export const nextMusicVolume = (volume: MusicVolume): MusicVolume => (volume === 'normal' ? 'soft' : volume === 'soft' ? 'off' : 'normal');
/** What the device remembers. "on" is what earlier versions saved for normal. */
export const MUSIC_SAVED: Record<MusicVolume, string> = { normal: 'on', soft: 'soft', off: 'off' };
/** Reads what was saved (null: nothing saved, or something that is not a choice). */
export function parseMusicVolume(saved: string | null | undefined): MusicVolume | null {
  return saved === 'on' || saved === 'normal' ? 'normal' : saved === 'soft' ? 'soft' : saved === 'off' ? 'off' : null;
}
/** The gain for a volume choice, and whether someone is speaking: nothing when off, softer under a voice. */
export function musicGain(volume: MusicVolume, ducked: boolean): number {
  if (volume === 'off') return 0;
  return (ducked ? MUSIC_DUCKED : MUSIC_LEVEL) * (volume === 'soft' ? SOFT_SHARE : 1);
}
/** Whether the music plays: sounds on, a grown-up allows it, the child has not turned it off, and the film is still
    going (it fades out when the film ends). */
export const musicPlays = ({ soundOn, allowed, volume, finished }: { soundOn: boolean; allowed: boolean; volume: MusicVolume; finished: boolean }) =>
  soundOn && allowed && volume !== 'off' && !finished;
/** How long the fade lasts when a film ends, and the quick one when the music is turned off or the child leaves (seconds). */
export const FADE_END_SECONDS = 2;
export const FADE_QUICK_SECONDS = 0.4;

export const noteFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** The arpeggio for one bar: up and back down the chord, an octave above the pad. */
export const arpeggio = (chord: number[]): number[] => [chord[0], chord[1], chord[2], chord[1]].map((note) => note + 12);

/** The mood for a film moment. */
export function filmMood({ cold, finished }: { cold: boolean; finished: boolean }): MusicMood {
  return finished ? 'happy' : cold ? 'worried' : 'calm';
}

/** Plays the music on the app's audio context. Every call is safe without Web Audio (it then does nothing). */
export class StoryMusic {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private mood: MusicMood = 'calm';
  private nextBeat = 0;   // when the next beat sounds (context time)
  private beat = 0;       // beats played so far
  private ducked = false;
  private volume: MusicVolume = 'normal';

  start(mood: MusicMood, volume: MusicVolume = 'normal') {
    this.mood = mood;
    this.volume = volume;
    if (this.timer) return;
    try {
      this.context = audioContext();
      if (!this.context) return;
      void this.context.resume?.().catch(() => undefined);
      this.master = this.context.createGain();
      this.master.gain.setValueAtTime(0.0001, this.context.currentTime);
      this.master.gain.exponentialRampToValueAtTime(this.level(), this.context.currentTime + 1.2);
      this.master.connect(this.context.destination);
      this.nextBeat = this.context.currentTime + 0.1;
      this.beat = 0;
      this.timer = setInterval(() => this.schedule(), 100);
      this.schedule();
    } catch { this.stop(); }
  }

  /** The new mood starts at the next bar. */
  setMood(mood: MusicMood) { this.mood = mood; }

  /** Softer while a character speaks. */
  duck(on: boolean) {
    this.ducked = on;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.level(), this.context.currentTime, 0.25);
  }

  /** Louder or softer, smoothly. */
  setVolume(volume: MusicVolume) {
    this.volume = volume;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.level(), this.context.currentTime, 0.25);
  }

  /** Fades out over `fade` seconds and ends: no more notes are scheduled, and the notes already sounding die away. */
  stop(fade = FADE_QUICK_SECONDS) {
    clearInterval(this.timer); this.timer = undefined;
    const { master, context } = this;
    this.master = null;
    if (!master || !context) return;
    try {
      master.gain.cancelScheduledValues(context.currentTime);
      // The gain is about 95% down after three time constants.
      master.gain.setTargetAtTime(0.0001, context.currentTime, fade / 3);
      setTimeout(() => master.disconnect(), fade * 1000 + 800);
    } catch { /* already gone */ }
  }

  private level() { return Math.max(musicGain(this.volume, this.ducked), 0.0001); }

  /** Schedules the beats due in the next 0.3 seconds. */
  private schedule() {
    const { context, master } = this;
    if (!context || !master) return;
    while (this.nextBeat < context.currentTime + 0.3) {
      const plan = MUSIC_PLANS[this.mood];
      const beatLength = 60 / plan.bpm;
      const chord = plan.chords[Math.floor(this.beat / 4) % plan.chords.length];
      if (this.beat % 4 === 0) chord.forEach((note) => this.tone(note, 'sine', this.nextBeat, beatLength * 4, 0.35));
      this.tone(arpeggio(chord)[this.beat % 4], plan.wave, this.nextBeat, beatLength * 0.9, 0.5);
      this.nextBeat += beatLength;
      this.beat += 1;
    }
  }

  private tone(midi: number, wave: OscillatorType, at: number, length: number, volume: number) {
    const { context, master } = this;
    if (!context || !master) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(noteFrequency(midi), at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.08, length / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
}
