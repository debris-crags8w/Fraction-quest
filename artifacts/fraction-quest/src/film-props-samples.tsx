/* The first six lesson-film props and three chapter endings (the approved prototype). Later batches live in
   film-props-a.tsx to film-props-d.tsx; film-props.tsx merges them all. */

import React, { type ReactNode } from 'react';
import { CREAM, delay, FlagPole, GOLD, INK, Ledge, outline, StonePiece, type EndDef, type PropDef } from './film-art';

function FlagArt() {
  return <>
    <path d="M14 106 Q52 62 106 66 Q160 70 190 106 Z" fill="#7BD389" {...outline} />
    <path className="fq-fp-trail" d="M40 100 Q92 82 160 98" fill="none" stroke={CREAM} strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
    <FlagPole x={92} />
    <ellipse cx="52" cy="94" rx="9" ry="6" fill="#B7C3CF" {...outline} strokeWidth={2.5} /><ellipse cx="150" cy="97" rx="7" ry="5" fill="#9FB0C0" {...outline} strokeWidth={2.5} />
    <path d="M30 104 q5 -8 10 0 M164 100 q4 -7 9 0" stroke="#3E9954" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </>;
}

const COOKIES: [number, number][] = [[84, 98], [116, 98], [100, 80]];
const Cookie = ({ x, y, r = 14 }: { x: number; y: number; r?: number }) => <>
  <circle cx={x} cy={y} r={r} fill="#E0A458" stroke="#9A5B1C" strokeWidth="2.5" />
  <circle cx={x - r * .35} cy={y - r * .2} r="2.2" fill="#6B3A12" /><circle cx={x + r * .3} cy={y - r * .35} r="2.2" fill="#6B3A12" /><circle cx={x + r * .1} cy={y + r * .4} r="2.2" fill="#6B3A12" />
</>;
function JarArt() {
  return <>
    <path d="M66 38 h68 q8 0 8 9 v50 q0 9 -9 9 h-66 q-9 0 -9 -9 v-50 q0 -9 8 -9 Z" fill="#E4F6FF" fillOpacity=".92" {...outline} />
    {COOKIES.map(([x, y]) => <Cookie key={x + '-' + y} x={x} y={y} />)}
    <path d="M74 50 v38" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".75" />
    <rect x="62" y="24" width="76" height="16" rx="6" fill="#FF6B6B" {...outline} />
    <g className="fq-fp-cookie"><Cookie x={166} y={92} /></g>
    <circle cx="150" cy="102" r="2" fill="#9A5B1C" /><circle cx="156" cy="104" r="1.6" fill="#9A5B1C" />
  </>;
}

/** Bolt's note: rows of beeps (dots and dashes, never digits), a pencil, and a magnifier that slides over it. */
const BEEP_ROWS: ('d' | 'b')[][] = [['d', 'b', 'd', 'd', 'b', 'd'], ['b', 'd', 'b', 'd', 'd'], ['d', 'd', 'b', 'b', 'd', 'd']];
function NoteArt() {
  return <>
    <g transform="rotate(-4 90 62)">
      <rect x="30" y="12" width="124" height="92" rx="7" fill={CREAM} {...outline} />
      <path d="M140 12 l14 14 h-14 Z" fill="#E7D6A8" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="46" cy="28" r="5" fill="#7CF3FF" stroke={INK} strokeWidth="2" />
      <path d="M56 22 q6 6 0 12 M62 18 q10 10 0 20" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {BEEP_ROWS.map((row, r) => row.map((kind, c) => kind === 'd'
        ? <circle key={`${r}-${c}`} cx={46 + c * 17} cy={54 + r * 17} r="4.2" fill={INK} />
        : <rect key={`${r}-${c}`} x={41 + c * 17} y={51 + r * 17} width="12" height="6.5" rx="3.2" fill={INK} />))}
    </g>
    <g transform="rotate(-14 150 112)"><rect x="112" y="108" width="44" height="9" rx="2" fill={GOLD} stroke={INK} strokeWidth="2.5" /><path d="M112 108 l-10 4.5 l10 4.5 Z" fill="#F6C99A" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" /></g>
    <g className="fq-fp-lens">
      <circle cx="118" cy="58" r="23" fill="#7CF3FF" fillOpacity=".28" stroke={INK} strokeWidth="4" />
      <path d="M104 48 q6 -8 16 -8" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity=".85" />
      <path d="M135 75 L156 98" stroke="#805E43" strokeWidth="8" strokeLinecap="round" /><path d="M135 75 L156 98" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity=".5" />
    </g>
  </>;
}

/** A beaker's glass and its water (each its own height); the third one takes a drip. */
const BEAKERS: { x: number; top: number }[] = [{ x: 24, top: 58 }, { x: 80, top: 44 }, { x: 136, top: 70 }];
function BeakersArt() {
  return <>
    {BEAKERS.map(({ x, top }, i) => (
      <g key={x}>
        <path className={i === 2 ? 'fq-fp-water' : undefined} d={`M${x + 3} ${top} h34 v${92 - top} q0 11 -11 11 h-12 q-11 0 -11 -11 Z`} fill="#4CC9F0" />
        <path d={`M${x + 3} ${top} h34`} stroke="#B8EEFF" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${x} 22 v70 q0 14 14 14 h12 q14 0 14 -14 v-70`} fill="#E4F6FF" fillOpacity=".3" {...outline} />
        <path d={`M${x - 4} 22 h8`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d={`M${x + 8} ${top + 8} v${80 - top}`} stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
      </g>
    ))}
    <rect x="146" y="2" width="28" height="12" rx="4" fill="#A8B4C8" {...outline} strokeWidth={2.5} />
    <path className="fq-fp-drip" d="M160 18 q-6 9 0 14 q6 -5 0 -14 Z" fill="#4CC9F0" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
  </>;
}

/** A basket of loaves: the loaves overlap, so there is nothing to count. */
const LOAVES: { x: number; y: number; w: number }[] = [{ x: 56, y: 58, w: 25 }, { x: 100, y: 48, w: 28 }, { x: 144, y: 58, w: 25 }, { x: 78, y: 66, w: 22 }, { x: 124, y: 66, w: 22 }];
function LoavesArt() {
  return <>
    {[52, 94, 138].map((x, i) => <path key={x} className="fq-fp-steam" style={delay(i)} d={`M${x} 40 q-6 -8 0 -16 q6 -8 0 -16`} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".7" />)}
    {LOAVES.map(({ x, y, w }, i) => (
      <g key={i} className="fq-fp-loaf" style={delay(i)}>
        <path d={`M${x - w} ${y + 24} q0 -${24 + w * .45} ${w} -${24 + w * .45} q${w} 0 ${w} ${24 + w * .45} Z`} fill="#E9A64A" {...outline} />
        <path d={`M${x - w * .5} ${y - 4} l${w * .3} 9 M${x - w * .05} ${y - 8} l${w * .3} 10 M${x + w * .4} ${y - 4} l${w * .26} 9`} stroke="#B96F1D" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${x - w * .7} ${y + 6} q${w * .1} -${w * .35} ${w * .45} -${w * .5}`} stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".45" />
      </g>
    ))}
    <path d="M30 80 h140 l-9 32 q-2 6 -8 6 h-106 q-6 0 -8 -6 Z" fill="#C9915B" {...outline} />
    <path d="M38 92 h124 M42 103 h116" stroke="#9A6A3A" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M64 82 v34 M100 82 v36 M136 82 v34" stroke="#9A6A3A" strokeWidth="2.5" strokeLinecap="round" />
  </>;
}

/** Pebbles resting on a plain line; one rolls into place on the beat. */
const PEBBLES: { x: number; rx: number; ry: number; fill: string }[] = [
  { x: 36, rx: 15, ry: 11, fill: '#A9B7C6' }, { x: 72, rx: 11, ry: 9, fill: '#8FA3B8' }, { x: 108, rx: 17, ry: 13, fill: '#C9D3DD' }, { x: 142, rx: 12, ry: 9, fill: '#98AABD' },
];
function PebblesArt() {
  return <>
    <rect x="10" y="94" width="180" height="7" rx="3.5" fill={CREAM} {...outline} strokeWidth={2.5} />
    {PEBBLES.map((p, i) => <ellipse key={i} cx={p.x} cy={94 - p.ry + 2} rx={p.rx} ry={p.ry} fill={p.fill} {...outline} strokeWidth={2.5} />)}
    <path d="M30 78 q4 -5 11 -5 M100 72 q6 -6 14 -5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />
    <g className="fq-fp-pebble"><ellipse cx="176" cy="85" rx="11" ry="9" fill="#7E93AA" {...outline} strokeWidth={2.5} /><path d="M170 80 q3 -3 8 -2" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".6" /></g>
  </>;
}

function HillEndArt() {
  return <>
    <path d="M10 112 Q50 64 104 68 Q160 72 192 112 Z" fill="#7BD389" {...outline} />
    <path d="M30 108 Q80 90 170 106" fill="none" stroke={CREAM} strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
    <FlagPole x={52} />
    <StonePiece x={120} y={52} />
  </>;
}

function DenEndArt() {
  return <>
    <Ledge />
    <g transform="rotate(-8 70 60)">
      {[10, 70].map((x) => (
        <g key={x} transform={`translate(${x} 18)`}>
          <path className="fq-fp-flame" d="M24 62 q-10 12 0 26 q10 -14 0 -26 Z" fill="#FF9F1C" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M0 0 h24 v34 q0 6 8 8 l16 4 q10 3 10 12 v4 h-58 Z" fill="#4CC9F0" {...outline} />
          <path d="M0 52 h58 v10 h-58 Z" fill={INK} />
          <path d="M0 62 h58" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <rect x="-3" y="-6" width="30" height="13" rx="5" fill={GOLD} {...outline} strokeWidth={2.5} />
          <path d="M6 14 v22" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
        </g>
      ))}
    </g>
    <StonePiece x={140} y={62} />
  </>;
}

function StageEndArt() {
  return <>
    <Ledge />
    <g className="fq-fp-planks">
      {[0, 1, 2, 3].map((i) => <rect key={i} className="fq-fp-plank" style={delay(i)} x={10 + i * 33} y="62" width="29" height="30" rx="4" fill="#C9915B" {...outline} />)}
    </g>
    <g className="fq-fp-tape">
      <rect x="10" y="42" width="128" height="12" rx="3" fill={GOLD} {...outline} strokeWidth={2.5} />
      <path d="M22 42 v6 M34 42 v6 M46 42 v6 M58 42 v6 M70 42 v6 M82 42 v6 M94 42 v6 M106 42 v6 M118 42 v6 M130 42 v6" stroke={INK} strokeWidth="2" />
      <circle cx="138" cy="48" r="10" fill="#E8B000" {...outline} strokeWidth={2.5} /><circle cx="138" cy="48" r="3" fill={INK} />
    </g>
    <StonePiece x={152} y={64} w={28} h={38} />
  </>;
}


export const SAMPLE_PROPS: Record<string, PropDef> = {
  flag: { label: 'A flag on a little hill', art: FlagArt },
  jar: { label: 'A snack jar with cookies, and one cookie beside it', art: JarArt, ledge: true },
  note: { label: 'A beep note from Bolt, with a magnifying glass', art: NoteArt },
  beakers: { label: 'Three glass beakers with water in them', art: BeakersArt, ledge: true },
  loaves: { label: 'A basket of fresh loaves', art: LoavesArt },
  pebbles: { label: 'Pebbles resting on a line', art: PebblesArt },
};
export const SAMPLE_LESSONS: Record<string, string> = {
  'benchmarks-zero-one': 'flag',        // chapter 3 lesson 2: a marker on Tilly's hill path
  'subtract-like-denominators': 'jar',  // chapter 8 lesson 2: "how much is left in my snack jar?"
  'hundredths-decimals': 'note',        // chapter 8 lesson 6: Bolt's beep note, read with a magnifier
  'line-plot-totals': 'beakers',        // chapter 12 lesson 4: "is there enough in all the beakers?"
  'fractional-sharing': 'loaves',       // chapter 12 lesson 7: "the stage crew shares loaves at lunch"
  'plot-in-eighths': 'pebbles',         // chapter 9 lesson 5: "let's plot my pebbles"
};
export const SAMPLE_ENDS: Record<number, EndDef> = {
  3: { art: HillEndArt, label: 'A flag at the top of the hill, and the stone piece shining beside it', sky: 'linear-gradient(#FFB873, #FFD8A8 30%, #BDE6FF 62%)' },
  8: { art: DenEndArt, label: "Chomp's rocket boots, and the stone piece glowing on the den floor", sky: 'linear-gradient(#43305E, #A26754 72%, #523B34)' },
  12: { art: StageEndArt, label: 'A stage board cut into four pieces with a measuring tape, and the stone piece beside it', sky: 'linear-gradient(#392C5E, #6D4BD8 68%, #805E43 69%)' },
};
