/* Lesson-film props and chapter endings, batch C (chapters 9 to 11: Tilly's race map, the team picnic, Bolt owns up).
   Every object is the thing in the story, drawn with shapes only (no text, no numbers, no equal parts). Each moving part
   sits in its own group whose resting style is its finished position; the wrapper groups carry the placement so the
   CSS animation never replaces it. See film-art.tsx for the shared pieces and film-props-c.css for the motion. */

import React from 'react';
import { CREAM, delay, GOLD, INK, Ledge, outline, StonePiece, type EndDef, type PropDef } from './film-art';

const thin = { ...outline, strokeWidth: 2.5 } as const;
const WOOD = '#C9915B', WOOD_DARK = '#9A6A3A', STEEL = '#A8B4C8', STEEL_DARK = '#7F8DA3', RED = '#FF6B6B', SKY = '#4CC9F0', GREEN = '#7BD389';
const shine = (d: string, w = 3, o = 0.6) => <path d={d} stroke="#fff" strokeWidth={w} fill="none" strokeLinecap="round" opacity={o} />;
const f1 = (n: number) => Math.round(n * 10) / 10;
/** A hexagon (a nut's outline) as a path. */
const hex = (cx: number, cy: number, r: number, rot = 0) => 'M' + [0, 1, 2, 3, 4, 5].map((i) => {
  const a = ((rot + 60 * i) * Math.PI) / 180;
  return `${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`;
}).join(' L') + ' Z';
/** A four-point sparkle as a path. */
const star = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} L${f1(cx + r * .28)} ${f1(cy - r * .28)} L${cx + r} ${cy} L${f1(cx + r * .28)} ${f1(cy + r * .28)} L${cx} ${cy + r} L${f1(cx - r * .28)} ${f1(cy + r * .28)} L${cx - r} ${cy} L${f1(cx - r * .28)} ${f1(cy - r * .28)} Z`;
/** A tuft of grass. */
const tuft = (x: number, y: number) => <path d={`M${x} ${y} q-2 -9 -6 -11 M${x} ${y} q0 -10 1 -14 M${x} ${y} q3 -8 7 -10`} stroke="#3E9954" strokeWidth="2.5" fill="none" strokeLinecap="round" />;

/* ---------------------------------------------------------------- Chapter 9: Tilly's race map */

/** Two signs, one spot: a post with two arrow boards pointing the same way, and an empty slot waiting for its plate. */
function SignpostArt() {
  return <>
    <rect x="93" y="20" width="14" height="88" rx="4" fill={WOOD} {...outline} />
    <path d="M97.5 32 v68" stroke="#E8B98A" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    <circle cx="100" cy="17" r="7" fill={GOLD} {...thin} />
    <path d="M100 26 h56 l16 12.5 l-16 12.5 h-56 Z" fill={CREAM} {...outline} />
    <rect x="112" y="31" width="22" height="15" rx="3" fill={GOLD} {...thin} />
    <circle cx="100" cy="38.5" r="2.6" fill={INK} />
    <g className="fq-fp-c-swing">
      <path d="M100 60 h56 l16 12.5 l-16 12.5 h-56 Z" fill="#E6D3A8" {...outline} />
      <rect x="112" y="65" width="22" height="15" rx="3" fill="#8A6A4A" stroke={INK} strokeWidth="2.5" strokeDasharray="4 3" />
      <circle cx="100" cy="72.5" r="2.6" fill={INK} />
    </g>
    {tuft(78, 106)}{tuft(126, 106)}
    <ellipse cx="146" cy="102" rx="9" ry="5.5" fill="#B7C3CF" {...thin} />
  </>;
}

/** The route chooser: a brass compass with a ring, a glass face and a red-and-white needle. */
function CompassArt() {
  return <>
    <circle cx="100" cy="18" r="8" fill="none" stroke={INK} strokeWidth="8" />
    <circle cx="100" cy="18" r="8" fill="none" stroke="#E8B000" strokeWidth="3" />
    <rect x="93" y="24" width="14" height="8" rx="2" fill="#E8B000" {...thin} />
    <circle cx="100" cy="66" r="40" fill={GOLD} {...outline} />
    <circle cx="100" cy="66" r="31" fill={CREAM} {...thin} />
    {[[100, 41], [125, 66], [100, 91], [75, 66]].map(([x, y]) => <path key={`${x}-${y}`} d={`M${x} ${y! - 4} l3 4 l-3 4 l-3 -4 Z`} fill="#E8B000" />)}
    <g transform="rotate(40 100 66)"><g className="fq-fp-c-needle">
      <path d="M93 66 L100 36 L107 66 Z" fill={RED} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M93 66 L100 96 L107 66 Z" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </g></g>
    <circle cx="100" cy="66" r="4.5" fill={INK} /><circle cx="100" cy="66" r="1.8" fill={GOLD} />
    {shine('M78 48 q6 -9 18 -11', 3.5, .7)}
  </>;
}

/** A pile of rolled-up route maps tied with ribbon; the top one is part-way unrolled. */
function ScrollsArt() {
  return <>
    <g transform="rotate(-1.5 90 97)">
      <rect x="22" y="88" width="128" height="18" rx="9" fill={CREAM} {...outline} />
      <circle cx="150" cy="97" r="9" fill="#E7D6A8" {...thin} /><circle cx="150" cy="97" r="3.5" fill="none" stroke={INK} strokeWidth="2" />
      <rect x="56" y="88" width="7" height="18" fill={RED} stroke={INK} strokeWidth="2" />
    </g>
    <g transform="rotate(2 100 79)">
      <rect x="40" y="70" width="124" height="18" rx="9" fill="#F6E7BF" {...outline} />
      <circle cx="164" cy="79" r="9" fill="#E7D6A8" {...thin} /><circle cx="164" cy="79" r="3.5" fill="none" stroke={INK} strokeWidth="2" />
      <rect x="86" y="70" width="7" height="18" fill={SKY} stroke={INK} strokeWidth="2" />
    </g>
    <rect x="28" y="52" width="80" height="18" rx="9" fill={CREAM} {...outline} />
    <rect x="52" y="52" width="7" height="18" fill={GOLD} stroke={INK} strokeWidth="2" />
    <g className="fq-fp-c-unroll">
      <path d="M100 52 h46 q10 0 10 9 q0 9 -10 9 h-46 Z" fill="#FFFBEA" {...outline} />
      <path d="M108 63 q10 -9 20 0 t20 -4" stroke={RED} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="5 5" />
      <circle cx="148" cy="59" r="3.5" fill={RED} />
    </g>
  </>;
}

/** A pin cushion bristling with pins of every length. */
const PINS: [number, number, number, number, string][] = [
  [72, 64, 24, -42, GOLD], [84, 60, 42, -18, SKY], [94, 58, 28, -4, '#FFFFFF'], [105, 57, 46, 8, RED],
  [116, 59, 32, 22, GREEN], [126, 63, 40, 40, '#B58BD9'], [135, 68, 20, 58, GOLD], [64, 70, 18, -64, RED],
];
function PincushionArt() {
  return <>
    <ellipse cx="100" cy="80" rx="50" ry="26" fill={RED} {...outline} />
    <path d="M70 100 q14 8 36 8" stroke="#D94F4F" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />
    {PINS.map(([bx, by, len, ang, col], i) => {
      const a = (ang * Math.PI) / 180, tx = f1(bx + len * Math.sin(a)), ty = f1(by - len * Math.cos(a));
      return (
        <g key={i} className={i === 3 ? 'fq-fp-c-pin' : undefined}>
          <path d={`M${bx} ${by} L${tx} ${ty}`} stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx={tx} cy={ty} r="4.6" fill={col} {...thin} strokeWidth={2.2} />
        </g>
      );
    })}
    <path d="M86 61 l6 -7 l8 4 l8 -4 l6 7 l-10 5 h-8 Z" fill="#3E9954" {...thin} />
    {shine('M62 76 q4 -10 14 -13', 3.5, .55)}
  </>;
}

/** Tilly's big stoneware drink jug with a cork, a handle and a paper cup beside it (opaque, so it shows no level). */
function JugArt() {
  return <>
    <path d="M140 58 q26 -4 24 22 q-2 14 -16 16" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
    <path d="M140 58 q26 -4 24 22 q-2 14 -16 16" fill="none" stroke="#2FA8D4" strokeWidth="5" strokeLinecap="round" />
    <path d="M84 28 h32 v14 q30 8 30 40 q0 24 -18 24 h-56 q-18 0 -18 -24 q0 -32 30 -40 Z" fill={SKY} {...outline} />
    <path d="M58 80 q11 -8 22 0 t22 0 t22 0 t14 0" stroke={CREAM} strokeWidth="5" fill="none" strokeLinecap="round" />
    <rect x="79" y="22" width="42" height="10" rx="5" fill="#2FA8D4" {...thin} />
    <rect x="88" y="10" width="24" height="14" rx="3" fill="#D9A066" {...thin} />
    {shine('M66 64 q-4 12 -2 26', 4, .55)}
    <g className="fq-fp-c-drop">
      <path d="M14 82 h28 l-5 24 h-18 Z" fill="#fff" {...outline} />
      <path d="M16 91 h24" stroke={RED} strokeWidth="5" strokeLinecap="round" />
    </g>
  </>;
}

/** The racers' recipe: a sack of flour with a measuring cup that has just been tipped, a little cloud of flour above it. */
function FlourArt() {
  return <>
    <path d="M40 106 q-14 0 -14 -18 q0 -22 14 -38 h56 q14 16 14 38 q0 18 -14 18 Z" fill="#EADFC2" {...outline} />
    <path d="M40 50 l-6 -16 q34 -10 68 0 l-6 16 Z" fill="#DCCDA6" {...outline} />
    <rect x="38" y="46" width="60" height="6" rx="3" fill={WOOD} {...thin} />
    <circle cx="68" cy="80" r="14" fill={SKY} {...thin} /><circle cx="68" cy="80" r="6" fill={CREAM} />
    {shine('M34 72 q-1 -12 5 -18', 3.5, .6)}
    <g className="fq-fp-c-tip">
      <path d="M158 82 q16 0 14 12 q-2 9 -12 9" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M158 82 q16 0 14 12 q-2 9 -12 9" fill="none" stroke={STEEL} strokeWidth="4" strokeLinecap="round" />
      <path d="M124 76 h36 l-4 30 h-28 Z" fill={STEEL} {...outline} />
      <path d="M124 76 q18 -22 36 0 Z" fill="#fff" {...thin} />
      {shine('M130 86 v12', 3, .6)}
    </g>
    {[0, 1, 2].map((i) => <circle key={i} className="fq-fp-c-puff" style={delay(i)} cx={132 + i * 10} cy={50 - (i % 2) * 8} r={4 + (i % 2) * 2} fill="#fff" opacity=".75" />)}
  </>;
}

/** A tall drink jug on a stand with a tap, a cup waiting under it and a stack of cups beside it. */
function DispenserArt() {
  return <>
    <rect x="68" y="70" width="8" height="36" rx="3" fill={STEEL_DARK} {...thin} /><rect x="124" y="70" width="8" height="36" rx="3" fill={STEEL_DARK} {...thin} />
    <rect x="62" y="12" width="76" height="62" rx="16" fill="#E4F6FF" fillOpacity=".35" {...outline} />
    <path d="M65 28 h70 v30 q0 13 -13 13 h-44 q-13 0 -13 -13 Z" fill="#FF9F1C" />
    <path d="M65 28 h70" stroke="#FFD08A" strokeWidth="3" strokeLinecap="round" />
    <circle cx="86" cy="48" r="7" fill="#FFE066" {...thin} strokeWidth={2} /><circle cx="108" cy="58" r="6" fill="#FFE066" {...thin} strokeWidth={2} /><circle cx="116" cy="40" r="5" fill={RED} {...thin} strokeWidth={2} />
    <rect x="78" y="4" width="44" height="10" rx="5" fill={RED} {...thin} />
    {shine('M72 30 q-2 14 0 26', 4, .6)}
    <rect x="132" y="58" width="18" height="10" rx="3" fill={STEEL} {...thin} /><rect x="144" y="66" width="7" height="12" rx="2" fill={STEEL} {...thin} />
    <circle cx="140" cy="54" r="4.5" fill={RED} {...thin} strokeWidth={2} />
    <path d="M138 90 h24 l-4 16 h-16 Z" fill="#fff" {...thin} />
    <path className="fq-fp-c-drip" d="M147.5 80 q-3.5 5 0 8 q3.5 -3 0 -8 Z" fill="#FF9F1C" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M18 60 h28 l-4 46 h-20 Z" fill="#fff" {...outline} />
    <rect x="16" y="56" width="32" height="7" rx="3.5" fill={CREAM} {...thin} />
    <path d="M22 78 h20 M23 92 h18" stroke={RED} strokeWidth="4" strokeLinecap="round" />
  </>;
}

/** The race map on an easel: a hill, a river, a dashed route and a pin at the end of it. */
function RaceEndArt() {
  return <>
    <Ledge />
    <path d="M44 88 L32 106 M116 88 L128 106" stroke={INK} strokeWidth="11" strokeLinecap="round" /><path d="M44 88 L32 106 M116 88 L128 106" stroke={WOOD} strokeWidth="5" strokeLinecap="round" />
    <rect x="14" y="10" width="132" height="82" rx="7" fill={CREAM} {...outline} />
    <path d="M26 78 q22 -26 48 -14 t58 -6 v22 h-106 Z" fill={GREEN} {...thin} />
    <path d="M24 34 q14 -10 28 0 t28 0 t28 0 t14 -2" fill="none" stroke={SKY} strokeWidth="5" strokeLinecap="round" />
    <path className="fq-fp-trail" d="M32 78 q12 -28 32 -12 t30 -22 t32 -16" fill="none" stroke={RED} strokeWidth="3.5" strokeDasharray="7 6" strokeLinecap="round" />
    <circle cx="32" cy="78" r="4.5" fill="#fff" {...thin} strokeWidth={2} />
    <g className="fq-fp-c-mark"><path d="M126 18 q-9 0 -9 9 q0 7 9 15 q9 -8 9 -15 q0 -9 -9 -9 Z" fill={RED} {...thin} /><circle cx="126" cy="27" r="3.5" fill="#fff" /></g>
    <StonePiece x={150} y={62} w={30} h={38} />
  </>;
}

/* ---------------------------------------------------------------- Chapter 10: the team picnic */

/** A whole lattice-topped pie in its tin; steam rises and a cherry lands on top. */
function PieArt() {
  return <>
    {[84, 100, 116].map((x, i) => <path key={x} className="fq-fp-c-puff" style={delay(i)} d={`M${x} 40 q-6 -7 0 -14 q6 -7 0 -14`} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".7" />)}
    <path d="M30 100 h140 l-10 6 h-120 Z" fill={STEEL_DARK} {...thin} />
    <path d="M28 80 q0 -28 72 -28 q72 0 72 28 Z" fill="#E9A64A" {...outline} />
    <path d="M46 80 l24 -19 M72 80 l26 -23 M100 80 l26 -23 M126 80 l22 -17 M52 63 l24 17 M76 56 l26 24 M104 54 l28 26 M130 60 l18 20" stroke="#F7C873" strokeWidth="5" strokeLinecap="round" />
    <circle cx="86" cy="68" r="4" fill={RED} {...thin} strokeWidth={2} /><circle cx="116" cy="68" r="4" fill={RED} {...thin} strokeWidth={2} />
    <path d="M24 80 h152 l-12 22 h-128 Z" fill={STEEL} {...outline} />
    <path d="M44 88 v8 M72 88 v10 M100 88 v10 M128 88 v10 M156 88 v8" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
    <g className="fq-fp-c-drop">
      <circle cx="100" cy="50" r="7" fill="#E04058" {...thin} /><path d="M100 43 q4 -8 10 -9" stroke="#3E9954" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  </>;
}

/** A plate heaped with sandwiches, crumbs and a bare patch where some are already gone. */
const SANDWICHES: { x: number; y: number; r: number; fill: string; a: string; b: string }[] = [
  { x: 52, y: 94, r: -14, fill: '#F4D08A', a: '#7BD389', b: RED },
  { x: 120, y: 92, r: 12, fill: '#EBC27A', a: GOLD, b: '#7BD389' },
  { x: 88, y: 98, r: -3, fill: '#F7DB9C', a: RED, b: '#7BD389' },
];
const Sandwich = ({ x, y, r, fill, a, b }: (typeof SANDWICHES)[number]) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <path d="M-27 0 q-3 -5 2 -9 l22 -32 q3 -4 6 0 l22 32 q5 4 2 9 Z" fill={fill} {...outline} />
    <path d="M-15 -13 h30" stroke={a} strokeWidth="6" strokeLinecap="round" /><path d="M-9 -24 h18" stroke={b} strokeWidth="5" strokeLinecap="round" />
  </g>
);
function SandwichesArt() {
  return <>
    <ellipse cx="100" cy="100" rx="82" ry="12" fill="#fff" {...outline} />
    <ellipse cx="100" cy="99" rx="62" ry="6.5" fill="#E3EEF7" />
    {SANDWICHES.map((s) => <Sandwich key={s.x} {...s} />)}
    <g transform="translate(142 78) rotate(-6)"><g className="fq-fp-c-drop">
      <path d="M-27 0 q-3 -5 2 -9 l22 -32 q3 -4 6 0 l22 32 q5 4 2 9 Z" fill="#F4D08A" {...outline} />
      <path d="M-15 -13 h30" stroke={RED} strokeWidth="6" strokeLinecap="round" /><path d="M-9 -24 h18" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
    </g></g>
    {[[24, 102], [32, 98], [168, 102], [174, 97]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="2.4" fill="#C9915B" />)}
  </>;
}

/** A big bowl of mixed fruit with a wooden spoon in it. */
function FruitBowlArt() {
  return <>
    <circle cx="62" cy="46" r="14" fill={RED} {...outline} /><path d="M54 36 l8 -6 l8 6" fill="none" stroke="#3E9954" strokeWidth="3" strokeLinecap="round" />
    <circle cx="100" cy="36" r="16" fill="#FF9F1C" {...outline} />
    <circle cx="140" cy="46" r="14" fill={GREEN} {...outline} />
    <circle cx="82" cy="54" r="9" fill="#9B6BD9" {...thin} /><circle cx="122" cy="54" r="8" fill="#9B6BD9" {...thin} />
    <circle cx="106" cy="56" r="5.5" fill="#4C6FE0" {...thin} strokeWidth={2} /><circle cx="116" cy="61" r="4.5" fill="#4C6FE0" {...thin} strokeWidth={2} />
    {shine('M92 28 q4 -5 10 -5', 3, .7)}
    <path d="M30 66 H170 Q170 106 130 106 H70 Q30 106 30 66 Z" fill="#3FB6A8" {...outline} />
    <rect x="26" y="61" width="148" height="9" rx="4.5" fill="#2C8F85" {...thin} />
    <circle cx="62" cy="86" r="3.5" fill="#fff" /><circle cx="94" cy="94" r="3" fill="#fff" /><circle cx="128" cy="84" r="3.5" fill="#fff" /><circle cx="150" cy="78" r="2.6" fill="#fff" />
    <g className="fq-fp-c-stir">
      <path d="M118 66 L132 8" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <path d="M118 66 L132 8" fill="none" stroke="#D9A066" strokeWidth="5" strokeLinecap="round" />
    </g>
  </>;
}

/** A tin lunch box with its lid up, an apple, a sandwich and a carrot peeking out. */
function LunchboxArt() {
  return <>
    <g className="fq-fp-c-lid">
      <rect x="38" y="12" width="124" height="28" rx="9" fill="#2FA8D4" {...outline} />
      <path d="M84 12 v-5 q0 -4 4 -4 h24 q4 0 4 4 v5" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" /><path d="M84 12 v-5 q0 -4 4 -4 h24 q4 0 4 4 v5" fill="none" stroke={STEEL} strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="27" r="6" fill={GOLD} {...thin} strokeWidth={2} />
      {shine('M48 21 h22', 3.5, .55)}
    </g>
    <rect x="48" y="38" width="10" height="20" rx="3" fill={STEEL_DARK} {...thin} strokeWidth={2} /><rect x="142" y="38" width="10" height="20" rx="3" fill={STEEL_DARK} {...thin} strokeWidth={2} />
    <rect x="42" y="56" width="116" height="14" rx="4" fill="#1F6F8B" {...thin} />
    <circle cx="68" cy="62" r="14" fill={RED} {...outline} /><path d="M68 48 q2 -8 9 -9" stroke="#3E9954" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M92 66 l18 -30 l22 30 Z" fill="#F4D08A" {...outline} /><path d="M100 56 h20" stroke="#7BD389" strokeWidth="5" strokeLinecap="round" />
    <path d="M140 66 l12 -26 l8 26 Z" fill="#FF9F1C" {...thin} />
    <rect x="38" y="64" width="124" height="42" rx="9" fill={SKY} {...outline} />
    <rect x="94" y="72" width="12" height="15" rx="3" fill={GOLD} {...thin} strokeWidth={2} />
    {shine('M48 76 v20', 4, .5)}
    <circle cx="136" cy="90" r="7" fill="#fff" {...thin} strokeWidth={2} />
  </>;
}

/** The picnic basket, with sandwiches, an apple and a gingham cloth peeking out, beside the stone piece. */
function PicnicEndArt() {
  return <>
    <Ledge />
    <path d="M44 62 q-8 -50 33 -50 q41 0 33 50" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
    <path d="M44 62 q-8 -50 33 -50 q41 0 33 50" fill="none" stroke="#E0B484" strokeWidth="5" strokeLinecap="round" />
    <g className="fq-fp-c-bite"><path d="M40 64 l17 -30 l19 30 Z" fill="#F4D08A" {...outline} /><path d="M48 54 h18" stroke="#7BD389" strokeWidth="5" strokeLinecap="round" /></g>
    <path d="M70 64 l18 -26 l17 26 Z" fill="#EBC27A" {...outline} /><path d="M78 56 h20" stroke={RED} strokeWidth="5" strokeLinecap="round" />
    <circle cx="112" cy="52" r="12" fill={RED} {...outline} /><path d="M112 41 q2 -7 8 -8" stroke="#3E9954" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M24 60 h106 l-4 12 l-10 -5 l-9 8 l-9 -8 l-9 8 l-9 -8 l-9 8 l-9 -8 l-9 8 l-9 -6 l-10 5 Z" fill={RED} {...outline} />
    <path d="M26 66 H128 L118 106 H36 Z" fill="#C99A6E" {...outline} />
    <path d="M30 80 H124 M33 93 H121 M60 68 v36 M82 68 v38 M104 68 v36" stroke={WOOD_DARK} strokeWidth="2.5" strokeLinecap="round" />
    <StonePiece x={146} y={62} w={30} h={38} />
  </>;
}

/* ---------------------------------------------------------------- Chapter 11: Bolt owns up */

/** A hopper that swallows bolts into a bin below; one more bolt drops in. */
function HopperArt() {
  return <>
    <path d="M60 56 L48 106 M140 56 L152 106" stroke={INK} strokeWidth="11" strokeLinecap="round" /><path d="M60 56 L48 106 M140 56 L152 106" stroke="#8B98AB" strokeWidth="5" strokeLinecap="round" />
    <path d={hex(76, 14, 11, 10)} fill="#C9D3DD" {...thin} /><path d={hex(104, 10, 12, 0)} fill={GOLD} {...thin} /><path d={hex(128, 16, 10, 20)} fill="#C9D3DD" {...thin} />
    <path d="M34 24 H166 L124 74 V90 H76 V74 Z" fill={STEEL} {...outline} />
    <rect x="28" y="19" width="144" height="10" rx="5" fill={STEEL_DARK} {...outline} />
    {shine('M48 36 L78 70', 4, .6)}
    <circle cx="100" cy="50" r="7" fill="#7CF3FF" {...thin} /><circle cx="100" cy="50" r="2.6" fill="#fff" />
    <path d="M72 92 h56 v14 h-56 Z" fill={WOOD} {...outline} />
    <path d={hex(88, 100, 5.5, 0)} fill={GOLD} {...thin} strokeWidth={2} /><path d={hex(108, 98, 5, 15)} fill="#C9D3DD" {...thin} strokeWidth={2} />
    <g className="fq-fp-c-fall"><path d={hex(142, 14, 11, 40)} fill={GOLD} {...thin} /><circle cx="142" cy="14" r="3.6" fill="#7A5A00" /></g>
  </>;
}

/** A heap of hex nuts with a shovel stuck in it; one nut rolls down the side. */
const NUTS: { x: number; y: number; r: number; rot: number; fill: string }[] = [
  { x: 40, y: 94, r: 13, rot: 10, fill: GOLD }, { x: 66, y: 96, r: 12, rot: 24, fill: STEEL }, { x: 92, y: 95, r: 14, rot: 4, fill: '#E39A4A' }, { x: 118, y: 96, r: 12, rot: 30, fill: GOLD }, { x: 144, y: 94, r: 13, rot: 14, fill: STEEL },
  { x: 54, y: 76, r: 12, rot: 18, fill: '#E39A4A' }, { x: 80, y: 74, r: 13, rot: 8, fill: STEEL }, { x: 108, y: 74, r: 12, rot: 26, fill: GOLD }, { x: 132, y: 78, r: 11, rot: 2, fill: '#E39A4A' },
  { x: 70, y: 56, r: 12, rot: 22, fill: GOLD }, { x: 96, y: 52, r: 13, rot: 12, fill: STEEL }, { x: 118, y: 58, r: 11, rot: 34, fill: '#E39A4A' },
];
function NutPileArt() {
  return <>
    <path d="M170 18 L152 62" stroke={INK} strokeWidth="10" strokeLinecap="round" /><path d="M170 18 L152 62" stroke={WOOD} strokeWidth="5" strokeLinecap="round" />
    <circle cx="172" cy="16" r="6" fill="none" stroke={INK} strokeWidth="3" />
    {NUTS.map((n, i) => <g key={i}><path d={hex(n.x, n.y, n.r, n.rot)} fill={n.fill} {...thin} /><circle cx={n.x} cy={n.y} r={n.r * .38} fill="#3A4255" /></g>)}
    <path d="M146 56 l22 -8 l7 26 l-20 8 Z" fill="#C9D3DD" {...outline} />
    <g className="fq-fp-c-roll"><path d={hex(20, 100, 10, 18)} fill={GOLD} {...thin} /><circle cx="20" cy="100" r="3.8" fill="#3A4255" /></g>
  </>;
}

/** A plank goes in one side of a gate with lamps on it and a smaller one comes out the other, on a belt. */
function PlankGateArt() {
  return <>
    <rect x="12" y="92" width="176" height="13" rx="6.5" fill="#4A5568" {...outline} />
    <circle cx="20" cy="98.5" r="7" fill={STEEL} {...thin} /><circle cx="180" cy="98.5" r="7" fill={STEEL} {...thin} />
    <path d="M40 98.5 h120" stroke="#64748B" strokeWidth="3" strokeDasharray="6 8" strokeLinecap="round" />
    <rect x="14" y="70" width="68" height="22" rx="3" fill={WOOD} {...outline} />
    <path d="M22 79 h40 M28 85 h46" stroke={WOOD_DARK} strokeWidth="2.5" strokeLinecap="round" /><circle cx="22" cy="81" r="2.4" fill={INK} /><circle cx="74" cy="81" r="2.4" fill={INK} />
    <g className="fq-fp-c-out">
      <rect x="128" y="78" width="34" height="14" rx="3" fill={WOOD} {...outline} />
      <path d="M134 85 h18" stroke={WOOD_DARK} strokeWidth="2.5" strokeLinecap="round" /><circle cx="134" cy="81" r="2" fill={INK} />
    </g>
    <rect x="80" y="30" width="13" height="64" rx="4" fill="#5C7380" {...outline} /><rect x="107" y="30" width="13" height="64" rx="4" fill="#5C7380" {...outline} />
    <rect x="72" y="22" width="56" height="15" rx="7" fill={SKY} {...outline} />
    <circle cx="86" cy="29.5" r="4" fill={GOLD} /><circle cx="100" cy="29.5" r="4" fill="#fff" /><circle cx="114" cy="29.5" r="4" fill={GOLD} />
    {shine('M85 46 v28', 3, .5)}
  </>;
}

/** A laser cutter: a gantry with a head that slides along it, a spark where it touches the metal sheet. */
function LaserCutterArt() {
  return <>
    <rect x="22" y="88" width="156" height="18" rx="5" fill="#5C7380" {...outline} />
    <rect x="40" y="70" width="120" height="18" rx="4" fill="#D5DEE8" {...outline} />
    <path d="M44 74 h112" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    {[[48, 84], [152, 84]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.4" fill={STEEL_DARK} />)}
    <path d="M56 80 q12 -6 24 0 t24 0 t18 0" stroke={RED} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="5 5" />
    <rect x="12" y="20" width="13" height="86" rx="4" fill={STEEL_DARK} {...outline} /><rect x="175" y="20" width="13" height="86" rx="4" fill={STEEL_DARK} {...outline} />
    <rect x="12" y="20" width="176" height="13" rx="6" fill="#64748B" {...outline} />
    <g className="fq-fp-c-head">
      <rect x="88" y="30" width="26" height="22" rx="6" fill={GOLD} {...outline} />
      <rect x="97" y="52" width="8" height="9" rx="2" fill={STEEL} {...thin} strokeWidth={2} />
      <path d="M101 62 V72" stroke="#FF4D6D" strokeWidth="3.5" strokeLinecap="round" />
      <path d={star(101, 71, 7)} fill="#fff" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
      <path d={star(112, 66, 4)} fill={GOLD} /><path d={star(90, 67, 4)} fill={GOLD} />
    </g>
  </>;
}

/** A red toolbox whose tray is pulled open, with a wrench, a screwdriver and a few bolts in it. */
function ToolboxArt() {
  return <>
    <rect x="30" y="60" width="140" height="46" rx="8" fill={RED} {...outline} />
    <rect x="48" y="72" width="14" height="12" rx="3" fill={GOLD} {...thin} strokeWidth={2} /><rect x="138" y="72" width="14" height="12" rx="3" fill={GOLD} {...thin} strokeWidth={2} />
    {shine('M40 70 v26', 4, .5)}
    <path d="M82 60 v-10 q0 -8 8 -8 h30 q8 0 8 8 v10" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
    <path d="M82 60 v-10 q0 -8 8 -8 h30 q8 0 8 8 v10" fill="none" stroke={STEEL} strokeWidth="5" strokeLinecap="round" />
    <g className="fq-fp-c-tray">
      <path d="M10 48 h112 v16 q0 4 -4 4 h-104 q-4 0 -4 -4 Z" fill="#D94F4F" {...outline} />
      <path d="M32 50 l3 -34" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M32 50 l3 -34" stroke={STEEL} strokeWidth="4" strokeLinecap="round" />
      <circle cx="36" cy="13" r="9" fill={STEEL} {...thin} /><path d="M32 8 l4 7 l4 -7 Z" fill={INK} />
      <rect x="56" y="22" width="9" height="24" rx="3" fill={GOLD} {...thin} strokeWidth={2} /><path d="M60.5 22 v-10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d={hex(86, 42, 7, 10)} fill="#C9D3DD" {...thin} strokeWidth={2} /><path d={hex(102, 44, 6, 25)} fill={GOLD} {...thin} strokeWidth={2} /><path d={hex(94, 33, 5.5, 0)} fill={GOLD} {...thin} strokeWidth={2} />
    </g>
  </>;
}

/** A chunky toy ray gun on its side with sparkles at the muzzle; it kicks back when it fires. */
function RayGunArt() {
  return <>
    <path d="M62 52 l8 -24 l8 24 Z" fill="#FFB5C5" {...thin} /><circle cx="70" cy="24" r="6" fill="#7CF3FF" {...thin} />
    <path d="M46 84 l-8 22 h22 l6 -22 Z" fill="#FF9F1C" {...outline} />
    <g className="fq-fp-c-recoil">
      <rect x="32" y="52" width="86" height="34" rx="14" fill={RED} {...outline} />
      <rect x="116" y="58" width="26" height="22" rx="6" fill={STEEL} {...outline} />
      <path d="M142 56 l16 -9 v44 l-16 -9 Z" fill={GOLD} {...outline} />
      <circle cx="82" cy="69" r="10" fill={CREAM} {...thin} /><path d="M82 69 l6 -6" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="52" cy="62" r="3.6" fill={GREEN} /><circle cx="52" cy="76" r="3.6" fill="#7CF3FF" />
      {shine('M44 60 q16 -8 40 -6', 3.5, .55)}
    </g>
    <path className="fq-fp-c-spark" style={delay(0)} d={star(180, 42, 11)} fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <path className="fq-fp-c-spark" style={delay(1)} d={star(188, 72, 8)} fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <path className="fq-fp-c-spark" style={delay(2)} d={star(172, 96, 9)} fill="#7CF3FF" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
  </>;
}

/** Bolt's dial gauge on a stand, with the wrench he is using to fix it leaning beside it. */
function GaugeArt() {
  return <>
    <rect x="76" y="94" width="48" height="12" rx="4" fill="#5C7380" {...outline} />
    <path d="M176 104 L150 54" stroke={INK} strokeWidth="11" strokeLinecap="round" /><path d="M176 104 L150 54" stroke={STEEL} strokeWidth="5" strokeLinecap="round" />
    <circle cx="100" cy="58" r="40" fill={STEEL} {...outline} />
    <circle cx="100" cy="58" r="31" fill={CREAM} {...thin} />
    <circle cx="86" cy="76" r="4.5" fill={GREEN} /><circle cx="114" cy="76" r="4.5" fill={RED} />
    <g transform="rotate(32 100 58)"><g className="fq-fp-c-needle">
      <path d="M95 58 L100 30 L105 58 Z" fill={RED} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </g></g>
    <circle cx="100" cy="58" r="5" fill={INK} /><circle cx="100" cy="58" r="2" fill={GOLD} />
    {shine('M76 40 q6 -9 18 -11', 3.5, .7)}
    <circle cx="146" cy="46" r="10" fill={STEEL} {...thin} /><path d="M142 40 l4 8 l4 -8 Z" fill={INK} />
  </>;
}

/** The rebuilt bridge plank on two trestles, with Bolt's wrench and a sparkle, beside the stone piece (Bolt's machine is the backdrop). */
function MachineEndArt() {
  return <>
    <Ledge />
    <path d="M24 106 L38 72 L52 106 M98 106 L112 72 L126 106" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 106 L38 72 L52 106 M98 106 L112 72 L126 106" fill="none" stroke={WOOD} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <g className="fq-fp-c-settle">
      <rect x="10" y="58" width="130" height="16" rx="3" fill={WOOD} {...outline} />
      <path d="M22 65 h40 M70 69 h52" stroke={WOOD_DARK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="18" cy="66" r="2.4" fill={INK} /><circle cx="132" cy="66" r="2.4" fill={INK} />
    </g>
    <g transform="rotate(-4 80 51)"><path d="M54 51 h54" stroke={INK} strokeWidth="10" strokeLinecap="round" /><path d="M54 51 h54" stroke={STEEL} strokeWidth="5" strokeLinecap="round" /><circle cx="52" cy="51" r="9" fill={STEEL} {...thin} /><path d="M46 49 l8 4 l-1 -9 Z" fill={INK} /></g>
    <path className="fq-fp-c-spark" style={delay(0)} d={star(40, 36, 9)} fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <path className="fq-fp-c-spark" style={delay(1)} d={star(122, 44, 7)} fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <StonePiece x={150} y={62} w={30} h={38} />
  </>;
}

export const PROPS_C: Record<string, PropDef> = {
  'c-signpost': { label: 'A signpost with two arrow boards pointing the same way, one with an empty slot', art: SignpostArt, ledge: true },
  'c-compass': { label: 'A brass compass with a red and white needle', art: CompassArt, ledge: true },
  'c-scrolls': { label: 'A pile of rolled up route maps tied with ribbon, the top one half unrolled', art: ScrollsArt, ledge: true },
  'c-pincushion': { label: 'A tomato pin cushion with lots of pins sticking out', art: PincushionArt, ledge: true },
  'c-jug': { label: 'A big blue drink jug with a cork, and a paper cup beside it', art: JugArt, ledge: true },
  'c-flour': { label: 'A sack of flour and a measuring cup with a puff of flour', art: FlourArt, ledge: true },
  'c-dispenser': { label: 'A big drink jug on a stand with a tap, a cup under it and a stack of cups', art: DispenserArt, ledge: true },
  'c-pie': { label: 'A steaming lattice pie in its tin with a cherry on top', art: PieArt, ledge: true },
  'c-sandwiches': { label: 'A plate piled with sandwiches and a few crumbs', art: SandwichesArt, ledge: true },
  'c-fruitbowl': { label: 'A big bowl of mixed fruit with a wooden spoon', art: FruitBowlArt, ledge: true },
  'c-lunchbox': { label: 'A tin lunch box with its lid open and food peeking out', art: LunchboxArt, ledge: true },
  'c-hopper': { label: 'A metal hopper full of bolts that drop into a bin', art: HopperArt, ledge: true },
  'c-nutpile': { label: 'A heap of shiny nuts with a shovel in it', art: NutPileArt, ledge: true },
  'c-plankgate': { label: 'A plank going into a gate with lamps on a belt, and a smaller plank coming out', art: PlankGateArt, ledge: true },
  'c-lasercutter': { label: 'A laser cutter over a metal sheet with sparks flying', art: LaserCutterArt, ledge: true },
  'c-toolbox': { label: 'A red toolbox with its tray pulled open, holding a wrench and bolts', art: ToolboxArt, ledge: true },
  'c-raygun': { label: 'A toy ray gun with sparkles at its muzzle', art: RayGunArt, ledge: true },
  'c-gauge': { label: 'A round dial gauge on a stand with a wrench leaning on it', art: GaugeArt, ledge: true },
};
export const LESSONS_C: Record<string, string> = {
  'equivalent-missing-both': 'c-signpost',          // chapter 9: "Two signs, one spot. A number is missing!"
  'compare-unlike-fractions': 'c-compass',          // "Two routes have different names. Which one is shorter?"
  'order-unlike-fractions': 'c-scrolls',            // "Help me put all the routes in order."
  'read-line-plots': 'c-pincushion',                // "My map pins come in different lengths."
  'measurement-word-problems': 'c-jug',             // "Racers need a drink. How much is in my jug?"
  'fraction-recipes': 'c-flour',                    // "Let's bake for the racers with my recipe."
  'party-portions': 'c-dispenser',                  // "Every racer gets a drink. Is my jug big enough?"
  'add-unlike-fractions': 'c-pie',                  // chapter 10: "Pip's pie is cut a different way."
  'subtract-unlike-fractions': 'c-sandwiches',      // "I packed lots of sandwiches. Some are already gone!"
  'mixed-unlike-operations': 'c-fruitbowl',         // "Mixing everything is tricky."
  'estimate-fraction-operations': 'c-lunchbox',     // "About how much food is left?"
  'sets-nonunit': 'c-hopper',                       // chapter 11: "Some bolts already went into the machine!"
  'fraction-of-quantity': 'c-nutpile',              // "The machine wants part of my nut pile!"
  'multiply-fractions': 'c-plankgate',              // "My machine shrinks a plank."
  'fraction-times-fraction': 'c-lasercutter',       // "My machine cuts a panel."
  'fraction-of-collection': 'c-toolbox',            // "My machine needs part of my bolt box."
  'multiplication-scaling': 'c-raygun',             // "Will this setting make it bigger or smaller?"
  'bigger-or-smaller': 'c-gauge',                   // "Bolt fixes his dial."
};
export const ENDS_C: Record<number, EndDef> = {
  9: { art: RaceEndArt, label: "Tilly's race map on an easel, with a dashed route and a pin, and the stone piece glowing beside it" },
  10: { art: PicnicEndArt, label: 'The picnic basket with sandwiches, an apple and a gingham cloth, and the stone piece glowing beside it' },
  11: { art: MachineEndArt, label: "The rebuilt bridge plank on two trestles with Bolt's wrench, and the stone piece glowing beside it" },
};
