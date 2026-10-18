/* A story comic filmed like a short cartoon: a title card, then one shot per panel on a big letterboxed screen. The
   camera pushes in and pans between shots, the colours warm or cool with the mood, and the words appear as a
   caption with the speaker's face while the voice reads along. Big moments (the stone cracking, a splash, a falling
   plank) shake the screen with a thud and, in the iPhone app, a heavy tap. Without a voice the shots move on by
   themselves, and a voice that falls behind (a clip still loading) never holds the film up: it carries on without
   it. A tap finishes a caption or shows everything. "Reduce motion" keeps the camera still.
   Scenes: the prologue and the opening comic of chapters 1 to 6. Other comics use the plain view. */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, RotateCcw, Search, Volume2, VolumeX } from 'lucide-react';
import { StoryCharacter } from './characters';
import { prefetchReading, useFollowedReading } from './LearningText';
import { useFun, useSeason } from './fun-ui';
import { playCue } from './lib/fun';
import { sentences, spokenText } from './lib/voice';
import { CHARACTERS, propTheme, withName, type Panel, type StoryChoice, type StoryScene } from './story';
import { TaskBar } from './TaskBar';
import './story-cinema.css';

export { CHAPTER_SCENES, type StoryScene } from './story';

const TYPE_MS = 32;        // one character every 32 ms: a little ahead of the voice
const PAUSE_MS = 1100;     // without a voice, the pause before the next shot
const TITLE_MS = 1700;     // the title card before the first shot
const END_MS = 1800;       // the "to be continued" card
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
  pond: { shots: [shot('scale(1.1)', '50% 40%'), shot('scale(1.35)', '66% 38%'), shot('scale(1.1)', '50% 46%'), shot('scale(1.2)', '30% 50%')], impact: 0 },
  hill: { shots: [shot('scale(1.1)', '20% 50%'), shot('scale(1.4)', '86% 14%'), shot('scale(1)', '50% 40%'), shot('scale(1.25)', '35% 40%')] },
  bridge: { shots: [shot('scale(1.1)', '50% 40%'), shot('scale(1.35)', '55% 38%'), shot('scale(1)', '50% 40%'), shot('scale(1.1)', '50% 36%')], impact: 0 },
  tower: { shots: [shot('scale(1.1)', '50% 40%'), shot('scale(1.25)', '30% 36%'), shot('scale(1.2)', '72% 30%'), shot('scale(1.05)', '60% 36%')], impact: 0 },
  honey: { shots: [shot('scale(1.1)', '50% 30%'), shot('scale(1.25)', '50% 16%'), shot('scale(1.4)', '30% 40%'), shot('scale(1.1)', '50% 40%')] },
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
      <span className={`fq-cine-actor fq-cine-enter-left ${beat === 0 ? 'is-grabbing' : ''} ${fair ? 'is-hopping' : ''}`} style={pos(4, 22)}>
        <StoryCharacter id="chomp" size={112} happy={fair} worried={beat === 1} />
      </span>
      <svg className="fq-cine-pie" style={pos(52, 24)} viewBox="0 0 120 120" role="img"
        aria-label={fair ? 'A pie cut into 4 equal pieces' : 'A pie cut into 4 pieces of different sizes'}>
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

/** Chapter 2: a stone piece splashes into Pip's snack bowl; the snacks are shared into equal groups to find it. */
function PondArt({ beat }: { beat: number }) {
  const grouped = beat >= 1;
  return (
    <>
      <span className="fq-cine-sun" />
      <span className="fq-cine-bunting" />
      <span className="fq-cine-pond" />
      <span className="fq-cine-pad" style={pos(2, 44)} />
      <span className="fq-cine-actor" style={pos(6, 24)}><StoryCharacter id="pip" size={96} happy={beat === 2} worried={beat === 0} /></span>
      <span className="fq-cine-bowl" style={pos(52, 32)} />
      {beat === 0 && <><span className="fq-cine-falling" style={pos(68, 0)} /><span className="fq-cine-splash" style={pos(57, 28)} /></>}
      {grouped && [18, 50, 82].map((x, plate) => (
        <span key={x} className={`fq-cine-plate ${beat === 2 && plate === 0 ? 'is-picked' : ''}`} style={pos(x - 11, 58)} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const plate = Math.floor(i / 4);
        const [left, top] = grouped
          ? [[18, 50, 82][plate] - 3 + (i % 2) * 6, 58 + (Math.floor(i / 2) % 2) * 4]
          : [60 + (i % 4) * 6, 35 + Math.floor(i / 4) * 3.5];
        return <span key={i} className="fq-cine-snack" style={pos(left, top, { transitionDelay: `${(i * 0.06).toFixed(2)}s` })} />;
      })}
      <span className={`fq-cine-glint ${grouped ? 'is-found' : 'is-hidden'}`} style={pos(66, 38)} aria-hidden="true" />
      <span className="fq-cine-sr" role="img" aria-label={grouped ? '12 snacks shared into 3 equal groups' : 'A stone piece falls into a bowl of 12 snacks'} />
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
      <span className="fq-cine-glint is-shining" style={pos(88, 12)} aria-hidden="true" />
      <span className="fq-cine-actor" style={beat >= 2 ? pos(30, 42) : pos(1, 50)}>
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
      <span className="fq-cine-actor" style={pos(2, 23)}><StoryCharacter id="pip" size={76} worried={beat === 0} /></span>
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
      <span className={`fq-cine-actor ${beat === 0 ? 'is-guarding' : ''}`} style={pos(4, 28)}>
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
      <span className={`fq-cine-actor ${beat === 0 ? 'is-buzzing' : ''}`} style={pos(36, 4)}>
        <StoryCharacter id="bea" size={72} happy={beat === 2} />
      </span>
      <span className={`fq-cine-map ${beat === 0 ? 'is-falling' : ''}`} aria-hidden="true" />
      <span className="fq-cine-sr" role="img" aria-label="Three honey jars filled to the same height, labelled 1 over 2, 2 over 4 and 4 over 8" />
    </>
  );
}

const ART: Record<StoryScene, (props: { beat: number }) => ReactNode> = {
  prologue: PrologueArt, bakery: BakeryArt, pond: PondArt, hill: HillArt, bridge: BridgeArt, tower: TowerArt, honey: HoneyArt,
};

/** What a filmed comic reads aloud, panel by panel: just the line, with "friend" instead of the child's name. The
    caption shows who is speaking, so the voice doesn't say it (plain comics read "Hoot says: ..." via storyScript). */
export const filmedLines = (panels: Panel[], theme: ReturnType<typeof propTheme>) =>
  panels.map((panel) => withName(panel.text, null, theme));

export function CinematicComic({ scene, title, kicker, panels, name, choice, picked: saved, choiceNotes, note, goLabel, onGo, onBack }: {
  scene: StoryScene; title: string; kicker: string; panels: Panel[]; name: string | null;
  choice?: [StoryChoice, StoryChoice]; picked?: 0 | 1; choiceNotes?: [string, string]; note?: string; goLabel: string;
  onGo: (choice?: 0 | 1) => void; onBack: () => void;
}) {
  const { fun } = useFun();
  const theme = propTheme(useSeason().season?.id);
  const reader = useFollowedReading();
  const filming = FILMING[scene];
  const Art = ART[scene];
  const [voiceOn, setVoiceOn] = useState(fun.sound !== false);
  const [beat, setBeat] = useState(-1);
  const [chars, setChars] = useState(0);
  const [ending, setEnding] = useState(false);
  const [done, setDone] = useState(false);
  const [take, setTake] = useState(0); // counts replays, so the title card and entrances play again
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
    voiceDriving.current = false; reader.stop();
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

  /** After the title card: the voice drives the shots, or a timer does. */
  const roll = () => {
    voiceDriving.current = voiceRef.current && reader.supported;
    if (!voiceDriving.current) { showBeat(0); return; }
    reader.speak(spoken.join(' '), {
      onPart: (index) => {
        const panel = sentenceToPanel[index] ?? 0;
        if (panel > beatRef.current) showBeat(panel);
      },
      onEnd: () => {
        clearTimeout(stall.current);
        voiceDriving.current = false;
        // No voice, or it stopped early: the timer carries on from here (a caption still typing moves on by itself).
        if (typedRef.current) later(() => showBeat(beatRef.current + 1), beatRef.current >= lines.length - 1 ? 600 : PAUSE_MS);
      },
    });
    showBeat(0);
  };

  const play = () => {
    clearTimers(); clearTimeout(stall.current); reader.stop(); voiceDriving.current = false;
    setDone(false); setEnding(false); setBeat(-1); beatRef.current = -1; typedRef.current = false;
    setTake((count) => count + 1);
    later(roll, TITLE_MS);
  };

  const showAll = () => {
    clearTimers(); clearTimeout(stall.current); reader.stop(); voiceDriving.current = false;
    setBeat(lines.length - 1); beatRef.current = lines.length - 1; setEnding(false); setDone(true);
  };

  // The comic starts by itself (the tap that opened it unlocked the sound).
  useEffect(() => {
    // Start fetching the voice now: the title card gives the first clips a head start.
    if (voiceOn) prefetchReading(spoken.join(' '));
    play();
    return () => { clearTimers(); clearTimeout(stall.current); reader.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per comic
  }, []);

  // The big moment lands with a thud (when sounds are on) and a heavy tap in the iPhone app.
  useEffect(() => {
    if (!done && beat >= 0 && beat === filming.impact) playCue('impact', fun.sound !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per shot
  }, [beat, take]);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next); voiceRef.current = next;
    if (!next) {
      clearTimeout(stall.current); reader.stop(); voiceDriving.current = false;
      if (!done && beatRef.current >= 0 && typedRef.current) later(() => showBeat(beatRef.current + 1), PAUSE_MS);
    }
  };

  const titleCard = !done && beat < 0;
  const typing = !done && beat >= 0 && chars < (lines[beat]?.text.length ?? 0);
  const current = !done && !ending && beat >= 0 ? lines[beat] : null;
  const [camera, origin] = filming.shots[done || ending ? filming.shots.length - 1 : beat + 1] ?? filming.shots[0];
  const cold = filming.coldFrom !== undefined && (done || beat >= filming.coldFrom);
  const reply = choice && picked !== null ? choice[picked].reply : null;

  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell fq-cine">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-story-back" title={title} />
        <section className={`fq-story-comic fq-cine-comic ${done ? 'is-done' : ''} ${done && choice ? 'has-choice' : ''}`} aria-labelledby="story-title" data-testid="story-comic">
          <div className="fq-story-comic-head">
            <h2 id="story-title">{kicker}</h2>
            <button type="button" className="fq-cine-voice" aria-pressed={voiceOn} onClick={toggleVoice}
              aria-label={voiceOn ? 'Turn the story voice off' : 'Turn the story voice on'} data-testid="button-story-voice">
              {voiceOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />} {voiceOn ? 'Voice on' : 'Voice off'}
            </button>
          </div>
          <button type="button" key={take} className={`fq-cine-screen is-${scene} ${done ? '' : 'is-rolling'}`} data-testid="story-panels"
            onClick={() => (done ? undefined : typing ? setChars(lines[beat].text.length) : showAll())}
            aria-label={done ? 'The last scene of the story' : 'Show the whole story now'}>
            <span className={`fq-cine-cam ${cold ? 'is-cold' : 'is-warm'}`} style={{ transform: camera, transformOrigin: origin }}>
              <span className={`fq-cine-set ${!done && beat === filming.impact ? 'is-shaking' : ''}`} data-testid="story-stage">
                <Art beat={done ? lines.length - 1 : Math.max(beat, 0)} />
              </span>
            </span>
            <span className="fq-cine-vignette" />
            <span className="fq-cine-bar is-top" /><span className="fq-cine-bar is-bottom" />
            {titleCard && (
              <span className="fq-cine-card">
                <small>{kicker}</small>
                <strong>{title}</strong>
              </span>
            )}
            {current && (
              <span key={beat} className={`fq-cine-caption is-${current.speaker}`} data-testid={`story-panel-${beat}`}>
                <span className={`fq-cine-face ${typing ? 'is-talking' : ''}`}><StoryCharacter id={current.speaker} size={44} happy={current.mood === 'happy'} worried={current.mood === 'worried'} /></span>
                <span className="fq-cine-words">
                  <span className="fq-cine-name">{CHARACTERS[current.speaker].name}</span>
                  <span className="fq-cine-line">{current.text.slice(0, chars)}{typing && <i className="fq-cine-caret" aria-hidden="true" />}</span>
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
          {done && (
            <ol className="fq-story-panels fq-cine-transcript">
              {lines.map((panel, index) => (
                <li key={index} className={`fq-story-panel fq-cine-panel ${index % 2 ? 'is-right' : ''} is-${panel.speaker}`} data-testid={`story-panel-${index}`}>
                  <span className="fq-cine-face"><StoryCharacter id={panel.speaker} size={40} happy={panel.mood === 'happy'} worried={panel.mood === 'worried'} /></span>
                  <div className="fq-story-bubble">
                    <span className="fq-story-name">{CHARACTERS[panel.speaker].name}</span>
                    <p>{panel.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {done && choice && (
            <fieldset className="fq-story-choice fq-cine-rise" data-testid="story-choice">
              <legend>What should we do first{name ? `, ${name}` : ''}?</legend>
              {choice.map((option, index) => (
                <button key={option.label} type="button" className={picked === index ? 'on' : ''} aria-pressed={picked === index}
                  onClick={() => setPicked(index as 0 | 1)} data-testid={`button-story-choice-${index}`}>
                  <strong>{withName(option.label, name, theme)}</strong><span>{withName(option.detail, name, theme)}</span>
                </button>
              ))}
              {reply && (
                <p className="fq-story-reply" role="status" data-testid="story-choice-reply">
                  <StoryCharacter id={reply.speaker} size={40} />
                  <span><b>{CHARACTERS[reply.speaker].name}:</b> {withName(reply.text, name, theme)}
                    {choiceNotes && picked !== null && <em className="fq-story-reward" data-testid="story-choice-reward">{choiceNotes[picked]}</em>}</span>
                </p>
              )}
            </fieldset>
          )}
          {done && note && <p className="fq-story-note fq-cine-rise" data-testid="story-detective-note"><Search size={16} aria-hidden="true" /> {withName(note, name, theme)}</p>}
          <div className="fq-cine-controls">
            <button type="button" className="fq-button ghost" onClick={play} data-testid="button-story-replay"><RotateCcw size={16} aria-hidden="true" /> Replay</button>
            {done ? (
              <button type="button" className="fq-button fq-story-go" onClick={() => onGo(picked ?? undefined)} disabled={!!choice && picked === null} data-testid="button-story-go">
                {goLabel} <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="fq-button secondary" onClick={showAll} data-testid="button-story-skip">Show all</button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
