import { useState } from 'react';
import { ArrowRight, LockKeyhole, Search } from 'lucide-react';
import { StoryCharacter } from './characters';
import { LearningListenButton, LearningText } from './LearningText';
import { TaskBar } from './TaskBar';
import { CHAPTERS, CHARACTERS, STONE_PIECES, lessonCliff, storyAsk, withName, type Chapter, type Panel, type StoryChoice } from './story';

/** The Whole Stone as a fraction model: one bar cut into 15 equal pieces, the found ones lit. */
export function StoneBar({ found, fresh = false }: { found: number; /** Glow the newest piece. */ fresh?: boolean }) {
  return (
    <div className="fq-stone-bar" role="img" aria-label={`${found} of ${STONE_PIECES} equal pieces of the Whole Stone found`} data-testid="stone-bar" data-found={found}>
      {Array.from({ length: STONE_PIECES }, (_, i) => <span key={i} className={`${i < found ? 'on' : ''} ${fresh && i === found - 1 ? 'fresh' : ''}`} />)}
    </div>
  );
}

/** A comic: three panels, an optional choice that must be picked, then an explicit button on. */
export function StoryComicView({ title, kicker, panels, name, choice, goLabel, onGo, onBack }: {
  title: string; kicker: string; panels: Panel[]; name: string | null;
  choice?: [StoryChoice, StoryChoice]; goLabel: string; onGo: (choice?: 0 | 1) => void; onBack: () => void;
}) {
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const lines = panels.map((panel) => ({ ...panel, text: withName(panel.text, name) }));
  const reply = choice && picked !== null ? { ...choice[picked].reply, text: withName(choice[picked].reply.text, name) } : null;
  const script = [...lines, ...(reply ? [reply] : [])].map((panel) => `${CHARACTERS[panel.speaker].name} says: ${panel.text}`).join(' ');
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
                  <strong>{option.label}</strong><span>{option.detail}</span>
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

/** The friend's short line above a question. It sets the scene; it never hints at the answer. */
export function StorySay({ chapter, questionId }: { chapter: Chapter; questionId: string }) {
  return (
    <div className="fq-story-say" data-testid="story-line">
      <StoryCharacter id={chapter.character} size={44} />
      <p><span className="fq-sr">{CHARACTERS[chapter.character].name} says: </span>{storyAsk(chapter, questionId)}</p>
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

/** After a lesson: the friend's line, a piece of the stone when the chapter is done, and the cliffhanger. */
export function StoryPayoff({ chapter, lessonIndex, lessonsTotal, chapterDone, piecesFound, name }: {
  chapter: Chapter; lessonIndex: number; lessonsTotal: number; chapterDone: boolean; piecesFound: number; name: string | null;
}) {
  const finale = chapterDone && piecesFound >= STONE_PIECES;
  return (
    <div className="fq-story-payoff" data-testid="story-payoff">
      <div className="fq-story-say">
        <StoryCharacter id={chapter.character} size={56} happy />
        <p><span className="fq-sr">{CHARACTERS[chapter.character].name} says: </span>{withName(chapterDone ? chapter.done : chapter.thanks, name)}</p>
      </div>
      {chapterDone && (
        <div className="fq-stone-found" data-testid="stone-found">
          <strong>{finale ? 'The Whole Stone is whole again!' : 'You found a piece of the Whole Stone!'}</strong>
          <StoneBar found={piecesFound} fresh />
          <span>{finale ? <>You found <b>{piecesFound}/{STONE_PIECES}</b>. <u>That’s one whole!</u></> : <>Now <b>{piecesFound}/{STONE_PIECES}</b> of the stone is back.</>}</span>
          <span className="fq-stone-clue new" data-testid="stone-new-clue"><Search size={14} aria-hidden="true" /> New clue: {chapter.clue}</span>
        </div>
      )}
      {chapterDone && <StoryCard chapter={chapter} unlocked fresh />}
      {finale && <KeeperCard name={name} fresh />}
      {!finale && (
        <p className="fq-story-cliff" data-testid="story-cliff">{withName(lessonCliff(chapter, lessonIndex, lessonsTotal), name)}</p>
      )}
      {!chapterDone && <p className="fq-story-progress">Chapter {chapter.unit} · {chapter.title}: <strong>{lessonIndex + 1} of {lessonsTotal}</strong> lessons done</p>}
    </div>
  );
}

/** The last card, for finding every piece. */
export function KeeperCard({ name, fresh = false }: { name: string | null; fresh?: boolean }) {
  return (
    <article className={`fq-story-card fq-keeper-card ${fresh ? 'is-fresh' : ''}`} data-testid="keeper-card">
      <span className="fq-story-card-art"><StoneBar found={STONE_PIECES} /></span>
      <span className="fq-story-card-copy">
        {fresh && <small>Final card</small>}
        <strong>{name ? `${name}, Keeper of the Whole Stone` : 'Keeper of the Whole Stone'}</strong>
        <span>Found all {STONE_PIECES} pieces and solved the mystery.</span>
      </span>
    </article>
  );
}

/** One character card. Locked cards show a shadow and the chapter that unlocks them. */
export function StoryCard({ chapter, unlocked, fresh = false }: { chapter: Chapter; unlocked: boolean; fresh?: boolean }) {
  return (
    <article className={`fq-story-card ${unlocked ? '' : 'is-locked'} ${fresh ? 'is-fresh' : ''}`} data-testid={`story-card-${chapter.unit}`}>
      <span className="fq-story-card-art">{unlocked ? <StoryCharacter id={chapter.character} size={64} happy /> : <LockKeyhole size={26} aria-hidden="true" />}</span>
      <span className="fq-story-card-copy">
        {fresh && <small>New card</small>}
        <strong>{unlocked ? chapter.card.title : `Chapter ${chapter.unit}`}</strong>
        <span>{unlocked ? chapter.card.blurb : `Finish “${chapter.title}” to unlock this card.`}</span>
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
export function StoryCardsView({ completedUnits, name, onBack }: { completedUnits: Set<number>; name: string | null; onBack: () => void }) {
  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-cards-back" title="Character cards" />
        <div className="fq-stone-banner fq-stone-banner-small">
          <div className="fq-stone-head"><h2>The Whole Stone</h2><span><strong>{completedUnits.size}/{STONE_PIECES}</strong> found</span></div>
          <StoneBar found={completedUnits.size} />
        </div>
        <p className="fq-story-cards-note">Finish a chapter to meet its friend. <strong>{completedUnits.size} of {CHAPTERS.length}</strong> cards collected.</p>
        <div className="fq-story-cards" data-testid="story-cards">
          {CHAPTERS.map((chapter) => <StoryCard key={chapter.unit} chapter={chapter} unlocked={completedUnits.has(chapter.unit)} />)}
          {completedUnits.size >= STONE_PIECES && <KeeperCard name={name} />}
        </div>
      </main>
    </div>
  );
}
