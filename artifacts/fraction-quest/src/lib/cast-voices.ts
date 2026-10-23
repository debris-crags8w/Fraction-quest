/* The story cast's voices. Numi and everything outside the films (lessons, hints, Grown-ups) read in Heart; each
   friend reads their own film lines in their own Kokoro voice, at their own speed. A line a friend's voice doesn't
   have yet plays in Heart. The speed is baked into the pre-made clips, so changing one here means remaking that
   voice's clips (the voice backfill does it). api-server/src/lib/cast-voices.ts mirrors this table. */

export const HEART_VOICE = 'af_heart';
export const HEART_SPEED = 0.92;

export const CAST_VOICES = {
  hoot: { voice: 'bm_george', speed: 0.85 }, // the fix-it owl: older, calm, wise
  chomp: { voice: 'am_onyx', speed: 0.9 }, // the crocodile: big and rumbly
  pip: { voice: 'am_puck', speed: 1.0 }, // the frog: bouncy and playful
  tilly: { voice: 'bf_emma', speed: 0.7 }, // the turtle: slow and gentle
  bolt: { voice: 'am_echo', speed: 0.9 }, // the robot: even and steady
  bea: { voice: 'af_nova', speed: 1.05 }, // the honeybee: quick and bright
} as const satisfies Record<string, { voice: string; speed: number }>;

export type CastVoice = (typeof CAST_VOICES)[keyof typeof CAST_VOICES]['voice'];
export const CAST_VOICE_IDS: readonly CastVoice[] = Object.values(CAST_VOICES).map((entry) => entry.voice);
export const isCastVoice = (voice: string): voice is CastVoice => (CAST_VOICE_IDS as readonly string[]).includes(voice);

/** The voice a speaker's film lines play in (Heart for Numi, or anyone without a voice of their own). */
export const speakerVoice = (speaker: string): string => (CAST_VOICES as Record<string, { voice: string }>)[speaker]?.voice ?? HEART_VOICE;
/** The speed a voice's clips are made at. */
export const voiceSpeed = (voice: string): number =>
  Object.values(CAST_VOICES).find((entry) => entry.voice === voice)?.speed ?? HEART_SPEED;
