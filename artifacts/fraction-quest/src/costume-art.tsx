/* Numi's costumes for the ten months without a holiday (month-themes.ts), drawn as small SVG overlays in the
   Mascot's 80 × 80 space (head circle at 40,21; eyes at y 20; arm bar at y 38.5 to 43.5 with hands at x 8 and 72;
   round body at 40,60; feet at y 74 to 78). Every piece is a decorative overlay (the Mascot names what Numi wears),
   with a dark outline so it reads on any background. A costume can draw into several layers:
   back (behind Numi), face (over the eyes), hands (inside the arms, so it tilts with them), front (over the body),
   feet and head (last, so hats sit on top). The two holidays keep their own artwork in fun-ui.tsx. */

import React from 'react';
import type { MonthCostumeId, MonthThemeId } from './month-themes';

export type CostumeLayer = 'back' | 'face' | 'hands' | 'front' | 'feet' | 'head';
type Drawing = () => React.ReactElement;

const INK = '#2B2D42';
const outline = { stroke: INK, strokeWidth: 1.3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
/** Draws a left-hand piece again on the right (mirrored about the middle of the 80-wide space). */
const Mirror = ({ children }: { children: React.ReactNode }) => <g transform="translate(80 0) scale(-1 1)">{children}</g>;

/* ---------- January ---------- */

const MittenLeft = () => (
  <g>
    <ellipse cx="10.2" cy="33.6" rx="2.7" ry="4" transform="rotate(24 10.2 33.6)" fill="#5AA9F2" {...outline} />
    <path d="M13.4 35.4 C9.4 33.6 3.4 35.2 2.8 40.8 C2.4 45.8 7.4 47.4 13.4 45.8 Z" fill="#5AA9F2" {...outline} />
    <rect x="13" y="35.4" width="6" height="10.6" rx="1.8" fill="#fff" {...outline} />
    <path d="M15 36.2 v9 M17.2 36.2 v9" stroke="#E03131" strokeWidth="1.1" />
    <path d="M5.4 39.6 l1.8 1.8 M7.2 39.6 l-1.8 1.8" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
  </g>
);
const Mittens: Drawing = () => <><MittenLeft /><Mirror><MittenLeft /></Mirror></>;

const PomPomBeanie: Drawing = () => (
  <g>
    <path d="M26.5 6.5 C25 -8 55 -8 53.5 6.5 Z" fill="#E03131" {...outline} />
    <path d="M32 5 C31 -3 34 -5.5 36 -5.4 M44 5 C45 -3 42 -5.5 40 -5.4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".7" />
    <rect x="25" y="5.2" width="30" height="7" rx="3" fill="#fff" {...outline} />
    <path d="M31 6.2 v5 M36 6.2 v5 M41 6.2 v5 M46 6.2 v5 M51 6.2 v5" stroke="#9CC7EF" strokeWidth="1.3" />
    <circle cx="40" cy="-6.5" r="4.6" fill="#fff" {...outline} />
  </g>
);

/* ---------- February ---------- */

const HEART = 'M0 4.8 C-7.4 -0.4 -6.4 -5.8 -2.7 -5.4 C-1.3 -5.2 0 -4 0 -2.7 C0 -4 1.3 -5.2 2.7 -5.4 C6.4 -5.8 7.4 -0.4 0 4.8 Z';
const HeartGlasses: Drawing = () => (
  <g>
    <path d="M28.6 17.6 L24.4 16.4 M51.4 17.6 L55.6 16.4" stroke="#9B1D4B" strokeWidth="2" strokeLinecap="round" />
    {[34.4, 45.6].map((x) => (
      <g key={x} transform={`translate(${x} 20.4) scale(1.08)`}>
        <path d={HEART} fill="#FFD6E5" fillOpacity=".5" stroke="#9B1D4B" strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M-3.4 -2.6 q1 -1.6 2.4 -1.4" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
    ))}
  </g>
);

const Bracelet: Drawing = () => (
  <g>
    {['#FF5C8A', '#fff', '#FFD43B', '#4DABF7'].map((fill, at) => <rect key={fill} x={12.5 + at * 3.1} y="36.9" width="3.2" height="8.2" fill={fill} />)}
    <rect x="12.5" y="36.9" width="12.4" height="8.2" rx="2" fill="none" {...outline} />
    <path d="M19 45.4 v2" stroke={INK} strokeWidth="1.2" />
    <g transform="translate(19 49.6) scale(.5)"><path d={HEART} fill="#FF5C8A" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" /></g>
  </g>
);

/* ---------- March ---------- */

const bow = (x: number, y: number, fill: string, tilt: number) => (
  <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${tilt}) scale(.92)`}>
    <path d="M0 0 L-6.6 -4.6 V4.6 Z M0 0 L6.6 -4.6 V4.6 Z" fill={fill} {...outline} strokeWidth="1.3" />
    <circle r="1.7" fill={fill} stroke={INK} strokeWidth="1.1" />
  </g>
);
const TAIL = 'M52 53 C62 49 67 55 64.4 60 C61.6 65.4 68.6 66.4 67 72 C66.2 75.6 69.4 78 75 78.6';
const KiteTail: Drawing = () => (
  <g>
    <path d={TAIL} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d={TAIL} stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    {bow(64.6, 60, '#FF6B6B', 12)}
    {bow(67.2, 71.6, '#FFD43B', -8)}
    {bow(74.8, 78.4, '#4DABF7', 70)}
  </g>
);

const PilotGoggles: Drawing = () => (
  <g>
    <path d="M28.4 16.6 Q40 5.4 51.6 16.6" stroke={INK} strokeWidth="4.2" fill="none" strokeLinecap="round" />
    <path d="M28.4 16.6 Q40 5.4 51.6 16.6" stroke="#8A5A2B" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M28.6 20 H24.2 M51.4 20 H55.8" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
    <path d="M28.6 20 H24.2 M51.4 20 H55.8" stroke="#8A5A2B" strokeWidth="2.6" strokeLinecap="round" />
    {[34.4, 45.6].map((x) => (
      <g key={x}>
        <circle cx={x} cy="20" r="6.1" fill="#CDEBFF" fillOpacity=".42" stroke={INK} strokeWidth="3.4" />
        <circle cx={x} cy="20" r="6.1" fill="none" stroke="#E8A317" strokeWidth="1.8" />
        <path d={`M${x - 3.2} 17.4 q1.2 -1.6 3 -1.8`} stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
    ))}
  </g>
);

/* ---------- April ---------- */

const BootLeft = () => (
  <g>
    <path d="M31.8 67.4 H38.8 V78.8 H28.6 Q25.6 78.8 25.6 76 Q25.6 74.2 28.2 74.2 H31.8 Z" fill="#FFD43B" {...outline} />
    <rect x="30.8" y="66.4" width="9.2" height="4" rx="1.4" fill="#E8A317" {...outline} />
    <path d="M26 77 H38.6" stroke="#B87500" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M33.2 72.4 v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
  </g>
);
const RainBoots: Drawing = () => <><BootLeft /><Mirror><BootLeft /></Mirror></>;

const RAINBOW = ['#E03131', '#FF922B', '#FFD43B', '#51CF66', '#339AF0'];
const arcPoint = (cx: number, cy: number, r: number, angle: number) => `${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`;
const RainbowUmbrella: Drawing = () => (
  <g>
    <path d="M10 6 V47 Q10 52 14.4 51" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    <path d="M10 6 V47 Q10 52 14.4 51" stroke="#6C757D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {RAINBOW.map((fill, at) => {
      const from = Math.PI + (at * Math.PI) / 5;
      const to = from + Math.PI / 5;
      return <path key={fill} d={`M10 15.5 L${arcPoint(10, 15.5, 10.6, from)} A10.6 10.6 0 0 1 ${arcPoint(10, 15.5, 10.6, to)} Z`} fill={fill} />;
    })}
    <path d="M-0.6 15.5 A10.6 10.6 0 0 1 20.6 15.5 Q17.6 13.2 15.3 15.5 Q12.6 13.2 10 15.5 Q7.4 13.2 4.7 15.5 Q2.4 13.2 -0.6 15.5 Z" fill="none" {...outline} />
    <circle cx="9.4" cy="41" r="3.6" fill="#FFB547" />
  </g>
);

/* ---------- May ---------- */

const Flower = ({ x, y, petal, size = 1 }: { x: number; y: number; petal: string; size?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${size})`}>
    {[0, 72, 144, 216, 288].map((angle) => <circle key={angle} cx={2.9 * Math.sin((angle * Math.PI) / 180)} cy={-2.9 * Math.cos((angle * Math.PI) / 180)} r="2.3" fill={petal} stroke={INK} strokeWidth="0.8" />)}
    <circle r="2" fill="#FFD43B" stroke={INK} strokeWidth="0.8" />
  </g>
);
const FlowerCrown: Drawing = () => (
  <g>
    <path d="M25.6 11.6 Q40 -4.2 54.4 11.6" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M25.6 11.6 Q40 -4.2 54.4 11.6" stroke="#2F9E44" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <ellipse cx="35.6" cy="3.4" rx="2.8" ry="1.5" transform="rotate(-35 35.6 3.4)" fill="#51CF66" stroke={INK} strokeWidth="0.8" />
    <ellipse cx="44.4" cy="3.4" rx="2.8" ry="1.5" transform="rotate(35 44.4 3.4)" fill="#51CF66" stroke={INK} strokeWidth="0.8" />
    <Flower x={27.4} y={10.4} petal="#FF8FB3" />
    <Flower x={33.2} y={3.8} petal="#fff" />
    <Flower x={40} y={0.6} petal="#FF6B9D" size={1.15} />
    <Flower x={46.8} y={3.8} petal="#fff" />
    <Flower x={52.6} y={10.4} petal="#FF8FB3" />
  </g>
);

const BeeWings: Drawing = () => (
  <g>
    {[0, 1].map((side) => (
      <g key={side} transform={side ? 'translate(80 0) scale(-1 1)' : undefined}>
        <ellipse cx="17.6" cy="45.4" rx="4.8" ry="9.4" transform="rotate(48 17.6 45.4)" fill="#E7F5FF" fillOpacity=".94" {...outline} />
        <ellipse cx="17.4" cy="27.6" rx="6.4" ry="13.6" transform="rotate(-30 17.4 27.6)" fill="#E7F5FF" fillOpacity=".96" {...outline} />
        <path d="M22.8 38 Q18.6 28 13 17.6 M21.4 37.6 Q19 30 18 22" stroke="#C98A00" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
    ))}
  </g>
);

/* ---------- June ---------- */

const Sunglasses: Drawing = () => (
  <g>
    <path d="M29 18 L24.4 16.8 M51 18 L55.6 16.8" stroke="#FF8A1F" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M39.6 17.4 Q40 15.8 40.4 17.4" stroke="#FF8A1F" strokeWidth="2" fill="none" />
    {[34.4, 45.6].map((x) => (
      <g key={x}>
        <rect x={x - 5.6} y="14.6" width="11.2" height="10" rx="4.2" fill="#10263F" fillOpacity=".9" stroke="#FF8A1F" strokeWidth="1.8" />
        <path d={`M${x - 3.2} 18.4 q.8 -1.6 2.6 -1.8`} stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".85" />
      </g>
    ))}
  </g>
);

const SunHat: Drawing = () => (
  <g>
    <ellipse cx="40" cy="6.4" rx="22.6" ry="5.6" fill="#EBC067" {...outline} />
    <path d="M28.6 6.4 C27.6 -9 52.4 -9 51.4 6.4 Z" fill="#F2CE7E" {...outline} />
    <path d="M28.3 3.4 H51.7 V7 H28.3 Z" fill="#0C8599" stroke={INK} strokeWidth="1.2" />
    <path d="M35 -4.4 Q40 -6.4 45 -4.4" stroke="#C99A3A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M17.4 6.6 A22.6 5.6 0 0 0 62.6 6.6 Q40 8.6 17.4 6.6 Z" fill="#EBC067" {...outline} />
    <path d="M24 8 q16 4 32 0" stroke="#C99A3A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M52 5.2 q5 3.6 5.6 8.4" stroke="#0C8599" strokeWidth="2.2" fill="none" strokeLinecap="round" />
  </g>
);

/* ---------- July ---------- */

const CampHat: Drawing = () => (
  <g>
    <ellipse cx="40" cy="7" rx="19.6" ry="4.6" fill="#B58B52" {...outline} />
    <path d="M29.4 6.6 L31.2 -5.4 Q40 -9 48.8 -5.4 L50.6 6.6 Z" fill="#C9A66B" {...outline} />
    <path d="M29.8 2.2 H50.2 V6.8 H29.8 Z" fill="#2F6B3A" stroke={INK} strokeWidth="1.2" />
    <path d="M40.3 6.2 C37.6 4.6 39 2.6 40.2 0.8 C40.6 2 42.8 3.2 42.4 5 C42 6.2 41.2 6.4 40.3 6.2 Z" fill="#FF922B" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M33.5 -5.2 Q40 -7.2 46.5 -5.2" stroke="#8C6A38" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    <path d="M20.4 7.6 A19.6 4.6 0 0 0 59.6 7.6 Q40 9.4 20.4 7.6 Z" fill="#B58B52" {...outline} />
  </g>
);

const STAR = 'M0 -4.4 L1.3 -1.4 L4.6 -1.2 L2.1 1 L2.9 4.2 L0 2.5 L-2.9 4.2 L-2.1 1 L-4.6 -1.2 L-1.3 -1.4 Z';
const StarLantern: Drawing = () => (
  <g transform="translate(72.6 41) scale(1.22) translate(-72.6 -41)">
    <circle cx="72.6" cy="55.6" r="11" fill="#FFE066" opacity=".4" />
    <path d="M72.2 41 V46.4" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M69.6 47 Q72.6 42.8 75.6 47" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <rect x="68" y="46.6" width="9.2" height="2.8" rx="1.1" fill="#E8A317" {...outline} strokeWidth="1.1" />
    <rect x="67.4" y="49.2" width="10.4" height="11" rx="2.6" fill="#FFE066" {...outline} strokeWidth="1.2" />
    <g transform="translate(72.6 54.8) scale(.85)"><path d={STAR} fill="#F08C00" stroke="#B35F00" strokeWidth="0.7" strokeLinejoin="round" /></g>
    <rect x="68" y="60" width="9.2" height="2.8" rx="1.1" fill="#E8A317" {...outline} strokeWidth="1.1" />
  </g>
);

/* ---------- August ---------- */

const Snorkel: Drawing = () => (
  <g>
    <path d="M24.2 20 H28" stroke={INK} strokeWidth="4.4" strokeLinecap="round" />
    <path d="M24.2 20 H28 M52 20 H55.8" stroke="#FFC800" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M52 20 H55.8" stroke={INK} strokeWidth="4.4" strokeLinecap="round" />
    <path d="M52 20 H55.8" stroke="#FFC800" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M22.6 -1.6 V24 Q22.6 31.4 30.6 29.4" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M22.6 -1.6 V24 Q22.6 31.4 30.6 29.4" stroke="#FF922B" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    <rect x="20.4" y="-4.4" width="4.4" height="4.2" rx="1.2" fill="#FFC800" stroke={INK} strokeWidth="1.1" />
    <rect x="29.6" y="26.6" width="5.6" height="5.2" rx="2" fill="#FFC800" stroke={INK} strokeWidth="1.2" />
    <rect x="27.4" y="13.4" width="25.2" height="13.4" rx="6" fill="#BDEBFF" fillOpacity=".42" stroke={INK} strokeWidth="4" />
    <rect x="27.4" y="13.4" width="25.2" height="13.4" rx="6" fill="none" stroke="#FFC800" strokeWidth="1.9" />
    <path d="M40 14.4 V25.8" stroke="#FFC800" strokeWidth="1.5" />
    <path d="M30.4 17.6 q1 -2 3.4 -2.4" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </g>
);

const FinLeft = () => (
  <g>
    <path d="M38.6 73.4 L20.6 74.6 Q12.6 76.6 14.8 79.6 Q17.6 82 24 81.2 L38.6 79.4 Z" fill="#FF922B" {...outline} />
    <path d="M35.6 74.6 L18.4 78 M36.2 76.8 L18.6 80 M28 74.8 L16.6 79" stroke="#B3500B" strokeWidth="1.1" strokeLinecap="round" />
    <rect x="32.4" y="72.2" width="6.6" height="3.2" rx="1.4" fill="#2B2D42" />
  </g>
);
const DivingFins: Drawing = () => <><FinLeft /><Mirror><FinLeft /></Mirror></>;

/* ---------- September ---------- */

const BackpackBack: Drawing = () => (
  <g>
    <rect x="20.4" y="45" width="39.2" height="25" rx="7" fill="#C92A2A" {...outline} />
    <rect x="21.6" y="56.4" width="9.2" height="11.4" rx="3" fill="#A61E1E" {...outline} strokeWidth="1.1" />
    <rect x="49.2" y="56.4" width="9.2" height="11.4" rx="3" fill="#A61E1E" {...outline} strokeWidth="1.1" />
    <path d="M24 61.4 h3.6 M52.4 61.4 h3.6" stroke="#FFD43B" strokeWidth="1.4" strokeLinecap="round" />
  </g>
);
const BackpackFront: Drawing = () => (
  <g>
    <path d="M32.6 42.6 Q31.2 52 33.2 64.4 M47.4 42.6 Q48.8 52 46.8 64.4" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M32.6 42.6 Q31.2 52 33.2 64.4 M47.4 42.6 Q48.8 52 46.8 64.4" stroke="#8F1D1D" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <rect x="31" y="58.4" width="4.4" height="3.8" rx="1" fill="#FFD43B" stroke={INK} strokeWidth="1" />
    <rect x="44.6" y="58.4" width="4.4" height="3.8" rx="1" fill="#FFD43B" stroke={INK} strokeWidth="1" />
  </g>
);

const AppleHat: Drawing = () => (
  <g>
    <path d="M25 9.4 C22.6 -3.4 31.4 -9.6 40 -4.6 C48.6 -9.6 57.4 -3.4 55 9.4 Q40 13 25 9.4 Z" fill="#D6342F" {...outline} />
    <path d="M30.6 -1 C31.4 -3.2 33.4 -4.4 35.4 -4.2" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".7" />
    <path d="M40 -4.6 Q39.4 -9.4 43 -12" stroke={INK} strokeWidth="3.8" fill="none" strokeLinecap="round" />
    <path d="M40 -4.6 Q39.4 -9.4 43 -12" stroke="#7B4A21" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M43.4 -9.6 C45.6 -14.6 51.6 -14.6 53.4 -12.6 C51.4 -8.6 46.6 -7.8 43.4 -9.6 Z" fill="#51CF66" {...outline} strokeWidth="1.1" />
  </g>
);

/* ---------- November ---------- */

const CAPE = 'M30 36.4 Q40 33.4 50 36.4 L56 46 L68 58 Q70 62 66 62 L68.6 68 Q64.6 69.4 62.4 66.4 L62 73 Q57 72 55.4 68.4 L52 74.4 Q46 72 44.4 69 L40 74.6 L35.6 69 Q34 72 28 74.4 L24.6 68.4 Q23 72 18 73 L17.6 66.4 Q15.4 69.4 11.4 68 L14 62 Q10 62 12 58 L24 46 Z';
const Leaf = ({ x, y, angle, fill }: { x: number; y: number; angle: number; fill: string }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(.38)`}>
    <path d="M0 0 C 11 6 11 24 0 38 C -11 24 -11 6 0 0 Z" fill={fill} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    <path d="M0 4 V33 M0 14 L-4.6 9.4 M0 14 L4.6 9.4 M0 23 L-5 17.6 M0 23 L5 17.6" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".6" />
  </g>
);
const LeafCape: Drawing = () => (
  <g>
    <path d={CAPE} fill="#E8590C" {...outline} />
    <path d="M24 46 L18 62 M56 46 L62 62" stroke="#B3400A" strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
    <Leaf x={22.4} y={49.4} angle={-24} fill="#FFC53D" />
    <Leaf x={17.6} y={59.4} angle={30} fill="#C92A2A" />
    <Leaf x={22.6} y={61.4} angle={-8} fill="#FFC53D" />
    <Leaf x={57.6} y={49.4} angle={24} fill="#FFC53D" />
    <Leaf x={62.4} y={59.4} angle={-30} fill="#C92A2A" />
    <Leaf x={57.4} y={61.4} angle={8} fill="#FFC53D" />
    <path d="M29.6 36.6 Q40 33.4 50.4 36.6 L48 40 Q40 38 32 40 Z" fill="#8C4A12" {...outline} strokeWidth="1.1" />
    <circle cx="40" cy="38.4" r="2.3" fill="#FFD43B" stroke={INK} strokeWidth="1" />
  </g>
);

const AcornCap: Drawing = () => (
  <g>
    <path d="M24.4 10 C23 -5 56.6 -5 55.6 10 Q40 14 24.4 10 Z" fill="#B97A33" {...outline} />
    <path d="M28.6 8.4 q2.2 -2.8 4.4 0 q2.2 -2.8 4.4 0 q2.2 -2.8 4.4 0 q2.2 -2.8 4.4 0 q2.2 -2.8 4.4 0 M31 3.8 q2.2 -2.8 4.4 0 q2.2 -2.8 4.4 0 q2.2 -2.8 4.4 0 q2.2 -2.8 4.4 0 M34.2 -0.4 q2.2 -2.6 4.4 0 q2.2 -2.6 4.4 0" stroke="#5B3A1A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M38.6 -3.6 Q38.4 -7.4 40 -9.2 Q41.6 -7.4 41.4 -3.6" stroke={INK} strokeWidth="4.2" fill="none" strokeLinecap="round" />
    <path d="M38.6 -3.6 Q38.4 -7.4 40 -9.2 Q41.6 -7.4 41.4 -3.6" stroke="#6B3A1A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
  </g>
);

/** Every month costume, by id: the layers it draws into. */
export const COSTUME_ART: Record<MonthCostumeId, Partial<Record<CostumeLayer, Drawing>>> = {
  mittens: { hands: Mittens },
  'pom-pom-beanie': { head: PomPomBeanie },
  'heart-glasses': { face: HeartGlasses },
  bracelet: { hands: Bracelet },
  'kite-tail': { back: KiteTail },
  'pilot-goggles': { face: PilotGoggles },
  'rain-boots': { feet: RainBoots },
  'rainbow-umbrella': { hands: RainbowUmbrella },
  'flower-crown': { head: FlowerCrown },
  'bee-wings': { back: BeeWings },
  sunglasses: { face: Sunglasses },
  'sun-hat': { head: SunHat },
  'camp-hat': { head: CampHat },
  'star-lantern': { hands: StarLantern },
  snorkel: { face: Snorkel },
  'diving-fins': { feet: DivingFins },
  backpack: { back: BackpackBack, front: BackpackFront },
  'apple-hat': { head: AppleHat },
  'leaf-cape': { back: LeafCape },
  'acorn-cap': { head: AcornCap },
};

/** The earned costumes' pieces for one layer of the Mascot (nothing for a holiday's own costume ids). */
export function costumeLayer(ids: readonly string[], layer: CostumeLayer): React.ReactNode[] {
  return ids.map((id) => {
    const draw = (COSTUME_ART as Record<string, Partial<Record<CostumeLayer, Drawing>> | undefined>)[id]?.[layer];
    return draw ? <g key={`${id}-${layer}`} className={`fq-costume fq-costume-${id}`}>{draw()}</g> : null;
  });
}

/* ---------- the reward card's icon, one per month (the approved mock-up's icons, in the card's colour) ---------- */

export function MonthRewardIcon({ id }: { id: MonthThemeId }) {
  const dark = 'rgb(0 0 0 / .5)';
  const icons: Record<MonthThemeId, React.ReactElement> = {
    january: <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"><path d="M20 4v32M6 12l28 16M6 28l28-16" /><path d="M16 7l4 4 4-4M16 33l4-4 4 4" /></g>,
    february: <path d="M20 34S5 25 5 14a7.5 7.5 0 0 1 15-2 7.5 7.5 0 0 1 15 2c0 11-15 20-15 20z" fill="currentColor" />,
    march: <><path d="M20 3l11 13-11 13-11-13z" fill="currentColor" /><path d="M20 29q-3 4 1 6t0 5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
    april: <path d="M20 4C14 14 10 19 10 25a10 10 0 0 0 20 0c0-6-4-11-10-21z" fill="currentColor" />,
    may: <><g fill="currentColor"><circle cx="20" cy="9" r="6" /><circle cx="31" cy="17" r="6" /><circle cx="27" cy="30" r="6" /><circle cx="13" cy="30" r="6" /><circle cx="9" cy="17" r="6" /></g><circle cx="20" cy="20" r="5" fill={dark} /></>,
    june: <><path d="M20 34L6 14a16 16 0 0 1 28 0z" fill="currentColor" /><path d="M20 34L13 9M20 34L20 6M20 34L27 9" stroke={dark} strokeWidth="2" /></>,
    july: <><path d="M20 4c4 8 10 11 10 19a10 10 0 0 1-20 0c0-5 3-7 4-11 2 3 3 4 4 4-1-5 0-8 2-12z" fill="currentColor" /><path d="M8 36l24-6M8 30l24 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></>,
    august: <path d="M20 3l4.5 10.5L36 15l-8.5 8 2.5 12L20 29l-10 6 2.5-12L4 15l11.5-1.5z" fill="currentColor" />,
    september: <><path d="M20 12c-4-3-14-2-14 9 0 8 6 15 10 15 2 0 3-1 4-1s2 1 4 1c4 0 10-7 10-15 0-11-10-12-14-9z" fill="currentColor" /><path d="M20 12c0-4 1-6 3-8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
    november: <><path d="M8 32C8 16 18 6 34 6c0 16-10 26-26 26z" fill="currentColor" /><path d="M8 32L26 14" stroke={dark} strokeWidth="2.5" strokeLinecap="round" /></>,
  };
  return <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true" className="fq-month-reward-icon">{icons[id]}</svg>;
}
