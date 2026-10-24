import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useOptionalFun, useSeasonalWords } from './fun-ui';
import { setLearningVoicePreference } from './lib/fun';
import { KokoroDiagnostic, showVoiceSelfTest } from './KokoroDiagnostic';
import { MathText } from './MathText';
import { execAll } from './lib/regexp';
import { selectLearningVoice as selectGentleVoice, sentences, spokenText, VOICE_PITCH, VOICE_RATE } from './lib/voice';
import { createNaturalSpeaker, voiceLogEntries, NATURAL_VOICES, naturalVoiceId, naturalVoicePreference, naturalVoiceReady, naturalVoiceStatus, onNaturalVoiceStatus, prefetchNaturalVoice, setNaturalVoicePreference, unlockAudioPlayback, warmUpNaturalVoice, type NaturalVoiceId, type NaturalVoicePhase, type NaturalVoiceStatus } from './lib/natural-voice';

type VocabularyEntry = { pattern: string; definition: string };

const VOCABULARY: VocabularyEntry[] = [
  { pattern: 'equal\\s+shares?', definition: 'Equal shares are parts that are the same size.' },
  { pattern: 'equal\\s+parts?', definition: 'Equal parts are pieces that are the same size.' },
  { pattern: 'equivalent\\s+fractions?', definition: 'Equivalent fractions look different but are the same amount.' },
  { pattern: 'improper\\s+fractions?', definition: 'An improper fraction has a numerator as big as, or bigger than, its denominator.' },
  { pattern: 'mixed\\s+numbers?', definition: 'A mixed number has a whole number and a fraction together, like 1 and 2/3.' },
  { pattern: 'unit\\s+fractions?', definition: 'A unit fraction has 1 as its numerator, like 1/4.' },
  { pattern: 'number\\s+lines?', definition: 'A number line shows numbers in order, using equal spaces.' },
  { pattern: 'denominators?', definition: 'The denominator is the bottom number: the total number of equal parts in one whole.' },
  { pattern: 'numerators?', definition: 'The numerator is the top number: how many of those parts are selected (shaded or counted).' },
  { pattern: 'decimal\\s+points?', definition: 'The decimal point is the dot in a decimal. Digits after it show tenths and hundredths.' },
  { pattern: 'benchmarks?', definition: 'A benchmark is an easy number like 0, 1/2 or 1 that helps you compare.' },
  { pattern: 'wholes?', definition: 'A whole is the full shape or amount.' },
];

const VOCABULARY_PATTERN = new RegExp(
  `\\b(${VOCABULARY.map(entry => entry.pattern).join('|')})\\b`,
  'gi',
);

function entryFor(match: string) {
  return VOCABULARY.find(entry => new RegExp(`^${entry.pattern}$`, 'i').test(match));
}

function VocabularyTerm({ text, definition, interactive }: { text: string; definition: string; interactive: boolean }) {
  const tooltipId = useId();
  if (!interactive) {
    return <span className="fq-vocab-static" title={definition}>{text}</span>;
  }

  // Centred on its word, the tooltip can run off a phone's edge: nudge it back inside when it opens.
  const keepOnScreen = (event: { currentTarget: HTMLElement }) => {
    const wrapper = event.currentTarget;
    const tip = wrapper.querySelector<HTMLElement>('.fq-vocab-tooltip');
    if (!tip) return;
    wrapper.style.setProperty('--fq-tip-shift', '0px');
    const { left, right } = tip.getBoundingClientRect();
    const edge = 8;
    const shift = left < edge ? edge - left : right > window.innerWidth - edge ? window.innerWidth - edge - right : 0;
    wrapper.style.setProperty('--fq-tip-shift', `${Math.round(shift)}px`);
  };
  return (
    <span className="fq-vocab" onMouseEnter={keepOnScreen} onFocus={keepOnScreen}>
      <span className="fq-vocab-trigger" role="term" tabIndex={0} aria-describedby={tooltipId}>{text}</span>
      <span className="fq-vocab-tooltip" id={tooltipId} role="tooltip"><MathText text={definition} /></span>
    </span>
  );
}

/** Read text the way a teacher would: "3/4" → "three fourths", "1 2/3" → "1 and two thirds". */
export function spokenLearningText(text: string) {
  return spokenText(text);
}

type VoiceCandidate = Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'default'>
  & Partial<Pick<SpeechSynthesisVoice, 'voiceURI'>>;
const FEMININE_VOICE_HINTS = /\b(female|woman|samantha|victoria|karen|moira|tessa|susan|zira|jenny|aria|joanna|ava|allison|serena|sara|hazel)\b/i;
const LEARNING_VOICE_STORAGE_KEY = 'fraction-quest-learning-voice';

export function learningVoiceId(voice: VoiceCandidate) {
  return voice.voiceURI || `${voice.name}|${voice.lang}`;
}

export function getLearningLanguage() {
  if (typeof document !== 'undefined' && document.documentElement.lang) return document.documentElement.lang;
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}

function getSavedLearningVoiceId() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(LEARNING_VOICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveLearningVoiceId(id: string) {
  try {
    window.localStorage.setItem(LEARNING_VOICE_STORAGE_KEY, id);
    return true;
  } catch {
    return false;
  }
}

/** A saved, available voice in the requested language wins. Otherwise pick the gentlest natural-sounding woman's
    voice in that language (skipping men's and novelty voices), then any voice in the language, then the browser default. */
export function selectLearningVoice<T extends VoiceCandidate>(
  voices: readonly T[],
  preferredLanguage: string,
  preferredVoiceId: string | null = null,
): T | null {
  if (voices.length === 0) return null;
  if (preferredVoiceId) {
    const primary = (language: string) => language.toLowerCase().replace(/_/g, '-').split('-')[0];
    const savedVoice = voices.find((voice) => learningVoiceId(voice) === preferredVoiceId && primary(voice.lang) === primary(preferredLanguage));
    if (savedVoice) return savedVoice;
  }
  return selectGentleVoice(voices, preferredLanguage);
}

/** Handles browsers whose speechSynthesis only partially implements voice-list events. */
export function subscribeToSpeechVoices(
  synthesis: SpeechSynthesis,
  onVoicesChanged: (voices: SpeechSynthesisVoice[]) => void,
) {
  let lastSignature: string | undefined;
  let listening = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  const refresh = () => {
    let voices: SpeechSynthesisVoice[] = [];
    try { voices = synthesis.getVoices(); } catch { /* keep the browser's default voice available */ }
    const signature = voices.map((voice) => `${voice.voiceURI}\u0000${voice.name}\u0000${voice.lang}`).join('\u0001');
    if (signature !== lastSignature) {
      lastSignature = signature;
      onVoicesChanged(voices);
    }
    return voices.length > 0;
  };
  const handleChange = () => { refresh(); };
  if (typeof synthesis.addEventListener === 'function' && typeof synthesis.removeEventListener === 'function') {
    try {
      synthesis.addEventListener('voiceschanged', handleChange);
      listening = true;
    } catch { /* use the bounded polling fallback below */ }
  }
  const hasVoices = refresh();
  if (!hasVoices) {
    let attempts = 20;
    pollTimer = setInterval(() => {
      if (refresh() || --attempts <= 0) {
        if (pollTimer !== undefined) clearInterval(pollTimer);
        pollTimer = undefined;
      }
    }, 500);
  }
  return () => {
    if (pollTimer !== undefined) clearInterval(pollTimer);
    if (listening && typeof synthesis.removeEventListener === 'function') {
      try { synthesis.removeEventListener('voiceschanged', handleChange); } catch { /* partial mobile implementations */ }
    }
  };
}

const VOICE_LIST_WAIT_MS = 500;
/** How long a story comic waits for the natural voice to connect before it plays with captions alone. */
const NATURAL_WAIT_MS = 5000;
/** How long a Listen tap waits for the natural voice to connect before reading in the device voice. */
const LISTEN_WAIT_MS = 3000;

/**
 * Owns a single read-aloud session. The short voice-list wait lets browsers
 * that populate voices asynchronously use the preferred voice on first play.
 */
export function createLearningSpeechController(
  synthesis: SpeechSynthesis,
  onSpeakingChange: (speaking: boolean) => void,
  makeUtterance: (text: string) => SpeechSynthesisUtterance = (text) => new SpeechSynthesisUtterance(text),
  voiceWaitMs = VOICE_LIST_WAIT_MS,
  getPreferredVoiceId: () => string | null = getSavedLearningVoiceId,
  natural: NaturalReader = defaultNaturalReader(),
) {
  let generation = 0;
  let waitTimer: ReturnType<typeof setTimeout> | undefined;
  let waitingForVoices = false;
  let speaking = false;
  let disposed = false;
  let waitingListener: (() => void) | undefined;

  const clearVoiceWait = () => {
    if (waitTimer !== undefined) clearTimeout(waitTimer);
    waitTimer = undefined;
    if (waitingListener && typeof synthesis.removeEventListener === 'function') {
      try { synthesis.removeEventListener('voiceschanged', waitingListener); } catch { /* older browsers may expose partial event support */ }
    }
    waitingListener = undefined;
    waitingForVoices = false;
  };

  const setSpeaking = (next: boolean) => {
    if (speaking === next) return;
    speaking = next;
    onSpeakingChange(next);
  };

  const stop = () => {
    generation += 1;
    clearVoiceWait();
    try { natural.stop(); } catch { /* keep the device speech controls usable if the natural player fails */ }
    try {
      if (typeof synthesis.cancel === 'function') synthesis.cancel();
    } catch { /* some mobile browsers expose speech synthesis without every control method */ }
    setSpeaking(false);
  };

  /** A screen following the reading (a story comic): which sentence is being read, and when it ends. */
  let follow: SpeechFollower | undefined;
  /** Reads `parts` with the device voice; `offset` is the index of the first one (a reading picked up part-way). */
  const startUtterance = (parts: string[], offset: number, language: string, playback: number, voices: readonly SpeechSynthesisVoice[]) => {
    if (disposed || playback !== generation) return;
    clearVoiceWait();
    const voice = selectLearningVoice(voices, language, getPreferredVoiceId());
    const following = follow;
    const finish = () => {
      if (playback === generation) { setSpeaking(false); following?.onEnd?.(); }
    };
    // One utterance per sentence: the voice pauses between them, and Chrome doesn't cut off long readings. Each one
    // is handed over only when the one before ends: Safari's cancel() stops the sentence being read but not ones
    // already queued, so a reading queued all at once went on after its screen had closed.
    const say = (index: number) => {
      if (disposed || playback !== generation) return;
      if (index >= parts.length) { finish(); return; }
      try {
        const utterance = makeUtterance(parts[index]);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || language;
        utterance.rate = VOICE_RATE;
        utterance.pitch = VOICE_PITCH;
        utterance.onend = () => say(index + 1);
        if (following?.onPart) utterance.onstart = () => { if (playback === generation) following.onPart?.(offset + index); };
        utterance.onerror = finish;
        synthesis.speak(utterance);
      } catch {
        finish();
      }
    };
    setSpeaking(true);
    say(0);
  };

  return {
    speak(text: string, language: string, follower?: SpeechFollower) {
      if (disposed) return;
      stop();
      follow = follower;
      const playback = generation;
      const parts = sentences(spokenLearningText(text));
      const english = /^en\b/i.test(language);
      // A story comic keeps one voice: while the natural voice is the chosen one, the comic never switches to the
      // device voice. If the natural voice can't read it, the comic carries on with its captions alone.
      const oneVoice = Boolean(follower) && english && (natural.chosen?.() ?? false);
      const silent = () => { setSpeaking(false); follower?.onEnd?.(); };
      const readNaturally = () => {
        let reached = -1;
        setSpeaking(true);
        natural.speak(parts, (ok) => {
          if (playback !== generation || disposed) return;
          if (ok) { setSpeaking(false); follower?.onEnd?.(); }
          else if (oneVoice) silent();
          // Pick up where the natural voice stopped, never from the start again.
          else startDevice(Math.max(reached, 0));
        }, undefined, undefined, (index) => { reached = index; if (playback === generation) follower?.onPart?.(index); }, follower?.voices);
      };
      // The natural voice reads English when it's ready; otherwise this playback uses the device voice
      // while the natural voice connects in the background for next time.
      if (natural.ready() && english) { readNaturally(); return; }
      // While the natural voice is on but still connecting (the first Listen after opening the app), wait a moment
      // for it rather than starting in the device voice. A comic waits longer and stays silent if it never comes;
      // any other Listen then reads in the device voice.
      if (english && natural.whenReady && (natural.chosen?.() ?? false)) {
        setSpeaking(true);
        const fallBack = () => { if (playback !== generation || disposed) return; if (oneVoice) silent(); else startDevice(0); };
        natural.whenReady(oneVoice ? NATURAL_WAIT_MS : LISTEN_WAIT_MS).then((ready) => {
          if (playback !== generation || disposed) return;
          if (ready && natural.ready()) readNaturally();
          else fallBack();
        }, fallBack);
        return;
      }
      natural.warmUp();
      startDevice(0);
      function startDevice(from: number) {
        const rest = parts.slice(from);
        let voices: SpeechSynthesisVoice[] = [];
        try {
          voices = synthesis.getVoices();
        } catch {
          startUtterance(rest, from, language, playback, []);
          return;
        }

        if (voices.length > 0) {
          startUtterance(rest, from, language, playback, voices);
          return;
        }

        waitingForVoices = true;
        setSpeaking(true);
        const startWithCurrentVoices = () => {
          if (!waitingForVoices || playback !== generation || disposed) return;
          let latestVoices: SpeechSynthesisVoice[] = [];
          try {
            latestVoices = synthesis.getVoices();
          } catch {
            // The native default voice remains available when voice enumeration fails.
          }
          if (latestVoices.length === 0 && waitTimer !== undefined) return;
          startUtterance(rest, from, language, playback, latestVoices);
        };
        // Safari and embedded iOS browsers can expose speechSynthesis while missing
        // one or both EventTarget methods. In that case, use the timed default-voice
        // fallback below rather than throwing from the Listen button.
        if (typeof synthesis.addEventListener === 'function' && typeof synthesis.removeEventListener === 'function') {
          waitingListener = startWithCurrentVoices;
          try { synthesis.addEventListener('voiceschanged', startWithCurrentVoices); } catch { waitingListener = undefined; }
        }
        waitTimer = setTimeout(() => {
          waitTimer = undefined;
          startWithCurrentVoices();
        }, voiceWaitMs);
      }
    },
    stop,
    dispose() {
      disposed = true;
      stop();
    },
  };
}

/** Follows a reading sentence by sentence (the sentences are `sentences(spokenLearningText(text))`). */
export type SpeechFollower = {
  onPart?: (index: number) => void; onEnd?: () => void;
  /** The natural voice for each sentence (a story friend's film line), else the chosen voice. */
  voices?: readonly (string | undefined)[];
};

/** What the controller needs from the natural voice (injectable for tests). */
export type NaturalReader = {
  ready(): boolean;
  /** The natural voice is the chosen voice and can still connect (not off, unsupported or failed). */
  chosen?(): boolean;
  /** Resolves true once the natural voice is ready, or false after `ms`. */
  whenReady?(ms: number): Promise<boolean>;
  speak(parts: string[], onDone: (ok: boolean) => void, onPhase?: (phase: NaturalVoicePhase) => void, onFailure?: (stage: 'generating' | 'playing', error: unknown) => void, onPart?: (index: number) => void, voices?: readonly (string | undefined)[]): void; stop(): void; warmUp(): void };
function defaultNaturalReader(): NaturalReader {
  const speaker = createNaturalSpeaker();
  return {
    ready: naturalVoiceReady,
    chosen: () => ['ready', 'loading', 'idle'].includes(naturalVoiceStatus().state),
    whenReady: (ms) => Promise.race([
      warmUpNaturalVoice().then((engine) => engine !== null),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
    ]),
    speak: speaker.speak, stop: speaker.stop, warmUp: () => { void warmUpNaturalVoice(); },
  };
}

const VOICE_PREVIEW = 'Hi there! I can read your fraction lessons to you.';

/** Grown-ups' choice of natural voice (or off), with its connection status. */
function NaturalVoiceSettings() {
  const [status, setStatus] = useState<NaturalVoiceStatus>(() => naturalVoiceStatus());
  const [choice, setChoice] = useState(naturalVoicePreference);
  const [previewing, setPreviewing] = useState(false);
  const [previewPhase, setPreviewPhase] = useState<NaturalVoicePhase>('preparing');
  const [previewMessage, setPreviewMessage] = useState('');
  const speaker = useRef<ReturnType<typeof createNaturalSpeaker> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => onNaturalVoiceStatus(setStatus), []);
  useEffect(() => () => {
    if (previewTimer.current !== null) clearTimeout(previewTimer.current);
    speaker.current?.stop();
  }, []);
  const choose = (next: NaturalVoiceId | 'off') => {
    if (previewTimer.current !== null) clearTimeout(previewTimer.current);
    previewTimer.current = null;
    setChoice(next); setNaturalVoicePreference(next); speaker.current?.stop(); setPreviewing(false); setPreviewMessage('');
  };
  const preview = () => {
    speaker.current ??= createNaturalSpeaker();
    if (previewing) {
      if (previewTimer.current !== null) clearTimeout(previewTimer.current);
      previewTimer.current = null;
      speaker.current.stop();
      setPreviewing(false);
      setPreviewMessage('');
      return;
    }
    setPreviewMessage('');
    setPreviewing(true);
    setPreviewPhase('preparing');
    previewTimer.current = setTimeout(() => {
      previewTimer.current = null;
      speaker.current?.stop();
      setPreviewing(false);
      setPreviewMessage('This natural voice is taking too long to preview here. Try a device voice below.');
    }, 80_000);
    speaker.current.speak([VOICE_PREVIEW], (ok) => {
      if (previewTimer.current !== null) clearTimeout(previewTimer.current);
      previewTimer.current = null;
      setPreviewing(false);
      setPreviewMessage(ok ? '' : 'This natural voice could not finish its preview here. Try a device voice below.');
    }, setPreviewPhase);
  };
  const statusText = status.state === 'off' ? 'Off: lessons use the device voice.'
    : status.state === 'unsupported' ? 'This browser can’t play the natural voice, so lessons use the device voice.'
    : status.state === 'ready' ? 'Ready.'
    : status.state === 'loading' ? 'Connecting to the voice…'
    : status.state === 'error' ? 'The natural voice isn’t reachable right now, so lessons use the device voice. Try again later.'
    : 'Prepares visible lesson sections in the background. Nothing to download.';
  return (
    <div className="fq-natural-voice" data-testid="natural-voice-settings">
      <h3 className="fq-learning-voice-subhead">Natural voice</h3>
      <p>A free, open-source voice that sounds like a real person. Our server makes the audio from the lesson sentence
        only (never a child’s name or answers), so it works on every device, iPhone and iPad included.</p>
      {(
        <div className="fq-natural-voice-options" role="radiogroup" aria-label="Natural voice">
          {[...NATURAL_VOICES.map((voice) => ({ id: voice.id as NaturalVoiceId | 'off', label: voice.name, note: voice.note })), { id: 'off' as const, label: 'Off', note: 'use the device voice' }].map((option) => (
            <label key={option.id} className={choice === option.id ? 'on' : ''}>
              <input type="radio" name="natural-voice" value={option.id} checked={choice === option.id} onChange={() => choose(option.id)} data-testid={`radio-natural-voice-${option.id}`} />
              <span><strong>{option.label}</strong><small>{option.note}</small></span>
            </label>
          ))}
        </div>
      )}
      <p className="fq-parent-note" role="status" data-testid="status-natural-voice">{statusText}</p>
      {showVoiceSelfTest() && <KokoroDiagnostic />}
      {showVoiceSelfTest() && <VoiceLog />}
      {(
        <div className="fq-natural-voice-actions">
          {(status.state === 'idle' || status.state === 'error') && <button type="button" className="fq-button ghost" onClick={() => { void warmUpNaturalVoice(); }} data-testid="button-download-natural-voice">Connect now</button>}
          {status.state === 'ready' && <button type="button" className="fq-button ghost" onClick={preview} data-testid="button-preview-natural-voice"><Volume2 size={16} aria-hidden="true" /> {previewing ? 'Stop preview' : 'Preview voice'}</button>}
        </div>
      )}
      {previewing && <p className="fq-parent-note" role="status" data-testid="status-natural-voice-preview-phase">
        {previewPhase === 'playing' ? 'The voice preview is playing. Tap Stop preview to stop it.'
          : previewPhase === 'generating' ? 'Making your voice preview…'
          : 'Preparing your voice preview…'}
      </p>}
      {previewMessage && <p className="fq-learning-voice-fallback" role="alert" data-testid="status-natural-voice-preview">{previewMessage}</p>}
    </div>
  );
}

/** The voice self-test's record of how each clip arrived and played on this device (newest last). */
function VoiceLog() {
  const [entries, setEntries] = useState(voiceLogEntries);
  const [copied, setCopied] = useState(false);
  const text = entries.map((entry) => `${new Date(entry.at).toLocaleTimeString()} ${entry.event}: ${entry.detail}`).join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } };
  return (
    <div className="fq-voice-log" data-testid="voice-log">
      <h3 className="fq-learning-voice-subhead">Voice log</h3>
      <p className="fq-parent-note">Watch a film, then come back here. Each line shows where a clip came from and how long it took, and any clip the browser paused or refused.</p>
      <pre data-testid="voice-log-text">{text || 'Nothing yet.'}</pre>
      <div className="fq-natural-voice-actions">
        <button type="button" className="fq-button ghost" onClick={() => { setEntries(voiceLogEntries()); setCopied(false); }}>Refresh</button>
        <button type="button" className="fq-button ghost" onClick={copy} disabled={!text}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  );
}

/** A local voice chooser for families. Browser speech synthesis keeps all audio on-device. */
export function LearningVoicePicker() {
  const funContext = useOptionalFun();
  const savedPreference = funContext
    ? funContext.fun.preferredLearningVoiceId ?? null
    : getSavedLearningVoiceId();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(savedPreference);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const voicePreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const language = getLearningLanguage();
  const primaryLanguage = language.toLowerCase().replace(/_/g, '-').split('-')[0];

  useEffect(() => {
    setSelectedVoiceId(savedPreference);
  }, [savedPreference]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)
      || typeof SpeechSynthesisUtterance === 'undefined') return;

    const synthesis = window.speechSynthesis;
    setSupported(true);
    const unsubscribe = subscribeToSpeechVoices(synthesis, setVoices);
    return () => {
      unsubscribe();
      if (voicePreviewTimer.current !== null) clearTimeout(voicePreviewTimer.current);
      voicePreviewTimer.current = null;
      try { if (typeof synthesis.cancel === 'function') synthesis.cancel(); } catch { /* partial mobile implementations */ }
    };
  }, []);

  const matchingVoices = voices
    .filter((voice) => voice.lang.toLowerCase().replace(/_/g, '-').split('-')[0] === primaryLanguage)
    .sort((a, b) => a.name.localeCompare(b.name) || a.lang.localeCompare(b.lang));
  const savedVoiceAvailable = matchingVoices.some((voice) => learningVoiceId(voice) === selectedVoiceId);
  const fallbackVoice = selectLearningVoice(matchingVoices, language);
  const currentVoice = savedVoiceAvailable
    ? matchingVoices.find((voice) => learningVoiceId(voice) === selectedVoiceId)
    : fallbackVoice;
  const effectiveVoiceId = savedVoiceAvailable
    ? selectedVoiceId
    : currentVoice ? learningVoiceId(currentVoice) : null;

  const previewVoice = (voice: SpeechSynthesisVoice) => {
    if (!supported) return;
    const synthesis = window.speechSynthesis;
    if (voicePreviewTimer.current !== null) clearTimeout(voicePreviewTimer.current);
    voicePreviewTimer.current = null;
    try { if (typeof synthesis.cancel === 'function') synthesis.cancel(); } catch { /* partial mobile implementations */ }
    const utterance = new SpeechSynthesisUtterance(VOICE_PREVIEW);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = VOICE_RATE;
    utterance.pitch = VOICE_PITCH;
    const id = learningVoiceId(voice);
    setPreviewError('');
    setPreviewingVoiceId(id);
    let timer: ReturnType<typeof setTimeout>;
    const finish = (message = '') => {
      if (voicePreviewTimer.current !== timer) return;
      clearTimeout(timer);
      voicePreviewTimer.current = null;
      setPreviewingVoiceId((active) => active === id ? null : active);
      setPreviewError(message);
    };
    timer = setTimeout(() => finish('This voice did not finish its preview. Try another voice.'), 15_000);
    voicePreviewTimer.current = timer;
    utterance.onend = () => finish();
    utterance.onerror = () => finish('This voice could not play here. Try another voice.');
    try {
      if (typeof synthesis.speak !== 'function') throw new Error('Speech is unavailable');
      synthesis.speak(utterance);
    } catch {
      finish('This voice could not play here. Try another voice.');
    }
  };

  const chooseVoice = (id: string) => {
    setSelectedVoiceId(id);
    const savedLocally = saveLearningVoiceId(id);
    if (funContext) funContext.setFun(setLearningVoicePreference(funContext.fun, id));
    setSaveFailed(!savedLocally && !funContext);
  };

  return (
    <section className="fq-parent-section fq-learning-voice-settings" data-testid="learning-voice-settings" aria-labelledby="learning-voice-heading">
      <h2 id="learning-voice-heading">Read-aloud voice</h2>
      <NaturalVoiceSettings />
      <h3 className="fq-learning-voice-subhead">Device voices</h3>
      <p>Used while the natural voice connects, when it is off, or when it can't be reached. Signed-in choices follow your account, but each device uses its own local voice. Device-voice audio stays on this device.</p>
      {!supported ? (
        <p className="fq-parent-note" role="status">Read-aloud voices are not available in this browser.</p>
      ) : matchingVoices.length > 0 ? (
        <ul className="fq-learning-voice-list">
          {matchingVoices.map((voice) => {
            const id = learningVoiceId(voice);
            return (
              <li key={id} className="fq-learning-voice-option">
                <label>
                  <input
                    type="radio"
                    name="learning-voice"
                    value={id}
                    checked={effectiveVoiceId === id}
                    onChange={() => chooseVoice(id)}
                    data-testid={`radio-learning-voice-${matchingVoices.indexOf(voice)}`}
                  />
                  <span><strong>{voice.name || 'Local voice'}</strong><small>{voice.lang}</small></span>
                </label>
                <button
                  type="button"
                  className="fq-learning-voice-preview"
                  onClick={() => previewVoice(voice)}
                  aria-label={`${previewingVoiceId === id ? 'Previewing' : 'Preview'} ${voice.name || 'local voice'}`}
                  data-testid={`button-preview-learning-voice-${matchingVoices.indexOf(voice)}`}
                >
                  {previewingVoiceId === id ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
                  {previewingVoiceId === id ? 'Playing' : 'Preview'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="fq-parent-note" role="status">No local voices for {language} are listed by this browser. Explanations will ask the browser for a voice in that language.</p>
      )}
      {previewError && <p className="fq-learning-voice-fallback" role="alert" data-testid="status-learning-voice-preview">{previewError}</p>}
      {supported && selectedVoiceId && !savedVoiceAvailable && (
        <p className="fq-learning-voice-fallback" role="status" data-testid="status-learning-voice-fallback">
          The saved voice is not available on this device. Explanations are using {currentVoice?.name
            ? `${currentVoice.name} (${currentVoice.lang})`
            : `the browser's ${language} voice if available`}.
        </p>
      )}
      {supported && !selectedVoiceId && (
        <p className="fq-parent-note" role="status">Using {currentVoice?.name
          ? `${currentVoice.name} (${currentVoice.lang})`
          : `the browser's ${language} voice if available`} by default.</p>
      )}
      {saveFailed && <p className="fq-learning-voice-fallback" role="alert">This browser could not save the voice choice. It will reset if you reload.</p>}
    </section>
  );
}

/** Call from a tap that starts something which will read aloud later (a race): browsers, iPhones most of all,
    only allow sound that a tap unlocked. */
export function primeReadAloud() {
  unlockAudioPlayback();
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    }
  } catch { /* no device speech: the natural voice (if any) still plays */ }
}

/** Read `text` aloud each time `key` changes (a new race question), with the family's chosen voice. A new key, null,
    or leaving the screen stops the reading. */
export function useReadAloud(text: string | null, key: string | number | null = text) {
  const funContext = useOptionalFun();
  const preferredVoiceId = funContext ? funContext.fun.preferredLearningVoiceId ?? null : getSavedLearningVoiceId();
  const controllerRef = useRef<ReturnType<typeof createLearningSpeechController> | null>(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  useEffect(() => {
    if (!supported) return;
    const controller = createLearningSpeechController(window.speechSynthesis, () => {}, undefined, undefined, () => preferredVoiceId);
    controllerRef.current = controller;
    return () => { controller.dispose(); controllerRef.current = null; };
  }, [preferredVoiceId, supported]);
  useEffect(() => {
    if (!text) { controllerRef.current?.stop(); return; }
    controllerRef.current?.speak(text, getLearningLanguage());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once per key, not on every re-render
  }, [key, text === null]);
}

/** Fetch a reading's natural-voice audio in the background (the next story comic), so it starts at once later. */
export function prefetchReading(text: string, voices?: readonly (string | undefined)[]): void {
  void warmUpNaturalVoice().then((engine) => {
    const voice = naturalVoiceId();
    if (!engine || !voice) return;
    return prefetchNaturalVoice(voice, sentences(spokenLearningText(text)), () => naturalVoiceId() === voice, voices);
  });
}

/** Read text aloud while a screen follows along sentence by sentence (a story comic). Stops when the screen goes. */
export function useFollowedReading() {
  const funContext = useOptionalFun();
  const preferredVoiceId = funContext ? funContext.fun.preferredLearningVoiceId ?? null : getSavedLearningVoiceId();
  const controllerRef = useRef<ReturnType<typeof createLearningSpeechController> | null>(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  useEffect(() => {
    if (!supported) return;
    const controller = createLearningSpeechController(window.speechSynthesis, () => {}, undefined, undefined, () => preferredVoiceId);
    controllerRef.current = controller;
    return () => { controller.dispose(); controllerRef.current = null; };
  }, [preferredVoiceId, supported]);
  return {
    supported,
    speak: (text: string, follower: SpeechFollower) => controllerRef.current?.speak(text, getLearningLanguage(), follower),
    stop: () => controllerRef.current?.stop(),
  };
}

export function LearningListenButton({
  text,
  section,
  label,
  prefetch = false,
  compact = false,
}: {
  text: string;
  section?: string;
  label?: string;
  /** A small round icon-only button, for tight spots. */
  compact?: boolean;
  /** Prepare fixed lesson or story copy as its Listen control approaches the viewport. */
  prefetch?: boolean;
}) {
  const words = useSeasonalWords();
  text = words(text);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  useNaturalVoicePrefetch(buttonRef, text, prefetch);
  const [speaking, setSpeaking] = useState(false);
  const funContext = useOptionalFun();
  const preferredVoiceId = funContext
    ? funContext.fun.preferredLearningVoiceId ?? null
    : getSavedLearningVoiceId();
  const controllerRef = useRef<ReturnType<typeof createLearningSpeechController> | null>(null);
  const accessibleSection = section
    ?? label?.replace(/^Listen to (?:the|this) /i, '')
    ?? 'explanation';
  const listenLabel = label ?? `Listen to the ${accessibleSection}`;
  const supported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    if (!supported) return;
    const controller = createLearningSpeechController(
      window.speechSynthesis,
      setSpeaking,
      undefined,
      undefined,
      () => preferredVoiceId,
    );
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [preferredVoiceId, supported]);

  const toggleSpeech = () => {
    if (!supported) return;
    if (speaking) {
      controllerRef.current?.stop();
      return;
    }

    const language = getLearningLanguage();
    controllerRef.current?.speak(text, language);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={compact ? 'fq-learning-listen is-compact' : 'fq-learning-listen'}
      onClick={toggleSpeech}
      disabled={!supported}
      aria-label={!supported
        ? `Audio unavailable for the ${accessibleSection}`
        : speaking ? `Stop reading the ${accessibleSection}` : listenLabel}
      aria-pressed={speaking}
      title={supported ? undefined : `Audio for the ${accessibleSection} is not available in this browser.`}
      data-testid="button-listen-learning-text"
    >
      {speaking ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
      {/* Every Listen button says what it does: the same word everywhere, small or full size. */}
      {supported ? (speaking ? 'Stop' : 'Listen') : 'Audio unavailable'}
    </button>
  );
}

function useNaturalVoicePrefetch<T extends Element>(
  targetRef: { current: T | null },
  text: string,
  enabled: boolean,
) {
  const [prefetchVoice, setPrefetchVoice] = useState(naturalVoiceId);
  useEffect(() => {
    if (!enabled) return;
    return onNaturalVoiceStatus(() => setPrefetchVoice(naturalVoiceId()));
  }, [enabled]);
  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target || !prefetchVoice || typeof IntersectionObserver === 'undefined') return;

    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void warmUpNaturalVoice().then((engine) => {
        if (!engine || !active || naturalVoiceId() !== prefetchVoice) return;
        return prefetchNaturalVoice(
          prefetchVoice,
          sentences(spokenLearningText(text)),
          () => active && naturalVoiceId() === prefetchVoice,
        );
      });
    }, { rootMargin: '160px 0px' });
    observer.observe(target);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [enabled, prefetchVoice, targetRef, text]);
}

/** A headed, speakable section with one control for its complete text. */
export function LearningTextSection({
  heading,
  text,
  id,
  label,
  className = 'fq-learning-section',
  paragraphClassName,
  emphasize = false,
  bold = false,
  listen = true,
}: {
  heading: string;
  text: string;
  id: string;
  label?: string;
  className?: string;
  paragraphClassName?: string;
  emphasize?: boolean;
  bold?: boolean;
  /** False when the card around this section has one Listen button for all of its sections. */
  listen?: boolean;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  useNaturalVoicePrefetch(sectionRef, text, listen);

  return (
    <section ref={sectionRef} className={className} aria-labelledby={id}>
      <header className="fq-example-section-header">
        <h3 id={id}>{heading}</h3>
        {listen && <LearningListenButton text={text} label={label ?? `Listen to the ${heading.toLowerCase()}`} />}
      </header>
      <p className={paragraphClassName}>{bold ? <strong><LearningText text={text} emphasize={emphasize} /></strong> : <LearningText text={text} emphasize={emphasize} />}</p>
    </section>
  );
}

/** One script for a card with several headed sections, read in order: "Question: … Worked answer: …". */
export { sectionsScript } from './lab-copy';

/** Keeps fractions stacked while making core vocabulary explorable and optionally audible. */
/* Key points in a question get a solid underline: amounts ("2 pieces", "4 friends"), fraction names (halves, eighths)
   and the words that decide the answer (equal, same, not, bigger, smaller…). Glossary words keep their dotted underline. */
const KEY_PATTERN = new RegExp([
  String.raw`(?<![\d/])\b\d+ (?:equal |same-size |fair )?(?:pieces?|parts?|slices?|spaces?|jumps?|groups?|friends?|kids?|wholes?|bars?|strips?|triangles?|squares?|loaves|pizzas?|cups?|beads?|marbles?|counters?)\b`,
  String.raw`\b(?:halves|thirds|fourths|fifths|sixths|sevenths|eighths|ninths|tenths|elevenths|twelfths|hundredths)\b`,
  String.raw`\b(?:equal|same|not|bigger|biggest|smaller|smallest|greater|more|less|closest|closer|fair|left)\b`,
].join('|'), 'gi');

/** The punctuation right after a highlighted word ("parts." or "fourths?"). It is kept with the word so a line never
    starts with a lone full stop: a highlighted word is its own box, and a line may otherwise break just after it. */
function trailingPunctuation(text: string, from: number): string {
  return /^[.,!?;:)’”]+/.exec(text.slice(from))?.[0] ?? '';
}

/** Plain text with its key points underlined (fractions inside still render as math). */
function EmphasizedText({ text }: { text: string }) {
  // An underlined amount ("3 pizzas") takes the season's words like the plain text around it does.
  const words = useSeasonalWords();
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of execAll(text, KEY_PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(<MathText key={`t-${last}`} text={text.slice(last, at)} />);
    const key = <span key={`k-${at}`} className="fq-key">{words(match[0])}</span>;
    const stop = trailingPunctuation(text, at + match[0].length);
    parts.push(stop ? <span key={`k-${at}`} className="fq-glue">{key}{stop}</span> : key);
    last = at + match[0].length + stop.length;
  }
  if (last < text.length) parts.push(<MathText key={`t-${last}`} text={text.slice(last)} />);
  return <>{parts}</>;
}

export function LearningText({
  text,
  interactiveTerms = true,
  emphasize = false,
}: {
  text: string | undefined | null;
  interactiveTerms?: boolean;
  /** Questions: underline the key points. */
  emphasize?: boolean;
}) {
  if (!text) return null;
  const plain = (value: string, key: string) => (emphasize ? <EmphasizedText key={key} text={value} /> : <MathText key={key} text={value} />);

  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of execAll(text, VOCABULARY_PATTERN)) {
    const at = match.index ?? 0;
    const word = match[0];
    const entry = entryFor(word);
    if (!entry) continue;
    if (at > last) parts.push(plain(text.slice(last, at), `text-${last}`));
    const term = <VocabularyTerm key={`term-${at}`} text={word} definition={entry.definition} interactive={interactiveTerms} />;
    const stop = trailingPunctuation(text, at + word.length);
    parts.push(stop ? <span key={`term-${at}`} className="fq-glue">{term}{stop}</span> : term);
    last = at + word.length + stop.length;
  }
  if (last < text.length || parts.length === 0) {
    parts.push(plain(text.slice(last), `text-${last}`));
  }

  return (
    <span className="fq-learning-text">
      {parts}
    </span>
  );
}
