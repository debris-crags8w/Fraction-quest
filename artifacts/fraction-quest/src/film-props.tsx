/* Lesson-film props: a later lesson's film shows the lesson's own object on the chapter's backdrop, and a
   finished chapter's ending shows that chapter's key prop with its stone piece. The art is small inline SVG drawn
   in code, chosen by data (LESSON_PROPS: lesson id -> prop; END_SCENES: chapter -> ending scene), so adding a
   lesson is one table row and, at most, one new drawing.

   Rules every prop keeps:
   - The object only: no numbers, no letters, no tick marks and no equal parts, so a picture never gives an answer away.
   - Light: a few dozen shapes, no filters, no images. All movement is CSS and sits under `fq-cine-move`, so the
     existing Reduce motion rules (system setting and the app setting) hold it still; the resting style of every
     moving part is its finished position, so the still picture is complete.
   - It lives in the band right of the speaker (x 38 to 86 percent, y 19 to 48 percent of the screen): clear of the
     speaker's face and of the caption, which sits along the bottom.
   The shared drawing pieces are film-art.tsx; the objects live in film-props-samples.tsx and the film-props-a to d batches, each with its own css file; story-cinema.tsx imports the styles. */

import React, { type CSSProperties, type ReactNode } from 'react';
import { StoryCharacter } from './characters';
import { CHAPTERS, CHAPTER_SCENES, type Panel, type StoryScene } from './story';
import { paletteFor, Ledge, StonePiece, type ChapterScene, type EndDef, type PropDef } from './film-art';
import { SAMPLE_ENDS, SAMPLE_LESSONS, SAMPLE_PROPS } from './film-props-samples';
import { ENDS_A, LESSONS_A, PROPS_A } from './film-props-a';
import { ENDS_B, LESSONS_B, PROPS_B } from './film-props-b';
import { ENDS_C, LESSONS_C, PROPS_C } from './film-props-c';
import { ENDS_D, LESSONS_D, PROPS_D } from './film-props-d';

export type PropId = string;

/** Every object (prop id -> drawing and label), and which object each lesson film shows (lesson id -> prop id). A lesson with no row keeps the plain backdrop. */
export const PROP_DEFS: Record<PropId, PropDef> = { ...SAMPLE_PROPS, ...PROPS_A, ...PROPS_B, ...PROPS_C, ...PROPS_D };
export const LESSON_PROPS: Record<string, PropId> = { ...SAMPLE_LESSONS, ...LESSONS_A, ...LESSONS_B, ...LESSONS_C, ...LESSONS_D };
export const END_SCENES: Partial<Record<number, EndDef>> = { ...SAMPLE_ENDS, ...ENDS_A, ...ENDS_B, ...ENDS_C, ...ENDS_D };
export const lessonPropFor = (lessonId: string | undefined): PropId | null => (lessonId && LESSON_PROPS[lessonId]) || null;

/** A lesson film's object, on the chapter's backdrop, in the band right of the speaker. `beat >= 1` is its small move. */
export function LessonProp({ prop, scene, beat }: { prop: PropId; scene: StoryScene; beat: number }) {
  const def = PROP_DEFS[prop]!;
  const { ledge, glow } = paletteFor(scene);
  return (
    <span className={`fq-fp fq-cine-move is-${prop} ${beat >= 1 ? 'is-on' : ''}`} data-testid="film-prop" data-prop={prop}
      style={{ '--fp-ledge': ledge, '--fp-glow': glow } as CSSProperties}>
      <svg viewBox="0 0 200 130" role="img" aria-label={def.label}>
        {def.ledge && <Ledge />}
        {def.art()}
      </svg>
    </span>
  );
}

/** The chapter's friend, small, peeking in above the speaker: that corner is clear of the letterbox bar, of the prop and of the caption, even a four-line one that reaches up to the middle of the screen. */
export const PROP_FRIEND = { style: { left: '14%', top: '17%' } as CSSProperties, size: 36 };

export const hasChapterEndPicture = (unit: number | undefined): boolean => !!END_SCENES[unit ?? 1];

/** A finished chapter's ending: its backdrop, the speaker, the chapter's key prop and its stone piece (found from the second line on). */
export function ChapterEndPicture({ unit, beat, speaker, backdrop }: { unit: number; beat: number; speaker?: Panel['speaker']; backdrop: ReactNode }) {
  const chapter = CHAPTERS[unit - 1] ?? CHAPTERS[0];
  const scene = CHAPTER_SCENES[unit] as ChapterScene;
  const picture = END_SCENES[unit]!;
  const { ledge, glow } = paletteFor(scene);
  const speaking = speaker ?? chapter.character;
  return (
    <>
      {picture.sky && <span className="fq-fp-sky" style={{ background: picture.sky }} />}
      {backdrop}
      <span className={`fq-fp fq-cine-move is-end is-${scene} ${beat >= 1 ? 'is-on is-found' : ''}`} data-testid="film-prop" data-prop={`end-${unit}`}
        style={{ '--fp-ledge': ledge, '--fp-glow': glow } as CSSProperties}>
        <svg viewBox="0 0 200 130" role="img" aria-label={picture.label}>{picture.art()}</svg>
      </span>
      <span key={speaking} className="fq-cine-actor fq-cine-set-speaker" style={{ left: '8%', top: '30%' }} data-testid="story-end-speaker">
        <StoryCharacter id={speaking} size={96} happy={beat >= 1} />
      </span>
      {speaking !== chapter.character && (
        <span className="fq-cine-actor" style={PROP_FRIEND.style} data-testid="story-end-friend"><StoryCharacter id={chapter.character} size={PROP_FRIEND.size} happy={beat >= 1} /></span>
      )}
    </>
  );
}
