/* Lesson-film props and chapter endings, batch A (chapters 1 to 6). Register each object under a prop id in PROPS, point a
   lesson id at it in LESSONS, and give each finished chapter an ending in ENDS (keyed by unit number). See film-art.tsx.
   Every object is the thing in the lesson's film (a tray of cookies, a cake slice, a rope bridge plank...), never a maths
   picture: no text, no numbers, no ticks and no equal parts. */

import React from 'react';
import { CREAM, delay, GOLD, INK, Ledge, outline, StonePiece, type EndDef, type PropDef } from './film-art';
import { cakeLook, foodWord, SidePie, ToppingArt } from './film-food';
import type { PropTheme } from './story';

const RED = '#FF6B6B';
const PINK = '#FF9EB5';
const TEAL = '#4CC9F0';
const WOOD = '#C9915B';
const WOOD_D = '#9A6A3A';
const HONEY = '#FFB703';
const thin = { ...outline, strokeWidth: 2.5 } as const;
const SOFT = { fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.6 } as const;

/** A star outline centred on 0 0 (outer radius R, inner radius r). */
const star = (R: number, r: number, n = 5) => Array.from({ length: n * 2 }, (_, i) => {
  const a = -Math.PI / 2 + i * Math.PI / n;
  const d = i % 2 ? r : R;
  return `${i ? 'L' : 'M'}${(Math.cos(a) * d).toFixed(1)} ${(Math.sin(a) * d).toFixed(1)}`;
}).join('') + 'Z';

/** A four-point sparkle centred on 0 0. */
const SPARKLE = 'M0 -9 Q1.5 -1.5 9 0 Q1.5 1.5 0 9 Q-1.5 1.5 -9 0 Q-1.5 -1.5 0 -9Z';

const Cherry = ({ x, y, r = 7 }: { x: number; y: number; r?: number }) => <g className="fq-fp-a-cherry">
  <path d={`M${x} ${y - r} q${r * .5} -${r * 1.5} ${r * 1.4} -${r * 1.7}`} stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
  <circle cx={x} cy={y} r={r} fill="#E63946" {...thin} />
  <circle cx={x - r * .35} cy={y - r * .3} r={r * .22} fill="#fff" opacity=".75" />
</g>;

/* ---------- Chapter 1 · the bakery ---------- */

/** equal-parts: "Can pieces of different shapes still be fair?" A bakery tray of cookies in all kinds of shapes. */
function TrayArt() {
  return <>
    <rect x="4" y="56" width="14" height="16" rx="6" fill="#9AA8B6" {...thin} />
    <rect x="182" y="56" width="14" height="16" rx="6" fill="#9AA8B6" {...thin} />
    <rect x="12" y="22" width="176" height="88" rx="13" fill="#C9D3DD" {...outline} />
    <rect x="22" y="31" width="156" height="70" rx="8" fill="#EEF3F7" stroke="#9AA8B6" strokeWidth="2.5" />
    <g transform="translate(46 58) rotate(-8)"><g className="fq-fp-a-pop" style={delay(0)}>
      <path d={star(21, 10.5)} fill="#E9A64A" {...thin} />
      <circle cx="-3" cy="-3" r="2.2" fill="#6B3A12" /><circle cx="4" cy="3" r="2.2" fill="#6B3A12" />
    </g></g>
    <g transform="translate(88 56)"><g className="fq-fp-a-pop" style={delay(1)}>
      <path d="M0 18 C-24 0 -18 -20 -8 -20 C-3 -20 0 -16 0 -13 C0 -16 3 -20 8 -20 C18 -20 24 0 0 18 Z" fill={PINK} {...thin} />
      <path d="M-11 -9 q3 -5 8 -4" {...SOFT} />
    </g></g>
    <g transform="translate(131 60)"><g className="fq-fp-a-pop" style={delay(2)}>
      <circle r="19" fill="#F2C879" {...thin} />
      <circle cx="-7" cy="-5" r="2.4" fill="#E63946" /><circle cx="6" cy="-8" r="2.4" fill="#4CC9F0" /><circle cx="8" cy="4" r="2.4" fill="#7B6CF6" /><circle cx="-3" cy="8" r="2.4" fill="#2FBF71" />
    </g></g>
    <g transform="translate(168 62) rotate(14)"><g className="fq-fp-a-pop" style={delay(3)}>
      <rect x="-14" y="-15" width="28" height="30" rx="7" fill="#F6D58E" {...thin} />
      <path d="M-8 -6 h16 M-8 3 h16" stroke="#C98B4E" strokeWidth="2.5" strokeLinecap="round" />
    </g></g>
    <g transform="translate(104 86)"><g className="fq-fp-a-pop" style={delay(4)}>
      <path d="M0 -14 L17 12 L-17 12 Z" fill="#B9E4A3" {...thin} />
      <circle cx="0" cy="3" r="3" fill="#2FBF71" />
    </g></g>
  </>;
}

/** unit-fractions: "I'll take just one slice." One slice of layer cake on a plate, with a cherry. */
function SliceArt() {
  return <>
    <ellipse cx="100" cy="102" rx="76" ry="13" fill="#fff" {...outline} />
    <ellipse cx="100" cy="102" rx="56" ry="7.5" fill="#E4ECF3" />
    <path d="M48 98 L152 98 L152 86 L79.2 86 Z" fill="#F2C879" />
    <path d="M79.2 86 L152 86 L152 80 L94.8 80 Z" fill="#E85D75" />
    <path d="M94.8 80 L152 80 L152 72 L115.5 72 Z" fill="#F2C879" />
    <path d="M115.5 72 L152 72 L152 66 L131.1 66 Z" fill={CREAM} />
    <path d="M131.1 66 L152 66 L152 58 Z" fill="#F2C879" />
    <path d="M48 98 L152 58" stroke={PINK} strokeWidth="6" strokeLinecap="round" />
    <path d="M48 98 L152 98 L152 58 Z" fill="none" {...outline} />
    <path d="M60 90 L98 76" {...SOFT} opacity=".4" />
    <Cherry x={141} y={50} />
    <circle cx="26" cy="104" r="2.4" fill="#C98B4E" /><circle cx="33" cy="100" r="1.8" fill="#C98B4E" /><circle cx="170" cy="105" r="2.2" fill="#C98B4E" />
  </>;
}

/** fraction-of-area: "The round cake is cut into slices... the coloured ones get frosting." A plain round sponge and a piping bag.
    In a theme it is that theme's cake (its colours and topping), or a pie when the cake word is one. */
const PipingBag = () => <g transform="translate(112 36)"><g className="fq-fp-a-bag"><g transform="rotate(55)">
  <path d="M-5 -10 L5 -10 L19 -42 L-19 -42 Z" fill={TEAL} {...thin} />
  <path d="M-19 -42 h38 l-7 -8 h-24 Z" fill="#37B4DB" {...thin} />
  <path d="M-5 -10 L5 -10 L3 0 L-3 0 Z" fill={GOLD} {...thin} strokeWidth={2} />
  <path d="M-6 -36 l5 22" {...SOFT} strokeWidth={3.5} />
</g></g></g>;
function PipingArt(theme: PropTheme = 'everyday') {
  const look = cakeLook(theme);
  if (look.pie) return <>
    <ellipse cx="92" cy="108" rx="70" ry="9" fill="#fff" {...outline} />
    <SidePie cx={92} cy={76} s={1.13} filling={look.frosting} topping={look.topping} toppingFill={look.toppingFill} />
    <PipingBag />
    <circle cx="164" cy="104" r="2.4" fill="#C98B4E" /><circle cx="172" cy="100" r="1.8" fill="#C98B4E" />
  </>;
  const sponge = look.plain ? '#F2C879' : look.sponge, top = look.plain ? '#FFE3A6' : look.frosting;
  return <>
    <ellipse cx="92" cy="108" rx="70" ry="9" fill="#fff" {...outline} />
    <path d="M40 62 v34 q0 12 52 12 q52 0 52 -12 v-34 Z" fill={sponge} {...outline} />
    <path d="M44 84 q48 12 96 0" stroke={look.plain ? '#C98B4E' : look.edge} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <ellipse cx="92" cy="62" rx="52" ry="13" fill={top} {...outline} />
    {look.plain ? <>
      <ellipse cx="92" cy="58" rx="20" ry="8" fill={PINK} {...thin} />
      <ellipse cx="92" cy="50" rx="14" ry="7" fill={PINK} {...thin} />
      <ellipse cx="92" cy="43" rx="8" ry="6" fill={PINK} {...thin} />
      <path d="M84 54 q4 -4 10 -3" {...SOFT} strokeWidth={2.5} />
    </> : <ToppingArt kind={look.topping} x={92} y={54} r={9} fill={look.toppingFill} />}
    <PipingBag />
    <circle cx="164" cy="104" r="2.4" fill="#C98B4E" /><circle cx="172" cy="100" r="1.8" fill="#C98B4E" />
  </>;
}
const pipingLabel = (theme: PropTheme) => {
  const look = cakeLook(theme);
  if (look.plain) return 'A round sponge cake and a piping bag of pink frosting';
  return `A round ${foodWord(theme, 'cake')} and a piping bag of ${look.pie ? 'cream' : 'frosting'}`;
};

/** Chapter 1 ending: the festival cake (the theme's cake, or its pie), a stone piece in the crumbs, and Chomp's big muddy footprints. */
function BakeryEndArt(theme: PropTheme = 'everyday') {
  const look = cakeLook(theme);
  const lower = look.plain ? PINK : look.sponge, drip = look.plain ? '#fff' : look.frosting;
  const upper = look.plain ? CREAM : look.frosting, upperDrip = look.plain ? PINK : look.edge;
  return <>
    <Ledge />
    {look.pie ? <SidePie cx={64} cy={84} s={.95} filling={look.frosting} topping={look.topping} toppingFill={look.toppingFill} /> : <>
      <rect x="22" y="76" width="84" height="30" rx="9" fill={lower} {...outline} />
      <path d="M22 84 q4 12 9 0 q3 8 7 0 q6 14 11 0 q3 6 8 0 q5 10 10 0 q4 9 8 0 q4 11 8 0" fill="none" stroke={drip} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
      <rect x="40" y="52" width="48" height="24" rx="8" fill={upper} {...outline} />
      <path d="M42 60 q5 9 10 0 q4 6 8 0 q6 12 12 0 q4 8 9 0" fill="none" stroke={upperDrip} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="96" r="2.6" fill="#fff" /><circle cx="52" cy="98" r="2.6" fill="#fff" /><circle cx="74" cy="95" r="2.6" fill="#fff" /><circle cx="94" cy="98" r="2.6" fill="#fff" />
      {look.plain ? <Cherry x={64} y={44} r={8} /> : <ToppingArt kind={look.topping} x={64} y={44} r={8} fill={look.toppingFill} />}
    </>}
    <g fill="#7A4A22"><ellipse cx="116" cy="114" rx="5" ry="3.4" transform="rotate(-18 116 114)" /><circle cx="122" cy="110" r="1.6" /><circle cx="125" cy="113" r="1.6" /><circle cx="124" cy="117" r="1.6" /></g>
    <circle cx="138" cy="104" r="2.4" fill="#E9A64A" /><circle cx="148" cy="106" r="1.8" fill="#E9A64A" /><circle cx="160" cy="104" r="2.4" fill="#E9A64A" /><circle cx="170" cy="105" r="1.8" fill="#E9A64A" />
    <StonePiece x={140} y={56} />
  </>;
}

/* ---------- Chapter 2 · Pip's pond party ---------- */

/** Lines from the middle of a cake's (or pie's) top to its rim: the cuts of `n` equal pieces, as one path. */
const topCuts = (cx: number, cy: number, rx: number, ry: number, n: number) => Array.from({ length: n }, (_, k) => {
  const a = -Math.PI / 2 + (k * 2 * Math.PI) / n;
  return `M${cx} ${cy} L${(cx + rx * Math.cos(a)).toFixed(1)} ${(cy + ry * Math.sin(a)).toFixed(1)}`;
}).join(' ');

/** compare-same-numerator: "Two same-size cakes, cut two ways." Two identical round cakes, one with strawberries and one
    with blueberries, one cut into fourths and one into eighths. In a theme, two of that theme's cakes (or pies) with its topping. */
function TwoCakesArt(theme: PropTheme = 'everyday') {
  const look = cakeLook(theme);
  const cut = { stroke: INK, strokeWidth: 2, strokeLinecap: 'round', fill: 'none' } as const;
  const cake = (cx: number, berry: string, dots: [number, number][], i: number, pieces: number) => (
    <g key={cx} className="fq-fp-a-hop" style={delay(i)}>
      <ellipse cx={cx} cy="104" rx="42" ry="7" fill="#fff" {...thin} />
      {look.pie ? <>
        <SidePie cx={cx} cy={78} s={.74} filling={look.frosting} topping={look.topping} toppingFill={look.toppingFill} />
        <path className="fq-fp-a-cuts" d={topCuts(cx, 78, 34, 11.8, pieces)} {...cut} />
      </> : <>
        <path d={`M${cx - 34} 66 v28 q0 9 34 9 q34 0 34 -9 v-28 Z`} fill={look.plain ? '#F2C879' : look.sponge} {...outline} />
        <path d={`M${cx - 30} 82 q30 8 60 0`} stroke={look.plain ? '#C98B4E' : look.edge} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <ellipse cx={cx} cy="66" rx="34" ry="10" fill={look.plain ? CREAM : look.frosting} {...outline} />
        <path className="fq-fp-a-cuts" d={topCuts(cx, 66, 34, 10, pieces)} {...cut} />
        {look.plain
          ? dots.map(([dx, dy]) => <circle key={`${dx}-${dy}`} cx={cx + dx} cy={66 + dy} r="5" fill={berry} {...thin} strokeWidth={2} />)
          : <ToppingArt kind={look.topping} x={cx} y={62} r={7} fill={look.toppingFill} />}
      </>}
    </g>
  );
  return <>
    {cake(52, '#E63946', [[-14, -2], [0, -5], [14, -1], [-4, 3]], 0, 4)}
    {cake(148, '#5B6CFF', [[-13, 0], [2, -4], [14, 1], [4, 4]], 1, 8)}
  </>;
}
const twoCakesLabel = (theme: PropTheme) => cakeLook(theme).plain
  ? 'Two round cakes of the same size, one with strawberries and one with blueberries, one cut into fourths and one into eighths'
  : `Two round ${foodWord(theme, 'cakes')} of the same size, one cut into fourths and one into eighths`;

/** Chapter 2 ending: Pip's snack bowl with two snack bars in it, and the stone piece beside it. */
function PondEndArt() {
  return <>
    <Ledge />
    <ellipse cx="68" cy="68" rx="52" ry="7" fill="#C46A1E" />
    <g transform="translate(46 70) rotate(-17)"><g className="fq-fp-a-lift">
      <rect x="-10" y="-58" width="20" height="62" rx="5" fill="#9B5DE5" {...outline} />
      <rect x="-10" y="-36" width="20" height="12" fill={CREAM} stroke={INK} strokeWidth="2.5" />
      <path d="M-10 -58 l-7 -4 v14 l7 -4" fill="#9B5DE5" {...thin} />
    </g></g>
    <g transform="translate(88 70) rotate(11)">
      <rect x="-10" y="-54" width="20" height="58" rx="5" fill={RED} {...outline} />
      <rect x="-10" y="-30" width="20" height="12" fill={GOLD} stroke={INK} strokeWidth="2.5" />
    </g>
    <path d="M14 68 h108 q0 30 -24 38 h-60 q-24 -8 -24 -38 Z" fill="#FFB347" {...outline} />
    <path d="M22 80 q10 10 14 22" {...SOFT} />
    <path d="M16 72 h104" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    <StonePiece x={142} y={62} />
  </>;
}

/* ---------- Chapter 3 · Tilly's hill ---------- */

/** fraction-magnitude: "I climb in little steps." Tilly's climbing kit at a rest stop: backpack, walking stick, water flask and an apple. */
function HikeArt() {
  return <>
    <rect x="32" y="12" width="68" height="17" rx="8.5" fill="#7B6CF6" {...outline} />
    <path d="M52 12 v17 M80 12 v17" stroke={INK} strokeWidth="2.5" />
    <path d="M36 44 q0 -16 30 -16 q30 0 30 16 v56 q0 6 -6 6 h-48 q-6 0 -6 -6 Z" fill={RED} {...outline} />
    <path d="M44 32 v30 M88 32 v30" stroke="#8A3B3B" strokeWidth="4" strokeLinecap="round" />
    <rect x="46" y="64" width="40" height="30" rx="8" fill="#C94F4F" {...thin} />
    <path d="M46 72 h40" stroke={INK} strokeWidth="2.5" />
    <rect x="62" y="70" width="8" height="8" rx="2" fill={GOLD} {...thin} strokeWidth={2} />
    <path d="M41 46 q3 -10 12 -13" {...SOFT} />
    <circle cx="128" cy="89" r="16" fill={TEAL} {...outline} />
    <rect x="121" y="68" width="14" height="9" rx="3" fill={GOLD} {...thin} />
    <path d="M124 72 q-12 -4 -10 12" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M120 85 q2 -6 7 -7" {...SOFT} />
    <g className="fq-fp-a-stick">
      <path d="M154 106 L174 26" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d="M154 106 L174 26" stroke={WOOD_D} strokeWidth="6" strokeLinecap="round" />
      <path d="M160 82 L165 62" stroke={RED} strokeWidth="6" strokeLinecap="butt" />
      <circle cx="174.5" cy="24" r="6" fill={GOLD} {...thin} />
    </g>
    <circle cx="18" cy="95" r="11" fill="#E63946" {...thin} />
    <path d="M18 85 q1 -6 6 -8 M18 85 q-5 -6 -10 -3 q4 6 10 3" stroke={INK} strokeWidth="2" fill="#2FBF71" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="14" cy="92" r="2.2" fill="#fff" opacity=".7" />
  </>;
}

/* ---------- Chapter 4 · the broken bridge ---------- */

/** number-line-points: "I dropped my snack on the bridge." A bridge plank between rope rails, and the dropped apple bouncing to rest on it. */
function PlankApple() {
  return <>
    <path d="M6 34 Q100 62 194 34" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
    <path d="M6 34 Q100 62 194 34" fill="none" stroke="#E3C79A" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M36 41 V82 M164 41 V82" stroke={INK} strokeWidth="7" strokeLinecap="round" />
    <path d="M36 41 V82 M164 41 V82" stroke="#E3C79A" strokeWidth="3" strokeLinecap="round" />
    <rect x="16" y="78" width="168" height="22" rx="5" fill={WOOD} {...outline} />
    <path d="M26 86 h46 M92 92 h60 M110 85 h40" stroke={WOOD_D} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="26" cy="89" r="2.6" fill={INK} /><circle cx="174" cy="89" r="2.6" fill={INK} />
    <path d="M24 100 v12 M176 100 v12" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="116" cy="79" rx="16" ry="3" fill="rgb(0 0 0 / .25)" />
    <g className="fq-fp-a-apple">
      <path d="M116 51 q1 -7 7 -10" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M116 51 q-6 -8 -13 -5 q5 8 13 5" fill="#2FBF71" {...thin} strokeWidth={2} />
      <circle cx="116" cy="64" r="15" fill="#E63946" {...outline} />
      <path d="M106 58 q3 -6 9 -7" {...SOFT} />
    </g>
  </>;
}

/** number-line-beyond-one: "My house is past the end of the bridge." Pip's cosy house on the far bank, window glowing, smoke from the chimney. */
function HouseArt() {
  return <>
    <path d="M22 106 q4 -10 8 0 M166 106 q4 -9 8 0 M176 106 q3 -8 7 0" stroke="#3E9954" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <g fill="#fff" opacity=".85">
      <circle className="fq-fp-a-puff" style={delay(0)} cx="128" cy="18" r="5" />
      <circle className="fq-fp-a-puff" style={delay(1)} cx="134" cy="9" r="4" />
      <circle className="fq-fp-a-puff" style={delay(2)} cx="127" cy="2" r="3" />
    </g>
    <rect x="120" y="24" width="14" height="26" rx="3" fill="#B96F1D" {...thin} />
    <rect x="56" y="54" width="88" height="52" rx="7" fill="#FFE8B0" {...outline} />
    <path d="M46 60 Q100 4 154 60 Z" fill="#2FBF71" {...outline} />
    <path d="M62 52 q18 -22 38 -26" {...SOFT} strokeWidth={3} />
    <circle className="fq-fp-a-glow" cx="84" cy="78" r="10" fill="#FFE066" {...thin} />
    <path d="M110 106 v-20 q10 -14 20 0 v20 Z" fill={WOOD_D} {...thin} />
    <circle cx="125" cy="94" r="1.8" fill={GOLD} />
    <path d="M30 108 V62" stroke={INK} strokeWidth="6" strokeLinecap="round" />
    <path d="M30 108 V62" stroke={WOOD} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="30" cy="54" r="16" fill={GOLD} opacity=".3" />
    <rect className="fq-fp-a-glow" x="22" y="44" width="16" height="18" rx="4" fill="#FFE066" {...thin} />
  </>;
}

/** ruler-measurement: "This reed could patch the bridge." A broken bridge plank, and a blue reed sliding in to patch it. */
function ReedArt() {
  return <>
    <path d="M10 80 H88 L80 88 L89 95 L82 104 H10 Z" fill={WOOD} {...outline} />
    <path d="M104 80 H190 V104 H98 L106 95 L97 88 Z" fill={WOOD} {...outline} />
    <path d="M20 90 h38 M120 87 h48 M132 96 h40" stroke={WOOD_D} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="20" cy="95" r="2.6" fill={INK} /><circle cx="180" cy="95" r="2.6" fill={INK} />
    <g transform="rotate(-9 100 50)"><g className="fq-fp-a-reed">
      <path d="M22 50 H178" stroke={INK} strokeWidth="14" strokeLinecap="round" />
      <path d="M22 50 H178" stroke={TEAL} strokeWidth="8" strokeLinecap="round" />
      <path d="M26 47 H120" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
      <rect x="66" y="42" width="5" height="16" rx="2" fill="#2E9FC8" {...thin} strokeWidth={1.8} />
      <rect x="132" y="42" width="5" height="16" rx="2" fill="#2E9FC8" {...thin} strokeWidth={1.8} />
      <path d="M134 44 q14 -26 34 -26 q-4 20 -34 26 Z" fill="#2FBF71" {...thin} />
    </g></g>
  </>;
}

/** build-line-plots: "I found shiny pebbles by the water." A leather pouch tipped over, shiny pebbles spilling out of it, with twinkles. */
const PEBBLE_PILE: { x: number; y: number; rx: number; ry: number; fill: string }[] = [
  { x: 86, y: 97, rx: 10, ry: 8, fill: '#6EC6C6' }, { x: 108, y: 98, rx: 12, ry: 9, fill: '#C79BF2' }, { x: 132, y: 98, rx: 10, ry: 8, fill: PINK },
  { x: 152, y: 96, rx: 13, ry: 10, fill: '#8FA3B8' }, { x: 98, y: 85, rx: 9, ry: 7, fill: '#FFD166' }, { x: 122, y: 86, rx: 9, ry: 7, fill: '#7CF3FF' },
];
function PouchArt() {
  return <>
    <path d="M18 78 Q16 106 46 106 Q72 106 74 92 L74 72 Q72 58 46 56 Q20 56 18 78 Z" fill="#B07A45" {...outline} />
    <path d="M26 70 q4 -8 14 -9" {...SOFT} />
    <ellipse cx="75" cy="82" rx="8" ry="15" fill="#6B4B3E" {...outline} />
    <path d="M66 62 q8 20 0 42" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
    {PEBBLE_PILE.map((p) => <g key={p.x}>
      <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={p.fill} {...thin} />
      <path d={`M${p.x - p.rx * .5} ${p.y - p.ry * .3} q${p.rx * .1} -${p.ry * .5} ${p.rx * .6} -${p.ry * .5}`} {...SOFT} strokeWidth={2.5} />
    </g>)}
    <g className="fq-fp-a-roll"><ellipse cx="177" cy="98" rx="11" ry="8" fill="#F4A261" {...thin} /><path d="M171 95 q3 -3 8 -2" {...SOFT} strokeWidth={2.5} /></g>
    <g fill="#fff" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round">
      <g transform="translate(112 62)"><path className="fq-fp-a-spark" style={delay(0)} d={SPARKLE} /></g>
      <g transform="translate(160 70)"><path className="fq-fp-a-spark" style={delay(1)} d={SPARKLE} /></g>
      <g transform="translate(60 38)"><path className="fq-fp-a-spark" style={delay(2)} d={SPARKLE} /></g>
    </g>
  </>;
}

/** Chapter 4 ending: the rope bridge with its planks hanging loose and gaps in it, and the stone piece on the far cliff. */
const BRIDGE_PLANKS = [0.05, 0.17, 0.3, 0.74, 0.88];
const ropeA = (t: number): [number, number] => [38 + 110 * t, 56 + 18 * 4 * t * (1 - t)];
const ropeB = (t: number): [number, number] => [38 + 110 * t, 78 + 22 * 4 * t * (1 - t)];
function BridgeEndArt() {
  const plank = (t: number, i: number) => {
    const [ax, ay] = ropeA(t), [bx, by] = ropeB(t);
    const w = 8 + (i % 3) * 1.6;
    return <g key={t}>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={INK} strokeWidth={w + 4} strokeLinecap="round" />
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={WOOD} strokeWidth={w} strokeLinecap="round" />
    </g>;
  };
  const [hx, hy] = ropeB(0.52);
  return <>
    <path d="M0 58 H36 V108 H0 Z" fill="#8A6A57" {...outline} />
    <path d="M148 62 H200 V108 H144 Z" fill="#8A6A57" {...outline} />
    <path d="M38 56 Q93 74 148 56" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
    <path d="M38 56 Q93 74 148 56" fill="none" stroke="#E3C79A" strokeWidth="4" strokeLinecap="round" />
    <path d="M38 78 Q93 100 148 78" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
    <path d="M38 78 Q93 100 148 78" fill="none" stroke="#E3C79A" strokeWidth="4" strokeLinecap="round" />
    {BRIDGE_PLANKS.map(plank)}
    <g transform={`translate(${hx} ${hy})`}><g className="fq-fp-a-swing">
      <line x1="0" y1="0" x2="0" y2="26" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <line x1="0" y1="0" x2="0" y2="26" stroke={WOOD} strokeWidth="8" strokeLinecap="round" />
    </g></g>
    <rect x="30" y="38" width="8" height="24" rx="3" fill={WOOD_D} {...thin} />
    <rect x="148" y="42" width="8" height="24" rx="3" fill={WOOD_D} {...thin} />
    <StonePiece x={158} y={22} />
  </>;
}

/* ---------- Chapter 5 · Chomp's tower of treats ---------- */

/** order-fractions: "Help me stack!" A crate of Chomp's treats waiting to be stacked: lollipop, cookie, cupcake and a donut. */
function CrateArt() {
  return <>
    <path d="M40 72 V40" stroke={INK} strokeWidth="6" strokeLinecap="round" />
    <path d="M40 72 V40" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <g className="fq-fp-a-pop" style={delay(0)}><circle cx="40" cy="32" r="15" fill={PINK} {...outline} /><path d="M40 32 m-9 0 a9 9 0 1 1 9 9 a5 5 0 1 1 -5 -5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></g>
    <g className="fq-fp-a-pop" style={delay(1)}><circle cx="72" cy="58" r="15" fill="#E0A458" {...outline} /><circle cx="67" cy="53" r="2.4" fill="#6B3A12" /><circle cx="77" cy="58" r="2.4" fill="#6B3A12" /><circle cx="70" cy="64" r="2.4" fill="#6B3A12" /></g>
    <g className="fq-fp-a-pop" style={delay(2)}>
      <ellipse cx="106" cy="60" rx="17" ry="8" fill="#FFB347" {...thin} />
      <ellipse cx="106" cy="50" rx="13" ry="7.5" fill={PINK} {...thin} />
      <ellipse cx="106" cy="42" rx="8" ry="6" fill={PINK} {...thin} />
      <Cherry x={106} y={34} r={5} />
    </g>
    <g className="fq-fp-a-pop" style={delay(3)}><circle cx="148" cy="56" r="19" fill="#E9A64A" {...outline} /><circle cx="148" cy="56" r="16" fill="#8B5A3C" /><circle cx="148" cy="56" r="6" fill="#EEF3F7" {...thin} /><path d="M138 48 l4 -2 M156 46 l3 3 M156 64 l3 -2 M138 63 l3 2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></g>
    <rect x="20" y="68" width="160" height="38" rx="4" fill={WOOD} {...outline} />
    <path d="M20 86 H180" stroke={INK} strokeWidth="3" />
    <path d="M38 78 h26 M110 94 h50 M120 77 h40" stroke={WOOD_D} strokeWidth="2.5" strokeLinecap="round" />
    <rect x="20" y="68" width="12" height="38" rx="3" fill={WOOD_D} {...thin} /><rect x="168" y="68" width="12" height="38" rx="3" fill={WOOD_D} {...thin} />
  </>;
}

/** Chapter 5 ending: the steady tower of treats, the biggest at the bottom, and the stone piece beside it. */
function TowerEndArt() {
  return <>
    <Ledge />
    <g className="fq-fp-a-settle">
      <rect x="22" y="84" width="88" height="22" rx="8" fill="#8B5A3C" {...outline} />
      <rect x="22" y="92" width="88" height="6" fill={CREAM} stroke={INK} strokeWidth="2.5" />
      <rect x="30" y="66" width="72" height="18" rx="9" fill="#F2C879" {...outline} />
      <circle cx="48" cy="66" r="5" fill="#E63946" {...thin} strokeWidth={2} /><circle cx="66" cy="64" r="5" fill="#7B6CF6" {...thin} strokeWidth={2} /><circle cx="84" cy="66" r="5" fill="#E63946" {...thin} strokeWidth={2} />
      <rect x="38" y="52" width="56" height="14" rx="7" fill={PINK} {...outline} />
      <path d="M48 58 h5 M62 56 h5 M76 59 h5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="46" y="40" width="40" height="12" rx="6" fill="#E0A458" {...outline} />
      <circle cx="56" cy="46" r="2" fill="#6B3A12" /><circle cx="68" cy="45" r="2" fill="#6B3A12" /><circle cx="77" cy="47" r="2" fill="#6B3A12" />
      <path d="M52 40 h28 l-4 -13 h-20 Z" fill={TEAL} {...thin} />
      <ellipse cx="66" cy="26" rx="14" ry="7" fill={CREAM} {...thin} />
      <ellipse cx="66" cy="19" rx="8" ry="5.5" fill={CREAM} {...thin} />
      <Cherry x={66} y={11} r={5} />
    </g>
    <StonePiece x={134} y={62} />
  </>;
}

/* ---------- Chapter 6 · Bea's honey jars ---------- */

/** equivalent-number-line: "My honey shelf... two marks share one spot!" The honey shelf: two jars of different shapes with the honey at the same height. */
function ShelfArt() {
  return <>
    <path d="M30 106 V120 L48 106 Z M152 106 V120 L170 106 Z" fill={WOOD_D} {...thin} />
    <rect x="10" y="92" width="180" height="14" rx="4" fill={WOOD} {...outline} />
    <rect x="30" y="30" width="30" height="12" rx="4" fill={RED} {...thin} />
    <path d="M34 72 h22 v14 q0 6 -6 6 h-10 q-6 0 -6 -6 Z" fill={HONEY} />
    <path d="M32 44 h26 q6 0 6 8 v34 q0 6 -8 6 h-22 q-8 0 -8 -6 v-34 q0 -8 6 -8 Z" fill="#E4F6FF" fillOpacity=".35" {...outline} />
    <path d="M30 72 h34" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
    <path d="M34 50 v30" {...SOFT} />
    <rect x="92" y="54" width="62" height="11" rx="4" fill={RED} {...thin} />
    <path d="M96 72 h54 v10 q0 4 -4 4 h-46 q-4 0 -4 -4 Z" fill={HONEY} />
    <path d="M98 66 h50 q8 0 8 8 v10 q0 8 -8 8 h-50 q-8 0 -8 -8 v-10 q0 -8 8 -8 Z" fill="#E4F6FF" fillOpacity=".35" {...outline} />
    <path d="M92 72 h60" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
    <path d="M100 76 v10" {...SOFT} />
    <path className="fq-fp-a-drip" d="M154 70 q6 8 4 20 q-6 2 -8 -2 q4 -8 4 -18 Z" fill={HONEY} {...thin} strokeWidth={2} />
  </>;
}

/** build-equivalents: "A new jar came from the hive. Can you make a label that matches?" A straw beehive with a blank tag on a string, and a pencil. */
function SkepArt() {
  return <>
    <path d="M30 106 Q26 32 100 28 Q174 32 170 106 Z" fill="#E5A93D" {...outline} />
    <path d="M34 90 Q100 98 166 90 M40 66 Q100 72 160 66 M56 46 Q100 50 144 46" fill="none" stroke="#B87A1F" strokeWidth="3" strokeLinecap="round" />
    <path d="M52 40 q12 -10 28 -11" {...SOFT} />
    <path d="M80 106 v-18 q20 -26 40 0 v18 Z" fill="#4A2F1B" {...thin} />
    <rect x="152" y="44" width="16" height="5" rx="2" fill={WOOD_D} {...thin} strokeWidth={2} />
    <g transform="translate(160 49)"><g className="fq-fp-a-tag">
      <path d="M0 0 V12" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="-14" y="10" width="28" height="36" rx="5" fill={CREAM} {...outline} />
      <circle cx="0" cy="18" r="3" fill="#E5A93D" stroke={INK} strokeWidth="2" />
    </g></g>
    <g transform="rotate(-8 36 100)">
      <rect x="10" y="94" width="52" height="9" rx="2" fill={GOLD} {...thin} />
      <path d="M62 94 l10 4.5 l-10 4.5 Z" fill="#F6C99A" {...thin} strokeWidth={2} />
      <rect x="4" y="94" width="8" height="9" rx="2" fill={PINK} {...thin} strokeWidth={2} />
    </g>
  </>;
}

/** missing-equivalent: "A label got torn." A paper honey-jar label with a ragged torn edge, a bee sticker, and the torn scrap fluttering down. */
function TornArt() {
  return <>
    <g transform="rotate(-5 90 62)">
      <path d="M24 20 H150 L141 33 L152 46 L142 58 L153 71 L143 84 L150 98 H24 Q18 98 18 92 V26 Q18 20 24 20 Z" fill="#FFF1B8" {...outline} />
      <rect x="52" y="12" width="32" height="12" rx="2" fill="#7CF3FF" opacity=".6" stroke={INK} strokeWidth="2" />
      <ellipse cx="72" cy="62" rx="18" ry="12" fill={GOLD} {...thin} />
      <path d="M66 51 q-3 11 0 22 M76 51 q3 11 0 22" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <ellipse cx="66" cy="46" rx="8" ry="5" fill="#fff" fillOpacity=".85" {...thin} strokeWidth={2} />
      <ellipse cx="80" cy="46" rx="8" ry="5" fill="#fff" fillOpacity=".85" {...thin} strokeWidth={2} />
      <circle cx="87" cy="60" r="2" fill={INK} />
      <path d="M100 80 q8 -22 22 -22" fill="none" stroke="#E5A93D" strokeWidth="4" strokeLinecap="round" />
    </g>
    <g transform="translate(150 94)"><g className="fq-fp-a-scrap">
      <path d="M0 0 L16 8 L8 18 L18 28 L5 38 L-9 32 L-4 14 Z" fill="#FFF1B8" {...thin} />
    </g></g>
    <g transform="rotate(-12 60 114)">
      <rect x="16" y="108" width="62" height="9" rx="2" fill={GOLD} {...thin} />
      <path d="M78 108 l10 4.5 l-10 4.5 Z" fill="#F6C99A" {...thin} strokeWidth={2} />
      <rect x="10" y="108" width="8" height="9" rx="2" fill={PINK} {...thin} strokeWidth={2} />
    </g>
  </>;
}

/** Chapter 6 ending: a full jar of golden honey with a wooden dipper beside it, and the stone piece. */
function HoneyEndArt() {
  return <>
    <Ledge />
    <path d="M30 56 h56 v42 q0 8 -8 8 h-40 q-8 0 -8 -8 Z" fill={HONEY} />
    <path d="M36 40 h44 q8 0 8 10 v48 q0 8 -8 8 h-44 q-8 0 -8 -8 v-48 q0 -10 8 -10 Z" fill="#E4F6FF" fillOpacity=".3" {...outline} />
    <path d="M28 56 h60" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
    <rect x="32" y="28" width="52" height="14" rx="5" fill={WOOD} {...outline} />
    <rect x="40" y="68" width="36" height="24" rx="5" fill={CREAM} {...thin} />
    <ellipse cx="58" cy="80" rx="8" ry="5.5" fill={GOLD} {...thin} strokeWidth={2} />
    <path d="M52 76 q-1 6 0 8 M62 76 q1 6 0 8" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M36 52 v38" {...SOFT} />
    <path className="fq-fp-a-drip" d="M84 42 q6 8 4 22 q-6 3 -9 -2 q5 -9 5 -20 Z" fill={HONEY} {...thin} strokeWidth={2} />
    <g transform="rotate(8 118 106)">
      <path d="M118 62 V106" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M118 62 V106" stroke={WOOD_D} strokeWidth="4" strokeLinecap="round" />
      <rect x="108" y="36" width="20" height="26" rx="8" fill={WOOD} {...outline} />
      <path d="M109 44 h18 M109 51 h18" stroke={INK} strokeWidth="2.5" />
    </g>
    <StonePiece x={140} y={62} />
  </>;
}

export const PROPS_A: Record<string, PropDef> = {
  'a-tray': { label: 'A bakery tray of cookies in different shapes: a star, a heart, a round one and more', art: TrayArt },
  'a-slice': { label: 'One slice of layer cake on a plate, with a cherry on top', art: SliceArt },
  'a-piping': { label: pipingLabel, art: PipingArt },
  'a-twocakes': { label: twoCakesLabel, art: TwoCakesArt, ledge: true },
  'a-hike': { label: 'A hiker backpack, a walking stick, a water flask and an apple at a rest stop on the hill', art: HikeArt, ledge: true },
  'a-plank': { label: 'A rope bridge plank with a dropped apple bouncing on it', art: PlankApple },
  'a-house': { label: 'A cosy little frog house on the far bank, with a glowing window and a lantern', art: HouseArt, ledge: true },
  'a-reed': { label: 'A broken wooden bridge plank and a long blue reed to patch it', art: ReedArt },
  'a-pebbles': { label: 'A leather pouch with shiny pebbles spilling out of it', art: PouchArt, ledge: true },
  'a-crate': { label: 'A wooden crate of treats: a lollipop, a cookie, a cupcake and a donut', art: CrateArt, ledge: true },
  'a-shelf': { label: 'A honey shelf with two honey jars of different shapes', art: ShelfArt },
  'a-skep': { label: 'A straw beehive with a blank paper tag on a string, and a pencil', art: SkepArt, ledge: true },
  'a-torn': { label: 'A torn paper honey label with a bee sticker, and the torn scrap', art: TornArt },
};
export const LESSONS_A: Record<string, string> = {
  'equal-parts': 'a-tray',                   // chapter 1: "can pieces of different shapes still be fair?"
  'unit-fractions': 'a-slice',               // chapter 1: "I'll take just one slice"
  'fraction-of-area': 'a-piping',            // chapter 1: "the coloured slices get frosting"
  'compare-same-numerator': 'a-twocakes',    // chapter 2: "two treats for the guests"
  'fraction-magnitude': 'a-hike',            // chapter 3: Tilly climbs in little steps, with a snack break
  'number-line-points': 'a-plank',           // chapter 4: "I dropped my snack on the bridge"
  'number-line-beyond-one': 'a-house',       // chapter 4: "my house is past the end of the bridge"
  'ruler-measurement': 'a-reed',             // chapter 4: "this reed could patch the bridge"
  'build-line-plots': 'a-pebbles',           // chapter 4: "I found shiny pebbles by the bridge"
  'order-fractions': 'a-crate',              // chapter 5: "help me stack!"
  'equivalent-number-line': 'a-shelf',       // chapter 6: "my honey shelf"
  'build-equivalents': 'a-skep',             // chapter 6: "a new jar came from the hive"
  'missing-equivalent': 'a-torn',            // chapter 6: "a label got torn"
};
export const ENDS_A: Record<number, EndDef> = {
  1: { art: BakeryEndArt, label: (theme) => `A festival ${foodWord(theme, 'cake')}, big muddy footprints and crumbs, and the stone piece shining in the crumbs` },
  2: { art: PondEndArt, label: 'A snack bowl with two snack bars in it, and the stone piece glowing beside it' },
  4: { art: BridgeEndArt, label: 'A rope bridge with loose planks and gaps, and the stone piece shining on the far cliff' },
  5: { art: TowerEndArt, label: 'A steady tower of treats, and the stone piece shining beside it' },
  6: { art: HoneyEndArt, label: 'A jar of golden honey with a wooden dipper, and the stone piece glowing beside it' },
};
