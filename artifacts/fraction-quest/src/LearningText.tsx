import React, { useEffect, useId, useState, type ReactNode } from 'react';
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

function spokenText(text: string) {
  return text.replace(/(\d+)\s*\/\s*(\d+)/g, '$1 over $2');
}

type VoiceCandidate = Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'default'>;
const FEMININE_VOICE_HINTS = /\b(female|woman|samantha|victoria|karen|moira|tessa|susan|zira|jenny|aria|joanna|ava|allison|serena|sara|hazel)\b/i;

/** Prefer a feminine-sounding voice within the requested language; browsers expose no reliable gender field. */
export function selectLearningVoice<T extends VoiceCandidate>(voices: readonly T[], preferredLanguage: string): T | null {
  if (voices.length === 0) return null;
  const normalize = (language: string) => language.toLowerCase().replace(/_/g, '-');
  const wanted = normalize(preferredLanguage);
  const primaryLanguage = wanted.split('-')[0];
  const languageMatches = voices.filter((voice) => normalize(voice.lang).split('-')[0] === primaryLanguage);
  const candidates = languageMatches.length > 0 ? languageMatches : voices;
  const feminineMatches = candidates.filter((voice) => FEMININE_VOICE_HINTS.test(voice.name));
  const preferred = feminineMatches.length > 0 ? feminineMatches : candidates;

  return [...preferred].sort((a, b) => {
    const exactLanguage = (voice: T) => Number(normalize(voice.lang) === wanted);
    return exactLanguage(b) - exactLanguage(a)
      || Number(b.default) - Number(a.default)
      || a.name.localeCompare(b.name);
  })[0] ?? null;
}

function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const supported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    if (!supported) return;
    const synthesis = window.speechSynthesis;
    const refreshVoices = () => setVoices(synthesis.getVoices());
    refreshVoices();
    synthesis.addEventListener('voiceschanged', refreshVoices);
    return () => {
      synthesis.removeEventListener('voiceschanged', refreshVoices);
      synthesis.cancel();
    };
  }, [supported]);

  const toggleSpeech = () => {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const language = document.documentElement.lang || navigator.language || 'en-US';
    const availableVoices = window.speechSynthesis.getVoices();
    const voice = selectLearningVoice(availableVoices.length > 0 ? availableVoices : voices, language);
    const utterance = new SpeechSynthesisUtterance(spokenText(text));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || language;
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    try {
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
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
