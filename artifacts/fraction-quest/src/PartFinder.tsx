import { useState, type ReactNode } from 'react';
import { useScrollTopOn } from './lib/reveal';
import { AREA_CUTS, pieceArea, type AreaCut, type Piece } from './area-shapes';
import { FRIENDS, isPartFinderAnswer, partFinderFeedback, type PartFinderRound } from './part-finder';
import './part-finder.css';
import { TaskBar } from './TaskBar';
import { AnswerTiles } from './AnswerTiles';
import { Mascot } from './fun-ui';
import { LearningListenButton } from './LearningText';
import { playHaptic } from './lib/fun';

type CheckState = 'idle' | 'right' | 'try-again';

const svgPoints = (piece: Piece) =>
  piece.points.map(([x, y]) => `${x * 168},${y * 168}`).join(' ');

const SHARE_NAMES = FRIENDS;

const FIRST_FRACTION_TEXT = 'A fraction shows equal parts of one whole. First look at the whole. Then split it into equal pieces and share them fairly.';

function FirstFractionIntroduction() {
  return (
    <section className="fq-pf-first-intro" data-testid="first-fraction-introduction" aria-labelledby="pf-first-intro-title">
      <div className="fq-pf-first-intro-copy">
        <Mascot mood="happy" size={62} />
        <div>
          <div className="fq-pf-first-intro-heading">
            <h2 id="pf-first-intro-title">Meet fractions with Numi</h2>
            <LearningListenButton text={FIRST_FRACTION_TEXT} label="Listen to the fraction introduction" prefetch />
          </div>
          <p>{FIRST_FRACTION_TEXT}</p>
        </div>
      </div>
      <figure className="fq-pf-first-intro-model" data-testid="first-fraction-intro-model">
        <div className="fq-pf-intro-whole" role="img" aria-label="One whole divided into four equal-size parts">
          {[1, 2, 3, 4].map((part) => <span className="fq-pf-intro-part" key={part} />)}
        </div>
        <figcaption>1 whole · 4 equal-size parts</figcaption>
      </figure>
    </section>
  );
}

function CutPicture({ cut, label, selected = [], groups, interactive = false, disabled = false, onToggle }: {
  cut: AreaCut;
  label: string;
  selected?: number[];
  /** Sort rounds: the share each piece is in (-1 = none), shown as a color. */
  groups?: number[];
  interactive?: boolean;
  disabled?: boolean;
  onToggle?: (index: number) => void;
}) {
  const pieces = AREA_CUTS[cut];
  return (
    <svg className={`fq-pf-square${interactive ? ' interactive' : ''}`} viewBox="0 0 168 168" role={interactive ? undefined : 'img'} aria-label={interactive ? undefined : label}>
      {interactive && <title>{label}</title>}
      {pieces.map((piece, index) => {
        const group = groups?.[index] ?? -1;
        const pressed = groups ? group >= 0 : selected.includes(index);
        const name = `${piece.shape === 'rect' ? 'rectangle' : piece.shape} piece ${index + 1}${groups ? (group >= 0 ? `, ${SHARE_NAMES[group]}’s` : ', nobody’s yet') : pressed ? ', selected' : ''}`;
        const look = groups ? (group >= 0 ? ` share-${group}` : ' unassigned') : pressed ? ' selected' : '';
        return interactive ? (
          <polygon
            key={index}
            points={svgPoints(piece)}
            className={`fq-pf-piece${look}`}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={pressed}
            aria-label={name}
            aria-disabled={disabled}
            onClick={() => !disabled && onToggle?.(index)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!disabled) onToggle?.(index);
              }
            }}
            data-testid={`button-part-finder-piece-${index + 1}`}
          />
        ) : (
          <polygon key={index} points={svgPoints(piece)} className={`fq-pf-piece fq-pf-static-piece${pressed ? ' selected' : ''}`} aria-hidden="true" />
        );
      })}
      <rect className="fq-pf-frame" x="1.5" y="1.5" width="165" height="165" fill="none" aria-hidden="true" />
    </svg>
  );
}

/** Tile rounds: no answer picture until the count is right; then show the copies filling the whole. */
function TileFill({ cut, selection, solved }: { cut: AreaCut; selection: number[]; solved: boolean }) {
  if (selection.length !== 1) {
    return <div className="fq-pf-tile-empty" aria-live="polite">Choose one piece. Then picture copies of it covering the whole square.</div>;
  }
  const area = pieceArea(AREA_CUTS[cut][selection[0]]);
  const copies = Math.max(1, Math.round(1 / area));
  if (!solved) {
    return <div className="fq-pf-tile-empty" aria-live="polite">Imagine copies of the piece you chose covering the square, with no gaps and no overlaps.</div>;
  }
  const filled: AreaCut = copies === 4 ? 'fourths-squares' : 'eighths-triangles';
  return (
    <div className="fq-pf-fill" data-testid="part-finder-tile-filled">
      <div className="fq-pf-fill-head">
        <span>One whole</span>
        <strong>{copies} copies</strong>
      </div>
      <div className="fq-pf-fill-grid" role="group" aria-label={`${copies} copies of the piece filling one whole`}>
        <CutPicture cut={filled} label={`A whole filled with ${copies} copies of the selected piece`} selected={AREA_CUTS[filled].map((_, index) => index)} />
      </div>
      <p>{copies} copies fill the whole, so each copy is 1/{copies}.</p>
    </div>
  );
}

/** Hands-on cake rounds inside a lesson, between the worked example and the questions. Each round must fit
    before the child moves on; the feedback says why a try doesn't fit. */
export default function PartFinder({ rounds, lessonLabel, activityTitle, showFirstIntroduction = false, intro, onExit, onDone, onSkip }: {
  rounds: PartFinderRound[];
  /** "Lesson 01 · Same whole, fair pieces": shown in the bar so the child knows this is part of the lesson. */
  lessonLabel: string;
  /** Short label for the specific hands-on activity. */
  activityTitle: string;
  /** Show the Numi-led introduction for the learner's first fraction lesson. */
  showFirstIntroduction?: boolean;
  /** A worked example shown as part of the lesson before its hands-on rounds. */
  intro?: ReactNode;
  onExit: () => void;
  onDone: () => void;
  /** Replaying a finished lesson: the cake rounds can be skipped. */
  onSkip?: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  useScrollTopOn(roundIndex);
  const [selected, setSelected] = useState<number[]>([]);
  const [checked, setChecked] = useState<CheckState>('idle');
  const [tileCount, setTileCount] = useState('');
  const round = rounds[roundIndex];
  const emptyShares = () => AREA_CUTS[round.cut].map(() => -1);
  const [assignment, setAssignment] = useState<number[]>(() => AREA_CUTS[rounds[0].cut].map(() => -1));
  const [activeShare, setActiveShare] = useState(0);
  const sorting = round.mode === 'sort';
  // Sort rounds check the share of every piece; the other rounds check the chosen pieces.
  const answerPieces = sorting ? assignment : selected;
  const placed = assignment.filter((share) => share >= 0).length;
  const correct = checked === 'right';
  const tileAnswer = tileCount.trim() ? Number(tileCount) : undefined;
  const lastRound = roundIndex === rounds.length - 1;

  const togglePiece = (index: number) => {
    if (correct) return;
    playHaptic('selection');
    setChecked('idle');
    if (sorting) {
      setAssignment((current) => current.map((share, i) => (i !== index ? share : share === activeShare ? -1 : activeShare)));
      return;
    }
    if (round.mode === 'tile') setTileCount('');
    setSelected((current) => {
      if (round.mode === 'tile') return current.includes(index) ? [] : [index];
      return current.includes(index) ? current.filter((item) => item !== index) : [...current, index].sort((a, b) => a - b);
    });
  };

  const checkAnswer = () => {
    if (correct) return;
    const isRight = isPartFinderAnswer(round, answerPieces, tileAnswer);
    playHaptic(isRight ? 'correct' : 'retry');
    setChecked(isRight ? 'right' : 'try-again');
  };

  const clearSelection = () => {
    if (correct) return;
    if (!selected.length && !assignment.some((share) => share >= 0) && !tileCount) return;
    playHaptic('selection');
    setSelected([]);
    setAssignment(emptyShares());
    setChecked('idle');
    setTileCount('');
  };

  const advance = () => {
    if (lastRound) { onDone(); return; }
    setRoundIndex((index) => index + 1);
    setAssignment(AREA_CUTS[rounds[roundIndex + 1].cut].map(() => -1));
    setSelected([]);
    setChecked('idle');
    setTileCount('');
    setActiveShare(0);
  };

  return (
    <main className="fq-app fq-pf" data-testid="part-finder-screen">
      <div className="fq-pf-shell">
        <TaskBar onBack={onExit} backLabel="Map" testId="button-part-finder-exit" title={activityTitle} backAriaLabel={`Back to the map (leaves ${lessonLabel})`} step={roundIndex + 1} total={rounds.length} sequenceLabel="Round"
          actions={onSkip && <button type="button" className="fq-hint-button" onClick={onSkip} data-testid="button-hands-on-skip">Skip</button>} />

        {showFirstIntroduction && <FirstFractionIntroduction />}

        {intro && <section className="fq-pf-lesson-example" data-testid="part-finder-lesson-example">{intro}</section>}

        <section className="fq-pf-card" aria-labelledby="pf-title">
          <div className="fq-pf-heading">
            <h1 id="pf-title">{round.title}</h1>
            <p className="fq-pf-prompt">{round.prompt}</p>
          </div>

          <div className={`fq-pf-workspace ${round.id === 'match' ? 'match' : ''}`}>
            {round.id === 'match' && round.comparisonCut && (
              <figure className="fq-pf-comparison" data-testid="part-finder-comparison">
                <figcaption><span>Compare</span><strong>1/4 of the cake</strong></figcaption>
                <CutPicture cut={round.comparisonCut} label="Comparison square with one fourth highlighted" selected={[0]} />
              </figure>
            )}
            <figure className="fq-pf-interactive">
              <figcaption>
                <span>{round.id === 'match' ? 'Find the same amount' : sorting ? 'Share it out' : 'Choose a piece'}</span>
                <strong>{round.targetLabel}</strong>
              </figcaption>
              <CutPicture
                cut={round.cut}
                label={`${round.title}: choose pieces`}
                selected={selected}
                groups={sorting ? assignment : undefined}
                interactive
                disabled={correct}
                onToggle={togglePiece}
              />
              <p className="fq-pf-instruction">{sorting ? 'Tap a friend, then tap their pieces. Tap a piece again to take it back.' : 'Tap or click pieces to select them. Use Tab, then Enter or Space.'}</p>
            </figure>
          </div>

          {sorting && (
            <div className="fq-pf-friends">
              <p className="fq-pf-friends-label" id="pf-friends-label">Who gets the next pieces you tap?</p>
              <div className="fq-pf-shares" role="radiogroup" aria-labelledby="pf-friends-label">
                {SHARE_NAMES.slice(0, round.shares).map((name, share) => {
                  const count = assignment.filter((owner) => owner === share).length;
                  return (
                    <button key={name} type="button" role="radio" aria-checked={activeShare === share} disabled={correct}
                      className={`fq-pf-share share-${share}${activeShare === share ? ' active' : ''}`}
                      onClick={() => {
                        if (activeShare === share) return;
                        playHaptic('selection');
                        setActiveShare(share);
                      }} data-testid={`button-part-finder-share-${share + 1}`}>
                      <i aria-hidden="true" /><span>{name}<small>{count} {count === 1 ? 'piece' : 'pieces'}</small></span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {round.mode === 'tile' && <>
            <TileFill cut={round.cut} selection={selected} solved={correct} />
            <div className="fq-pf-count-entry">
              <span>How many copies fill one whole?</span>
              <AnswerTiles key={round.id} shape={{ kind: 'number' }} value={tileCount} disabled={correct} testIdPrefix="part-finder-tile-count"
                label="Number of copies that fill one whole" onChange={(value) => { setTileCount(value); setChecked('idle'); }} />
            </div>
          </>}

          <div className="fq-pf-control-row">
            <p className="fq-pf-selection" aria-live="polite" data-testid="part-finder-selection">
              {sorting
                ? `${placed} of ${assignment.length} pieces given out.`
                : selected.length === 0 ? 'No pieces selected yet.' : `${selected.length} ${selected.length === 1 ? 'piece' : 'pieces'} selected.`}
            </p>
            <div className="fq-pf-actions">
              <button type="button" className="fq-button ghost" onClick={clearSelection} disabled={(sorting ? placed === 0 : selected.length === 0) || correct} data-testid="button-part-finder-clear">Clear</button>
              {correct ? (
                <button type="button" className="fq-button" onClick={advance} data-testid="button-part-finder-next">
                  {lastRound ? 'Keep going' : 'Next cake'}
                </button>
              ) : (
                <button type="button" className="fq-button" onClick={checkAnswer} disabled={(sorting ? placed === 0 : selected.length === 0) || (round.mode === 'tile' && tileAnswer === undefined)} data-testid="button-part-finder-check">{sorting ? 'Is it fair?' : 'Check pieces'}</button>
              )}
            </div>
          </div>
          {checked !== 'idle' && (
            <div className={`fq-pf-feedback ${correct ? 'right' : 'retry'}`} role="status" aria-live="polite" data-testid="part-finder-feedback">
              <strong>{correct ? 'That fits!' : 'Not quite yet.'}</strong>
              <span>{partFinderFeedback(round, answerPieces, tileAnswer)}</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
