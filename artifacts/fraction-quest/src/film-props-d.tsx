/* Lesson-film props and chapter endings, batch D (chapters 12 to 15): PROPS_D (prop id -> object), LESSONS_D (lesson id -> prop id)
   and ENDS_D (chapter -> ending). Chapter 12's ending is the prototype's. See film-art.tsx for the shared pieces and rules. */

import React from 'react';
import { CREAM, delay, GOLD, INK, Ledge, outline, StonePiece, type EndDef, type PropDef } from './film-art';
import { aFood, cakeLook, DrinkBadgeArt, drinkLook, foodWord, Steam, ToppingArt } from './film-food';
import type { PropTheme } from './story';

const thin = { ...outline, strokeWidth: 2.5 } as const;
const GLASS = '#E4F6FF';
const STEEL = '#C3CCD6';

/* ---------- Chapter 12 · the stage ---------- */

/** Two stage boards on sawhorses, end to end; the second slides up to the first. */
function BoardsArt() {
  return <>
    {[24, 112].map((x) => <path key={x} d={`M${x} 106 L${x + 12} 74 H${x + 26} L${x + 38} 106 Z`} fill="#8B5E3C" {...outline} />)}
    <rect x="12" y="52" width="98" height="22" rx="4" fill="#E0AE72" {...outline} />
    <path d="M22 60 q14 -3 28 0 t30 0 M30 67 q12 3 26 0" stroke="#B9824A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <circle cx="20" cy="63" r="2.5" fill={INK} /><circle cx="102" cy="63" r="2.5" fill={INK} />
    <g className="fq-fp-d-slide">
      <rect x="110" y="52" width="64" height="22" rx="4" fill="#C98B4E" {...outline} />
      <path d="M120 60 q12 -3 24 0 t24 0 M128 67 q10 3 22 0" stroke="#9A6A3A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="118" cy="63" r="2.5" fill={INK} /><circle cx="166" cy="63" r="2.5" fill={INK} />
    </g>
    <rect x="64" y="99" width="34" height="7" rx="3.5" fill="#C9915B" {...thin} />
    <rect x="94" y="88" width="13" height="18" rx="3" fill="#9FB0C0" {...thin} />
  </>;
}

/** Three clear mugs of lemonade filled to different heights, and a lemonade jug tipped over them. A theme's drink
    changes the colour, the badge on the jug (a lemon slice, a pumpkin, a marshmallow...) and, for a warm drink, adds steam. */
const MUGS: { x: number; level: number }[] = [{ x: 26, level: 82 }, { x: 66, level: 74 }, { x: 106, level: 90 }];
function CupsArt(theme: PropTheme = 'everyday') {
  const drink = drinkLook(theme);
  return <>
    {MUGS.map(({ x, level }, i) => (
      <g key={x}>
        <path d={`M${x + 13} 78 q11 0 11 10 q0 10 -11 10`} fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        <path className={i === 1 ? 'fq-fp-d-rise' : undefined} d={`M${x - 11} ${level} h22 v${98 - level} q0 8 -8 8 h-6 q-8 0 -8 -8 Z`} fill={drink.liquid} />
        <path d={`M${x - 11} ${level} h22`} stroke={drink.top} strokeWidth="3" strokeLinecap="round" />
        <path d={`M${x - 13} 64 V98 q0 8 8 8 h10 q8 0 8 -8 V64`} fill={GLASS} fillOpacity=".3" {...outline} />
        <path d={`M${x - 7} ${level + 8} v${88 - level}`} stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
      </g>
    ))}
    {drink.steam && <Steam xs={[22, 62, 102]} y={60} />}
    <g transform="translate(8 0) rotate(-12 160 106)"><g className="fq-fp-d-tip">
      <path d="M176 48 q13 0 13 14 q0 14 -11 16" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M147.5 66 h25 l2.5 32 q0 8 -8 8 h-14 q-8 0 -8 -8 Z" fill={drink.liquid} />
      <DrinkBadgeArt badge={drink.badge} x={160} y={84} />
      <path d="M146 40 l-9 -3 l3 11 M146 40 h28 l4 58 q0 8 -8 8 h-20 q-8 0 -8 -8 Z" fill={GLASS} fillOpacity=".3" {...outline} />
      <path d="M152 70 v24" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
    </g></g>
  </>;
}
const cupsLabel = (theme: PropTheme) => {
  const name = foodWord(theme, 'drink');
  return `Three clear mugs of ${name} and ${aFood(name)} jug tipped over them`;
};

/** A crate of nails with a few spilled; one nail drops onto the floor. */
const NAILS: { x: number; t: number; h: number }[] = [{ x: 58, t: -10, h: 18 }, { x: 72, t: 6, h: 30 }, { x: 86, t: -4, h: 22 }, { x: 100, t: 12, h: 34 }, { x: 114, t: -8, h: 26 }, { x: 126, t: 4, h: 16 }];
const Nail = ({ x, y, len, t = 0 }: { x: number; y: number; len: number; t?: number }) => (
  <g transform={`rotate(${t} ${x} ${y})`}>
    <path d={`M${x} ${y} v${len}`} stroke="#8E9BAB" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx={x} cy={y} r="4" fill={STEEL} stroke={INK} strokeWidth="2" />
  </g>
);
function NailsArt() {
  return <>
    {NAILS.map(({ x, t, h }) => <Nail key={x} x={x} y={72 - h} len={h} t={t} />)}
    <rect x="44" y="66" width="92" height="40" rx="4" fill="#D8B07A" {...outline} />
    <rect x="40" y="62" width="100" height="9" rx="3.5" fill="#C9915B" {...thin} />
    <path d="M46 83 h88 M46 95 h88" stroke="#B9824A" strokeWidth="2.5" strokeLinecap="round" />
    <Nail x={146} y={101} len={18} t={-80} />
    <Nail x={150} y={106} len={16} t={-100} />
    <g className="fq-fp-d-drop"><Nail x={166} y={97} len={18} t={-84} /></g>
  </>;
}

/** A sandbag hanging from the curtain rope; it swings and settles. */
function SandbagArt() {
  return <>
    <path d="M118 106 q12 -22 32 -22 q20 0 34 22 Z" fill="#E8C77A" {...outline} />
    <path d="M132 98 q8 -8 16 -8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".5" />
    <g className="fq-fp-d-swing">
      <path d="M100 8 V48" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="10" r="6" fill={GOLD} {...thin} />
      <path d="M82 54 Q72 80 80 98 Q100 110 120 98 Q128 80 118 54 Q100 48 82 54 Z" fill="#E3C58A" {...outline} />
      <path d="M85 51 h30 l-4 9 h-22 Z" fill="#B9824A" {...thin} />
      <path d="M88 74 l7 3 M104 80 l7 -2 M91 90 l8 2 M108 90 l7 -4" stroke="#B08A4E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M86 68 q-3 12 0 22" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".5" />
    </g>
  </>;
}

/** A coil of rope with its snapped end lying out on the boards. */
function RopeArt() {
  return <>
    <ellipse cx="62" cy="98" rx="42" ry="14" fill="#C69A5B" {...outline} />
    <ellipse cx="62" cy="86" rx="42" ry="14" fill="#D9B26F" {...outline} />
    <ellipse cx="62" cy="76" rx="40" ry="13" fill="#E3C183" {...outline} />
    <ellipse cx="62" cy="76" rx="20" ry="6" fill="#8B5E3C" />
    <ellipse cx="62" cy="76" rx="31" ry="9.5" fill="none" stroke="#A5763D" strokeWidth="2.5" strokeDasharray="5 6" strokeLinecap="round" />
    <g className="fq-fp-d-sway">
      <path d="M98 94 q26 10 48 2 q14 -6 22 -22" fill="none" stroke={INK} strokeWidth="14" strokeLinecap="round" />
      <path d="M98 94 q26 10 48 2 q14 -6 22 -22" fill="none" stroke="#D9B26F" strokeWidth="8" strokeLinecap="round" />
      <path d="M98 94 q26 10 48 2 q14 -6 22 -22" fill="none" stroke="#A5763D" strokeWidth="8" strokeLinecap="round" strokeDasharray="2.5 7" />
      <path d="M168 74 l-4 -9 M168 74 l1 -10 M168 74 l8 -7" stroke="#D9B26F" strokeWidth="3" strokeLinecap="round" />
    </g>
  </>;
}

/** A baking pan with only a small piece of cake left in it, and a fork: the theme's cake (its colours and topping), or a
    slice of pie when the cake word is one. */
function CakeArt(theme: PropTheme = 'everyday') {
  const look = cakeLook(theme);
  return <>
    <path d="M36 62 H128 L144 84 H20 Z" fill="#8E9BAF" {...outline} />
    <path d="M20 84 H144 V101 q0 5 -5 5 H25 q-5 0 -5 -5 Z" fill={STEEL} {...outline} />
    <path d="M26 90 h112" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
    {look.pie ? <>
      <path d="M32 80 L76 80 L66 60 Z" fill={look.frosting} {...outline} />
      <path d="M32 80 L76 80" stroke="#E0A458" strokeWidth="7" strokeLinecap="round" />
      <path d="M32 80 L76 80" fill="none" stroke={INK} strokeWidth="2" opacity=".5" />
      <ToppingArt kind={look.topping} x={56} y={70} r={5} fill={look.toppingFill} />
    </> : <>
      <path d="M36 80 V64 q0 -6 6 -6 h22 q6 0 6 6 V80 Z" fill={look.plain ? '#F3C77E' : look.sponge} {...outline} />
      <path d="M36 65 q0 -8 8 -8 h20 q8 0 8 8 q-3 6 -6 1 q-3 6 -6 0 q-3 6 -6 0 q-3 6 -6 0 q-3 6 -6 0 q-3 5 -6 -1 Z" fill={look.plain ? '#FFB3C7' : look.frosting} {...thin} />
      {look.plain
        ? <><circle cx="54" cy="51" r="5.5" fill="#E63946" {...thin} /><path d="M54 46 q3 -6 7 -7" stroke="#3E9954" strokeWidth="2.5" fill="none" strokeLinecap="round" /></>
        : <ToppingArt kind={look.topping} x={54} y={51} r={6} fill={look.toppingFill} />}
    </>}
    <circle cx="84" cy="76" r="2.2" fill="#E8B15D" /><circle cx="97" cy="80" r="1.8" fill="#E8B15D" /><circle cx="76" cy="70" r="1.6" fill="#E8B15D" />
    <g className="fq-fp-d-in">
      <rect x="164" y="97" width="26" height="6" rx="3" fill={STEEL} {...thin} />
      <rect x="150" y="93" width="16" height="14" rx="3" fill={STEEL} {...thin} />
      <path d="M150 95 h-8 M150 100 h-9 M150 105 h-8" stroke={STEEL} strokeWidth="3.5" strokeLinecap="round" />
    </g>
  </>;
}

/** An open paint can with drips, its lid leaning beside it, and a scoop that lands next to it. */
function PaintArt() {
  return <>
    <path d="M52 58 q29 -34 58 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    <rect x="50" y="56" width="62" height="50" rx="5" fill="#D6DEE8" {...outline} />
    <rect x="52" y="72" width="58" height="16" fill="#4CC9F0" stroke={INK} strokeWidth="2.5" />
    <ellipse cx="81" cy="56" rx="31" ry="8" fill="#D6DEE8" {...outline} />
    <ellipse cx="81" cy="56" rx="25" ry="5.5" fill="#FF6FA3" />
    <path d="M90 58 q0 16 5 16 q5 0 5 -16 Z" fill="#FF6FA3" {...thin} />
    <ellipse cx="30" cy="94" rx="8" ry="14" fill="#A8B4C8" {...outline} />
    <g className="fq-fp-d-drop">
      <rect x="152" y="86" width="36" height="6" rx="3" transform="rotate(-38 152 89)" fill={GOLD} {...thin} />
      <path d="M126 88 h30 q0 18 -15 18 q-15 0 -15 -18 Z" fill={GOLD} {...outline} />
      <ellipse cx="141" cy="88" rx="15" ry="4" fill="#FF6FA3" />
    </g>
  </>;
}

/** A lump of clay for the props, and little cloth bags tied with string; the last bag pops into place. */
const Pouch = ({ x, y, s, className }: { x: number; y: number; s: number; className?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className={className}>
      <path d="M-14 0 Q-19 -16 -8 -26 L8 -26 Q19 -16 14 0 Q0 6 -14 0 Z" fill="#F2E2B3" stroke={INK} strokeWidth={2.5 / s} strokeLinejoin="round" />
      <path d="M-9 -24 h18" stroke="#E63946" strokeWidth="4" strokeLinecap="round" />
      <path d="M0 -26 q-9 -9 -11 -2 M0 -26 q9 -9 11 -2" fill="none" stroke="#E63946" strokeWidth="3" strokeLinecap="round" />
    </g>
  </g>
);
function ClayArt() {
  return <>
    <path d="M24 106 Q20 66 62 58 Q108 52 118 84 Q124 100 116 106 Z" fill="#D2694A" {...outline} />
    <ellipse cx="50" cy="86" rx="7" ry="4.5" transform="rotate(-18 50 86)" fill="#B5523A" /><ellipse cx="80" cy="74" rx="6" ry="4" transform="rotate(10 80 74)" fill="#B5523A" /><ellipse cx="94" cy="94" rx="6" ry="4" fill="#B5523A" />
    <path d="M38 76 q6 -12 20 -14" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".45" />
    <Pouch x={142} y={106} s={1.5} />
    <Pouch x={172} y={106} s={1.05} className="fq-fp-d-pop" />
  </>;
}

/* ---------- Chapter 13 · the garden ---------- */

/** A wooden-framed garden plot with sprouts, and a bee that lands above it. */
const SPROUTS: [number, number][] = [[70, 76], [96, 70], [122, 78], [146, 73], [50, 84], [102, 86], [150, 86]];
function PlotArt() {
  return <>
    <path d="M46 62 H154 L182 90 H18 Z" fill="#6B4226" {...outline} />
    {SPROUTS.map(([x, y]) => <g key={x}>
      <path d={`M${x} ${y} v-9`} stroke="#4CAF50" strokeWidth="3.5" strokeLinecap="round" />
      <path d={`M${x} ${y - 8} q-8 -2 -9 -9 q8 0 9 9 Z M${x} ${y - 8} q8 -2 9 -9 q-8 0 -9 9 Z`} fill="#7BD389" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </g>)}
    <rect x="18" y="90" width="164" height="16" rx="3" fill="#C9915B" {...outline} />
    <path d="M26 98 h60 M104 98 h70" stroke="#9A6A3A" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="12" y="82" width="10" height="24" rx="3" fill="#A9784A" {...thin} /><rect x="178" y="82" width="10" height="24" rx="3" fill="#A9784A" {...thin} />
    <path d="M92 60 q20 -22 48 -14" fill="none" stroke={CREAM} strokeWidth="3" strokeDasharray="4 5" strokeLinecap="round" />
    <g className="fq-fp-d-bee">
      <ellipse cx="146" cy="30" rx="6" ry="4" fill={GLASS} fillOpacity=".85" {...thin} strokeWidth={2} /><ellipse cx="156" cy="29" rx="6" ry="4" fill={GLASS} fillOpacity=".85" {...thin} strokeWidth={2} />
      <ellipse cx="152" cy="40" rx="11" ry="7.5" fill={GOLD} {...thin} />
      <path d="M148 34 v12 M155 34.5 v11" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="141" cy="39" r="1.6" fill={INK} />
    </g>
  </>;
}

/** A long planter of tall flowers; they grow up on the beat. */
const FLOWERS: { x: number; top: number; color: string }[] = [
  { x: 42, top: 44, color: '#FF6FA3' }, { x: 66, top: 28, color: GOLD }, { x: 90, top: 48, color: '#FF6B6B' },
  { x: 114, top: 32, color: '#B58BD9' }, { x: 138, top: 44, color: '#4CC9F0' }, { x: 162, top: 30, color: '#FF9F1C' },
];
function FlowersArt() {
  return <>
    {FLOWERS.map(({ x, top, color }, i) => (
      <g key={x} className="fq-fp-d-bloom" style={delay(i)}>
        <path d={`M${x} 84 V${top}`} stroke="#3E9954" strokeWidth="4" strokeLinecap="round" />
        {i % 2 === 0
          ? <><circle cx={x} cy={top} r="10.5" fill={color} {...thin} /><circle cx={x} cy={top} r="3.8" fill={CREAM} /></>
          : <path d={`M${x - 9} ${top - 8} q0 18 9 18 q9 0 9 -18 l-4.5 5 l-4.5 -8 l-4.5 8 Z`} fill={color} {...thin} />}
      </g>
    ))}
    <rect x="24" y="82" width="152" height="24" rx="4" fill="#B5763E" {...outline} />
    <rect x="28" y="76" width="144" height="10" rx="4" fill="#5B3A22" {...thin} />
    <path d="M34 98 h132" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
  </>;
}

/* ---------- Chapter 14 · the lock ---------- */

/** A steel safe door with a big dial: a crossbar turns, and the lamp is green. */
function DialArt() {
  return <>
    <rect x="12" y="12" width="140" height="94" rx="12" fill="#8FA3C8" {...outline} />
    {[[22, 22], [142, 22], [22, 96], [142, 96]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill={STEEL} stroke={INK} strokeWidth="2" />)}
    <circle cx="66" cy="21" r="9" fill="#7BD389" opacity=".4" /><circle cx="66" cy="21" r="5" fill="#7BD389" {...thin} />
    <circle cx="66" cy="66" r="32" fill="#DDE6F5" {...outline} />
    <circle cx="66" cy="66" r="21" fill="#B3C2DD" {...thin} />
    <path d="M50 56 q6 -9 16 -10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
    <g className="fq-fp-d-knob">
      <rect x="40" y="62" width="52" height="8" rx="4" fill={GOLD} {...thin} />
      <circle cx="66" cy="66" r="7" fill={GOLD} {...thin} />
    </g>
    <rect x="116" y="38" width="12" height="44" rx="6" fill={GOLD} {...thin} />
    <circle cx="122" cy="94" r="4" fill={INK} />
    <rect x="6" y="28" width="9" height="16" rx="3" fill="#6C7A99" {...thin} /><rect x="6" y="72" width="9" height="16" rx="3" fill="#6C7A99" {...thin} />
  </>;
}

/** A little treasure chest with a round dial lock ("One dial is left"), whose lid has just popped open, with light spilling out. */
function ChestArt() {
  return <>
    <rect x="44" y="62" width="112" height="44" rx="6" fill="#A8693A" {...outline} />
    <rect x="92" y="62" width="16" height="44" fill={GOLD} stroke={INK} strokeWidth="2.5" />
    <circle cx="100" cy="84" r="12" fill={STEEL} {...outline} /><circle cx="100" cy="84" r="5" fill="#8E9BAF" stroke={INK} strokeWidth="2" /><path d="M100 84 l6 -7" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    {[[52, 70], [148, 70], [52, 98], [148, 98]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill={GOLD} stroke={INK} strokeWidth="1.5" />)}
    <ellipse cx="100" cy="60" rx="46" ry="9" fill="#FFE066" />
    <g transform="rotate(-24 44 62)"><g className="fq-fp-d-lid">
      <path d="M44 62 q0 -30 56 -30 q56 0 56 30 Z" fill="#C98B4E" {...outline} />
      <rect x="92" y="33" width="16" height="29" fill={GOLD} stroke={INK} strokeWidth="2.5" />
    </g></g>
    <circle cx="138" cy="36" r="3.2" fill={CREAM} /><circle cx="152" cy="46" r="2.4" fill={CREAM} /><circle cx="120" cy="22" r="2.4" fill="#FFE066" />
  </>;
}

/* ---------- Chapter 15 · the festival ---------- */

/** Chomp's riddle scroll with a pencil: one line is circled in red; the pencil's eraser scrubs. */
const SQUIGGLES = ['M52 42 q8 -7 16 0 t16 0 t16 0 t16 0 t16 0', 'M52 58 q8 -7 16 0 t16 0 t16 0 t16 0', 'M52 74 q8 -7 16 0 t16 0 t16 0'];
function ScrollArt() {
  return <>
    <rect x="38" y="22" width="124" height="78" rx="3" fill={CREAM} {...outline} />
    <rect x="30" y="14" width="140" height="14" rx="7" fill="#E7D6A8" {...outline} />
    <rect x="30" y="94" width="140" height="14" rx="7" fill="#E7D6A8" {...outline} />
    {SQUIGGLES.map((d) => <path key={d} d={d} fill="none" stroke="#7C6E54" strokeWidth="3" strokeLinecap="round" />)}
    <ellipse cx="94" cy="57" rx="48" ry="10" fill="none" stroke="#E63946" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="120 12" />
    <g transform="rotate(-24 120 84)"><g className="fq-fp-d-scrub">
      <rect x="96" y="80" width="60" height="9" rx="2" fill={GOLD} {...thin} />
      <path d="M96 80 l-12 4.5 l12 4.5 Z" fill="#F6C99A" {...thin} strokeLinejoin="round" />
      <rect x="154" y="80" width="5" height="9" fill={STEEL} {...thin} strokeWidth={2} /><rect x="159" y="80" width="10" height="9" rx="2" fill="#FF8FA3" {...thin} />
    </g></g>
    <circle cx="176" cy="94" r="2.5" fill="#FF8FA3" /><circle cx="181" cy="99" r="2" fill="#FF8FA3" />
  </>;
}

/** A big party bowl heaped with snacks, and a small plate with a couple on it. */
const SNACKS: { x: number; y: number; r: number; c: string }[] = [
  { x: 40, y: 74, r: 9, c: '#FF9F1C' }, { x: 118, y: 74, r: 9, c: '#FF8FA3' }, { x: 62, y: 70, r: 10, c: GOLD }, { x: 98, y: 70, r: 10, c: '#7BD389' },
  { x: 80, y: 72, r: 10, c: '#FFF4D6' }, { x: 52, y: 60, r: 9, c: '#7BD389' }, { x: 104, y: 58, r: 9, c: GOLD }, { x: 72, y: 56, r: 10, c: '#FF8FA3' }, { x: 88, y: 50, r: 9, c: '#FF9F1C' },
];
function SnacksArt() {
  return <>
    {SNACKS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.c} {...thin} />)}
    <path d="M26 74 H132 q0 34 -53 34 q-53 0 -53 -34 Z" fill="#4CC9F0" {...outline} />
    <rect x="22" y="70" width="114" height="9" rx="4.5" fill={GOLD} {...thin} />
    <path d="M40 90 q6 10 18 13" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55" />
    <g className="fq-fp-d-in">
      <ellipse cx="164" cy="103" rx="26" ry="7" fill={CREAM} {...outline} />
      <circle cx="154" cy="96" r="7" fill={GOLD} {...thin} /><circle cx="170" cy="95" r="7" fill="#7BD389" {...thin} />
    </g>
  </>;
}

/** A glass measuring jug of lemonade, and a small scoop that dips in. A theme's drink changes the colour, puts its badge
    (a pumpkin, a marshmallow, an apple...) on the jug, and steams when it is warm. */
function JugArt(theme: PropTheme = 'everyday') {
  const drink = drinkLook(theme);
  const plain = foodWord(theme, 'drink') === 'lemonade';
  return <>
    <path d="M114 40 q22 2 20 26 q-2 20 -14 24" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
    <path d="M56.5 58 H111.5 L108.2 96 q-1 10 -11 10 H71 q-10 0 -11 -10 Z" fill={drink.liquid} />
    <path d="M56.5 58 H111.5" stroke={plain ? CREAM : drink.top} strokeWidth="3" strokeLinecap="round" />
    {!plain && <DrinkBadgeArt badge={drink.badge} x={86} y={82} r={9} />}
    {drink.steam && <Steam xs={[72, 96]} y={22} />}
    <path d="M44 26 l10 4 l-4 10 M54 30 H114 L108 96 q-1 10 -11 10 H71 q-10 0 -11 -10 Z" fill={GLASS} fillOpacity=".5" {...outline} />
    <path d="M64 64 v28" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
    <g className="fq-fp-d-drop">
      <rect x="172" y="84" width="26" height="6" rx="3" transform="rotate(-45 172 87)" fill={GOLD} {...thin} />
      <path d="M146 86 h30 q0 20 -15 20 q-15 0 -15 -20 Z" fill={GOLD} {...outline} />
      <ellipse cx="161" cy="86" rx="15" ry="4" fill={drink.liquid} />
    </g>
  </>;
}

/* ---------- Chapter endings ---------- */

/** Chapter 13: Bea's seed sack, a shovel and a sprout, with the stone piece found beside them. */
function GardenEndArt() {
  return <>
    <Ledge />
    <path d="M26 106 Q16 74 34 56 H68 Q86 74 76 106 Z" fill="#E3C58A" {...outline} />
    <path d="M32 54 q-7 -12 6 -14 q7 4 14 -2 q8 6 16 0 q11 4 3 16 Z" fill="#E3C58A" {...outline} />
    <rect x="34" y="55" width="36" height="7" rx="3" fill="#E63946" {...thin} />
    <path d="M44 80 q6 -4 12 0 M42 92 l7 3" stroke="#B08A4E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <ellipse cx="86" cy="103" rx="3" ry="2" fill="#5B3A22" /><ellipse cx="92" cy="101" rx="3" ry="2" fill="#5B3A22" /><ellipse cx="82" cy="99" rx="3" ry="2" fill="#5B3A22" />
    <g transform="rotate(14 112 106)">
      <rect x="109" y="44" width="6" height="56" rx="3" fill="#C9915B" {...thin} />
      <circle cx="112" cy="42" r="5" fill="#C9915B" {...thin} />
      <path d="M104 98 h16 v6 q0 8 -8 8 q-8 0 -8 -8 Z" fill={STEEL} {...thin} />
    </g>
    <g className="fq-fp-d-bloom">
      <path d="M126 106 V86" stroke="#3E9954" strokeWidth="4" strokeLinecap="round" />
      <path d="M126 92 q-10 -2 -11 -11 q10 0 11 11 Z M126 88 q10 -2 11 -11 q-10 0 -11 11 Z" fill="#7BD389" {...thin} strokeWidth={2} />
    </g>
    <StonePiece x={146} y={62} />
  </>;
}

/** Chapter 14: an open padlock, its key, and the stone piece the code released. */
function LockEndArt() {
  return <>
    <Ledge />
    <g transform="translate(0 -12)"><g className="fq-fp-d-lift">
      <path d="M38 74 V44 q0 -20 19 -20 q19 0 19 20 V62" fill="none" stroke={INK} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 74 V44 q0 -20 19 -20 q19 0 19 20 V62" fill="none" stroke={STEEL} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </g></g>
    <rect x="28" y="62" width="58" height="44" rx="8" fill="#8FA3C8" {...outline} />
    <circle cx="57" cy="80" r="6" fill={INK} /><path d="M57 80 l-3 12 h6 Z" fill={INK} />
    <path d="M36 70 q4 -4 10 -4" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />
    <circle cx="100" cy="98" r="7" fill={CREAM} {...thin} /><circle cx="100" cy="98" r="2.5" fill={INK} />
    <rect x="106" y="95" width="26" height="6" rx="3" fill={CREAM} {...thin} />
    <path d="M122 101 v7 M128 101 v5" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    <StonePiece x={146} y={62} />
  </>;
}

/** Chapter 15: a festival lantern post with two glowing lanterns, and the last stone piece. */
const Lantern = ({ x, y, color, i }: { x: number; y: number; color: string; i: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className="fq-fp-d-swing" style={delay(i)}>
      <path d="M0 -12 V0" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="0" cy="15" r="20" fill={GOLD} opacity=".3" />
      <path d="M-12 0 q-6 15 0 30 q12 8 24 0 q6 -15 0 -30 Z" fill={color} {...outline} strokeWidth={2.8} />
      <rect x="-9" y="-3" width="18" height="6" rx="3" fill={GOLD} {...thin} strokeWidth={2} /><rect x="-9" y="27" width="18" height="6" rx="3" fill={GOLD} {...thin} strokeWidth={2} />
      <path d="M-7 8 q-2 8 0 14" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />
    </g>
  </g>
);
function FestivalEndArt() {
  return <>
    <Ledge />
    <rect x="20" y="14" width="8" height="92" rx="3" fill="#C9915B" {...outline} strokeWidth={2.8} />
    <rect x="20" y="14" width="86" height="8" rx="3.5" fill="#C9915B" {...outline} strokeWidth={2.8} />
    <circle cx="24" cy="12" r="5" fill={GOLD} {...thin} />
    <Lantern x={48} y={34} color="#4CC9F0" i={0} />
    <Lantern x={88} y={34} color="#FF8FA3" i={1} />
    <path d="M24 106 h14 M24 100 q-8 6 -4 10" stroke="#3E9954" strokeWidth="3" fill="none" strokeLinecap="round" />
    <StonePiece x={130} y={62} />
  </>;
}

export const PROPS_D: Record<string, PropDef> = {
  'd-boards': { label: 'Two wooden stage boards on sawhorses, end to end, with a hammer', art: BoardsArt, ledge: true },
  'd-cups': { label: cupsLabel, art: CupsArt, ledge: true },
  'd-nails': { label: 'A wooden crate of shiny nails with a few spilled on the floor', art: NailsArt, ledge: true },
  'd-sandbag': { label: 'A sandbag hanging from a rope, with a little pile of sand beside it', art: SandbagArt, ledge: true },
  'd-rope': { label: 'A coil of rope with its snapped, frayed end lying out', art: RopeArt, ledge: true },
  'd-cake': { label: (theme) => `A baking pan with a small piece of ${foodWord(theme, 'cake')} left in it, and a fork`, art: CakeArt, ledge: true },
  'd-paint': { label: 'An open pink paint can with drips, its lid leaning beside it, and a scoop', art: PaintArt, ledge: true },
  'd-clay': { label: 'A lump of clay and little cloth bags tied with red string', art: ClayArt, ledge: true },
  'd-plot': { label: 'A wooden garden plot with little green sprouts, and a bee flying in', art: PlotArt, ledge: true },
  'd-flowers': { label: 'A long wooden planter of tall flowers in different colors', art: FlowersArt, ledge: true },
  'd-dial': { label: 'A steel safe door with a big round dial and a green lamp', art: DialArt, ledge: true },
  'd-chest': { label: 'A little treasure chest with a round dial lock, its lid popped open and light shining out', art: ChestArt, ledge: true },
  'd-scroll': { label: 'A riddle scroll with one wavy line circled in red, and a pencil with an eraser', art: ScrollArt },
  'd-snacks': { label: 'A big party bowl heaped with snacks, and a small plate beside it', art: SnacksArt, ledge: true },
  'd-jug': { label: (theme) => `A glass measuring jug of ${foodWord(theme, 'drink')}, and a small scoop beside it`, art: JugArt, ledge: true },
};
export const LESSONS_D: Record<string, string> = {
  'fractional-measure-addition': 'd-boards',      // ch 12: "Two boards go end to end. How long together?"
  'line-plot-leveling': 'd-cups',                 // ch 12: "Let's even out the cups so they match."
  'fractional-unit-conversions': 'd-nails',       // ch 12: "Pip needs nails... pounds and ounces"
  'two-step-conversions': 'd-sandbag',            // ch 12: Pip fills a sandbag to hold the curtain
  'fraction-as-division': 'd-rope',               // ch 12: "The stage rope snapped."
  'unit-fraction-divided-whole': 'd-cake',        // ch 12: the crew shares one small part of the cake
  'divide-whole-by-unit-fraction': 'd-paint',     // ch 12: scoops of paint for the stage
  'share-or-fit': 'd-clay',                       // ch 12: bag the clay for the props
  'fractional-side-area': 'd-plot',               // ch 13: "Every plot in the garden is a different size"
  'multiply-mixed-numbers': 'd-flowers',          // ch 13: Bea's flower bed
  'percent-to-fraction': 'd-dial',                // ch 14: a dial on the lock
  'multi-step-fraction-stories': 'd-chest',       // ch 14: "One dial is left. It hides a puzzle"
  'spot-the-mistake': 'd-scroll',                 // ch 15: Chomp's riddle with a mistake in it
  'fraction-of-remainder': 'd-snacks',            // ch 15: Chomp's snacks, shared with friends
  'divide-fractions': 'd-jug',                    // ch 15: scoops of drink in a cup
};
export const ENDS_D: Record<number, EndDef> = {
  13: { art: GardenEndArt, label: "Bea's seed sack, a shovel and a little sprout, and the stone piece shining beside them", sky: 'linear-gradient(#9EDCFF 0 48%, #5FB872 49%)' },
  14: { art: LockEndArt, label: 'An open padlock and its key, and the stone piece glowing beside them', sky: 'radial-gradient(ellipse at 48% 44%, #63568A, #211D3A 70%)' },
  15: { art: FestivalEndArt, label: 'A festival post with two glowing lanterns, and the last stone piece shining beside it', sky: 'linear-gradient(#211D45, #6D4BD8 66%, #372D56)' },
};
