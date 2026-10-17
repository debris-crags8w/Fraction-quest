import { ArrowRight, LockKeyhole } from 'lucide-react';
import { StoryCharacter } from './characters';
import { LearningListenButton, LearningText } from './LearningText';
import { TaskBar } from './TaskBar';
import { CHAPTERS, CHARACTERS, storyAsk, type Chapter, type Panel } from './story';

/** The comic before a lesson: three panels, then an explicit button into the lesson. */
export function StoryComicView({ chapter, panels, first, lessonLabel, onGo, onBack }: {
  chapter: Chapter; panels: Panel[]; /** The chapter's first lesson (its intro comic). */ first: boolean; lessonLabel: string; onGo: () => void; onBack: () => void;
}) {
  const script = panels.map((panel) => `${CHARACTERS[panel.speaker].name} says: ${panel.text}`).join(' ');
  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-story-back" title={<>Chapter {chapter.unit} · {chapter.title}</>} />
        <section className="fq-story-comic" aria-labelledby="story-title" data-testid="story-comic">
          <div className="fq-story-comic-head">
            <h2 id="story-title">{lessonLabel}</h2>
            <LearningListenButton text={script} label="Listen to the story" />
          </div>
          <ol className="fq-story-panels">
            {panels.map((panel, index) => (
              <li key={index} className={`fq-story-panel ${index % 2 ? 'is-right' : ''} is-${panel.speaker}`} data-testid={`story-panel-${index}`}>
                <StoryCharacter id={panel.speaker} size={72} />
                <div className="fq-story-bubble">
                  <span className="fq-story-name">{CHARACTERS[panel.speaker].name}</span>
                  <p>{panel.speaker === 'hoot' ? <LearningText text={panel.text} emphasize /> : panel.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="fq-button fq-story-go" onClick={onGo} data-testid="button-story-go">
            {first ? 'Let’s help!' : 'Let’s go!'} <ArrowRight size={18} />
          </button>
        </section>
      </main>
    </div>
  );
}

/** The chapter friend's short line above a question. It sets the scene; it never hints at the answer. */
export function StorySay({ chapter, questionId }: { chapter: Chapter; questionId: string }) {
  return (
    <div className="fq-story-say" data-testid="story-line">
      <StoryCharacter id={chapter.character} size={44} />
      <p><span className="fq-sr">{CHARACTERS[chapter.character].name} says: </span>{storyAsk(chapter, questionId)}</p>
    </div>
  );
}

/** The thank-you after a lesson, and the new character card when the chapter is done. */
export function StoryPayoff({ chapter, lessonsDone, lessonsTotal }: { chapter: Chapter; lessonsDone: number; lessonsTotal: number }) {
  const chapterDone = lessonsDone >= lessonsTotal;
  return (
    <div className="fq-story-payoff" data-testid="story-payoff">
      <div className="fq-story-say">
        <StoryCharacter id={chapter.character} size={56} happy />
        <p><span className="fq-sr">{CHARACTERS[chapter.character].name} says: </span>{chapterDone ? chapter.done : chapter.thanks}</p>
      </div>
      {chapterDone
        ? <StoryCard chapter={chapter} unlocked fresh />
        : <p className="fq-story-progress">Chapter {chapter.unit} · {chapter.title}: <strong>{lessonsDone} of {lessonsTotal}</strong> lessons done</p>}
    </div>
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

/** Every character card: unlocked ones from finished chapters, the rest locked. */
export function StoryCardsView({ completedUnits, onBack }: { completedUnits: Set<number>; onBack: () => void }) {
  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-cards-back" title="Character cards" />
        <p className="fq-story-cards-note">Finish a chapter to meet its friend. <strong>{completedUnits.size} of {CHAPTERS.length}</strong> cards collected.</p>
        <div className="fq-story-cards" data-testid="story-cards">
          {CHAPTERS.map((chapter) => <StoryCard key={chapter.unit} chapter={chapter} unlocked={completedUnits.has(chapter.unit)} />)}
        </div>
      </main>
    </div>
  );
}
