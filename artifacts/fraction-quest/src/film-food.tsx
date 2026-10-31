/* Seasonal food in the films. Story lines name their treats with blanks ("my {cake}", "cups of {drink}") that the theme
   showing now fills (story.ts PROPS): a Halloween film says "pumpkin pie", a December one "hot cocoa". The picture has
   to show the same food, so every food word a theme can put in a film line has a look here, keyed by that word: the
   colours and the topping of the cake, pie, drink, jar snack or snack bar the props draw. The shapes stay the props'
   own (film-props-*.tsx and the chapter 1 and 2 openers); only colours and a small topping change, and a cake word
   that is really a pie ("pumpkin pie") is drawn as a pie. The everyday words keep each prop's own colours.
   film-prop-fit.test.ts checks every theme and every month. */

import React, { type CSSProperties, type ReactNode } from 'react';
import { INK, outline } from './film-art';
import { PROPS, type PropTheme } from './story';

const thin = { ...outline, strokeWidth: 2.5 } as const;

export type Topping = 'cherry' | 'strawberry' | 'holly' | 'snow' | 'carrot' | 'sprinkles' | 'honey' | 'scoop' | 'marshmallow' | 'shell' | 'apple' | 'leaf' | 'cream';

/** A cake word's look. `plain` (the everyday "cake") keeps each prop's own colours; `pie` is a cake word that is a pie. */
export type CakeLook = { plain?: boolean; pie?: boolean; sponge: string; frosting: string; edge: string; topping: Topping; toppingFill: string };
export type PieLook = { plain?: boolean; filling: string; lattice: boolean; topping: Topping; toppingFill: string };
export type DrinkBadge = 'lemon' | 'pumpkin' | 'marshmallow' | 'berry' | 'honey' | 'coconut' | 'apple' | 'shell';
export type DrinkLook = { liquid: string; top: string; badge: DrinkBadge; steam?: boolean };
export type SnackKind = 'cookie' | 'candy' | 'candy cane';
export type BarLook = { plain?: boolean; fill: string; edge: string };

/** Every cake word: the everyday one, the holidays' and each month's (month-themes.ts foods.cake). */
export const CAKES: Record<string, CakeLook> = {
  cake: { plain: true, sponge: '#F2C879', frosting: '#F6A55B', edge: '#B5651D', topping: 'cherry', toppingFill: '#E63946' },
  'pumpkin pie': { pie: true, sponge: '#E0A458', frosting: '#E8862A', edge: '#A8561A', topping: 'cream', toppingFill: '#FFFFFF' },
  'Christmas cake': { sponge: '#9A6238', frosting: '#FFFFFF', edge: '#7A4A22', topping: 'holly', toppingFill: '#E63946' },
  'snowball cake': { sponge: '#F2C879', frosting: '#F4FBFF', edge: '#8FB8D6', topping: 'snow', toppingFill: '#FFFFFF' },
  'strawberry cake': { sponge: '#FFD1DC', frosting: '#FF8FB1', edge: '#C94F78', topping: 'strawberry', toppingFill: '#E63946' },
  'carrot cake': { sponge: '#D98B45', frosting: '#FFF8EC', edge: '#A8692E', topping: 'carrot', toppingFill: '#F28C28' },
  'rainbow cake': { sponge: '#C9A7FF', frosting: '#FFFFFF', edge: '#8A6BD1', topping: 'sprinkles', toppingFill: '#FF6B6B' },
  'honey cake': { sponge: '#E8B04A', frosting: '#FFD36B', edge: '#B57E14', topping: 'honey', toppingFill: '#F2A007' },
  'ice cream cake': { sponge: '#7A4A2E', frosting: '#FFE3EE', edge: '#C76A8C', topping: 'scoop', toppingFill: '#FF9EB5' },
  's’mores cake': { sponge: '#7A4A2E', frosting: '#FFFFFF', edge: '#5B3A22', topping: 'marshmallow', toppingFill: '#FFFFFF' },
  'ocean cake': { sponge: '#8FDBFF', frosting: '#3FA9E0', edge: '#1F6E9C', topping: 'shell', toppingFill: '#FFC800' },
  'apple cake': { sponge: '#EDC07A', frosting: '#F7E3B5', edge: '#B98552', topping: 'apple', toppingFill: '#E63946' },
  'maple cake': { sponge: '#D9A060', frosting: '#B5651D', edge: '#7A4A22', topping: 'leaf', toppingFill: '#E8562A' },
};

/** Every pie word ("pie" itself keeps each prop's own berry or cherry pie). */
export const PIES: Record<string, PieLook> = {
  pie: { plain: true, filling: '#D6455D', lattice: true, topping: 'cherry', toppingFill: '#E04058' },
  'pumpkin pie': { filling: '#E8862A', lattice: false, topping: 'cream', toppingFill: '#FFFFFF' },
  'cherry pie': { filling: '#C8102E', lattice: true, topping: 'cherry', toppingFill: '#E04058' },
};

/** Every drink word: the colour in the glass, the fruit (or treat) badge on the jug, and steam for a warm drink. */
export const DRINKS: Record<string, DrinkLook> = {
  lemonade: { liquid: '#FFE066', top: '#FFF3A8', badge: 'lemon' },
  'pink lemonade': { liquid: '#FF9EC4', top: '#FFCCE0', badge: 'lemon' },
  'honey lemonade': { liquid: '#F6C343', top: '#FFE08A', badge: 'honey' },
  'pumpkin juice': { liquid: '#F28C28', top: '#FFB866', badge: 'pumpkin' },
  'hot cocoa': { liquid: '#8B5A3C', top: '#B98463', badge: 'marshmallow', steam: true },
  'berry juice': { liquid: '#A63D9A', top: '#D77CCB', badge: 'berry' },
  'coconut water': { liquid: '#E6F2DC', top: '#FFFFFF', badge: 'coconut' },
  'sea-blue juice': { liquid: '#2FA7E0', top: '#8FDBFF', badge: 'shell' },
  'apple juice': { liquid: '#F0B23A', top: '#FFD98A', badge: 'apple' },
  'warm cider': { liquid: '#B8692A', top: '#DB9A5C', badge: 'apple', steam: true },
};

/** What a snack jar holds: cookies, wrapped candies, or candy canes. */
export const SNACKS: Record<string, SnackKind> = { snack: 'cookie', candy: 'candy', 'candy cane': 'candy cane' };

/** The chapter 2 bars: snack bars, chocolate candy bars, or striped peppermint bars. */
export const BARS: Record<string, BarLook> = {
  'snack bars': { plain: true, fill: '#B5651D', edge: '#8A4A12' },
  'candy bars': { fill: '#6B3A1E', edge: '#4A2612' },
  'peppermint bars': { fill: 'repeating-linear-gradient(120deg, #FFFFFF 0 7px, #E63946 7px 11px)', edge: '#B81D2B' },
};

/** The word a theme puts in a film line for one of its blanks ("cake" is "pumpkin pie" at Halloween). */
export const foodWord = (theme: PropTheme, key: string) => PROPS[theme]?.[key] ?? PROPS.everyday[key]!;
export const cakeLook = (theme: PropTheme): CakeLook => CAKES[foodWord(theme, 'cake')] ?? CAKES.cake!;
export const pieLook = (theme: PropTheme): PieLook => PIES[foodWord(theme, 'pie')] ?? PIES.pie!;
export const drinkLook = (theme: PropTheme): DrinkLook => DRINKS[foodWord(theme, 'drink')] ?? DRINKS.lemonade!;
export const snackKind = (theme: PropTheme): SnackKind => SNACKS[foodWord(theme, 'snack')] ?? 'cookie';
export const barLook = (theme: PropTheme): BarLook => BARS[foodWord(theme, 'bars')] ?? BARS['snack bars']!;
/** "a cake", "an apple cake". */
export const aFood = (name: string) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;

/* ---------- Small drawings the props share ---------- */

/** A topping centred on x, y (r is about its radius). */
export function ToppingArt({ kind, x, y, r = 6, fill }: { kind: Topping; x: number; y: number; r?: number; fill: string }) {
  switch (kind) {
    case 'cherry': return <g><path d={`M${x} ${y - r} q${r * .5} -${r * 1.5} ${r * 1.4} -${r * 1.7}`} stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" /><circle cx={x} cy={y} r={r} fill={fill} {...thin} /></g>;
    case 'strawberry': return <g><path d={`M${x - r} ${y - r * .4} q${r} -${r * .5} ${r * 2} 0 q0 ${r * 1.4} -${r} ${r * 1.8} q-${r} -${r * .4} -${r} -${r * 1.8} Z`} fill={fill} {...thin} /><path d={`M${x - r * .7} ${y - r * .6} l${r * .7} -${r * .6} l${r * .7} ${r * .6}`} stroke="#3E9954" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>;
    case 'holly': return <g><path d={`M${x} ${y} q-${r * 1.4} -${r * .9} -${r * 2.2} ${r * .2} q${r * 1.2} ${r * .7} ${r * 2.2} -${r * .2} Z M${x} ${y} q${r * 1.4} -${r * .9} ${r * 2.2} ${r * .2} q-${r * 1.2} ${r * .7} -${r * 2.2} -${r * .2} Z`} fill="#3E9954" {...thin} strokeWidth={2} /><circle cx={x - r * .35} cy={y - r * .45} r={r * .45} fill={fill} {...thin} strokeWidth={1.8} /><circle cx={x + r * .4} cy={y - r * .5} r={r * .45} fill={fill} {...thin} strokeWidth={1.8} /></g>;
    case 'snow': return <g><circle cx={x} cy={y} r={r} fill={fill} {...thin} /><path d={`M${x - r * .45} ${y - r * .3} q${r * .3} -${r * .35} ${r * .7} -${r * .3}`} stroke="#8FB8D6" strokeWidth="2" fill="none" strokeLinecap="round" /></g>;
    case 'carrot': return <g><path d={`M${x - r * .6} ${y - r * .6} L${x + r * .6} ${y - r * .6} L${x} ${y + r * 1.2} Z`} fill={fill} {...thin} /><path d={`M${x} ${y - r * .6} l-${r * .4} -${r * .7} M${x} ${y - r * .6} l${r * .4} -${r * .7}`} stroke="#3E9954" strokeWidth="2.5" strokeLinecap="round" /></g>;
    case 'sprinkles': return <g strokeWidth="3" strokeLinecap="round">{['#FF6B6B', '#FFC800', '#7BD389', '#4CC9F0', '#9B5DE5'].map((colour, i) => <path key={colour} d={`M${x - r * 1.6 + i * r * .8} ${y + (i % 2 ? r * .4 : -r * .3)} l${r * .5} ${i % 2 ? -r * .3 : r * .3}`} stroke={colour} />)}</g>;
    case 'honey': return <path d={`M${x} ${y - r * 1.1} q${r} ${r} ${r} ${r * 1.5} a${r} ${r} 0 0 1 -${r * 2} 0 q0 -${r * .5} ${r} -${r * 1.5} Z`} fill={fill} {...thin} />;
    case 'scoop': return <path d={`M${x - r} ${y} a${r} ${r} 0 0 1 ${r * 2} 0 q-${r * .4} ${r * .5} -${r * .7} 0 q-${r * .3} ${r * .6} -${r * .6} 0 q-${r * .4} ${r * .5} -${r * .7} 0 Z`} fill={fill} {...thin} />;
    case 'marshmallow': return <g><rect x={x - r * 1.5} y={y - r * .7} width={r * 1.3} height={r * 1.2} rx={r * .35} fill={fill} {...thin} strokeWidth={2} /><rect x={x + r * .2} y={y - r * .9} width={r * 1.3} height={r * 1.2} rx={r * .35} fill={fill} {...thin} strokeWidth={2} /></g>;
    case 'shell': {
      const points = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5; const d = i % 2 ? r * .5 : r * 1.2; return `${i ? 'L' : 'M'}${(x + Math.cos(a) * d).toFixed(1)} ${(y + Math.sin(a) * d).toFixed(1)}`; }).join('') + 'Z';
      return <path d={points} fill={fill} {...thin} strokeWidth={2} />;
    }
    case 'apple': return <g><circle cx={x} cy={y} r={r} fill={fill} {...thin} /><path d={`M${x} ${y - r} v-${r * .6}`} stroke={INK} strokeWidth="2.2" strokeLinecap="round" /><path d={`M${x} ${y - r * 1.3} q${r * .7} -${r * .6} ${r * 1.1} 0 q-${r * .6} ${r * .4} -${r * 1.1} 0 Z`} fill="#3E9954" /></g>;
    case 'leaf': return <path d={`M${x} ${y + r} v-${r * .6} l-${r} ${r * .2} l${r * .3} -${r * .7} l-${r * .7} -${r * .5} l${r * .6} -${r * .1} l-${r * .1} -${r * .7} l${r * .5} ${r * .5} l${r * .4} -${r * .9} l${r * .4} ${r * .9} l${r * .5} -${r * .5} l-${r * .1} ${r * .7} l${r * .6} ${r * .1} l-${r * .7} ${r * .5} l${r * .3} ${r * .7} l-${r} -${r * .2} Z`} fill={fill} {...thin} strokeWidth={2} />;
    case 'cream': return <path d={`M${x - r * 1.2} ${y + r * .4} q0 -${r * .9} ${r * .6} -${r * .9} q0 -${r * .9} ${r * .6} -${r * 1.1} q${r * .6} ${r * .2} ${r * .6} ${r * 1.1} q${r * .6} 0 ${r * .6} ${r * .9} Z`} fill={fill} {...thin} strokeWidth={2} />;
  }
}

/** The badge on a drink jug (a lemon slice for lemonade): what the drink is made of, centred on x, y. */
export function DrinkBadgeArt({ badge, x, y, r = 7 }: { badge: DrinkBadge; x: number; y: number; r?: number }) {
  switch (badge) {
    case 'lemon': return <g><circle cx={x} cy={y} r={r} fill="#FFF3A8" stroke="#E0B400" strokeWidth="2" /><path d={`M${x} ${y - r} v${r * 2} M${x - r} ${y} h${r * 2}`} stroke="#E0B400" strokeWidth="1.5" /></g>;
    case 'pumpkin': return <g><ellipse cx={x} cy={y} rx={r * 1.15} ry={r} fill="#F28C28" stroke="#A8561A" strokeWidth="2" /><path d={`M${x} ${y - r} v${r * 2}`} stroke="#A8561A" strokeWidth="1.5" /><path d={`M${x} ${y - r} q${r * .2} -${r * .5} ${r * .5} -${r * .6}`} stroke="#3E9954" strokeWidth="2.5" fill="none" strokeLinecap="round" /></g>;
    case 'marshmallow': return <rect x={x - r} y={y - r * .8} width={r * 2} height={r * 1.6} rx={r * .45} fill="#FFFFFF" stroke="#C9B8A8" strokeWidth="2" />;
    case 'berry': return <g fill="#7A2A8A" stroke="#4A1A55" strokeWidth="1.5"><circle cx={x - r * .45} cy={y + r * .2} r={r * .5} /><circle cx={x + r * .45} cy={y + r * .2} r={r * .5} /><circle cx={x} cy={y - r * .45} r={r * .5} /></g>;
    case 'honey': return <ToppingArt kind="honey" x={x} y={y + r * .2} r={r * .75} fill="#F2A007" />;
    case 'coconut': return <g><circle cx={x} cy={y} r={r} fill="#7A4A22" stroke={INK} strokeWidth="2" /><circle cx={x} cy={y} r={r * .6} fill="#FFFFFF" /></g>;
    case 'apple': return <ToppingArt kind="apple" x={x} y={y + r * .15} r={r * .85} fill="#E63946" />;
    case 'shell': return <ToppingArt kind="shell" x={x} y={y} r={r * .85} fill="#FFC800" />;
  }
}

/** Steam over a warm drink (still lines, so nothing loops). */
export const Steam = ({ xs, y }: { xs: number[]; y: number }) => <>{xs.map((x) => (
  <path key={x} d={`M${x} ${y} q-4 -5 0 -10 q4 -5 0 -10`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".75" />
))}</>;

/** A whole pie seen from the side, centred on cx (46 wide each way at y cy when s = 1): crust, filling and topping. */
export function SidePie({ cx, cy = 80, s = 1, filling, topping, toppingFill }: { cx: number; cy?: number; s?: number; filling: string; topping: Topping; toppingFill: string }) {
  const rx = 46 * s, ry = 16 * s;
  return <>
    <path d={`M${cx - rx} ${cy} v${10 * s} a${rx} ${ry} 0 0 0 ${rx * 2} 0 v-${10 * s} Z`} fill="#C98B4E" {...outline} />
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#E0A458" {...outline} />
    <ellipse cx={cx} cy={cy} rx={rx * .76} ry={ry * .7} fill={filling} stroke={INK} strokeWidth="2" />
    <ToppingArt kind={topping} x={cx} y={cy - 2 * s} r={6 * s} fill={toppingFill} />
  </>;
}

/** What a snack jar holds, at x, y: a cookie, a wrapped candy or a candy cane. */
export function JarSnack({ kind, x, y, r = 14 }: { kind: SnackKind; x: number; y: number; r?: number }) {
  if (kind === 'candy') {
    const colour = ['#FF6B6B', '#9B5DE5', '#4CC9F0'][Math.round(x / 16) % 3]!;
    return <g>
      <path d={`M${x - r * .7} ${y} l-${r * .55} -${r * .45} v${r * .9} Z M${x + r * .7} ${y} l${r * .55} -${r * .45} v${r * .9} Z`} fill={colour} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx={x} cy={y} rx={r * .75} ry={r * .6} fill={colour} stroke={INK} strokeWidth="2.5" />
      <path d={`M${x - r * .35} ${y - r * .2} q${r * .25} -${r * .2} ${r * .5} 0`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>;
  }
  if (kind === 'candy cane') {
    const d = `M${x - r * .3} ${y + r * .9} V${y - r * .3} a${r * .4} ${r * .4} 0 0 1 ${r * .8} 0`;
    return <g strokeLinecap="round" fill="none">
      <path d={d} stroke={INK} strokeWidth="8" />
      <path d={d} stroke="#FFFFFF" strokeWidth="5" />
      <path d={d} stroke="#E63946" strokeWidth="5" strokeDasharray="3 4" />
    </g>;
  }
  return <g>
    <circle cx={x} cy={y} r={r} fill="#E0A458" stroke="#9A5B1C" strokeWidth="2.5" />
    <circle cx={x - r * .35} cy={y - r * .2} r="2.2" fill="#6B3A12" /><circle cx={x + r * .3} cy={y - r * .35} r="2.2" fill="#6B3A12" /><circle cx={x + r * .1} cy={y + r * .4} r="2.2" fill="#6B3A12" />
  </g>;
}

/* ---------- The chapter 1 and 2 openers' food (story-cinema.tsx) ---------- */

const SLICES = ['M60 60 V8 A52 52 0 0 1 112 60 Z', 'M60 60 H112 A52 52 0 0 1 60 112 Z', 'M60 60 V112 A52 52 0 0 1 8 60 Z', 'M60 60 H8 A52 52 0 0 1 60 8 Z'];
const TOPPING_SPOTS: [number, number][] = [[38, 40], [84, 38], [82, 84], [36, 82]];

/** Chapter 1's festival cake, from above: cut into 4 pieces of different sizes, then 4 equal ones. Its colours and
    topping are the theme's cake (an orange pumpkin pie with cream at Halloween, a white Christmas cake with holly). */
export function OpenerCake({ theme, fair, beat, style }: { theme: PropTheme; fair: boolean; beat: number; style?: CSSProperties }) {
  const look = cakeLook(theme);
  const name = foodWord(theme, 'cake');
  return (
    <svg className="fq-cine-pie" style={style} viewBox="0 0 120 120" role="img" data-food={name}
      aria-label={fair ? `${aFood(name)} cut into 4 equal pieces` : `${aFood(name)} cut into 4 pieces of different sizes`}>
      <ellipse cx="60" cy="116" rx="52" ry="7" fill="rgb(0 0 0 / .28)" style={{ filter: 'blur(3px)' }} aria-hidden="true" />
      {fair
        ? SLICES.map((d, i) => <path key={i} className={`fq-cine-slice is-${i}`} d={d} fill={look.frosting} stroke={look.edge} strokeWidth="3" />)
        : <>
          <circle cx="60" cy="60" r="52" fill={look.frosting} stroke={look.edge} strokeWidth="6" />
          <path className={beat === 1 ? 'fq-cine-pulse' : ''} d="M60 60 L60 8 A52 52 0 0 1 108 80 Z" fill={look.plain ? '#FFB86B' : 'rgb(255 255 255 / .3)'} />
          <path d="M60 60 L60 8 M60 60 L108 80 M60 60 L30 108 M60 60 L10 50" stroke="#2B2D42" strokeWidth="3" fill="none" />
        </>}
      {!look.plain && TOPPING_SPOTS.map(([x, y], i) => (
        <g key={i} className={fair ? `fq-cine-slice is-${i}` : undefined}><ToppingArt kind={look.topping} x={x} y={y} r={5} fill={look.toppingFill} /></g>
      ))}
    </svg>
  );
}

/** Chapter 10's picnic pie ("I packed {pie} and sandwiches"), from the side in its tin: a lattice berry pie, or the
    theme's pie (an orange pumpkin pie with cream, a cherry pie). */
export function OpenerPie({ theme, style, storyThing }: { theme: PropTheme; style?: CSSProperties; storyThing?: string }) {
  const look = pieLook(theme);
  const name = foodWord(theme, 'pie');
  return (
    <svg className="fq-cine-picnic-pie" style={style} viewBox="0 0 100 44" role="img" data-food={name} data-story-thing={storyThing} aria-label={`${aFood(name)} in its tin`}>
      <path d="M6 22 l8 16 h72 l8 -16 Z" fill="#B8C2CC" {...outline} />
      <ellipse cx="50" cy="22" rx="44" ry="13" fill="#E0A458" {...outline} />
      <ellipse cx="50" cy="22" rx="34" ry="9" fill={look.filling} stroke={INK} strokeWidth="2" />
      {look.lattice
        ? <path d="M30 16 l14 12 M44 14 l16 14 M58 14 l14 12 M32 28 l14 -14 M48 30 l16 -16 M62 29 l12 -12" stroke="#F7C873" strokeWidth="3" strokeLinecap="round" />
        : <ToppingArt kind={look.topping} x={50} y={20} r={6} fill={look.toppingFill} />}
    </svg>
  );
}

/** Chapter 2's two same-size bars, cut into thirds and eighths: the theme's bars (snack, chocolate candy or striped
    peppermint), coloured through two CSS variables the bar pieces read. */
export function OpenerBars({ theme, compared, style, children }: { theme: PropTheme; compared: boolean; style?: CSSProperties; children?: ReactNode }) {
  const look = barLook(theme);
  const name = foodWord(theme, 'bars');
  return (
    <span className={`fq-cine-bars ${compared ? 'is-compared' : ''}`} data-food={name} role="img"
      aria-label={compared ? 'One third and one eighth side by side: the third is bigger. More equal parts means smaller parts.' : `Two same-size ${name}: one cut into 3 equal pieces, one cut into 8 equal pieces`}
      style={{ ...style, '--bar-fill': look.fill, '--bar-edge': look.edge } as CSSProperties}>
      {children}
    </span>
  );
}
