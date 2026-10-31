/* Shared pieces for the lesson-film props and chapter-ending pictures (film-props.tsx and the film-props-*.tsx batches):
   colours, the chapter ledge palette, outline style, the ledge a prop stands on, the stone piece and the flag pole. */

import React, { type CSSProperties, type ReactNode } from 'react';
import type { PropTheme, StoryScene } from './story';

export const INK = '#2B2D42';
export const CREAM = '#FFF4D6';
export const GOLD = '#FFC800';


/** One lesson-film object: what a screen reader hears (the object, never the math), its drawing, and whether it stands on a ledge.
    A food prop takes the theme showing now (film-food.tsx), so its picture and its name are the food the line names. */
export type PropDef = { label: string | ((theme: PropTheme) => string); art: (theme: PropTheme) => ReactNode; ledge?: boolean };
/** One chapter ending: the chapter's key prop beside its stone piece. `sky` replaces the generic ending sky when it does not suit the chapter. */
export type EndDef = { label: string | ((theme: PropTheme) => string); art: (theme: PropTheme) => ReactNode; sky?: string };
/** A prop's or ending's name in a theme. */
export const labelIn = (label: PropDef['label'], theme: PropTheme) => (typeof label === 'function' ? label(theme) : label);

export type ChapterScene = Exclude<StoryScene, 'prologue' | 'chapter-end' | 'epilogue'>;

/** Each chapter's ledge (what the prop stands on) and the soft glow behind it, so it reads on that backdrop. */
export const PALETTE: Record<ChapterScene, { ledge: string; glow: string }> = {
  bakery: { ledge: '#C98B4E', glow: 'rgb(255 240 200 / .7)' }, pond: { ledge: '#6BBF8E', glow: 'rgb(255 255 255 / .6)' },
  hill: { ledge: '#5FB872', glow: 'rgb(255 244 214 / .7)' }, bridge: { ledge: '#6B4B3E', glow: 'rgb(255 190 140 / .5)' },
  tower: { ledge: '#B58BD9', glow: 'rgb(255 255 255 / .6)' }, honey: { ledge: '#E3AE3D', glow: 'rgb(255 244 200 / .8)' },
  workshop: { ledge: '#805E43', glow: 'rgb(255 220 150 / .5)' }, den: { ledge: '#805E43', glow: 'rgb(255 190 120 / .55)' },
  race: { ledge: '#5FB872', glow: 'rgb(255 255 255 / .6)' }, picnic: { ledge: '#E86A6A', glow: 'rgb(255 255 255 / .6)' },
  machine: { ledge: '#5C7380', glow: 'rgb(180 210 255 / .45)' }, stage: { ledge: '#805E43', glow: 'rgb(255 230 160 / .55)' },
  garden: { ledge: '#7A5230', glow: 'rgb(255 255 255 / .6)' }, lock: { ledge: '#3B3560', glow: 'rgb(170 150 255 / .5)' },
  festival: { ledge: '#4A3D78', glow: 'rgb(255 230 120 / .5)' },
};
export const paletteFor = (scene: StoryScene) => PALETTE[scene as ChapterScene] ?? PALETTE.hill;


export const outline = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
export const delay = (i: number): CSSProperties => ({ '--i': i } as CSSProperties);

/** The ground a prop stands on, with its contact shadow. */
export const Ledge = () => <>
  <ellipse cx="100" cy="121" rx="86" ry="5" fill="rgb(0 0 0 / .25)" />
  <rect className="fq-fp-ledge" x="12" y="106" width="176" height="14" rx="7" {...outline} />
</>;

/** One stone piece: a gold slab with a cream rim, dim until it is found. */
export const StonePiece = ({ x, y, w = 32, h = 40 }: { x: number; y: number; w?: number; h?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className="fq-fp-stone">
      <circle className="fq-fp-aura" cx={w / 2} cy={h / 2} r={w * 1.05} fill={GOLD} />
      <circle className="fq-fp-aura is-inner" cx={w / 2} cy={h / 2} r={w * .7} fill="#FFE066" />
      <rect width={w} height={h} rx="7" fill={GOLD} stroke={CREAM} strokeWidth="4" />
      <path d={`M${w * .22} ${h * .2} q${w * .2} -${h * .08} ${w * .4} 0`} stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
      <path d={`M${w * .6} ${h} l-${w * .12} -${h * .22} l${w * .16} -${h * .18}`} stroke="#9A6A00" strokeWidth="2" fill="none" strokeLinejoin="round" />
    </g>
  </g>
);

/** A flag on a pole: the pennant waves and, on the beat, climbs the pole. */
export const FlagPole = ({ x }: { x: number }) => <>
  <rect x={x} y="8" width="5" height="66" rx="2" fill="#C9915B" stroke={INK} strokeWidth="2.5" />
  <circle cx={x + 2.5} cy="8" r="5" fill={GOLD} stroke={INK} strokeWidth="2.5" />
  <g className="fq-fp-flag">
    <g className="fq-fp-wave">
      <path d={`M${x + 5} 14 h46 l-12 12 l12 12 h-46 Z`} fill="#FF6B6B" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx={x + 20} cy="26" r="5" fill={CREAM} />
    </g>
  </g>
</>;

