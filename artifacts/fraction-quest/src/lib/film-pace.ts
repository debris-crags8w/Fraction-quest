/* How long a film caption stays up when nobody reads it aloud (Voice off, or a voice that never came). The words type
   in quickly, a little ahead of where a voice would be; then the line holds long enough for a young reader to finish
   it: about 12 characters a second, plus a 2-second rest before the next shot. A tap on the picture moves on sooner. */

/** Characters typed per step, and the time between steps (about 31 characters a second). */
export const TYPE_STEP_CHARS = 2;
export const TYPE_STEP_MS = 64;
/** A young reader's pace when reading alone (characters a second, spaces included). */
export const READ_CPS = 12;
/** The rest after a line is read, before the next shot. */
export const READ_REST_MS = 2000;
/** After the voice has read a line, the short pause before the next shot. */
export const VOICED_PAUSE_MS = 1100;

/** How long a line of `length` characters takes to type. */
export const typingMs = (length: number) => Math.ceil(Math.max(0, length) / TYPE_STEP_CHARS) * TYPE_STEP_MS;

/** How long a line stays on screen in all, from its first letter to the next shot, when no voice reads it. */
export const readingMs = (length: number) => Math.round((Math.max(0, length) / READ_CPS) * 1000) + READ_REST_MS;

/** Once a line has finished typing, how long it holds before the next shot: the rest of its reading time, and never
    less than the 2-second rest. */
export const holdAfterTypingMs = (length: number) => Math.max(READ_REST_MS, readingMs(length) - typingMs(length));
