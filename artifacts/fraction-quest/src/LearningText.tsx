import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { MathText } from './MathText';

type VocabularyEntry = { pattern: string; definition: string };

const VOCABULARY: VocabularyEntry[] = [
  { pattern: 'equal\\s+shares?', definition: 'Equal shares are parts that are the same size.' },
  { pattern: 'equal\\s+parts?', definition: 'Equal parts are pieces that are the same size.' },
  { pattern: 'equivalent\\s+fractions?', definition: 'Equivalent fractions look different but are the same amount.' },
  { pattern: 'improper\\s+fractions?', definition: 'An improper fraction has a top number as big as, or bigger than, the bottom number.' },
  { pattern: 'mixed\\s+numbers?', definition: 'A mixed number has a whole number and a fraction together, like 1 and 2/3.' },
  { pattern: 'unit\\s+fractions?', definition: 'A unit fraction has 1 as its numerator, like 1/4.' },
  { pattern: 'number\\s+lines?', definition: 'A number line shows numbers in order, using equal spaces.' },
  { pattern: 'denominators?', definition: 'The denominator is the bottom number: how many equal parts make 1 whole.' },
  { pattern: 'numerators?', definition: 'The numerator is the top number: how many parts you count.' },
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

  return (
    <span className="fq-vocab">
      <span className="fq-vocab-trigger" role="term" tabIndex={0} aria-describedby={tooltipId}>{text}</span>
      <span className="fq-vocab-tooltip" id={tooltipId} role="tooltip">{definition}</span>
    </span>
  );
}

export function spokenLearningText(text: string) {
  return text.replace(/(\d+)\s*\/\s*(\d+)/g, '$1 over $2');
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

/** Prefer a feminine-sounding voice within the requested language; browsers expose no reliable gender field. */
export function selectLearningVoice<T extends VoiceCandidate>(
  voices: readonly T[],
  preferredLanguage: string,
  preferredVoiceId: string | null = null,
): T | null {
  if (voices.length === 0) return null;
  const normalize = (language: string) => language.toLowerCase().replace(/_/g, '-');
  const wanted = normalize(preferredLanguage);
  const primaryLanguage = wanted.split('-')[0];
  const languageMatches = voices.filter((voice) => normalize(voice.lang).split('-')[0] === primaryLanguage);
  if (preferredVoiceId) {
    const savedVoice = languageMatches.find((voice) => learningVoiceId(voice) === preferredVoiceId);
    if (savedVoice) return savedVoice;
  }
  if (languageMatches.length === 0) return null;
  const feminineMatches = languageMatches.filter((voice) => FEMININE_VOICE_HINTS.test(voice.name));
  const preferred = feminineMatches.length > 0 ? feminineMatches : languageMatches;

  return [...preferred].sort((a, b) => {
    const exactLanguage = (voice: T) => Number(normalize(voice.lang) === wanted);
    return exactLanguage(b) - exactLanguage(a)
      || Number(b.default) - Number(a.default)
      || a.name.localeCompare(b.name);
  })[0] ?? null;
}

const VOICE_LIST_WAIT_MS = 500;

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
    if (waitingListener) synthesis.removeEventListener('voiceschanged', waitingListener);
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
    try {
      synthesis.cancel();
    } finally {
      setSpeaking(false);
    }
  };

  const startUtterance = (text: string, language: string, playback: number, voices: readonly SpeechSynthesisVoice[]) => {
    if (disposed || playback !== generation) return;
    clearVoiceWait();
    const voice = selectLearningVoice(voices, language, getPreferredVoiceId());
    const utterance = makeUtterance(spokenLearningText(text));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || language;
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    const finish = () => {
      if (playback === generation) setSpeaking(false);
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    try {
      setSpeaking(true);
      synthesis.speak(utterance);
    } catch {
      finish();
    }
  };

  return {
    speak(text: string, language: string) {
      if (disposed) return;
      stop();
      const playback = generation;
      let voices: SpeechSynthesisVoice[] = [];
      try {
        voices = synthesis.getVoices();
      } catch {
        startUtterance(text, language, playback, []);
        return;
      }

      if (voices.length > 0) {
        startUtterance(text, language, playback, voices);
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
        startUtterance(text, language, playback, latestVoices);
      };
      waitingListener = startWithCurrentVoices;
      synthesis.addEventListener('voiceschanged', startWithCurrentVoices);
      waitTimer = setTimeout(() => {
        waitTimer = undefined;
        startWithCurrentVoices();
      }, voiceWaitMs);
    },
    stop,
    dispose() {
      disposed = true;
      stop();
    },
  };
}

const VOICE_PREVIEW = 'Hello! This is how I will read fraction explanations.';

/** A device-local voice chooser for families. Browser speech synthesis keeps all audio on-device. */
export function LearningVoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(getSavedLearningVoiceId);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const language = getLearningLanguage();
  const primaryLanguage = language.toLowerCase().replace(/_/g, '-').split('-')[0];

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)
      || typeof SpeechSynthesisUtterance === 'undefined') return;

    const synthesis = window.speechSynthesis;
    setSupported(true);
    const updateVoices = () => {
      try {
        setVoices(synthesis.getVoices());
      } catch {
        setVoices([]);
      }
    };
    updateVoices();
    synthesis.addEventListener('voiceschanged', updateVoices);
    return () => {
      synthesis.removeEventListener('voiceschanged', updateVoices);
      synthesis.cancel();
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

  const previewVoice = (voice: SpeechSynthesisVoice) => {
    if (!supported) return;
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(VOICE_PREVIEW);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    const id = learningVoiceId(voice);
    setPreviewingVoiceId(id);
    const finish = () => setPreviewingVoiceId((active) => active === id ? null : active);
    utterance.onend = finish;
    utterance.onerror = finish;
    try {
      synthesis.speak(utterance);
    } catch {
      finish();
    }
  };

  const chooseVoice = (id: string) => {
    setSelectedVoiceId(id);
    setSaveFailed(!saveLearningVoiceId(id));
  };

  return (
    <section className="fq-parent-section fq-learning-voice-settings" data-testid="learning-voice-settings" aria-labelledby="learning-voice-heading">
      <h2 id="learning-voice-heading">Read-aloud voice</h2>
      <p>Preview voices available on this device, then choose one for lesson explanations. Audio stays on this device.</p>
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
                    checked={selectedVoiceId === id}
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

function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const controllerRef = useRef<ReturnType<typeof createLearningSpeechController> | null>(null);
  const supported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    if (!supported) return;
    const controller = createLearningSpeechController(window.speechSynthesis, setSpeaking);
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [supported]);

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
      type="button"
      className="fq-learning-listen"
      onClick={toggleSpeech}
      disabled={!supported}
      aria-label={!supported ? 'Audio unavailable' : speaking ? 'Stop reading' : 'Listen to this explanation'}
      aria-pressed={speaking}
      title={supported ? undefined : 'Audio is not available in this browser.'}
      data-testid="button-listen-learning-text"
    >
      {speaking ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
      {supported ? (speaking ? 'Stop' : 'Listen') : 'Audio unavailable'}
    </button>
  );
}

/** Keeps fractions stacked while making core vocabulary explorable and optionally audible. */
export function LearningText({
  text,
  speak = false,
  interactiveTerms = true,
}: {
  text: string | undefined | null;
  speak?: boolean;
  interactiveTerms?: boolean;
}) {
  if (!text) return null;

  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(VOCABULARY_PATTERN)) {
    const at = match.index ?? 0;
    const word = match[0];
    const entry = entryFor(word);
    if (!entry) continue;
    if (at > last) parts.push(<MathText key={`text-${last}`} text={text.slice(last, at)} />);
    parts.push(
      <VocabularyTerm key={`term-${at}`} text={word} definition={entry.definition} interactive={interactiveTerms} />,
    );
    last = at + word.length;
  }
  if (last < text.length || parts.length === 0) {
    parts.push(<MathText key={`text-${last}`} text={text.slice(last)} />);
  }

  return (
    <span className="fq-learning-text">
      {parts}
      {speak && <ListenButton text={text} />}
    </span>
  );
}
