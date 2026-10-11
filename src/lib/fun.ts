// Small, device-only "fun" state: XP, daily goal, day streak and the sound setting.
// Kept separate from learning progress so it can never block or alter lesson gating.

const FUN_KEY = 'fraction-quest-fun-v1';
export const DAILY_GOAL = 10;

export type FunState = {
  xp: number;
  day: string;
  answeredToday: number;
  dayStreak: number;
  lastActiveDay: string | null;
  sound: boolean;
};

const today = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const fresh = (): FunState => ({ xp: 0, day: today(), answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: true });

export function loadFun(): FunState {
  try {
    const raw = window.localStorage.getItem(FUN_KEY);
    const saved = raw ? { ...fresh(), ...(JSON.parse(raw) as Partial<FunState>) } : fresh();
    return saved.day === today() ? saved : { ...saved, day: today(), answeredToday: 0 };
  } catch {
    return fresh();
  }
}

function saveFun(state: FunState): FunState {
  try {
    window.localStorage.setItem(FUN_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: fun state just lasts for this tab.
  }
  return state;
}

function isYesterday(day: string | null, now = new Date()): boolean {
  if (!day) return false;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return day === today(yesterday);
}

/** Record one correct answer: +10 XP, one step toward the daily goal, and keep the day streak alive. */
export function recordCorrect(state: FunState): FunState {
  const current = state.day === today() ? state : { ...state, day: today(), answeredToday: 0 };
  const dayStreak = current.lastActiveDay === today() ? current.dayStreak : isYesterday(current.lastActiveDay) ? current.dayStreak + 1 : 1;
  return saveFun({ ...current, xp: current.xp + 10, answeredToday: current.answeredToday + 1, dayStreak, lastActiveDay: today() });
}

export function setSound(state: FunState, sound: boolean): FunState {
  return saveFun({ ...state, sound });
}

export function resetFun(): FunState {
  return saveFun({ ...fresh(), sound: loadFun().sound });
}

let audio: AudioContext | null = null;
type Cue = 'correct' | 'retry' | 'star' | 'complete';
const CUES: Record<Cue, number[]> = {
  correct: [660, 880],
  retry: [300, 240],
  star: [990],
  complete: [523, 659, 784, 1047],
};

/** Short synth chimes. Silently does nothing if audio is unavailable or sound is off. */
export function playCue(cue: Cue, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    const start = audio.currentTime;
    CUES[cue].forEach((freq, index) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      const at = start + index * 0.09;
      osc.type = cue === 'retry' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gain).connect(audio!.destination);
      osc.start(at);
      osc.stop(at + 0.25);
    });
  } catch {
    // Audio is a bonus; ignore failures.
  }
}
