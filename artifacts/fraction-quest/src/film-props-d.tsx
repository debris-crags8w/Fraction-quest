/* Lesson-film props and chapter endings, batch D (chapters 12 to 15). Register each object under a prop id in PROPS, point a
   lesson id at it in LESSONS, and give each finished chapter an ending in ENDS (keyed by unit number). See film-art.tsx. */

import React from 'react';
import { CREAM, delay, FlagPole, GOLD, INK, Ledge, outline, StonePiece, type EndDef, type PropDef } from './film-art';

export const PROPS_D: Record<string, PropDef> = {};
export const LESSONS_D: Record<string, string> = {};
export const ENDS_D: Record<number, EndDef> = {};
