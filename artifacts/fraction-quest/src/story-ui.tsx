import { useState } from 'react';
import { ArrowRight, BookOpen, LockKeyhole, Search } from 'lucide-react';
import { StoryCharacter } from './characters';
import { LearningListenButton, LearningText } from './LearningText';
import { TaskBar } from './TaskBar';
import { CHAPTERS, CHARACTERS, STONE_PIECES, WHOLE_STONE_OPENING, lessonCliff, propTheme, stoneQuestion, storyAsk, storyReaction, storyScript, withName, type Chapter, type Panel, type StoryChoice } from './story';
import { useSeason } from './fun-ui';
import { MathText } from './MathText';

/** The props theme for story text: the season showing now (pumpkin pies at Halloween), else everyday props. */
export const useStoryTheme = () => propTheme(useSeason().season?.id);

/** The Whole Stone as a fraction model: one bar cut into 15 equal pieces, the found ones lit. */
export function StoneBar({ found, fresh = false }: { found: number; /** Glow the newest piece. */ fresh?: boolean }) {
  return (
    <div className="fq-stone-bar" role="img" aria-label={`${found} of ${STONE_PIECES} equal pieces of the Whole Stone found`} data-testid="stone-bar" data-found={found}>
      {Array.from({ length: STONE_PIECES }, (_, i) => <span key={i} className={`${i < found ? 'on' : ''} ${fresh && i === found - 1 ? 'fresh' : ''}`} />)}
    </div>
  );
}

/** A comic: three panels, an optional choice that must be picked, then an explicit button on. */
export function StoryComicView({ title, kicker, panels, name, choice, picked: saved, goLabel, onGo, onBack }: {
  title: string; kicker: string; panels: Panel[]; name: string | null;
  choice?: [StoryChoice, StoryChoice]; /** The choice already made, when reading the comic again. */ picked?: 0 | 1; goLabel: string; onGo: (choice?: 0 | 1) => void; onBack: () => void;
}) {
  const [picked, setPicked] = useState<0 | 1 | null>(saved ?? null);
  const theme = useStoryTheme();
  const lines = panels.map((panel) => ({ ...panel, text: withName(panel.text, name, theme) }));
  const reply = choice && picked !== null ? { ...choice[picked].reply, text: withName(choice[picked].reply.text, name, theme) } : null;
  const script = storyScript([...panels, ...(choice && picked !== null ? [choice[picked].reply] : [])], theme);
  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-story-back" title={title} />
        <section className="fq-story-comic" aria-labelledby="story-title" data-testid="story-comic">
          <div className="fq-story-comic-head">
            <h2 id="story-title">{kicker}</h2>
            <LearningListenButton text={script} label="Listen to the story" prefetch />
          </div>
          <ol className="fq-story-panels">
            {lines.map((panel, index) => (
              <li key={index} className={`fq-story-panel ${index % 2 ? 'is-right' : ''} is-${panel.speaker}`} data-testid={`story-panel-${index}`}>
                <StoryCharacter id={panel.speaker} size={72} />
                <div className="fq-story-bubble">
                  <span className="fq-story-name">{CHARACTERS[panel.speaker].name}</span>
                  <p>{panel.speaker === 'hoot' ? <LearningText text={panel.text} emphasize /> : panel.text}</p>
                </div>
              </li>
            ))}
          </ol>
          {choice && (
            <fieldset className="fq-story-choice" data-testid="story-choice">
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
                  <span><b>{CHARACTERS[reply.speaker].name}:</b> {reply.text}</span>
                </p>
              )}
            </fieldset>
          )}
          <button type="button" className="fq-button fq-story-go" onClick={() => onGo(picked ?? undefined)} disabled={!!choice && picked === null} data-testid="button-story-go">
            {goLabel} <ArrowRight size={18} />
          </button>
        </section>
      </main>
    </div>
  );
}

/** A short story setup before the first comic, so the learner knows what the Whole Stone quest is about. */
export function StoryOpeningView({ name, onGo, onBack }: {
  name: string | null;
  onGo: () => void;
  onBack: () => void;
}) {
  const theme = useStoryTheme();
  const text = withName(WHOLE_STONE_OPENING, name, theme);
  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-story-intro-back" title="The Whole Stone" />
        <section className="fq-story-opening" aria-labelledby="story-opening-title" data-testid="story-introduction">
          <header className="fq-story-opening-head">
            <div className="fq-story-opening-identity">
              <span aria-hidden="true"><StoryCharacter id="numi" size={76} /></span>
              <div>
                <span className="fq-story-opening-kicker">Before the comic</span>
                <h2 id="story-opening-title">Meet the Whole Stone</h2>
              </div>
            </div>
            {/* Read aloud as "friend", like the comics: the name stays on this device and the pack has the line. */}
            <LearningListenButton text={withName(WHOLE_STONE_OPENING, null, theme)} label="Listen to the story introduction" prefetch />
          </header>
          <p className="fq-story-opening-copy">{text}</p>
          <div className="fq-story-opening-stone" data-testid="story-opening-stone">
            <div className="fq-story-opening-stone-head">
              <strong>Pieces to find</strong>
              <span>15 equal pieces</span>
            </div>
            <StoneBar found={0} />
          </div>
          <button type="button" className="fq-button fq-story-go" onClick={onGo} data-testid="button-story-intro-go">
            Start the story <ArrowRight size={18} />
          </button>
        </section>
      </main>
    </div>
  );
}

/** The friend's short line above a question. It sets the scene (or a story problem's setup), then reacts once the
   answer is checked; it never hints. */
export function StorySay({ chapter, questionId, result = null, setup }: { chapter: Chapter; questionId: string; result?: 'correct' | 'retry' | null; setup?: string }) {
  const theme = useStoryTheme();
  return (
    <div className={`fq-story-say ${result ? `is-${result}` : ''}`} data-testid="story-line" data-result={result ?? undefined}>
      <StoryCharacter id={chapter.character} size={40} happy={result === 'correct'} />
      <p aria-live="polite"><span className="fq-sr">{CHARACTERS[chapter.character].name} says: </span>{result ? storyReaction(chapter.character, result, questionId) : withName(setup ?? storyAsk(chapter, questionId), null, theme)}</p>
    </div>
  );
}

/** The quest on the map: the stone filling in, the clue notebook, and what happens next. */
export function StoneBanner({ completedUnits, teaser, chapterTitle }: { completedUnits: Set<number>; teaser: string; chapterTitle: string | null }) {
  const clues = CHAPTERS.filter((chapter) => completedUnits.has(chapter.unit)).map((chapter) => chapter.clue);
  return (
    <section className="fq-stone-banner" aria-labelledby="stone-title" data-testid="stone-banner">
      <div className="fq-stone-head">
        <h2 id="stone-title">The Whole Stone</h2>
        <span><strong>{completedUnits.size}/{STONE_PIECES}</strong> found</span>
      </div>
      <StoneBar found={completedUnits.size} />
      <div className="fq-stone-clues" aria-label="Clue notebook" data-testid="clue-notebook">
        <Search size={15} aria-hidden="true" />
        {clues.length
          ? clues.slice(-3).map((clue) => <span key={clue} className="fq-stone-clue">{clue}</span>)
          : <span className="fq-stone-clue empty">No clues yet. Who cracked the stone?</span>}
        {clues.length > 3 && <span className="fq-stone-clue empty">+{clues.length - 3} more</span>}
      </div>
      {chapterTitle && <p className="fq-stone-teaser" data-testid="stone-teaser"><b>{chapterTitle}.</b> {teaser}</p>}
    </section>
  );
}

/** After a lesson, in one compact box: the friend's line, what the story problem changed, the stone question and
   piece when the chapter is done, then the cliffhanger. */
export function StoryPayoff({ chapter, lessonIndex, lessonsTotal, chapterDone, piecesFound, name, problem }: {
  chapter: Chapter; lessonIndex: number; lessonsTotal: number; chapterDone: boolean; piecesFound: number; name: string | null;
  /** What the lesson's story problem changed in the story. */
  problem?: { result: string };
}) {
  const theme = useStoryTheme();
  const finale = chapterDone && piecesFound >= STONE_PIECES;
  // The stone piece is shown after the child works out how much of the stone is back.
  const [stoneSolved, setStoneSolved] = useState(false);
  const tell = (text: string) => withName(text, name, theme);
  return (
    <div className="fq-story-payoff" data-testid="story-payoff">
      <div className="fq-story-say">
        <StoryCharacter id={chapter.character} size={48} happy />
        <p><span className="fq-sr">{CHARACTERS[chapter.character].name} says: </span>{tell(chapterDone ? chapter.done : chapter.thanks)}</p>
      </div>
      {problem && (
        <p className="fq-story-result" data-testid="story-problem-result">
          <strong>Because you solved the story problem:</strong> {tell(problem.result)}
        </p>
      )}
      {chapterDone && !stoneSolved && <StoneQuestion found={piecesFound} onSolved={() => setStoneSolved(true)} />}
      {chapterDone && stoneSolved && (
        <div className="fq-stone-found" data-testid="stone-found">
          <span className="fq-stone-found-head">
            <strong>{finale ? <>The stone is <u>one whole</u> again!</> : 'You found a stone piece!'}</strong>
            <span><b>{piecesFound}/{STONE_PIECES}</b> found</span>
          </span>
          <StoneBar found={piecesFound} fresh />
          <span className="fq-stone-clue new" data-testid="stone-new-clue"><Search size={14} aria-hidden="true" /> New clue: {tell(chapter.clue)}</span>
          {finale ? <KeeperCard name={name} fresh compact /> : <StoryCard chapter={chapter} unlocked fresh compact />}
          {!finale && <p className="fq-story-cliff" data-testid="story-cliff">{tell(lessonCliff(chapter, lessonIndex, lessonsTotal))}</p>}
        </div>
      )}
      {!chapterDone && (
        <p className="fq-story-cliff is-solo" data-testid="story-cliff">
          {tell(lessonCliff(chapter, lessonIndex, lessonsTotal))}
          <span className="fq-story-progress">Chapter {chapter.unit}: <strong>{lessonIndex + 1} of {lessonsTotal}</strong> lessons done</span>
        </p>
      )}
    </div>
  );
}

/** "How much of the Whole Stone is back?" after a chapter: the stone bar is the model, the piece comes after. */
function StoneQuestion({ found, onSolved }: { found: number; onSolved: () => void }) {
  const { choices, correct } = stoneQuestion(found);
  const [picked, setPicked] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  return (
    <section className="fq-stone-question" aria-labelledby="stone-question-title" data-testid="stone-question">
      <span className="fq-stone-question-tag">Stone question</span>
      <h2 id="stone-question-title">How much of the <u>Whole Stone</u> is back?</h2>
      <StoneBar found={found} />
      <div className="fq-stone-question-choices" role="group" aria-label="Choices">
        {choices.map((choice, index) => (
          <button key={choice} type="button" className={picked === index ? `on ${missed ? 'missed' : ''}` : ''} aria-pressed={picked === index}
            onClick={() => { setPicked(index); setMissed(false); }} data-testid={`button-stone-choice-${index}`}>
            <MathText text={choice} />
          </button>
        ))}
      </div>
      {missed && <p className="fq-stone-question-note" role="status" data-testid="stone-question-feedback">Good try! Count the gold pieces. Then count all the pieces in the whole stone.</p>}
      <button type="button" className="fq-button fq-stone-question-check" disabled={picked === null || missed}
        onClick={() => { if (picked === correct) onSolved(); else setMissed(true); }} data-testid="button-stone-check">
        Check <ArrowRight size={17} />
      </button>
    </section>
  );
}

/** The last card, for finding every piece. */
export function KeeperCard({ name, fresh = false, compact = false }: { name: string | null; fresh?: boolean; compact?: boolean }) {
  return (
    <article className={`fq-story-card fq-keeper-card ${fresh ? 'is-fresh' : ''} ${compact ? 'is-compact' : ''}`} data-testid="keeper-card">
      <span className="fq-story-card-art"><StoneBar found={STONE_PIECES} /></span>
      <span className="fq-story-card-copy">
        {fresh && <small>Final card</small>}
        <strong>{name ? `${name}, Keeper of the Whole Stone` : 'Keeper of the Whole Stone'}</strong>
        {!compact && <span>Found all {STONE_PIECES} pieces and solved the mystery.</span>}
      </span>
    </article>
  );
}

/** One character card. Locked cards show a shadow and the chapter that unlocks them. */
export function StoryCard({ chapter, unlocked, fresh = false, compact = false, onRead }: { chapter: Chapter; unlocked: boolean; fresh?: boolean; compact?: boolean; /** Read the chapter's comic again. */ onRead?: () => void }) {
  const theme = useStoryTheme();
  return (
    <article className={`fq-story-card ${unlocked ? '' : 'is-locked'} ${fresh ? 'is-fresh' : ''} ${compact ? 'is-compact' : ''}`} data-testid={`story-card-${chapter.unit}`}>
      <span className="fq-story-card-art">{unlocked ? <StoryCharacter id={chapter.character} size={compact ? 40 : 64} happy /> : <LockKeyhole size={26} aria-hidden="true" />}</span>
      <span className="fq-story-card-copy">
        {fresh && <small>New card</small>}
        <strong>{unlocked ? chapter.card.title : `Chapter ${chapter.unit}`}</strong>
        {!compact && <span>{unlocked ? withName(chapter.card.blurb, null, theme) : `Finish “${chapter.title}” to unlock this card.`}</span>}
        {unlocked && onRead && (
          <button type="button" className="fq-story-card-read" onClick={onRead} data-testid={`button-read-chapter-${chapter.unit}`}>
            <BookOpen size={15} aria-hidden="true" /> Read chapter {chapter.unit} again
          </button>
        )}
      </span>
    </article>
  );
}

/** A small chapter tag on the map's unit heading. */
export function ChapterTag({ chapter }: { chapter: Chapter }) {
  return (
    <span className="fq-chapter-tag" data-testid={`chapter-tag-${chapter.unit}`}>
      <StoryCharacter id={chapter.character} size={30} />
      <span>Chapter {chapter.unit} · {chapter.title}</span>
    </span>
  );
}

/** Every card and the stone: unlocked cards come from finished chapters, the rest stay locked. */
export function StoryCardsView({ completedUnits, name, onBack, onRead }: { completedUnits: Set<number>; name: string | null; onBack: () => void; onRead: (unit: number) => void }) {
  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-cards-back" title="Character cards" />
        <div className="fq-stone-banner fq-stone-banner-small">
          <div className="fq-stone-head"><h2>The Whole Stone</h2><span><strong>{completedUnits.size}/{STONE_PIECES}</strong> found</span></div>
          <StoneBar found={completedUnits.size} />
        </div>
        <p className="fq-story-cards-note">Finish a chapter to meet its friend and read its story again. <strong>{completedUnits.size} of {CHAPTERS.length}</strong> cards collected.</p>
        <div className="fq-story-cards" data-testid="story-cards">
          {CHAPTERS.map((chapter) => <StoryCard key={chapter.unit} chapter={chapter} unlocked={completedUnits.has(chapter.unit)} onRead={() => onRead(chapter.unit)} />)}
          {completedUnits.size >= STONE_PIECES && <KeeperCard name={name} />}
        </div>
      </main>
    </div>
  );
}
