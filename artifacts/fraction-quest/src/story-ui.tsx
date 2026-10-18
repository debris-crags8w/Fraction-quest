import { useState, type ReactNode } from 'react';
import { ArrowRight, BookOpen, LockKeyhole, Search } from 'lucide-react';
import { StoryCharacter } from './characters';
import { LearningListenButton, LearningText } from './LearningText';
import { TaskBar } from './TaskBar';
import { CHAPTERS, CHARACTERS, STONE_PIECES, type CharacterId, lessonCliff, propTheme, stoneQuestion, storyAsk, storyReaction, storyScript, withName, type Chapter, type Panel, type StoryChoice } from './story';
import { useSeason } from './fun-ui';
import { MathText } from './MathText';
import { CinematicComic, type StoryScene } from './story-cinema';
import { BOARD_AFTER, ClueCard, StickerView, bonusClue, earnsThanks, thanksSticker, lessonSticker, type Sticker, type SuspectBoard } from './quest';

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

/** A friend in trouble looks worried: a question, a plea for help, something missing or broken. */
const looksWorried = (panel: Panel) => !['numi', 'hoot'].includes(panel.speaker) && /\?|can’t|help|missing|broken|wobbl|stuck|sorry|scared/i.test(panel.text);

/** A comic: three panels, an optional choice that must be picked, then an explicit button on. */
export function StoryComicView({ title, kicker, panels, name, choice, picked: saved, choiceNotes, note, goLabel, onGo, onBack, scene }: {
  title: string; kicker: string; panels: Panel[]; name: string | null;
  /** Film this comic as a short cartoon with its scene (the prologue and the openings of chapters 1 to 6). */ scene?: StoryScene;
  /** What each choice earns ("Bonus clue added!"), shown with the reply. */ choiceNotes?: [string, string];
  /** A detective note under the comic: the story remembering the child's guess. */ note?: string;
  choice?: [StoryChoice, StoryChoice]; /** The choice already made, when reading the comic again. */ picked?: 0 | 1; goLabel: string; onGo: (choice?: 0 | 1) => void; onBack: () => void;
}) {
  // Comics with a scene play as a cartoon (a mounted comic never switches between the two views).
  if (scene) return <CinematicComic scene={scene} title={title} kicker={kicker} panels={panels} name={name}
    choice={choice} picked={saved} choiceNotes={choiceNotes} note={note} goLabel={goLabel} onGo={onGo} onBack={onBack} />;
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
                <StoryCharacter id={panel.speaker} size={72} happy={panel.mood === 'happy'} worried={panel.mood === 'worried' || (!panel.mood && looksWorried(panel))} />
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
                  <span><b>{CHARACTERS[reply.speaker].name}:</b> {reply.text}
                    {choiceNotes && picked !== null && <em className="fq-story-reward" data-testid="story-choice-reward">{choiceNotes[picked]}</em>}</span>
                </p>
              )}
            </fieldset>
          )}
          {note && <p className="fq-story-note" data-testid="story-detective-note"><Search size={16} aria-hidden="true" /> {withName(note, name, theme)}</p>}
          <button type="button" className="fq-button fq-story-go" onClick={() => onGo(picked ?? undefined)} disabled={!!choice && picked === null} data-testid="button-story-go">
            {goLabel} <ArrowRight size={18} />
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

/** The quest at the top of the map: the stone filling in, and the way into the Storybook. */
export function StoneBanner({ completedUnits, onStorybook, town }: { completedUnits: Set<number>; onStorybook: () => void; /** The town map, under the stone. */ town?: ReactNode }) {
  return (
    <section className="fq-stone-banner" aria-labelledby="stone-title" data-testid="stone-banner">
      <div className="fq-stone-head">
        <h2 id="stone-title">The Whole Stone</h2>
        <span><strong>{completedUnits.size}/{STONE_PIECES}</strong> found</span>
        <button type="button" className="fq-storybook-button" onClick={onStorybook} data-testid="button-open-storybook">
          <BookOpen size={18} aria-hidden="true" /> Storybook
        </button>
      </div>
      <StoneBar found={completedUnits.size} />
      {town}
    </section>
  );
}

/** A chapter on the map: the story leads (friend, chapter title), with the unit's math underneath. The current
   chapter carries the hook and the one next step; a chapter not reached yet shows what opens it. */
export function ChapterBanner({ chapter, unitTitle, done, total, state, teaser, startLabel, startTestId, onStart, onRead }: {
  chapter: Chapter; unitTitle: string; done: number; total: number;
  state: 'current' | 'reached' | 'locked'; teaser?: string;
  startLabel?: string; startTestId?: string; onStart?: () => void; onRead: () => void;
}) {
  const theme = useStoryTheme();
  return (
    <div className={`fq-chapter-banner is-${state}`} data-testid={`chapter-banner-${chapter.unit}`}>
      <div className="fq-chapter-banner-head">
        <span className="fq-chapter-banner-art"><StoryCharacter id={chapter.character} size={72} happy={done === total} /></span>
        <div>
          <span className="fq-chapter-banner-kicker">Chapter {chapter.unit} · with {CHARACTERS[chapter.character].name}</span>
          <h3 id={`unit-${chapter.unit}`}>{chapter.title}</h3>
          <p>{unitTitle} · <span aria-label={`${done} of ${total} lessons mastered`}>{done}/{total} lessons</span></p>
        </div>
      </div>
      {state === 'current' && teaser && <p className="fq-chapter-banner-teaser" data-testid="stone-teaser">{withName(teaser, null, theme)}</p>}
      {state === 'current' && onStart && startLabel && (
        <button type="button" className="fq-button fq-chapter-banner-go" onClick={onStart} data-testid={startTestId}>
          {startLabel} <ArrowRight size={18} aria-hidden="true" />
        </button>
      )}
      {state === 'locked'
        ? <p className="fq-chapter-banner-lock"><LockKeyhole size={16} aria-hidden="true" /> {chapter.unit > 1 ? `Finish chapter ${chapter.unit - 1} to open this chapter` : 'Finish the lessons before this one to open it'}</p>
        : (
          <button type="button" className="fq-chapter-banner-read" onClick={onRead} data-testid={`button-read-chapter-${chapter.unit}-map`}>
            <BookOpen size={16} aria-hidden="true" /> Read chapter {chapter.unit}
          </button>
        )}
    </div>
  );
}

export type StorybookTab = 'story' | 'clues' | 'stickers' | 'cards';
export type StorybookChapter = {
  chapter: Chapter;
  /** A lesson of it is open (or done). */
  reached: boolean;
  lessons: { id: string; title: string; state: 'read' | 'new' | 'locked'; /** Finished: its sticker is earned. */ done: boolean }[];
  /** Every lesson is done: the chapter's ending (thanks, clue, what happens next) can be read. */
  ended: boolean;
};

/** Every story part in one place: the prologue, each chapter's comics, the finale; plus the clue notebook and
   the friends' cards. Parts open as the lessons do; nothing here changes progress. */
export function StorybookView({ tab, chapters, completedUnits, prologueSeen, focusUnit, name, choices, guesses, onTab, onPrologue, onLesson, onEnding, onEpilogue, onSuspects, onBack }: {
  tab: StorybookTab; chapters: StorybookChapter[]; completedUnits: Set<number>; prologueSeen: boolean; focusUnit?: number; name: string | null;
  /** The chapter choices made (unit → 0 or 1): looking closely gives a bonus clue, helping gives a thank-you sticker. */
  choices: Record<string, 0 | 1>;
  /** Suspect board guesses (board → suspect). */
  guesses: Record<string, string>;
  onTab: (tab: StorybookTab) => void; onPrologue: () => void; onLesson: (missionId: string) => void;
  onEnding: (unit: number) => void; onEpilogue: () => void; onSuspects: (board: SuspectBoard) => void; onBack: () => void;
}) {
  const theme = useStoryTheme();
  const tabs: [StorybookTab, string][] = [['story', 'Story'], ['clues', 'Clues'], ['stickers', 'Stickers'], ['cards', 'Cards']];
  const clues = CHAPTERS.filter((chapter) => completedUnits.has(chapter.unit));
  const nextClue = CHAPTERS.find((chapter) => !completedUnits.has(chapter.unit));
  const finale = completedUnits.size >= STONE_PIECES;
  const open = focusUnit ?? chapters.filter((item) => item.reached).at(-1)?.chapter.unit;
  const earnedStickers = chapters.reduce((sum, { chapter, lessons }) => sum + lessons.filter((lesson) => lesson.done).length + (earnsThanks(chapter, choices, completedUnits.has(chapter.unit)) ? 1 : 0), 0);
  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell">
        <TaskBar onBack={onBack} backLabel="Map" testId="button-storybook-back" title="Storybook" />
        <div className="fq-storybook-tabs" role="tablist" aria-label="Storybook sections">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => onTab(id)} data-testid={`tab-storybook-${id}`}>{label}</button>
          ))}
        </div>

        {tab === 'story' && (
          <div className="fq-storybook-sections" data-testid="storybook-story">
            <section aria-labelledby="storybook-beginning" data-testid="storybook-section-beginning">
              <h3 id="storybook-beginning" className="fq-storybook-heading">The beginning</h3>
              {/* Open any time: it is the story's start, not a spoiler (the first lesson still plays it until it is finished). */}
              <button type="button" className="fq-storybook-row" onClick={onPrologue} data-testid="button-storybook-prologue">
                <span className="fq-storybook-num">P</span>
                <span><strong>Prologue · The night the stone cracked</strong><small>{prologueSeen ? 'Read again' : 'Watch it now'}</small></span>
              </button>
            </section>
            <section aria-labelledby="storybook-chapters" data-testid="storybook-section-chapters">
              <h3 id="storybook-chapters" className="fq-storybook-heading">Chapters</h3>
              <ol className="fq-storybook-list">
                {chapters.map(({ chapter, reached, lessons, ended }) => reached ? (
                  <li key={chapter.unit}>
                    <details className="fq-storybook-chapter" open={chapter.unit === open} data-testid={`storybook-chapter-${chapter.unit}`}>
                      <summary>
                        <span className="fq-storybook-num">{chapter.unit}</span>
                        <span><strong>{chapter.title}</strong><small>With {CHARACTERS[chapter.character].name} · {ended ? 'Stone piece found' : `${lessons.filter((item) => item.state === 'read').length} of ${lessons.length} lessons`}</small></span>
                      </summary>
                      <ol>
                        {lessons.map((lesson, index) => (
                          <li key={lesson.id}>
                            <button type="button" className={`fq-storybook-part is-${lesson.state}`} disabled={lesson.state === 'locked'} onClick={() => onLesson(lesson.id)} data-testid={`button-storybook-part-${lesson.id}`}>
                              <span>{index === 0 ? 'Chapter start' : `Lesson ${index + 1}`} · {lesson.title}</span>
                              {lesson.state === 'new' && <em>New</em>}
                              {lesson.state === 'locked' && <LockKeyhole size={15} aria-label="Locked" />}
                            </button>
                          </li>
                        ))}
                        <li>
                          <button type="button" className={`fq-storybook-part ${ended ? 'is-read' : 'is-locked'}`} disabled={!ended} onClick={() => onEnding(chapter.unit)} data-testid={`button-storybook-end-${chapter.unit}`}>
                            <span>Chapter end · The stone piece and a clue</span>
                            {!ended && <LockKeyhole size={15} aria-label="Locked" />}
                          </button>
                        </li>
                      </ol>
                    </details>
                  </li>
                ) : (
                  <li key={chapter.unit}>
                    <div className="fq-storybook-row is-locked" data-testid={`storybook-chapter-${chapter.unit}`}>
                      <span className="fq-storybook-num">{chapter.unit}</span>
                      <span><strong>{chapter.title}</strong></span>
                      <LockKeyhole size={16} aria-label="Locked" />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section aria-labelledby="storybook-end" data-testid="storybook-section-end">
              <h3 id="storybook-end" className="fq-storybook-heading">The end</h3>
              <button type="button" className="fq-storybook-row" disabled={!finale} onClick={onEpilogue} data-testid="storybook-finale">
                <span className="fq-storybook-num">F</span>
                <span><strong>Finale · The stone is whole again</strong><small>{finale ? 'Read the ending' : 'Find all 15 pieces to read the ending'}</small></span>
                {!finale && <LockKeyhole size={16} aria-label="Locked" />}
              </button>
            </section>
          </div>
        )}

        {tab === 'clues' && (
          <div className="fq-storybook-clues" data-testid="clue-notebook">
            {clues.length === 0 && <p className="fq-storybook-empty">No clues yet. Who cracked the stone?</p>}
            {clues.map((chapter) => (
              <div key={chapter.unit} className="fq-storybook-clue-pair">
                <ClueCard chapter={chapter} name={name} theme={theme} />
                {choices[String(chapter.unit)] === 1 && bonusClue(chapter) && <ClueCard chapter={chapter} bonus name={name} theme={theme} />}
              </div>
            ))}
            {([1, 2] as SuspectBoard[]).filter((board) => completedUnits.has(BOARD_AFTER[board])).map((board) => (
              <button key={board} type="button" className="fq-button secondary fq-storybook-suspects" onClick={() => onSuspects(board)} data-testid={`button-storybook-suspects-${board}`}>
                <Search size={17} aria-hidden="true" /> Suspect board {board}{guesses[String(board)] ? ` · you guessed ${CHARACTERS[guesses[String(board)] as CharacterId]?.name ?? ''}` : ''}
              </button>
            ))}
            {nextClue && <p className="fq-storybook-empty">Finish chapter {nextClue.unit} to find the next clue.</p>}
          </div>
        )}

        {tab === 'stickers' && (
          <div className="fq-storybook-stickers" data-testid="sticker-book">
            <p className="fq-story-cards-note">Every lesson earns a sticker. Helping a friend earns a thank-you sticker. <strong>{earnedStickers} stickers</strong> collected.</p>
            {chapters.filter((item) => item.reached).map(({ chapter, lessons }) => (
              <section key={chapter.unit} className="fq-sticker-row" aria-label={`Chapter ${chapter.unit} stickers`}>
                <h3>Chapter {chapter.unit} · {chapter.title}</h3>
                <div className="fq-sticker-grid">
                  {lessons.map((lesson, index) => <StickerView key={lesson.id} sticker={lessonSticker(chapter, index, lesson.title)} earned={lesson.done} />)}
                  <StickerView sticker={thanksSticker(chapter)} earned={earnsThanks(chapter, choices, completedUnits.has(chapter.unit))} />
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'cards' && (
          <>
            <p className="fq-story-cards-note">Finish a chapter to meet its friend. <strong>{completedUnits.size} of {CHAPTERS.length}</strong> cards collected.</p>
            <div className="fq-story-cards" data-testid="story-cards">
              {CHAPTERS.map((chapter) => {
                const first = chapters.find((item) => item.chapter.unit === chapter.unit)?.lessons[0];
                return <StoryCard key={chapter.unit} chapter={chapter} unlocked={completedUnits.has(chapter.unit)} onRead={first ? () => onLesson(first.id) : undefined} />;
              })}
              {finale && <KeeperCard name={name} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/** After a lesson, in one compact box: the friend's line, what the story problem changed, the stone question and
   piece when the chapter is done, then the cliffhanger. */
export function StoryPayoff({ chapter, lessonIndex, lessonsTotal, chapterDone, piecesFound, name, problem, sticker, onSuspects }: {
  chapter: Chapter; lessonIndex: number; lessonsTotal: number; chapterDone: boolean; piecesFound: number; name: string | null;
  /** The sticker this lesson earned. */
  sticker?: Sticker;
  /** After chapters 4 and 7: open the suspect board. */
  onSuspects?: () => void;
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
          <div data-testid="stone-new-clue"><ClueCard chapter={chapter} name={name} theme={theme} fresh /></div>
          {finale ? <KeeperCard name={name} fresh compact /> : <StoryCard chapter={chapter} unlocked fresh compact />}
          {!finale && <p className="fq-story-cliff" data-testid="story-cliff">{tell(lessonCliff(chapter, lessonIndex, lessonsTotal))}</p>}
        </div>
      )}
      {chapterDone && stoneSolved && onSuspects && (
        <button type="button" className="fq-button fq-detective-go" onClick={onSuspects} data-testid="button-open-suspects">
          <Search size={18} aria-hidden="true" /> Detective time: who did it?
        </button>
      )}
      {sticker && (
        <div className="fq-sticker-earned" data-testid="sticker-earned">
          <StickerView sticker={sticker} fresh compact />
          <span><strong>New sticker!</strong> {sticker.label}. It’s in your Storybook.</span>
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
