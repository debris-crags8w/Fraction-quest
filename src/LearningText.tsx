import React, { useEffect, useId, useState, type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { MathText } from './MathText';
import { speak, stopSpeaking } from './lib/voice';

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

function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => () => stopSpeaking(), []);

  const toggleSpeech = () => {
    if (!supported) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    try {
      setSpeaking(speak(text, () => setSpeaking(false)));
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
