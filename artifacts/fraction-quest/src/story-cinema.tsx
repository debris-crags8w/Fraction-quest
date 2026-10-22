/* A story comic filmed like a short cartoon: a title card, then one shot per panel on a big letterboxed screen. The
   camera pushes in and pans between shots, the colours warm or cool with the mood, and the words appear as a
   caption with the speaker's face while the voice reads along. Big moments (the stone cracking, a splash, a falling
   plank) shake the screen with a thud and, in the app on iPhone and Android, a heavy tap. Without a voice the shots
   move on by themselves, and a voice that falls behind (a clip still loading) never holds the film up: it carries
   on without it. A tap on the picture finishes a caption and the Skip button jumps to the end, where the film
   stays on its last picture. "Reduce motion" keeps the camera still.
   Scenes: the prologue, every chapter opening, completed chapter endings and the finale. */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, Music, RotateCcw, Search, Volume2, VolumeX } from 'lucide-react';
import { StoryCharacter } from './characters';
import { LearningListenButton, LearningText, prefetchReading, useFollowedReading } from './LearningText';
import { useFun, useSeason } from './fun-ui';
import { playCue } from './lib/fun';
import { filmMood, StoryMusic } from './lib/story-music';
import { sentences, spokenText } from './lib/voice';
import { CHAPTERS, CHARACTERS, propTheme, withName, type Panel, type StoryChoice, type StoryScene } from './story';
import { TaskBar } from './TaskBar';
import './story-cinema.css';

export { CHAPTER_SCENES, type StoryScene } from './story';

const TYPE_MS = 32;        // one character every 32 ms: a little ahead of the voice
const PAUSE_MS = 1100;     // without a voice, the pause before the next shot
const TITLE_MS = 1700;     // the title card before the first shot
const FONT_WAIT_MS = 500;  // the longest the title card waits for its font before it starts anyway

/** The title card's fonts load from the web; a card that starts before they arrive jumps in size when they swap in.
    Resolves when they are ready, or after FONT_WAIT_MS, so the film is never held up for long. */
const TITLE_FONTS = ['700 30px "Baloo 2"', '700 12px "Atkinson Hyperlegible"'];
function titleFontReady(): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!fonts?.load) return Promise.resolve();
  if (TITLE_FONTS.every((font) => fonts.check(font))) return Promise.resolve();
  return Promise.race([
    Promise.all(TITLE_FONTS.map((font) => fonts.load(font))).then(() => undefined, () => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]);
}
const END_MS = 1800;       // the "to be continued" card
const FILM_VOICE_KEY = 'fraction-quest-film-voice';
/** The Voice on/off choice carries over to the next film (null: not chosen yet, so sounds decide). */
function savedFilmVoice(): boolean | null {
  try { const saved = globalThis.localStorage?.getItem(FILM_VOICE_KEY); return saved === 'on' ? true : saved === 'off' ? false : null; } catch { return null; }
}
function saveFilmVoice(on: boolean) {
  try { globalThis.localStorage?.setItem(FILM_VOICE_KEY, on ? 'on' : 'off'); } catch { /* the choice still holds for this film */ }
}
const FILM_MUSIC_KEY = 'fraction-quest-film-music';
/** The film's Music button carries over to the next film (null: not chosen, so the music plays when allowed). */
function savedFilmMusic(): boolean | null {
  try { const saved = globalThis.localStorage?.getItem(FILM_MUSIC_KEY); return saved === 'on' ? true : saved === 'off' ? false : null; } catch { return null; }
}
function saveFilmMusic(on: boolean) {
  try { globalThis.localStorage?.setItem(FILM_MUSIC_KEY, on ? 'on' : 'off'); } catch { /* the choice still holds for this film */ }
}
const VOICE_GIVE_UP_MS = 15_000; // the first shot waits at least this long for the voice to start
const VOICE_CPS = 10;      // a generous reading pace (characters a second): slower than any voice reads, "says:" included
const VOICE_SLACK_MS = 4000; // beyond that pace, how long a shot waits for a late voice before the film moves on

/** A camera position: what to scale and move, and the point it zooms towards. */
type Shot = [transform: string, origin: string];
const shot = (transform: string, origin = '50% 50%'): Shot => [transform, origin];

/** How each scene is filmed: the title shot then one shot per panel, the panel with the big moment, and the panel
   from which the colours go cold (after something goes wrong). The last shot is also the still after the story. */
const FILMING: Record<StoryScene, { shots: Shot[]; impact?: number; coldFrom?: number; end?: string }> = {
  prologue: {
    shots: [shot('scale(1.15)', '50% 42%'), shot('scale(1.06) translateY(1%)', '50% 42%'), shot('scale(2) translateY(4%)', '50% 38%'),
      shot('scale(1.28)', '50% 42%'), shot('scale(1)', '50% 60%')],
    impact: 2, coldFrom: 2, end: 'To be continued…',
  },
  bakery: { shots: [shot('scale(1.1)', '50% 40%'), shot('scale(1.3)', '24% 40%'), shot('scale(1.55)', '60% 48%'), shot('scale(1.05)', '50% 40%')], impact: 2 },
  pond: { shots: [shot('scale(1.1)', '50% 40%'), shot('scale(1.35)', '66% 30%'), shot('scale(1.1)', '50% 50%'), shot('scale(1)', '50% 40%')], impact: 0 },
  hill: { shots: [shot('scale(1.1)', '20% 50%'), shot('scale(1.4)', '86% 14%'), shot('scale(1)', '50% 40%'), shot('scale(1.25)', '35% 40%')] },
  bridge: { shots: [shot('scale(1.1)', '50% 40%'), shot('scale(1.35)', '55% 38%'), shot('scale(1)', '50% 40%'), shot('scale(1.1)', '50% 36%')], impact: 0 },
  tower: { shots: [shot('scale(1.1)', '50% 40%'), shot('scale(1.25)', '30% 36%'), shot('scale(1.2)', '72% 30%'), shot('scale(1.05)', '60% 36%')], impact: 0 },
  honey: { shots: [shot('scale(1.1)', '50% 30%'), shot('scale(1.25)', '50% 16%'), shot('scale(1.4)', '30% 40%'), shot('scale(1.1)', '50% 40%')] },
  workshop: { shots: [shot('scale(1.1)', '50% 38%'), shot('scale(1.15)', '10% 44%'), shot('scale(1.15)', '10% 40%'), shot('scale(1.05)', '50% 45%')], impact: 2 },
  den: { shots: [shot('scale(1.12)', '50% 40%'), shot('scale(1.3)', '30% 48%'), shot('scale(1.2)', '32% 46%'), shot('scale(1.05)', '50% 42%')], coldFrom: 1 },
  race: { shots: [shot('scale(1.08)', '50% 42%'), shot('scale(1.15)', '12% 30%'), shot('scale(1.2)', '30% 46%'), shot('scale(1.05)', '50% 42%')] },
  picnic: { shots: [shot('scale(1.05)', '50% 42%'), shot('scale(1.1)', '27% 38%'), shot('scale(1.1)', '72% 38%'), shot('scale(1.05)', '50% 42%')] },
  machine: { shots: [shot('scale(1.05)', '50% 42%'), shot('scale(1.12)', '29% 40%'), shot('scale(1.12)', '71% 40%'), shot('scale(1.05)', '50% 42%')], impact: 2 },
  stage: { shots: [shot('scale(1.08)', '50% 42%'), shot('scale(1.25)', '32% 48%'), shot('scale(1.15)', '34% 55%'), shot('scale(1.05)', '50% 42%')] },
  garden: { shots: [shot('scale(1.08)', '50% 42%'), shot('scale(1.15)', '32% 48%'), shot('scale(1.08)', '40% 45%'), shot('scale(1.05)', '50% 42%')] },
  lock: { shots: [shot('scale(1.1)', '50% 40%'), shot('scale(1.28)', '32% 48%'), shot('scale(1.18)', '34% 48%'), shot('scale(1.05)', '50% 42%')], impact: 2 },
  festival: { shots: [shot('scale(1.05)', '9% 29%'), shot('scale(1.2)', '9% 29%'), shot('scale(1.3)', '9% 29%'), shot('scale(1.05)', '9% 29%')] },
  'chapter-end': { shots: [shot('scale(1.1)', '50% 42%'), shot('scale(1.3)', '50% 45%'), shot('scale(1.05)', '50% 42%')], impact: 1 },
  epilogue: { shots: [shot('scale(1.05)', '11% 30%'), shot('scale(1.15)', '11% 30%'), shot('scale(1.15)', '11% 30%'), shot('scale(1.1)', '11% 30%'), shot('scale(1.2)', '11% 30%'), shot('scale(1.05)', '11% 30%')], impact: 2 },
};

/** A fraction written the school way, one number over the other. */
const Frac = ({ n, d }: { n: number; d: number }) => <span className="fq-cine-frac" aria-label={`${n} over ${d}`}><b>{n}</b><b>{d}</b></span>;

const pos = (left: number, top: number, extra?: CSSProperties): CSSProperties => ({ left: `${left}%`, top: `${top}%`, ...extra });

function Stars() {
  return <>{[[8, 8, 0], [28, 16, .8], [72, 6, 1.4], [56, 12, 2], [90, 18, .4], [40, 4, 1.1]].map(([x, y, d]) => (
    <span key={x} className="fq-cine-star" style={pos(x, y, { animationDelay: `${d}s` })} />
  ))}</>;
}

function Confetti() {
  return <span className="fq-cine-confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => (
    <i key={i} style={{ left: `${6 + i * 6.6}%`, background: ['#FF6B6B', '#FFC800', '#4CC9F0', '#7BD389'][i % 4], animationDelay: `${(i % 5) * 0.12}s` }} />
  ))}</span>;
}

/** Prologue: the Whole Stone glows in the town square, cracks into 15 equal pieces, and the pieces fly over town. */
function PrologueArt({ beat }: { beat: number }) {
  const cracked = beat >= 2;
  const landed = beat >= 3;
  return (
    <>
      <Stars />
      <span className="fq-cine-moon" />
      <svg className="fq-cine-town" viewBox="0 0 366 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 120 V70 h30 v-20 h26 v20 h20 V40 l18 -14 l18 14 v30 h24 v-26 h30 v26 h40 V54 l22 -18 l22 18 v16 h26 v-24 h30 v24 h40 v50 Z" fill="#14102A" />
        <rect x="40" y="80" width="6" height="8" fill="#FFC800" opacity=".7" /><rect x="92" y="60" width="6" height="8" fill="#FFC800" opacity=".7" /><rect x="250" y="70" width="6" height="8" fill="#FFC800" opacity=".7" />
      </svg>
      <div className={`fq-cine-case ${beat === 1 ? 'is-glowing' : ''}`} role="img"
        aria-label={cracked ? 'The Whole Stone has broken into 15 equal pieces' : 'The Whole Stone in its glass case'}>
        <div className="fq-cine-stone">
          {Array.from({ length: 15 }, (_, i) => {
            // Each piece flies to its own spot in town, spread across the roofs.
            const x = ((i * 7) % 15) / 14;
            const fly = cracked ? `translate(${Math.round((x - 0.5) * 300 - (i - 7) * 9)}px, ${Math.round(110 + (i % 4) * 22)}px) rotate(${(i % 2 ? 1 : -1) * (40 + i * 11)}deg)` : undefined;
            return <span key={i} className={`fq-cine-piece ${beat >= 1 ? 'is-lit' : ''} ${cracked && !landed ? 'is-flying' : ''} ${landed ? 'is-landed' : ''}`}
              style={{ transform: fly, transitionDelay: `${(i * 0.035).toFixed(2)}s` }} />;
          })}
        </div>
        <span className="fq-cine-case-label">{landed ? 'The case is locked!' : beat === 1 ? 'The Whole Stone' : ''}</span>
      </div>
      {beat === 2 && <><span className="fq-cine-flash" /><strong className="fq-cine-bang">CRACK!</strong></>}
    </>
  );
}

/** Chapter 1: Chomp grabs the big piece, the camera finds a stone piece in the crumbs, and the pie is cut fairly. */
function BakeryArt({ beat }: { beat: number }) {
  const fair = beat >= 2;
  return (
    <>
      <span className="fq-cine-awning" />
      <span className="fq-cine-shelf" style={pos(6, 18)} /><span className="fq-cine-shelf" style={pos(58, 16)} />
      <span className="fq-cine-counter" />
      <span className={`fq-cine-actor fq-cine-bakery-enter ${beat === 0 ? 'is-grabbing' : ''} ${fair ? 'is-hopping' : ''}`} style={pos(17, 22)}>
        <StoryCharacter id="chomp" size={112} happy={fair} worried={beat === 1} />
      </span>
      <svg className="fq-cine-pie" style={pos(53, 24)} viewBox="0 0 120 120" role="img"
        aria-label={fair ? 'A pie cut into 4 equal pieces' : 'A pie cut into 4 pieces of different sizes'}>
        <ellipse cx="60" cy="116" rx="52" ry="7" fill="rgb(0 0 0 / .28)" style={{ filter: 'blur(3px)' }} aria-hidden="true" />
        {fair
          ? ['M60 60 V8 A52 52 0 0 1 112 60 Z', 'M60 60 H112 A52 52 0 0 1 60 112 Z', 'M60 60 V112 A52 52 0 0 1 8 60 Z', 'M60 60 H8 A52 52 0 0 1 60 8 Z'].map((d, i) => (
            <path key={i} className={`fq-cine-slice is-${i}`} d={d} fill="#F6A55B" stroke="#B5651D" strokeWidth="3" />
          ))
          : <>
            <circle cx="60" cy="60" r="52" fill="#F6A55B" stroke="#B5651D" strokeWidth="6" />
            <path className={beat === 1 ? 'fq-cine-pulse' : ''} d="M60 60 L60 8 A52 52 0 0 1 108 80 Z" fill="#FFB86B" />
            <path d="M60 60 L60 8 M60 60 L108 80 M60 60 L30 108 M60 60 L10 50" stroke="#2B2D42" strokeWidth="3" fill="none" />
          </>}
      </svg>
      {beat === 2 && <><span className="fq-cine-knife is-first" /><span className="fq-cine-knife is-second" /></>}
      <span className={`fq-cine-glint ${beat === 1 ? 'is-found' : ''}`} style={pos(44, 56)} aria-hidden="true" />
      {beat === 1 && <span className="fq-cine-spot" style={{ '--x': '46%', '--y': '58%' } as CSSProperties} />}
      {fair && <Confetti />}
    </>
  );
}

/** Chapter 2: a stone piece splashes into Pip's snack bowl; two same-size snack bars are cut into halves and fourths,
    and one piece of each is laid side by side: more equal parts means smaller parts. */
function PondArt({ beat }: { beat: number }) {
  const cut = beat >= 1;
  const compared = beat >= 2;
  return (
    <>
      <span className="fq-cine-sun" />
      <span className="fq-cine-bunting" />
      <span className="fq-cine-pond" />
      <span className="fq-cine-pad" style={pos(2, 44)} />
      <span className="fq-cine-actor" style={pos(8, 22)}><StoryCharacter id="pip" size={88} happy={compared} worried={beat === 0} /></span>
      <span className="fq-cine-bowl" style={pos(60, 22)} />
      {beat === 0 && <><span className="fq-cine-falling" style={pos(74, 0)} /><span className="fq-cine-splash" style={pos(65, 18)} /></>}
      {cut && (
        <span className={`fq-cine-bars ${compared ? 'is-compared' : ''}`} style={pos(30, 38)}>
          {/* Both bars are the same size: one is cut into 2 equal pieces, the other into 4. */}
          <span className="fq-cine-cutbar is-halves">
            {[0, 1].map((i) => <i key={i} className={compared && i === 0 ? 'is-picked' : compared ? 'is-set-aside' : ''} />)}
            <span className="fq-cine-cutbar-label"><Frac n={1} d={2} /></span>
          </span>
          <span className="fq-cine-cutbar is-fourths">
            {[0, 1, 2, 3].map((i) => <i key={i} className={compared && i === 0 ? 'is-picked' : compared ? 'is-set-aside' : ''} />)}
            <span className="fq-cine-cutbar-label"><Frac n={1} d={4} /></span>
          </span>
        </span>
      )}
      <span className={`fq-cine-glint ${compared ? 'is-found' : 'is-hidden'}`} style={pos(71, 26)} aria-hidden="true" />
      <span className="fq-cine-sr" role="img" aria-label={compared
        ? 'One half and one fourth side by side: the half is bigger. More equal parts means smaller parts.'
        : cut ? 'Two same-size snack bars: one cut into 2 equal pieces, one cut into 4 equal pieces'
          : 'A stone piece falls into a snack bowl'} />
    </>
  );
}

/** Chapter 3: something shines at the top of Tilly's hill; landmark flags for 0, one half and 1 pop up along the path. */
function HillArt({ beat }: { beat: number }) {
  const flags = beat >= 1;
  const landmarks: [number, number, ReactNode][] = [[22, 49, <b>0</b>], [50, 27, <Frac n={1} d={2} />], [80, 8, <b>1</b>]];
  return (
    <>
      <span className="fq-cine-sun is-low" />
      <span className="fq-cine-cloud" style={pos(30, 8)} /><span className="fq-cine-cloud" style={pos(56, 22)} />
      <svg className="fq-cine-hill" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 100 V64 C30 62 60 30 100 6 V100 Z" fill="#7BD389" /><path d="M0 100 V72 C34 70 62 40 100 18 V100 Z" fill="#5FB872" />
        <path className={`fq-cine-trail ${flags ? 'is-on' : ''}`} d="M4 62 C34 58 62 30 92 11" fill="none" stroke="#FFF4D6" strokeWidth="1.4" strokeDasharray="3 2.4" />
      </svg>
      {flags && landmarks.map(([x, y, label], i) => (
        <span key={i} className="fq-cine-flag" style={pos(x, y, { animationDelay: `${i * 0.35}s` })}>{label}</span>
      ))}
      <span className="fq-cine-glint is-shining" style={pos(80, 12)} aria-hidden="true" />
      <span className="fq-cine-actor" style={beat >= 2 ? pos(30, 42) : pos(26, 50)}>
        <StoryCharacter id="tilly" size={beat >= 2 ? 60 : 68} worried={beat === 0} happy={beat === 2} />
      </span>
      <span className="fq-cine-sr" role="img" aria-label={flags ? 'Flags for 0, one half and 1 along the hill path' : 'Something shines at the top of a hill'} />
    </>
  );
}

/** Chapter 4: planks fall out of Pip's bridge; the bridge is split into equal jumps. */
function BridgeArt({ beat }: { beat: number }) {
  return (
    <>
      <Stars />
      <span className="fq-cine-cliff is-left" /><span className="fq-cine-cliff is-right" />
      <span className="fq-cine-river" />
      <span className="fq-cine-rope" />
      {Array.from({ length: 6 }, (_, i) => {
        const missing = i === 2 || i === 4;
        return <span key={i} className={`fq-cine-plank ${missing ? (beat === 0 ? 'is-falling' : 'is-gone') : ''}`}
          style={pos(18 + i * 10.6, 40, { animationDelay: `${i === 4 ? 0.25 : 0}s` })} />;
      })}
      {beat >= 1 && Array.from({ length: 7 }, (_, i) => <span key={i} className="fq-cine-tick" style={pos(17.6 + i * 10.6, 45, { animationDelay: `${i * 0.12}s` })} />)}
      {beat >= 2 && <svg className="fq-cine-hops" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${18 + i * 10.6} 39 q5.3 -12 10.6 0`} style={{ animationDelay: `${i * 0.3}s` }} />)}
      </svg>}
      <span className="fq-cine-actor" style={pos(18, 23)}><StoryCharacter id="pip" size={76} worried={beat === 0} /></span>
      <span className="fq-cine-sr" role="img" aria-label={beat >= 1 ? 'A bridge split into 6 equal jumps with 2 planks missing' : 'A bridge with 2 planks falling out'} />
    </>
  );
}

/** Chapter 5: Chomp guards a wobbly tower of treats; it is stacked again with the biggest treat at the bottom. */
function TowerArt({ beat }: { beat: number }) {
  const sorted = beat >= 1;
  const widths = [34, 52, 26, 44]; // bottom to top, as Chomp stacked them
  const order = sorted ? [...widths].sort((a, b) => b - a) : widths;
  return (
    <>
      <span className="fq-cine-wall" />
      <span className="fq-cine-floor" />
      <span className={`fq-cine-actor ${beat === 0 ? 'is-guarding' : ''}`} style={pos(16, 28)}>
        <StoryCharacter id="chomp" size={112} worried={beat === 1} happy={beat === 2} />
      </span>
      <div className={`fq-cine-tower ${beat === 0 ? 'is-wobbling' : ''}`} role="img"
        aria-label={sorted ? 'A steady tower with the biggest treat at the bottom' : 'A wobbly tower of treats'}>
        {widths.map((width, i) => (
          <span key={i} className={`fq-cine-treat is-${i} ${beat >= 2 ? 'is-cut' : ''}`} style={{ width: `${width}%`, bottom: `${order.indexOf(width) * 24}%` }} />
        ))}
      </div>
      {beat === 0 && <span className="fq-cine-crumb" style={pos(70, 8)} />}
      {beat === 2 && <span className="fq-cine-sparkle" style={pos(68, 2)} />}
    </>
  );
}

/** Chapter 6: three honey jars with different labels hold the same amount; a map flutters down. */
function HoneyArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-hive" style={pos(80, 6)} />
      <span className="fq-cine-shelf is-long" />
      {[[1, 2], [2, 4], [4, 8]].map(([n, d], i) => (
        <span key={i} className={`fq-cine-jar ${beat === 2 ? 'is-glowing' : ''}`} style={pos(10 + i * 30, 26, { animationDelay: `${i * 0.2}s` })}>
          <i className="fq-cine-honey" /><span className="fq-cine-label"><Frac n={n} d={d} /></span>
        </span>
      ))}
      {beat === 2 && <span className="fq-cine-level" />}
      <span className={`fq-cine-actor ${beat === 0 ? 'is-buzzing' : ''}`} style={pos(40, 1)}>
        <StoryCharacter id="bea" size={64} happy={beat === 2} />
      </span>
      <span className={`fq-cine-map ${beat === 0 ? 'is-falling' : ''}`} aria-hidden="true" />
      <span className="fq-cine-sr" role="img" aria-label="Three honey jars filled to the same height, labelled 1 over 2, 2 over 4 and 4 over 8" />
    </>
  );
}

/** Chapter 7: Bolt's workshop, where a suspicious stone piece sits among the machine parts. */
function WorkshopArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-workshop-window" /><span className="fq-cine-workbench" />
      <span className={`fq-cine-workshop-box ${beat >= 1 ? 'is-open' : ''}`}><i /><i /><i /></span>
      <span className={`fq-cine-gear ${beat >= 2 ? 'is-turning' : ''}`} style={pos(66, 30)} />
      <span className="fq-cine-actor" style={pos(10, 27)}><StoryCharacter id="bolt" size={104} worried={beat >= 1} happy={beat === 3} /></span>
      <span className={`fq-cine-glint ${beat >= 2 ? 'is-found' : ''}`} style={pos(77, 59)} aria-hidden="true" />
    </>
  );
}

/** Chapter 8: Chomp's den opens to reveal the boots he hid to protect Bolt. */
function DenArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-den-cave" /><span className="fq-cine-den-floor" />
      <span className={`fq-cine-boots ${beat >= 1 ? 'is-lit' : ''}`}><i /><i /></span>
      <span className={`fq-cine-den-stone ${beat >= 2 ? 'is-found' : ''}`} />
      <span className="fq-cine-actor" style={pos(8, 30)}><StoryCharacter id="chomp" size={108} worried={beat === 0} happy={beat >= 2} /></span>
    </>
  );
}

/** Chapter 9: Tilly follows the middle route while Bolt peeks from behind a tree. */
function RaceArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-race-sky" /><span className="fq-cine-race-hill" /><span className="fq-cine-race-road" />
      <span className="fq-cine-race-sign" style={pos(62, 6)}><b><Frac n={1} d={3} /></b><b><Frac n={1} d={2} /></b><b><Frac n={2} d={3} /></b></span>
      <span className="fq-cine-tree" style={pos(80, 46)} />
      {beat >= 2 && <span className="fq-cine-peeker" style={pos(80, 41)}><StoryCharacter id="bolt" size={50} worried /></span>}
      <span className="fq-cine-actor" style={pos(12, 42)}><StoryCharacter id="tilly" size={76} happy={beat >= 1} /></span>
      <span className={`fq-cine-glint ${beat >= 1 ? 'is-found' : ''}`} style={pos(55, 65)} aria-hidden="true" />
    </>
  );
}

/** Chapter 10: the team shares a picnic and leaves a place for Bolt. */
function PicnicArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-picnic-sky" /><span className="fq-cine-picnic-grass" />
      <span className="fq-cine-picnic-blanket" />
      {[16, 39, 62].map((x) => <span key={x} className="fq-cine-picnic-plate" style={pos(x, 63)} />)}
      <span className="fq-cine-picnic-basket" style={pos(68, 57)} />
      <span className="fq-cine-actor" style={pos(13, 27)}><StoryCharacter id="chomp" size={84} happy={beat >= 2} /></span>
      <span className={`fq-cine-peeker ${beat >= 2 ? 'is-arriving' : ''}`} style={pos(76, 31)}><StoryCharacter id="bolt" size={58} worried={beat < 2} happy={beat >= 2} /></span>
      {beat >= 1 && <span className="fq-cine-note" style={pos(70, 49)}>B</span>}
    </>
  );
}

/** Chapter 11: Bolt's machine rebuilds Pip's bridge as the team forgives him. */
function MachineArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-machine-wall" /><span className="fq-cine-machine-floor" />
      <span className={`fq-cine-machine ${beat >= 1 ? 'is-on' : ''}`}><i /><i /><i /></span>
      <span className={`fq-cine-machine-plank ${beat >= 2 ? 'is-built' : ''}`} />
      <span className="fq-cine-actor" style={pos(9, 29)}><StoryCharacter id="bolt" size={94} worried={beat === 0} happy={beat >= 2} /></span>
      <span className="fq-cine-actor" style={pos(72, 43)}><StoryCharacter id="pip" size={62} happy={beat >= 2} /></span>
      {beat === 1 && <span className="fq-cine-flash" />}
    </>
  );
}

/** Chapter 12: Pip measures the festival stage board by board. */
function StageArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-stage-curtain" /><span className="fq-cine-stage-floor" />
      <span className="fq-cine-stage-board" />
      <span className="fq-cine-ruler" style={pos(24, 61)}>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span>
      <span className="fq-cine-actor" style={pos(8, 26)}><StoryCharacter id="pip" size={92} happy={beat >= 2} /></span>
      {beat >= 1 && <span className="fq-cine-glint is-found" style={pos(65, 69)} aria-hidden="true" />}
    </>
  );
}

/** Chapter 13: Bea's garden is divided into equal plots around the locked glass case. */
function GardenArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-garden-sky" /><span className="fq-cine-garden-bed" />
      {[0, 1, 2, 3].map((i) => <span key={i} className={`fq-cine-garden-plot is-${i}`} />)}
      <span className="fq-cine-garden-case" />
      <span className="fq-cine-actor" style={pos(10, 27)}><StoryCharacter id="bea" size={88} happy={beat >= 2} /></span>
      {beat >= 1 && <span className="fq-cine-glint is-found" style={pos(68, 64)} aria-hidden="true" />}
    </>
  );
}

/** Chapter 14: the Whole Stone's glass case is empty and locked. Bolt matches the dials (one half, 50 hundredths,
    50%); the case only opens at the end of the chapter. */
function LockArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-lock-room" /><span className="fq-cine-lock-case">
        <span className="fq-cine-lock-seat" />
        <span className={`fq-cine-lock-dials ${beat >= 2 ? 'is-matched' : ''}`}><b><Frac n={1} d={2} /></b><b><Frac n={50} d={100} /></b><b>50%</b></span>
      </span>
      <span className="fq-cine-actor" style={pos(8, 32)}><StoryCharacter id="bolt" size={88} happy={beat >= 2} /></span>
      {beat === 2 && <span className="fq-cine-flash" />}
    </>
  );
}

/** Chapter 15: Chomp's last riddles bring the whole team together at the festival. */
function FestivalArt({ beat }: { beat: number }) {
  return (
    <>
      <span className="fq-cine-festival-sky" /><span className="fq-cine-festival-tent" />
      <span className="fq-cine-festival-stone">{Array.from({ length: 15 }, (_, i) => <i key={i} />)}</span>
      <span className="fq-cine-actor" style={pos(9, 29)}><StoryCharacter id="chomp" size={92} happy={beat >= 2} /></span>
      {beat >= 1 && <span className="fq-cine-festival-riddle">?</span>}
      {beat >= 2 && <Confetti />}
    </>
  );
}

/** Finished chapters close on the friend, their recovered piece, and an image of that chapter's story. */
function ChapterEndArt({ beat, unit = 1, speaker }: { beat: number; unit?: number; speaker?: Panel['speaker'] }) {
  const chapter = CHAPTERS[unit - 1] ?? CHAPTERS[0];
  return (
    <>
      <span className="fq-cine-end-horizon" />
      <span className={`fq-cine-end-stone ${beat >= 1 ? 'is-found' : ''}`} role="img" aria-label={`Chapter ${unit} stone piece recovered`} />
      <span className="fq-cine-actor" style={pos(26, 27)}><StoryCharacter id={speaker ?? chapter.character} size={96} happy={beat >= 1} /></span>
      {/* The chapter's friend stays beside their piece, so every ending looks like its own chapter. */}
      {speaker && speaker !== chapter.character && (
        <span className="fq-cine-actor" style={pos(72, 40)} data-testid="story-end-friend"><StoryCharacter id={chapter.character} size={66} happy={beat >= 1} /></span>
      )}
      <span className={`fq-cine-end-ribbon ${beat >= 2 ? 'is-visible' : ''}`}>{beat >= 2 ? `${unit} of 15 pieces` : ''}</span>
      {beat >= 2 && <Confetti />}
    </>
  );
}

function EpilogueArt({ beat, speaker = 'hoot' }: { beat: number; speaker?: Panel['speaker'] }) {
  return (
    <>
      <span className="fq-cine-end-horizon is-festival" />
      <span className="fq-cine-whole-stone" aria-label="The Whole Stone restored with 15 equal pieces">
        {Array.from({ length: 15 }, (_, i) => <i key={i} />)}
      </span>
      <span className="fq-cine-actor" style={pos(11, 30)}><StoryCharacter id={speaker} size={88} happy /></span>
      <span className="fq-cine-festival-riddle fq-cine-epilogue-riddle">{beat >= 1 ? 'One whole' : 'Festival'}</span>
      {beat >= 2 && <Confetti />}
    </>
  );
}

/** Lessons 2 onward play in the chapter's place with no story props, so nothing in the picture can disagree with the
    lesson: just the backdrop, whoever is speaking, and the chapter's friend beside them. */
type ChapterScene = Exclude<StoryScene, 'prologue' | 'chapter-end' | 'epilogue'>;
const BACKDROPS: Record<ChapterScene, () => ReactNode> = {
  bakery: () => <><span className="fq-cine-awning" /><span className="fq-cine-shelf" style={pos(6, 18)} /><span className="fq-cine-shelf" style={pos(58, 16)} /><span className="fq-cine-counter" /></>,
  pond: () => <><span className="fq-cine-sun" /><span className="fq-cine-bunting" /><span className="fq-cine-pond" /><span className="fq-cine-pad" style={pos(2, 44)} /></>,
  hill: () => <><span className="fq-cine-sun is-low" /><span className="fq-cine-cloud" style={pos(30, 8)} /><span className="fq-cine-cloud" style={pos(56, 22)} />
    <svg className="fq-cine-hill" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 100 V64 C30 62 60 30 100 6 V100 Z" fill="#7BD389" /><path d="M0 100 V72 C34 70 62 40 100 18 V100 Z" fill="#5FB872" />
    </svg></>,
  bridge: () => <><Stars /><span className="fq-cine-cliff is-left" /><span className="fq-cine-cliff is-right" /><span className="fq-cine-river" /><span className="fq-cine-rope" />
    {Array.from({ length: 6 }, (_, i) => <span key={i} className={`fq-cine-plank ${i === 2 || i === 4 ? 'is-gone' : ''}`} style={pos(18 + i * 10.6, 40)} />)}</>,
  tower: () => <><span className="fq-cine-wall" /><span className="fq-cine-floor" /></>,
  honey: () => <><span className="fq-cine-hive" style={pos(80, 6)} /><span className="fq-cine-shelf is-long" /></>,
  workshop: () => <><span className="fq-cine-workshop-window" /><span className="fq-cine-workbench" /><span className="fq-cine-gear is-turning" style={pos(66, 30)} /></>,
  den: () => <><span className="fq-cine-den-cave" /><span className="fq-cine-den-floor" /></>,
  race: () => <><span className="fq-cine-race-sky" /><span className="fq-cine-race-hill" /><span className="fq-cine-race-road" /><span className="fq-cine-tree" style={pos(80, 46)} /></>,
  picnic: () => <><span className="fq-cine-picnic-sky" /><span className="fq-cine-picnic-grass" /><span className="fq-cine-picnic-blanket" /><span className="fq-cine-picnic-basket" style={pos(68, 57)} /></>,
  machine: () => <><span className="fq-cine-machine-wall" /><span className="fq-cine-machine-floor" /><span className="fq-cine-machine is-on"><i /><i /><i /></span></>,
  stage: () => <><span className="fq-cine-stage-curtain" /><span className="fq-cine-stage-floor" /><span className="fq-cine-stage-board" /></>,
  garden: () => <><span className="fq-cine-garden-sky" /><span className="fq-cine-garden-bed" /><span className="fq-cine-garden-case" /></>,
  lock: () => <><span className="fq-cine-lock-room" /><span className="fq-cine-lock-case"><span className="fq-cine-lock-seat" /></span></>,
  festival: () => <><span className="fq-cine-festival-sky" /><span className="fq-cine-festival-tent" /></>,
};
const isChapterScene = (scene: StoryScene): scene is ChapterScene => scene in BACKDROPS;

function SetArt({ scene, unit = 1, speaker }: { scene: ChapterScene; beat: number; unit?: number; speaker?: Panel['speaker'] }) {
  const friend = (CHAPTERS[unit - 1] ?? CHAPTERS[0]).character;
  const Backdrop = BACKDROPS[scene];
  return (
    <>
      <Backdrop />
      <span key={speaker ?? friend} className="fq-cine-actor fq-cine-set-speaker" style={pos(10, 30)} data-testid="story-set-speaker">
        <StoryCharacter id={speaker ?? friend} size={96} happy />
      </span>
      {speaker && speaker !== friend && (
        <span className="fq-cine-actor" style={pos(70, 42)}><StoryCharacter id={friend} size={66} /></span>
      )}
    </>
  );
}

/** A lesson scene's camera: a slow push in on whoever speaks, then back out for the still. */
const setFilming = (panels: number) => ({
  shots: [shot('scale(1.06)', '50% 45%'), ...Array.from({ length: panels }, (_, i) => shot(`scale(${i % 2 ? 1.12 : 1.18})`, i % 2 ? '45% 45%' : '24% 45%')), shot('scale(1.04)', '50% 45%')],
}) as { shots: Shot[]; impact?: number; coldFrom?: number; end?: string };

const ART: Record<StoryScene, (props: { beat: number; unit?: number; speaker?: Panel['speaker'] }) => ReactNode> = {
  prologue: PrologueArt, bakery: BakeryArt, pond: PondArt, hill: HillArt, bridge: BridgeArt, tower: TowerArt, honey: HoneyArt,
  workshop: WorkshopArt, den: DenArt, race: RaceArt, picnic: PicnicArt, machine: MachineArt, stage: StageArt,
  garden: GardenArt, lock: LockArt, festival: FestivalArt, 'chapter-end': ChapterEndArt, epilogue: EpilogueArt,
};

/** What a filmed comic reads aloud, panel by panel: just the line, with "friend" instead of the child's name. The
    caption shows who is speaking, so the voice doesn't say it (plain comics read "Hoot says: ..." via storyScript). */
export const filmedLines = (panels: Panel[], theme: ReturnType<typeof propTheme>) =>
  panels.map((panel) => withName(panel.text, null, theme));

export function CinematicComic({ scene, title, kicker, panels, name, choice, picked: saved, choiceNotes, note, goLabel, onGo, onBack, unit, setOnly = false }: {
  scene: StoryScene; title: string; kicker: string; panels: Panel[]; name: string | null; unit?: number;
  /** A later lesson: the chapter's place and the speakers, without the opening film's story props. */
  setOnly?: boolean;
  choice?: [StoryChoice, StoryChoice]; picked?: 0 | 1; choiceNotes?: [string, string]; note?: string; goLabel: string;
  onGo: (choice?: 0 | 1) => void; onBack: () => void;
}) {
  const { fun } = useFun();
  const theme = propTheme(useSeason().season?.id);
  const reader = useFollowedReading();
  const lessonSet = setOnly && isChapterScene(scene) ? scene : null;
  const filming = lessonSet ? setFilming(panels.length) : FILMING[scene];
  const Art = useMemo(() => (lessonSet
    ? (props: { beat: number; unit?: number; speaker?: Panel['speaker'] }) => <SetArt scene={lessonSet} {...props} />
    : ART[scene]), [lessonSet, scene]);
  const [voiceOn, setVoiceOn] = useState(() => savedFilmVoice() ?? fun.sound !== false);
  // Story music: a grown-up allows it (on unless turned off, and only with sounds on); the film's button turns it off.
  const musicAllowed = fun.sound !== false && fun.displayPreferences?.storyMusic !== false;
  const [musicOn, setMusicOn] = useState(() => savedFilmMusic() ?? true);
  const music = useRef<StoryMusic | null>(null);
  // While the voice is on its way (a clip still downloading), the caption says so; while it speaks, the music is softer.
  const [voiceWaiting, setVoiceWaiting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [chars, setChars] = useState(0);
  const [ending, setEnding] = useState(false);
  const [done, setDone] = useState(false);
  const [take, setTake] = useState(0); // counts replays, so the title card and entrances play again
  const [started, setStarted] = useState(false); // the title font is in (or the short wait is over)
  const [picked, setPicked] = useState<0 | 1 | null>(saved ?? null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const voiceRef = useRef(voiceOn);
  const voiceDriving = useRef(false);
  const beatRef = useRef(-1);
  const typedRef = useRef(false);
  const stall = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lines = useMemo(() => panels.map((panel) => ({ ...panel, text: withName(panel.text, name, theme) })), [panels, name, theme]);
  // What is read aloud says "friend", never the child's name; each panel is one or more of its sentences.
  const spoken = useMemo(() => filmedLines(panels, theme), [panels, theme]);
  const sentenceToPanel = useMemo(() => spoken.flatMap((line, index) => sentences(spokenText(line)).map(() => index)), [spoken]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  /** The voice is late (a clip is still downloading or being made): the film keeps its pace without it. */
  const dropVoice = () => {
    clearTimeout(stall.current);
    if (!voiceDriving.current) return;
    voiceDriving.current = false; reader.stop(); setVoiceWaiting(false); setSpeaking(false);
    if (typedRef.current) later(() => showBeat(beatRef.current + 1), PAUSE_MS); // a caption still typing moves on by itself
  };
  /** While the voice leads, each shot waits only as long as its line could take to read. */
  const watchVoice = (shot: number) => {
    clearTimeout(stall.current);
    if (!voiceDriving.current) return;
    const due = (lines[shot]?.text.length ?? 0) / VOICE_CPS * 1000 + VOICE_SLACK_MS;
    stall.current = setTimeout(dropVoice, shot === 0 ? Math.max(VOICE_GIVE_UP_MS, due) : due);
  };
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const finish = () => {
    if (!filming.end) { setDone(true); return; }
    setEnding(true);
    later(() => { setEnding(false); setDone(true); }, END_MS);
  };

  const showBeat = (next: number) => {
    clearTimers();
    if (next >= lines.length) { finish(); return; }
    beatRef.current = next; typedRef.current = false;
    setBeat(next); setChars(0);
    watchVoice(next);
    const length = lines[next].text.length;
    const tick = (count: number) => {
      setChars(count);
      if (count < length) later(() => tick(Math.min(length, count + 2)), TYPE_MS * 2);
      else { typedRef.current = true; if (!voiceDriving.current) later(() => showBeat(next + 1), PAUSE_MS); }
    };
    tick(0);
  };

  /** Read the film aloud from shot `from` on (the start, or the shot on screen when the voice is turned on). */
  const speakFrom = (from: number) => {
    voiceDriving.current = voiceRef.current && reader.supported;
    if (!voiceDriving.current) return;
    setVoiceWaiting(true);
    let heard = false;
    const first = Math.max(0, sentenceToPanel.indexOf(from));
    reader.speak(spoken.slice(from).join(' '), {
      onPart: (index) => {
        const panel = sentenceToPanel[first + index] ?? from;
        setSpeaking(true);
        // The voice has arrived: the line it starts on types again in step with it.
        if (!heard) { heard = true; setVoiceWaiting(false); if (panel === beatRef.current) { showBeat(panel); return; } }
        if (panel > beatRef.current) showBeat(panel);
      },
      onEnd: () => {
        clearTimeout(stall.current);
        voiceDriving.current = false; setVoiceWaiting(false); setSpeaking(false);
        // No voice, or it stopped early: the timer carries on from here (a caption still typing moves on by itself).
        if (typedRef.current) later(() => showBeat(beatRef.current + 1), beatRef.current >= lines.length - 1 ? 600 : PAUSE_MS);
      },
    });
  };

  /** After the title card: the voice drives the shots, or a timer does. */
  const roll = () => {
    speakFrom(0);
    showBeat(0);
  };

  const play = (replay = false) => {
    clearTimers(); clearTimeout(stall.current); reader.stop(); voiceDriving.current = false; setVoiceWaiting(false); setSpeaking(false);
    setDone(false); setEnding(false); setBeat(-1); beatRef.current = -1; typedRef.current = false;
    // A replay remounts the screen so the title card and entrances play again; the first play must not (it would
    // restart every animation a frame after they began).
    if (replay) setTake((count) => count + 1);
    later(roll, TITLE_MS);
  };

  const showAll = () => {
    clearTimers(); clearTimeout(stall.current); reader.stop(); voiceDriving.current = false; setVoiceWaiting(false); setSpeaking(false);
    setBeat(lines.length - 1); beatRef.current = lines.length - 1; setEnding(false); setDone(true);
  };

  // The comic starts by itself (the tap that opened it unlocked the sound).
  useEffect(() => {
    // Start fetching the voice now: the title card gives the first clips a head start.
    if (voiceOn) prefetchReading(spoken.join(' '));
    let live = true;
    titleFontReady().then(() => { if (live) { setStarted(true); play(); } });
    return () => { live = false; clearTimers(); clearTimeout(stall.current); reader.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per comic
  }, []);

  // The big moment lands with a thud (when sounds are on) and a heavy tap in the app (iPhone and Android).
  useEffect(() => {
    if (!done && beat >= 0 && beat === filming.impact) playCue('impact', fun.sound !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per shot
  }, [beat, take]);

  // The button decides whether the film is heard, right away: off silences it, on reads from the shot on screen.
  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next); voiceRef.current = next;
    saveFilmVoice(next);
    if (!next) {
      clearTimeout(stall.current); reader.stop(); voiceDriving.current = false; setVoiceWaiting(false); setSpeaking(false);
      if (!done && beatRef.current >= 0 && typedRef.current) later(() => showBeat(beatRef.current + 1), PAUSE_MS);
    } else if (!done && beatRef.current >= 0) {
      const shot = beatRef.current;
      prefetchReading(spoken.slice(shot).join(' '));
      speakFrom(shot);
      showBeat(shot); // the line on screen starts again, read aloud this time
    }
    // Before the first shot (the title card), the film simply starts with the new setting.
  };

  const titleCard = !done && beat < 0;
  const typing = !done && beat >= 0 && chars < (lines[beat]?.text.length ?? 0);
  const current = !ending && beat >= 0 ? lines[done ? lines.length - 1 : beat] : null;
  const [camera, origin] = filming.shots[done || ending ? filming.shots.length - 1 : beat + 1] ?? filming.shots[0];
  const cold = filming.coldFrom !== undefined && (done || beat >= filming.coldFrom);
  const waitingCaption = voiceWaiting && !done && beat >= 0;
  const reply = choice && picked !== null ? choice[picked].reply : null;

  // The music starts with the film, follows its mood, gets softer under the voice, and fades out when it closes.
  const playMusic = musicAllowed && musicOn && started;
  const mood = filmMood({ cold, finished: done || ending });
  useEffect(() => {
    if (!playMusic) return;
    const player = new StoryMusic();
    music.current = player;
    player.start(mood);
    return () => { player.stop(); music.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- started once; the mood follows below
  }, [playMusic]);
  useEffect(() => { music.current?.setMood(mood); }, [mood]);
  useEffect(() => { music.current?.duck(speaking); }, [speaking]);
  const toggleMusic = () => { const next = !musicOn; setMusicOn(next); saveFilmMusic(next); };

  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell fq-cine">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-story-back" title={title} />
        <section className={`fq-story-comic fq-cine-comic ${done ? 'is-done' : ''} ${done && choice ? 'has-choice' : ''}`} aria-labelledby="story-title" data-testid="story-comic">
          <div className="fq-story-comic-head">
            <h2 id="story-title">{kicker}</h2>
            <span className="fq-cine-head-tools">
            <button type="button" className="fq-cine-voice" aria-pressed={voiceOn} onClick={toggleVoice}
              aria-label={voiceOn ? 'Turn the story voice off' : 'Turn the story voice on'} data-testid="button-story-voice">
              {voiceOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />} {voiceOn ? 'Voice on' : 'Voice off'}
            </button>
            {musicAllowed && (
              <button type="button" className="fq-cine-voice fq-cine-music" aria-pressed={musicOn} onClick={toggleMusic}
                aria-label={musicOn ? 'Turn the story music off' : 'Turn the story music on'} data-testid="button-story-music">
                <Music size={16} aria-hidden="true" /> {musicOn ? 'Music on' : 'Music off'}
              </button>
            )}
            </span>
          </div>
          <button type="button" key={take} className={`fq-cine-screen is-${scene} ${done ? '' : 'is-rolling'}`} data-testid="story-panels"
            onClick={() => (typing ? setChars(lines[beat].text.length) : undefined)}
            aria-label={done ? 'The last scene of the story' : 'The story scene'}>
            <span className={`fq-cine-cam ${cold ? 'is-cold' : 'is-warm'}`} style={{ transform: camera, transformOrigin: origin }}>
              <span className={`fq-cine-set ${!done && beat === filming.impact ? 'is-shaking' : ''}`} data-testid="story-stage">
                <Art beat={done ? lines.length - 1 : Math.max(beat, 0)} unit={unit} speaker={lines[done ? lines.length - 1 : Math.max(beat, 0)]?.speaker} />
              </span>
            </span>
            <span className={`fq-cine-grade ${cold ? 'is-cold' : 'is-warm'}`} aria-hidden="true" />
            <span className="fq-cine-ambient" aria-hidden="true" />
            <span className="fq-cine-vignette" />
            <span className="fq-cine-grain" aria-hidden="true" />
            <span className="fq-cine-bar is-top" /><span className="fq-cine-bar is-bottom" />
            {titleCard && (started ? (
              <span className="fq-cine-card">
                <small>{kicker}</small>
                <strong>{title}</strong>
              </span>
            ) : <span className="fq-cine-card is-waiting" aria-hidden="true" />)}
            {current && (
              <span key={beat} className={`fq-cine-caption is-${current.speaker}`} data-testid={done ? 'story-caption-final' : `story-panel-${beat}`}>
                <span className={`fq-cine-face ${typing ? 'is-talking' : ''}`}><StoryCharacter id={current.speaker} size={44} happy={current.mood === 'happy'} worried={current.mood === 'worried'} /></span>
                <span className="fq-cine-words">
                  <span className="fq-cine-name">{CHARACTERS[current.speaker].name}</span>
                  <span className="fq-cine-line">
                    {/* The full line, hidden, holds the caption's size so it doesn't grow or re-wrap as it types. */}
                    {!done && <span className="fq-cine-line-space" aria-hidden="true"><LearningText text={current.text} emphasize interactiveTerms={false} /></span>}
                    {waitingCaption
                      ? <span className="fq-cine-voice-wait" data-testid="story-voice-waiting"><span className="fq-cine-wait-dots" aria-hidden="true"><i /><i /><i /></span>Getting {CHARACTERS[current.speaker].name}’s voice ready…</span>
                      : <span><LearningText text={done ? current.text : current.text.slice(0, chars)} emphasize interactiveTerms={false} />{typing && <i className="fq-cine-caret" aria-hidden="true" />}</span>}
                  </span>
                </span>
              </span>
            )}
            {ending && <span className="fq-cine-end"><strong>{filming.end}</strong></span>}
          </button>
          {!done && (
            <ol className="fq-cine-dots" aria-label={beat >= 0 ? `Scene ${beat + 1} of ${lines.length}` : 'Starting the story'}>
              {lines.map((_, index) => <li key={index} className={index === beat ? 'is-on' : index < beat ? 'is-seen' : ''} />)}
            </ol>
          )}
          {/* For screen readers the scene is one button, so its captions are also kept here: each line is added (and
              read) as it starts, and the whole story stays once the film ends. */}
          <ol className="fq-cine-transcript" aria-live={done ? undefined : 'polite'} aria-label="Story so far">
            {lines.slice(0, done ? lines.length : Math.max(beat + 1, 0)).map((panel, index) => (
              <li key={index} data-testid={done ? `story-panel-${index}` : undefined}>{CHARACTERS[panel.speaker].name}: {panel.text}</li>
            ))}
          </ol>
          {done && choice && (
            <fieldset className="fq-story-choice fq-cine-rise" data-testid="story-choice">
              <legend>What should we do first{name ? `, ${name}` : ''}?
                <LearningListenButton text={choice.map((option) => `${withName(option.label, null, theme)}. ${withName(option.detail, null, theme)}.`).join(' ')} label="Listen to the choices" compact />
              </legend>
              {choice.map((option, index) => (
                <button key={option.label} type="button" className={picked === index ? 'on' : ''} aria-pressed={picked === index}
                  onClick={() => setPicked(index as 0 | 1)} data-testid={`button-story-choice-${index}`}>
                  <strong>{withName(option.label, name, theme)}</strong><span>{withName(option.detail, name, theme)}</span>
                </button>
              ))}
              {reply && (
                <p className="fq-story-reply" role="status" data-testid="story-choice-reply">
                  <StoryCharacter id={reply.speaker} size={40} />
                  <LearningListenButton text={withName(reply.text, null, theme)} label="Listen to the reply" compact />
                  <span><b>{CHARACTERS[reply.speaker].name}:</b> {withName(reply.text, name, theme)}
                    {choiceNotes && picked !== null && <em className="fq-story-reward" data-testid="story-choice-reward">{choiceNotes[picked]}</em>}</span>
                </p>
              )}
            </fieldset>
          )}
          {done && note && <p className="fq-story-note fq-cine-rise" data-testid="story-detective-note"><Search size={16} aria-hidden="true" /> <LearningListenButton text={withName(note, null, theme)} label="Listen to the note" compact /> {withName(note, name, theme)}</p>}
          <div className="fq-cine-controls">
            <button type="button" className="fq-button ghost" onClick={() => play(true)} data-testid="button-story-replay"><RotateCcw size={16} aria-hidden="true" /> Replay</button>
            {done ? (
              <button type="button" className="fq-button fq-story-go" onClick={() => onGo(picked ?? undefined)} disabled={!!choice && picked === null} data-testid="button-story-go">
                {goLabel} <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="fq-button secondary" onClick={showAll} data-testid="button-story-skip">Skip to the end</button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
