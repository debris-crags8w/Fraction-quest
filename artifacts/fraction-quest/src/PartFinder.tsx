import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRevealWhen, useScrollTopOn } from './lib/reveal';
import { MathText } from './MathText';
import { AREA_CUTS, pieceArea, type AreaCut, type Piece } from './area-shapes';
import { FRIENDS, isPartFinderAnswer, partFinderFeedback, type PartFinderRound } from './part-finder';
import './part-finder.css';
import { TaskBar } from './TaskBar';
import { AnswerTiles } from './AnswerTiles';
import { Mascot, useSeasonalWords } from './fun-ui';
import { LearningListenButton } from './LearningText';
import { playHaptic } from './lib/fun';
import { useLessonHelper } from './model-intro';

type CheckState = 'idle' | 'right' | 'try-again';

const svgPoints = (piece: Piece) =>
  piece.points.map(([x, y]) => `${x * 168},${y * 168}`).join(' ');


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
        <figcaption>one whole · 4 equal-size parts</figcaption>
      </figure>
    </section>
  );
}

function CutPicture({ cut, label, selected = [], groups, interactive = false, disabled = false, onToggle, names = FRIENDS }: {
  cut: AreaCut;
  /** Who each share belongs to (sort rounds). */
  names?: readonly string[];
  label: string;
  selected?: number[];
  /** Sort rounds: the share each piece is in (-1 = none), shown as a color. */
  groups?: number[];
  interactive?: boolean;
  disabled?: boolean;
  onToggle?: (index: number) => void;
}) {
  const pieces = AREA_CUTS[cut];
  // The focused piece's outline is drawn again on top of every piece, so a neighbour can't cover it.
  const [focused, setFocused] = useState<number | null>(null);
  return (
    <svg className={`fq-pf-square${interactive ? ' interactive' : ''}`} viewBox="0 0 168 168" role={interactive ? 'group' : 'img'} aria-label={label}>
      {pieces.map((piece, index) => {
        const group = groups?.[index] ?? -1;
        const pressed = groups ? group >= 0 : selected.includes(index);
        const name = `${piece.shape === 'rect' ? 'rectangle' : piece.shape} piece ${index + 1}${groups ? (group >= 0 ? `, ${names[group]}’s` : ', nobody’s yet') : pressed ? ', selected' : ''}`;
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
            onFocus={() => setFocused(index)}
            onBlur={() => setFocused((current) => (current === index ? null : current))}
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
      {interactive && focused !== null && pieces[focused] && <g className="fq-pf-focus" aria-hidden="true">
        <polygon className="fq-pf-focus-halo" points={svgPoints(pieces[focused])} />
        <polygon className="fq-pf-focus-line" points={svgPoints(pieces[focused])} />
      </g>}
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
      <p><MathText text={`${copies} copies fill the whole, so each copy is 1/${copies}.`} /></p>
    </div>
  );
}

/** Hands-on cake rounds inside a lesson, between the worked example and the questions. Each round must fit
    before the child moves on; the feedback says why a try doesn't fit. */
export default function PartFinder({ rounds, lessonLabel, activityTitle, showFirstIntroduction = false, intro, onExit, onDone, onSkip, friends = FRIENDS, storyLine, progress }: {
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
  /** Story mode: the friends sharing the cake are the story's cast. */
  friends?: readonly string[];
  /** Story mode: the chapter friend's line above the task (asks, then reacts to each check). */
  storyLine?: (result: 'correct' | 'retry' | null) => ReactNode;
  /** One round as an idea's practice: the bar counts the idea's practices ("Practise 2 of 3") instead of the rounds. */
  progress?: { step: number; total: number; label: string; kicker: string };
}) {
  // During a season the shared treat follows it (a pumpkin cake at Halloween); pieces and answers stay the same.
  const words = useSeasonalWords();
  const [roundIndex, setRoundIndex] = useState(0);
  const helper = useLessonHelper();
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
  const instruction = sorting ? 'Tap a friend, then tap their pieces. Tap a piece again to take it back.' : 'Tap or click pieces to select them. Use Tab, then Enter or Space.';
  // On a short phone the cake can push the check button below the screen: show it once there is something to check
  // (every piece shared out, or a piece picked).
  const checkButtonRef = useRef<HTMLButtonElement>(null);
  useRevealWhen(checkButtonRef, checked === 'idle' && (sorting ? placed === assignment.length : selected.length > 0));
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

  const help = <>
    {showFirstIntroduction && <FirstFractionIntroduction />}
    {intro && <section className="fq-pf-lesson-example" data-testid="part-finder-lesson-example">{intro}</section>}
  </>;

  const advance = () => {
    if (lastRound) { onDone(); return; }
    setRoundIndex((index) => index + 1);
    setAssignment(AREA_CUTS[rounds[roundIndex + 1].cut].map(() => -1));
    setSelected([]);
    setChecked('idle');
    setTileCount('');
    setActiveShare(0);
  };
  const feedbackText = checked === 'idle' ? '' : partFinderFeedback(round, answerPieces, tileAnswer, friends);
  // Keyboard and screen-reader users: a right answer moves focus to "Next cake", and a new cake focuses its title.
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (correct) nextButtonRef.current?.focus({ preventScroll: true }); }, [correct]);
  const firstRound = useRef(true);
  useEffect(() => {
    if (firstRound.current) { firstRound.current = false; return; }
    document.getElementById('pf-title')?.focus({ preventScroll: true });
  }, [roundIndex]);

  return (
    <main className="fq-app fq-pf" data-testid="part-finder-screen">
      <div className="fq-pf-shell">
        <TaskBar onBack={onExit} backLabel="Map" testId="button-part-finder-exit" title={activityTitle} backAriaLabel={`Back to the map (leaves ${lessonLabel})`} step={progress?.step ?? roundIndex + 1} total={progress?.total ?? rounds.length} sequenceLabel={progress?.label ?? 'Round'}
          actions={<>{helper.button}{onSkip && <button type="button" className="fq-hint-button" onClick={onSkip} data-testid="button-hands-on-skip">Skip</button>}</>} />
        {helper.panel}

        {/* Teach first: the introduction and worked example open the first round; later rounds keep them a tap away. */}
        {(showFirstIntroduction || intro) && (roundIndex === 0 ? help : (
          <details className="fq-pf-help-again" data-testid="part-finder-help-again">
            <summary>See how it works again</summary>
            {help}
          </details>
        ))}

        {progress && <p className="fq-play-kicker" data-testid="idea-kicker">{progress.kicker}</p>}
        {storyLine?.(checked === 'idle' ? null : correct ? 'correct' : 'retry')}

        <section className="fq-pf-card" aria-labelledby="pf-title">
          <div className="fq-pf-heading">
            <div className="fq-listen-row">
              <h1 id="pf-title" tabIndex={-1}>{words(round.title)}</h1>
              <LearningListenButton text={`${round.prompt} ${instruction}${sorting ? ' Who gets the next pieces you tap?' : ''}`} label="Listen to this cake's task" compact />
            </div>
            <p className="fq-pf-prompt"><MathText text={words(round.prompt)} /></p>
          </div>

          <div className={`fq-pf-workspace ${round.id === 'match' ? 'match' : ''}`}>
            {round.id === 'match' && round.comparisonCut && (
              <figure className="fq-pf-comparison" data-testid="part-finder-comparison">
                <figcaption><span>Compare</span><strong><MathText text={words('1/4 of the cake')} /></strong></figcaption>
                <CutPicture cut={round.comparisonCut} label="Comparison square with one fourth highlighted" selected={[0]} />
              </figure>
            )}
            <figure className="fq-pf-interactive">
              <figcaption>
                <span>{round.id === 'match' ? 'Find the same amount' : sorting ? 'Share it out' : 'Choose a piece'}</span>
                <strong><MathText text={words(round.targetLabel)} /></strong>
              </figcaption>
              <CutPicture
                cut={round.cut}
                label={`${round.title}: choose pieces`}
                selected={selected}
                groups={sorting ? assignment : undefined}
                names={friends}
                interactive
                disabled={correct}
                onToggle={togglePiece}
              />
              <p className="fq-pf-instruction">{instruction}</p>
            </figure>
          </div>

          {sorting && (
            <div className="fq-pf-friends">
              <p className="fq-pf-friends-label" id="pf-friends-label">Who gets the next pieces you tap?</p>
              <div className="fq-pf-shares" role="radiogroup" aria-labelledby="pf-friends-label">
                {friends.slice(0, round.shares).map((name, share) => {
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
                <button ref={nextButtonRef} type="button" className="fq-button" onClick={advance} data-testid="button-part-finder-next">
                  {lastRound ? 'Keep going' : 'Next cake'}
                </button>
              ) : (
                <button ref={checkButtonRef} type="button" className="fq-button" onClick={checkAnswer} disabled={(sorting ? placed === 0 : selected.length === 0) || (round.mode === 'tile' && tileAnswer === undefined)} data-testid="button-part-finder-check">{sorting ? 'Is it fair?' : 'Check pieces'}</button>
              )}
            </div>
          </div>
          {/* Always on the page, so the feedback is announced when it appears. */}
          <div role="status" aria-live="polite">{checked !== 'idle' && (
            <div className={`fq-pf-feedback ${correct ? 'right' : 'retry'}`} data-testid="part-finder-feedback">
              <strong className="fq-listen-row">{correct ? 'That fits!' : 'Almost there.'}<LearningListenButton text={`${correct ? 'That fits!' : 'Almost there.'} ${feedbackText}`} label="Listen to the feedback" compact /></strong>
              <span><MathText text={words(feedbackText)} /></span>
            </div>
          )}</div>
        </section>

      </div>
    </main>
  );
}
