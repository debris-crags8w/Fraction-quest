/* A story comic that plays like a cartoon: a scene at the top, panels sliding in one at a time with their words
   typing out, the voice reading along, and the scene reacting (the stone cracks, the pie is cut fairly). Without a
   voice the panels move on by themselves; a tap shows everything at once. "Reduce motion" turns it into fades.
   Pilot: the prologue and chapter 1's opening. Other comics use the plain view. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { StoryCharacter } from './characters';
import { useFollowedReading } from './LearningText';
import { useFun, useSeason } from './fun-ui';
import { sentences, spokenText } from './lib/voice';
import { CHARACTERS, propTheme, withName, type Panel, type StoryChoice } from './story';
import { TaskBar } from './TaskBar';
import './story-cinema.css';

export type StoryScene = 'prologue' | 'bakery';

const TYPE_MS = 32;        // one character every 32 ms: a little ahead of the voice
const PAUSE_MS = 1100;     // without a voice, the pause before the next panel
const VOICE_GIVE_UP_MS = 15_000; // no sentence started by then: move on without the voice

/** The scene for one beat (panel) of the story. */
function Scene({ scene, beat, done }: { scene: StoryScene; beat: number; done: boolean }) {
  if (scene === 'prologue') {
    const cracked = beat >= 2 || done;
    const gone = beat >= 3 || done;
    return (
      <div className={`fq-cine-stage is-night ${beat === 2 ? 'is-shaking' : ''}`} data-testid="story-stage">
        {[[30, 22, 0], [120, 40, .8], [300, 26, 1.4], [210, 16, 2]].map(([x, y, d]) => (
          <span key={x} className="fq-cine-star" style={{ left: x, top: y, animationDelay: `${d}s` }} />
        ))}
        <span className="fq-cine-moon" />
        <svg className="fq-cine-town" viewBox="0 0 366 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 120 V70 h30 v-20 h26 v20 h20 V40 l18 -14 l18 14 v30 h24 v-26 h30 v26 h40 V54 l22 -18 l22 18 v16 h26 v-24 h30 v24 h40 v50 Z" fill="#14102A" />
          <rect x="40" y="80" width="6" height="8" fill="#FFC800" opacity=".7" /><rect x="92" y="60" width="6" height="8" fill="#FFC800" opacity=".7" /><rect x="250" y="70" width="6" height="8" fill="#FFC800" opacity=".7" />
        </svg>
        <div className={`fq-cine-case ${beat >= 1 && !cracked ? 'is-glowing' : ''}`} role="img"
          aria-label={cracked ? 'The Whole Stone has broken into 15 equal pieces' : 'The Whole Stone in its glass case'}>
          <div className="fq-cine-stone">
            {Array.from({ length: 15 }, (_, i) => {
              const angle = (i / 15) * Math.PI * 2;
              const fly = cracked ? `translate(${Math.round(Math.cos(angle) * (120 + (i % 3) * 30))}px, ${Math.round(Math.sin(angle) * 70 + 60)}px) rotate(${(i % 2 ? 1 : -1) * (60 + i * 9)}deg)` : undefined;
              return <span key={i} className={`fq-cine-piece ${beat >= 1 || cracked ? 'is-lit' : ''}`}
                style={{ transform: fly, opacity: gone ? 0 : 1, transitionDelay: `${(i * 0.03).toFixed(2)}s` }} />;
            })}
          </div>
          <span className="fq-cine-case-label">{gone ? 'The case is locked. The pieces are gone!' : cracked ? '15 equal pieces!' : beat >= 1 ? 'The Whole Stone' : ''}</span>
        </div>
        {beat === 2 && !done && <><span className="fq-cine-flash" /><strong className="fq-cine-crack">CRACK!</strong></>}
      </div>
    );
  }
  const fair = beat >= 2 || done;
  return (
    <div className={`fq-cine-stage is-bakery ${beat === 1 && !done ? 'is-zoomed' : ''}`} data-testid="story-stage">
      <span className="fq-cine-awning" />
      <span className="fq-cine-counter" />
      <span className={`fq-cine-chomp ${beat === 0 && !done ? 'is-grabbing' : ''}`}>
        <StoryCharacter id="chomp" size={104} happy={fair} worried={beat === 1 && !done} />
      </span>
      <svg className="fq-cine-pie" viewBox="0 0 120 120" role="img" aria-label={fair ? 'A pie cut into 4 equal pieces' : 'A pie cut into 4 pieces of different sizes'}>
        <circle cx="60" cy="60" r="52" fill="#F6A55B" stroke="#B5651D" strokeWidth="6" />
        {!fair && <path className={beat === 1 ? 'fq-cine-pulse' : ''} d="M60 60 L60 8 A52 52 0 0 1 108 80 Z" fill="#FFB86B" />}
        <path d={fair ? 'M60 8 V112 M8 60 H112' : 'M60 60 L60 8 M60 60 L108 80 M60 60 L30 108 M60 60 L10 50'} stroke="#2B2D42" strokeWidth="3" fill="none" />
      </svg>
      {beat >= 1 && !fair && <span className="fq-cine-stonebit" aria-hidden="true" />}
    </div>
  );
}

export function CinematicComic({ scene, title, kicker, panels, name, choice, picked: saved, choiceNotes, goLabel, onGo, onBack }: {
  scene: StoryScene; title: string; kicker: string; panels: Panel[]; name: string | null;
  choice?: [StoryChoice, StoryChoice]; picked?: 0 | 1; choiceNotes?: [string, string]; goLabel: string;
  onGo: (choice?: 0 | 1) => void; onBack: () => void;
}) {
  const { fun } = useFun();
  const theme = propTheme(useSeason().season?.id);
  const reader = useFollowedReading();
  const [voiceOn, setVoiceOn] = useState(fun.sound !== false);
  const [beat, setBeat] = useState(-1);
  const [chars, setChars] = useState(0);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<0 | 1 | null>(saved ?? null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const voiceDriving = useRef(false);
  const beatRef = useRef(-1);
  const typedRef = useRef(false);
  const giveUp = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lines = useMemo(() => panels.map((panel) => ({ ...panel, text: withName(panel.text, name, theme) })), [panels, name, theme]);
  // What is read aloud says "friend", never the child's name; each panel is one or more of its sentences.
  const spoken = useMemo(() => panels.map((panel) => `${CHARACTERS[panel.speaker].name} says: ${withName(panel.text, null, theme)}`), [panels, theme]);
  const sentenceToPanel = useMemo(() => spoken.flatMap((line, index) => sentences(spokenText(line)).map(() => index)), [spoken]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const showBeat = (next: number) => {
    clearTimers();
    if (next >= lines.length) { setDone(true); return; }
    beatRef.current = next; typedRef.current = false;
    setBeat(next); setChars(0);
    const length = lines[next].text.length;
    const tick = (count: number) => {
      setChars(count);
      if (count < length) later(() => tick(Math.min(length, count + 2)), TYPE_MS * 2);
      else { typedRef.current = true; if (!voiceDriving.current) later(() => showBeat(next + 1), PAUSE_MS); }
    };
    tick(0);
  };

  const play = (withVoice: boolean) => {
    clearTimers(); clearTimeout(giveUp.current); reader.stop();
    setDone(false); setBeat(-1); beatRef.current = -1;
    voiceDriving.current = withVoice && reader.supported;
    if (voiceDriving.current) {
      let started = false;
      reader.speak(spoken.join(' '), {
        onPart: (index) => {
          started = true;
          const panel = sentenceToPanel[index] ?? 0;
          if (panel > beatRef.current) showBeat(panel);
        },
        onEnd: () => {
          clearTimeout(giveUp.current);
          voiceDriving.current = false;
          // No voice, or it stopped early: the timer carries on from here (a panel still typing moves on by itself).
          if (typedRef.current) later(() => showBeat(beatRef.current + 1), beatRef.current >= lines.length - 1 ? 600 : PAUSE_MS);
        },
      });
      showBeat(0);
      if (voiceDriving.current) giveUp.current = setTimeout(() => { if (!started && voiceDriving.current) { voiceDriving.current = false; reader.stop(); showBeat(beatRef.current + 1); } }, VOICE_GIVE_UP_MS);
    } else showBeat(0);
  };

  const showAll = () => { clearTimers(); clearTimeout(giveUp.current); reader.stop(); voiceDriving.current = false; setBeat(lines.length - 1); setDone(true); };

  // The comic starts by itself (the tap that opened it unlocked the sound).
  useEffect(() => {
    play(voiceOn);
    return () => { clearTimers(); clearTimeout(giveUp.current); reader.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per comic
  }, []);

  const typing = !done && beat >= 0 && chars < (lines[beat]?.text.length ?? 0);
  const shown = done ? lines : lines.slice(0, beat + 1);
  const reply = choice && picked !== null ? choice[picked].reply : null;

  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell fq-cine">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-story-back" title={title} />
        <section className={`fq-story-comic fq-cine-comic ${done ? 'is-done' : ''}`} aria-labelledby="story-title" data-testid="story-comic">
          <div className="fq-story-comic-head">
            <h2 id="story-title">{kicker}</h2>
            <button type="button" className="fq-cine-voice" aria-pressed={voiceOn} onClick={() => { const next = !voiceOn; setVoiceOn(next); if (!next) { reader.stop(); voiceDriving.current = false; if (!done && beatRef.current >= 0 && typedRef.current) later(() => showBeat(beatRef.current + 1), PAUSE_MS); } }}
              aria-label={voiceOn ? 'Turn the story voice off' : 'Turn the story voice on'} data-testid="button-story-voice">
              {voiceOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />} {voiceOn ? 'Voice on' : 'Voice off'}
            </button>
          </div>
          <Scene scene={scene} beat={beat} done={done} />
          <button type="button" className="fq-cine-panels" onClick={() => (done ? undefined : typing ? setChars(lines[beat].text.length) : showAll())}
            aria-label={done ? 'The whole story' : 'Show the whole story now'} data-testid="story-panels">
            <ol className="fq-story-panels">
              {shown.map((panel, index) => (
                <li key={index} className={`fq-story-panel fq-cine-panel ${index % 2 ? 'is-right' : ''} is-${panel.speaker} ${index === beat && !done ? 'is-current' : ''}`} data-testid={`story-panel-${index}`}>
                  <span className="fq-cine-face"><StoryCharacter id={panel.speaker} size={56} happy={panel.mood === 'happy'} worried={panel.mood === 'worried'} /></span>
                  <div className="fq-story-bubble">
                    <span className="fq-story-name">{CHARACTERS[panel.speaker].name}</span>
                    <p>{index === beat && !done ? panel.text.slice(0, chars) : panel.text}{index === beat && typing && <i className="fq-cine-caret" aria-hidden="true" />}</p>
                  </div>
                </li>
              ))}
            </ol>
          </button>
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
          <div className="fq-cine-controls">
            <button type="button" className="fq-button ghost" onClick={() => play(voiceOn)} data-testid="button-story-replay"><RotateCcw size={16} aria-hidden="true" /> Replay</button>
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
