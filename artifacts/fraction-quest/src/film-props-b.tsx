/* Lesson-film props and chapter endings, batch B (chapters 7 and 8: Bolt's workshop and the secret in Chomp's den).
   Register each object under a prop id in PROPS, point a lesson id at it in LESSONS, and give each finished chapter an
   ending in ENDS (keyed by unit number). See film-art.tsx. Every drawing is the object only: no text, no numbers, no
   tick marks and no equal parts. The motion lives in film-props-b.css. */

import React from 'react';
import { CREAM, delay, GOLD, INK, Ledge, outline, StonePiece, type EndDef, type PropDef } from './film-art';
import { aFood, foodWord, pieLook, ToppingArt } from './film-food';
import type { PropTheme } from './story';

const STEEL = '#B8C4D6';
const STEEL_D = '#8795AB';
const CYAN = '#4CC9F0';
const ORANGE = '#FF9F1C';
const RED = '#FF6B6B';
const thin = { ...outline, strokeWidth: 2.5 } as const;
const shine = { stroke: '#fff', strokeWidth: 3, fill: 'none', strokeLinecap: 'round', opacity: 0.6 } as const;

/* ---------------------------------------------------------------- Chapter 7: Bolt's workshop */

/** Lesson 2: "One of my parts is too big for its slot. Can you break it apart?" A bracket with a slot, a block that is too big for it, broken into two uneven chunks, and a small block dropping into the slot. */
function BracketArt() {
  return <>
    <path d="M26 106 V46 h20 V86 h34 V46 h20 V106 Z" fill={STEEL} {...outline} />
    <circle cx="36" cy="60" r="3" fill={STEEL_D} /><circle cx="90" cy="60" r="3" fill={STEEL_D} />
    <g className="fq-fp-b-drop">
      <rect x="50" y="58" width="26" height="28" rx="4" fill={ORANGE} {...outline} />
      <path d="M56 66 v14" {...shine} />
    </g>
    <rect x="112" y="56" width="44" height="50" rx="6" fill={CYAN} {...outline} />
    <circle cx="134" cy="82" r="7" fill={INK} />
    <path d="M120 66 v22" {...shine} />
    <rect x="160" y="70" width="24" height="36" rx="5" fill="#2FB4DE" {...outline} />
    <path d="M167 78 v14" {...shine} />
    <path d="M154 60 l4 8 l-4 8 l4 8" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </>;
}

/** Lesson 3: "Is this wire a whole number of meters?" A spool of copper wire with its loose end curling along the bench. */
function SpoolArt() {
  return <>
    <rect x="124" y="34" width="14" height="72" rx="5" fill="#C9915B" {...outline} />
    <rect x="52" y="48" width="74" height="46" fill="#E0894A" {...outline} />
    <path d="M56 60 q35 -6 66 0 M56 74 q35 6 66 0 M56 86 q35 -5 66 0" fill="none" stroke="#9A4A1C" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M60 54 q20 -4 36 -2" {...shine} />
    <rect x="38" y="34" width="14" height="72" rx="5" fill="#C9915B" {...outline} />
    <path d="M44 44 v40" {...shine} />
    <path d="M138 82 q22 -2 28 16 q4 10 -8 9 q-12 -2 -2 -12 q10 -10 30 0" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    <path className="fq-fp-b-wire" pathLength="100" d="M138 82 q22 -2 28 16 q4 10 -8 9 q-12 -2 -2 -12 q10 -10 30 0" fill="none" stroke="#E0894A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
  </>;
}

/** Lesson 4: "One of these rods is longer than a whole." A bucket of metal rods of different lengths, one just slid in. */
function RodsArt() {
  return <>
    <g transform="rotate(-9 73 82)"><rect x="66" y="12" width="14" height="72" rx="6" fill={CYAN} {...outline} /><rect x="66" y="12" width="14" height="9" rx="4" fill="#2FB4DE" {...thin} /></g>
    <g transform="rotate(3 101 82)"><rect x="94" y="4" width="14" height="80" rx="6" fill={ORANGE} {...outline} /><rect x="94" y="4" width="14" height="9" rx="4" fill="#E68600" {...thin} /></g>
    <g className="fq-fp-b-rod"><g transform="rotate(11 128 82)"><rect x="121" y="30" width="14" height="54" rx="6" fill={RED} {...outline} /><rect x="121" y="30" width="14" height="9" rx="4" fill="#E04A4A" {...thin} /></g></g>
    <path d="M52 68 h96 l-9 38 h-78 Z" fill="#7E8FA8" {...outline} />
    <rect x="48" y="62" width="104" height="10" rx="5" fill={STEEL} {...outline} />
    <path d="M62 80 v18" {...shine} />
  </>;
}

/** Lesson 5: "I like to write long numbers the short way." A label maker pushing out a blank sticker label. */
function LabelerArt() {
  return <>
    <g className="fq-fp-b-label">
      <rect x="104" y="72" width="70" height="16" rx="3" fill={CREAM} {...outline} />
      <path d="M174 72 q10 2 6 8 q-3 6 -6 8" fill={CREAM} stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="122" cy="80" r="3.5" fill={GOLD} />
    </g>
    <rect x="30" y="54" width="84" height="52" rx="12" fill={CYAN} {...outline} />
    <rect x="42" y="40" width="60" height="20" rx="8" fill="#2FB4DE" {...outline} />
    <rect x="44" y="66" width="38" height="16" rx="4" fill={INK} />
    <rect x="50" y="72" width="12" height="3.5" rx="1.7" fill="#7CF3FF" />
    <circle cx="50" cy="94" r="5" fill={GOLD} {...thin} /><circle cx="68" cy="94" r="5" fill={RED} {...thin} /><circle cx="86" cy="94" r="5" fill={CREAM} {...thin} />
    <rect x="100" y="74" width="14" height="12" rx="3" fill={INK} />
    <path d="M38 70 v22" {...shine} />
  </>;
}

/** The chapter 7 ending: Bolt's parts box with its lid open, gears and a glow inside, beside the stone piece. */
function BoxEndArt() {
  return <>
    <Ledge />
    <g className="fq-fp-b-lid">
      <rect x="18" y="20" width="92" height="40" rx="6" fill="#A9784A" {...outline} />
      <path d="M28 32 h72 M28 46 h72" stroke="#7B5230" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    <ellipse cx="64" cy="62" rx="42" ry="9" fill={GOLD} opacity=".55" />
    {[{ x: 46, y: 60, r: 15 }, { x: 84, y: 56, r: 12 }].map(({ x, y, r }, i) => (
      <g key={x} className="fq-fp-b-gear" style={delay(i)}>
        <circle cx={x} cy={y} r={r} fill="none" stroke={INK} strokeWidth="10" strokeDasharray="7 5" />
        <circle cx={x} cy={y} r={r} fill="none" stroke={STEEL} strokeWidth="5" strokeDasharray="7 5" />
        <circle cx={x} cy={y} r={r - 3} fill={STEEL} {...thin} />
        <circle cx={x} cy={y} r="3.5" fill={INK} />
      </g>
    ))}
    <rect x="14" y="64" width="100" height="42" rx="6" fill="#C99A6E" {...outline} />
    <rect x="14" y="64" width="100" height="9" rx="4" fill="#A9784A" {...thin} />
    <path d="M14 88 h100" stroke="#7B5230" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="20" y="64" width="9" height="42" rx="3" fill={STEEL} {...thin} /><rect x="99" y="64" width="9" height="42" rx="3" fill={STEEL} {...thin} />
    <circle cx="64" cy="76" r="5" fill={GOLD} {...thin} />
    <StonePiece x={140} y={62} />
  </>;
}

/* ---------------------------------------------------------------- Chapter 8: the secret in the den */

/** A glass snack jar (46 wide, standing on the ledge) with cookies up to `level` (106 is empty), and its red lid. */
const SnackJar = ({ x, level }: { x: number; level: number }) => <>
  <path d={`M${x} 52 q0 -8 8 -8 h30 q8 0 8 8 v46 q0 8 -8 8 h-30 q-8 0 -8 -8 Z`} fill="#E4F6FF" fillOpacity=".92" {...outline} />
  {level < 100 && <>
    <path d={`M${x + 4} ${level} h38 v${96 - level} q0 6 -6 6 h-26 q-6 0 -6 -6 Z`} fill="#E0A458" stroke="#9A5B1C" strokeWidth="2" />
    <circle cx={x + 14} cy={level + 6} r="2.4" fill="#6B3A12" /><circle cx={x + 30} cy={Math.min(level + 14, 98)} r="2.4" fill="#6B3A12" />
  </>}
  <path d={`M${x + 8} 56 v34`} {...shine} />
  <rect x={x - 3} y="34" width="52" height="12" rx="5" fill={RED} {...thin} />
</>;

/** Lesson 3: "I have whole jars and part of a jar. Let's add them up!" Two full snack jars, and a third with only a few
    cookies in it that slides in beside them. */
function JarsArt() {
  return <>
    <SnackJar x={18} level={56} />
    <SnackJar x={74} level={56} />
    <g className="fq-fp-b-jarin"><SnackJar x={136} level={88} /></g>
  </>;
}

/** Lesson 4: "I ate some of my jars. Okay, okay. How much is left?" One full jar still standing, and an empty jar on
    its side with its lid off and a few crumbs tumbling out of its open end. */
function EmptyJarsArt() {
  return <>
    <SnackJar x={22} level={56} />
    <path d="M98 60 h54 q8 0 8 8 v30 q0 8 -8 8 h-54 Z" fill="#E4F6FF" fillOpacity=".92" {...outline} />
    <path d="M98 58 v50" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    <path d="M110 68 h36" {...shine} />
    <rect x="164" y="94" width="28" height="11" rx="4" fill={RED} {...thin} transform="rotate(-10 178 100)" />
    <g className="fq-fp-b-crumb">
      {[[88, 101, 4], [78, 103, 3], [68, 102, 3.5], [104, 100, 3]].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#E0A458" stroke="#9A5B1C" strokeWidth="1.8" />)}
    </g>
  </>;
}

/** Lesson 7: "Robots count in tenths. Which boot has more charge?" A rocket boot plugged in to charge. */
function BootArt() {
  return <>
    <path d="M30 44 h24 v34 q0 6 8 8 l16 4 q10 3 10 12 v4 h-58 Z" fill={CYAN} {...outline} />
    <path d="M30 96 h58 v10 h-58 Z" fill={INK} />
    <rect x="27" y="38" width="30" height="13" rx="5" fill={GOLD} {...thin} />
    <path d="M36 58 v22" {...shine} />
    <path d="M88 92 q18 -2 22 -10 q4 -8 14 -8" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M88 92 q18 -2 22 -10 q4 -8 14 -8" fill="none" stroke={ORANGE} strokeWidth="4" strokeLinecap="round" />
    <rect x="122" y="56" width="52" height="50" rx="8" fill="#FFE066" {...outline} />
    <g className="fq-fp-b-zap"><path d="M152 62 l-14 20 h10 l-6 18 l18 -24 h-11 l7 -14 Z" fill={ORANGE} {...thin} /></g>
    <circle cx="128" cy="62" r="2.5" fill={INK} /><circle cx="168" cy="100" r="2.5" fill={INK} />
    <path className="fq-fp-b-spark" d="M118 56 l-6 -6 M114 66 l-8 0 M120 48 l0 -8" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
  </>;
}

/** Lesson 9: "Bolt's screen shows two numbers. Which is bigger?" A little screen on a stalk with two glowing eyes and a smile. */
/** Lit-segment digits, like a calculator's: which of the seven segments each digit uses (a top, b top right, c bottom
    right, d bottom, e bottom left, f top left, g middle). */
const SEGMENTS: Record<string, string> = { 0: 'abcdef', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg' };
const segmentPath = (digit: string, x: number, y: number, w = 10, h = 20) => SEGMENTS[digit]!.split('').map((part) => ({
  a: `M${x} ${y} h${w}`, b: `M${x + w} ${y} v${h / 2}`, c: `M${x + w} ${y + h / 2} v${h / 2}`, d: `M${x} ${y + h} h${w}`,
  e: `M${x} ${y + h / 2} v${h / 2}`, f: `M${x} ${y} v${h / 2}`, g: `M${x} ${y + h / 2} h${w}`,
}[part])).join(' ');
/** A decimal in lit segments ("0.6"), its first digit at x. */
const LitDecimal = ({ text, x, y }: { text: string; x: number; y: number }) => {
  let at = x;
  const parts = text.split('').map((char, i) => {
    if (char === '.') { const dot = <circle key={i} cx={at + 1} cy={y + 20} r="2" fill="#7CF3FF" />; at += 7; return dot; }
    const digit = <path key={i} d={segmentPath(char, at, y)} stroke="#7CF3FF" strokeWidth="3" strokeLinecap="round" fill="none" />;
    at += 15; return digit;
  });
  return <g className="fq-fp-b-eye">{parts}</g>;
};

/** Lesson 9: "Bolt's screen shows two decimals." A little screen on a stalk, two decimals lit side by side (never the
    lesson's own numbers, and nothing says which is bigger). */
function ScreenArt() {
  return <>
    <rect x="70" y="94" width="60" height="12" rx="5" fill="#7E8FA8" {...outline} />
    <rect x="93" y="78" width="14" height="18" fill="#7E8FA8" {...outline} />
    <rect x="34" y="14" width="132" height="68" rx="11" fill="#6B7A99" {...outline} />
    <rect x="43" y="23" width="114" height="50" rx="6" fill="#0F1A33" />
    <LitDecimal text="0.6" x={54} y={36} />
    <path d="M94 30 v36" stroke="#3A4A6B" strokeWidth="2.5" strokeLinecap="round" />
    <LitDecimal text="0.45" x={104} y={36} />
    <circle cx="150" cy="78" r="2.5" fill="#7BD389" />
  </>;
}

/** Lesson 10: "Which battery has the most charge?" A jumble of batteries, one just rolled onto the pile. */
const Battery = ({ x, y, body, band }: { x: number; y: number; body: string; band: string }) => <>
  <rect x={x + 30} y={y + 6} width="7" height="10" rx="2.5" fill={STEEL} {...thin} />
  <rect x={x} y={y} width="30" height="22" rx="7" fill={body} {...outline} />
  <rect x={x + 9} y={y} width="9" height="22" fill={band} stroke={INK} strokeWidth="2" />
</>;
/** "Bolt's battery screen is a grid of hundredths." A big battery whose screen is a grid of little squares (none of
    them filled in), and a spare battery that rolls up beside it. */
const GRID = Array.from({ length: 11 }, (_, i) => `M${62 + i * 7.6} 50 v38 M62 ${50 + i * 3.8} h76`).join(' ');
function BatteriesArt() {
  return <>
    <rect x="166" y="60" width="10" height="20" rx="3" fill={STEEL} {...thin} />
    <rect x="34" y="38" width="134" height="64" rx="12" fill="#7BD389" {...outline} />
    <rect x="44" y="38" width="12" height="64" fill={CREAM} stroke={INK} strokeWidth="2" />
    <rect x="60" y="48" width="80" height="42" rx="4" fill="#0F1A33" stroke={INK} strokeWidth="2.5" />
    <path d={GRID} stroke="#7CF3FF" strokeWidth="1.2" opacity=".85" />
    <g className="fq-fp-b-roll"><g transform="rotate(10 160 104)">
      <Battery x={138} y={94} body={RED} band={CREAM} />
    </g></g>
  </>;
}

/** Lesson 11: "Let's join two pieces to fix Bolt's boot strap." Two straps of different lengths, joined at a buckle. */
function StrapArt() {
  return <>
    <ellipse cx="100" cy="106" rx="84" ry="6" fill="rgb(0 0 0 / .25)" />
    <g transform="rotate(-4 55 68)">
      <rect x="10" y="56" width="92" height="24" rx="9" fill="#B5753A" {...outline} />
      <circle cx="30" cy="68" r="3.5" fill={STEEL} stroke={INK} strokeWidth="2" /><circle cx="52" cy="68" r="3.5" fill={STEEL} stroke={INK} strokeWidth="2" />
      <path d="M20 62 h40" {...shine} />
    </g>
    <g className="fq-fp-b-strap">
      <g transform="rotate(5 150 70)">
        <rect x="108" y="58" width="74" height="24" rx="9" fill="#C98A47" {...outline} />
        <circle cx="156" cy="70" r="3.5" fill={STEEL} stroke={INK} strokeWidth="2" /><circle cx="170" cy="70" r="3.5" fill={STEEL} stroke={INK} strokeWidth="2" />
        <path d="M122 64 h26" {...shine} />
      </g>
    </g>
    <rect x="92" y="46" width="30" height="40" rx="7" fill="none" stroke={INK} strokeWidth="13" />
    <rect x="92" y="46" width="30" height="40" rx="7" fill="none" stroke="#D5DEEA" strokeWidth="7" />
    <rect x="100" y="63" width="24" height="6" rx="3" fill={STEEL} {...thin} />
  </>;
}

/** Lesson 12: "How much of a dollar is in my jar? Dimes and pennies." A tipped-over coin purse and the coins that spilled out. */
const Coin = ({ x, y, r, fill, ring }: { x: number; y: number; r: number; fill: string; ring: string }) => <>
  <circle cx={x} cy={y} r={r} fill={fill} {...thin} />
  <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke={ring} strokeWidth="2" />
</>;
const COPPER = { fill: '#D9824A', ring: '#9A4A1C' };
const SILVER = { fill: '#D5DEEA', ring: STEEL_D };
function CoinsArt() {
  return <>
    <Coin x={92} y={96} r={11} {...COPPER} /><Coin x={114} y={98} r={9} {...SILVER} />
    <Coin x={134} y={95} r={11} {...COPPER} /><Coin x={156} y={98} r={9} {...SILVER} />
    <Coin x={104} y={80} r={9} {...SILVER} /><Coin x={126} y={78} r={11} {...COPPER} /><Coin x={146} y={80} r={9} {...SILVER} />
    <path d="M18 106 q-12 -28 10 -42 l-6 -12 h36 l-6 12 q24 14 10 42 Z" fill="#7BD389" {...outline} />
    <path d="M22 54 q18 7 36 0" fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
    <path d="M30 76 q-2 12 2 20" {...shine} />
    <g className="fq-fp-b-coin"><Coin x={116} y={64} r={10} {...COPPER} /></g>
  </>;
}

/** Lesson 13: "I eat the same small piece every day." A pie with one slice served onto a little plate: a berry pie, or
    the theme's pie (an orange pumpkin pie with cream, a cherry pie). */
function PieArt(theme: PropTheme = 'everyday') {
  const look = pieLook(theme);
  const filling = look.plain ? '#D6455D' : look.filling;
  return <>
    <path d="M38 80 v10 a46 16 0 0 0 92 0 v-10 Z" fill="#C98B4E" {...outline} />
    <ellipse cx="84" cy="80" rx="46" ry="16" fill="#E0A458" {...outline} />
    <ellipse cx="84" cy="80" rx="35" ry="11" fill={filling} stroke={look.plain ? '#9A1F3A' : INK} strokeWidth="2" />
    <path d="M84 80 L127.2 85.5 A46 16 0 0 1 110.4 93.1 Z" fill="#A9784A" {...thin} />
    {look.lattice
      ? <><circle cx="66" cy="78" r="2.5" fill="#FF8FB1" /><circle cx="86" cy="73" r="2.5" fill="#FF8FB1" /><circle cx="100" cy="80" r="2.5" fill="#FF8FB1" /></>
      : <ToppingArt kind={look.topping} x={78} y={77} r={6} fill={look.toppingFill} />}
    <g className="fq-fp-b-slice">
      <ellipse cx="156" cy="103" rx="28" ry="6" fill={CREAM} {...thin} />
      <path d="M140 100 L172 90 q7 6 0 14 L140 104 Z" fill="#E0A458" {...outline} />
      <path d="M146 99 L168 93 L168 98 L146 102 Z" fill={filling} />
    </g>
    <path className="fq-fp-b-steam" d="M64 62 q-5 -6 0 -12 M84 58 q-5 -6 0 -12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity=".6" />
  </>;
}

/** Lesson 14: "Each friend gets part of a sandwich tray." A serving tray piled with sandwich triangles. */
const Sandwich = ({ x, y }: { x: number; y: number }) => <g transform={`translate(${x} ${y})`}>
  <path d="M0 0 h46 l-23 -40 Z" fill="#F0C98A" {...outline} />
  <path d="M11 -5 h24 l-12 -21 Z" fill="#7BD389" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
  <circle cx="23" cy="-12" r="3.6" fill={RED} />
</g>;
function TrayArt() {
  return <>
    <Sandwich x={24} y={88} /><Sandwich x={66} y={88} /><Sandwich x={108} y={88} />
    <Sandwich x={45} y={72} /><Sandwich x={87} y={72} />
    <g className="fq-fp-b-top"><Sandwich x={130} y={78} /></g>
    <rect x="14" y="86" width="172" height="16" rx="8" fill="#D5DEEA" {...outline} />
    <path d="M26 92 h60" {...shine} />
    <path d="M14 94 h-8 q-3 0 -3 5 q0 4 3 4 h8 M186 94 h8 q3 0 3 5 q0 4 -3 4 h-8" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
  </>;
}

/* ---------------------------------------------------------------- Registry */

export const PROPS_B: Record<string, PropDef> = {
  'b-bracket': { label: 'A metal bracket with a slot, a block too big to fit it that has broken in two uneven chunks, and a small block dropping into the slot', art: BracketArt, ledge: true },
  'b-spool': { label: 'A spool of copper wire with its loose end curling along the bench', art: SpoolArt, ledge: true },
  'b-rods': { label: 'A bucket of long metal rods sticking out at different heights', art: RodsArt, ledge: true },
  'b-labeler': { label: 'A little label maker pushing out a blank sticker label', art: LabelerArt, ledge: true },
  'b-jars': { label: 'Two full snack jars, and a third jar with only a few cookies in it', art: JarsArt, ledge: true },
  'b-emptyjars': { label: 'A full snack jar, and an empty jar tipped over with cookie crumbs spilling out', art: EmptyJarsArt, ledge: true },
  'b-boot': { label: 'A rocket boot plugged in to a yellow charger', art: BootArt, ledge: true },
  'b-screen': { label: 'A little screen on a stalk showing two decimals side by side', art: ScreenArt },
  'b-batteries': { label: 'A big battery with a screen that is a grid of little squares, and a spare battery', art: BatteriesArt, ledge: true },
  'b-strap': { label: 'Two leather straps of different lengths joined at a metal buckle', art: StrapArt },
  'b-coins': { label: 'A tipped-over green coin purse with small silver coins and bigger copper coins spilled out', art: CoinsArt, ledge: true },
  'b-pie': { label: (theme) => `${pieLook(theme).plain ? 'A berry pie' : aFood(foodWord(theme, 'pie'))} with one slice served on a little plate beside it`, art: PieArt, ledge: true },
  'b-tray': { label: 'A serving tray piled with sandwich triangles', art: TrayArt },
};

export const LESSONS_B: Record<string, string> = {
  'decompose-fractions': 'b-bracket',            // ch 7: "One of my parts is too big for its slot. Can you break it apart?"
  'whole-numbers-as-fractions': 'b-spool',       // ch 7: "Is this wire a whole number of meters?"
  'improper-fractions': 'b-rods',                // ch 7: "one of these rods is longer than a whole"
  'mixed-improper': 'b-labeler',                 // ch 7: "I like to write long numbers the short way"
  'add-mixed-numbers': 'b-jars',                 // ch 8: "I have whole jars and part of a jar."
  'subtract-mixed-numbers': 'b-emptyjars',       // ch 8: "I ate some of my jars."
  'tenths-decimals': 'note',                     // ch 8: "Bolt's note counts in tenths."
  'decimal-fraction-equivalence': 'b-boot',      // ch 8: "Maybe his boots can say it for him."
  'compare-decimals': 'b-screen',                // ch 8: "Bolt's screen shows two decimals"
  'compare-decimals-grid': 'b-batteries',        // ch 8: "Bolt's battery screen is a grid of hundredths"
  'add-tenths-hundredths': 'b-strap',            // ch 8: "join two pieces to fix Bolt's boot strap"
  'dimes-and-pennies': 'b-coins',                // ch 8: "My snack money is dimes and pennies"
  'unit-fraction-multiples': 'b-pie',            // ch 8: "the same small piece of pie each day"
  'multiply-whole-by-fraction': 'b-tray',        // ch 8: "Each friend gets part of a sandwich tray"
};

export const ENDS_B: Record<number, EndDef> = {
  7: { art: BoxEndArt, label: "Bolt's parts box with its lid open and gears glowing inside, and the stone piece shining beside it", sky: 'linear-gradient(#202B48, #526078 68%, #805E43 69%)' },
};
