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

  start(mood: MusicMood) {
    this.mood = mood;
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

  stop() {
    clearInterval(this.timer); this.timer = undefined;
    const { master, context } = this;
    this.master = null;
    if (!master || !context) return;
    try {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0.0001, context.currentTime, 0.2);
      setTimeout(() => master.disconnect(), 1200);
    } catch { /* already gone */ }
  }

  private level() { return this.ducked ? MUSIC_DUCKED : MUSIC_LEVEL; }

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
