/* The story cast's voices and the speed each one's clips are made at. Mirrors CAST_VOICES in
   artifacts/fraction-quest/src/lib/cast-voices.ts (cast-voices.test.ts checks they match). Heart reads at VOICE_SPEED. */
export const CAST_VOICE_SPEEDS = {
  bm_george: 0.85,
  am_onyx: 0.9,
  am_puck: 1.0,
  bf_emma: 0.7,
  am_echo: 0.9,
  af_nova: 1.05,
} as const;
export type CastVoice = keyof typeof CAST_VOICE_SPEEDS;
export const CAST_VOICES = Object.keys(CAST_VOICE_SPEEDS) as CastVoice[];
export const isCastVoice = (voice: string): voice is CastVoice => Object.hasOwn(CAST_VOICE_SPEEDS, voice);
