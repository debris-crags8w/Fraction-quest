/* The detective quest around the lessons: picture clue cards (one per chapter, plus a bonus clue when the child
   chose to look for one), stickers (one per lesson, plus a thank-you sticker for helping), and the suspect board
   where the child guesses who cracked the Whole Stone. Nothing here changes lesson progress. */

import { useState, type ReactElement } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { StoryCharacter } from './characters';
import { TaskBar } from './TaskBar';
import { LearningListenButton } from './LearningText';
import { BOARD_AFTER, BOARD_CASES, CHAPTERS, CHARACTERS, SUSPECTS, SUSPECT_BOARDS, bonusClue, suspectReply, withName, type Chapter, type CharacterId, type PropTheme, type SuspectBoard } from './story';

export { BOARD_AFTER, SUSPECT_BOARDS, bonusClue, suspectReply, type SuspectBoard };

const INK = '#2B2D42';

/** The clue's picture. */
export function ClueArt({ unit, size = 52 }: { unit: number; size?: number }) {
  const art: Record<number, ReactElement> = {
    1: <><ellipse cx="18" cy="34" rx="8" ry="11" fill="#8D6E63" /><ellipse cx="34" cy="22" rx="8" ry="11" fill="#8D6E63" />{[12, 18, 24].map((x) => <circle key={x} cx={x} cy="20" r="2.6" fill="#8D6E63" />)}{[28, 34, 40].map((x) => <circle key={x} cx={x} cy="8" r="2.6" fill="#8D6E63" />)}</>,
    2: <><path d="M6 40 Q18 10 30 26 T50 12" stroke="#4CAF50" strokeWidth="9" fill="none" strokeLinecap="round" /><path d="M8 46 h40" stroke="#4FC3F7" strokeWidth="4" strokeLinecap="round" /></>,
    3: <><rect x="8" y="10" width="40" height="22" rx="3" fill="#D7B98E" stroke={INK} strokeWidth="2" /><path d="M26 32 v16" stroke={INK} strokeWidth="3" /><path d="M14 14 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6" stroke={INK} strokeWidth="2.4" fill="none" /></>,
    4: <><rect x="4" y="22" width="48" height="12" rx="2" fill="#B98552" stroke={INK} strokeWidth="2" /><path d="M14 22 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6" stroke={INK} strokeWidth="2.4" fill="none" /></>,
    5: <><path d="M14 12 h12 v22 h10 a6 6 0 0 1 6 6 v4 H14 Z" fill="#FF8A65" stroke={INK} strokeWidth="2" /><path d="M20 44 l-4 8 M32 44 l0 8 M42 44 l4 8" stroke="#FFC800" strokeWidth="3" strokeLinecap="round" /></>,
    6: <><path d="M6 12 l14 -4 l16 4 l14 -4 v34 l-14 4 l-16 -4 l-14 4 Z" fill="#FFF3C4" stroke={INK} strokeWidth="2" /><path d="M12 36 q10 -16 20 -6 t14 -12" stroke="#E53935" strokeWidth="2.4" strokeDasharray="3 3" fill="none" /><path d="M40 16 l4 4 m0 -4 l-4 4" stroke="#E53935" strokeWidth="2.6" /></>,
    7: <><rect x="6" y="30" width="44" height="6" fill="#8D6E63" /><path d="M10 36 v12 M46 36 v12" stroke="#8D6E63" strokeWidth="4" /><rect x="16" y="14" width="24" height="10" rx="2" fill="#fff" stroke={INK} strokeWidth="2" strokeDasharray="3 2" /><text x="28" y="22" textAnchor="middle" fontSize="6" fontWeight="800" fill={INK}>BOOTS</text></>,
    8: <path d="M28 46 C8 32 6 18 16 12 c6 -4 12 0 12 6 c0 -6 6 -10 12 -6 c10 6 8 20 -12 34z" fill="#FF6B8B" stroke={INK} strokeWidth="2" />,
    9: <><path d="M28 6 l18 10 v20 l-18 10 l-18 -10 v-20 Z" fill="#A8B4C8" stroke={INK} strokeWidth="2" /><circle cx="28" cy="26" r="7" fill="#fff" stroke={INK} strokeWidth="2" /></>,
    10: <><rect x="10" y="8" width="36" height="40" rx="3" fill="#FFFDE7" stroke={INK} strokeWidth="2" /><path d="M16 18 h24 M16 26 h24 M16 34 h14" stroke="#90A4AE" strokeWidth="2.4" /><text x="40" y="44" textAnchor="end" fontSize="9" fontWeight="900" fill={INK}>B</text></>,
    11: <><path d="M8 10 h40 v26 h-24 l-10 10 v-10 h-6 Z" fill="#E3F2FD" stroke={INK} strokeWidth="2" /><path d="M18 22 l6 6 l12 -12" stroke="#43A047" strokeWidth="4" fill="none" strokeLinecap="round" /></>,
    12: <><rect x="4" y="30" width="48" height="10" fill="#8D6E63" stroke={INK} strokeWidth="2" /><path d="M6 30 L28 10 L50 30" fill="#FFCDD2" stroke={INK} strokeWidth="2" /><circle cx="28" cy="22" r="3" fill="#FFC800" /></>,
    13: <><rect x="14" y="24" width="28" height="22" rx="4" fill="#FFC800" stroke={INK} strokeWidth="2" /><path d="M20 24 v-6 a8 8 0 0 1 16 0 v6" stroke={INK} strokeWidth="3" fill="none" /><circle cx="28" cy="34" r="3" fill={INK} /></>,
    14: <><rect x="10" y="20" width="36" height="26" rx="3" fill="#E1F5FE" stroke={INK} strokeWidth="2" /><path d="M10 20 L20 8 h26 l-10 12" fill="#B3E5FC" stroke={INK} strokeWidth="2" /><path d="M20 34 h16" stroke="#FFC800" strokeWidth="4" strokeLinecap="round" /></>,
    15: <path d="M28 4 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2z" fill="#FFC800" stroke={INK} strokeWidth="2" />,
  };
  return <svg className="fq-clue-art" width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">{art[unit] ?? art[15]}</svg>;
}

/** One clue on a card: its picture, where it was found and what it says. */
export function ClueCard({ chapter, bonus = false, name = null, theme = 'everyday', fresh = false, compact = false }: { chapter: Chapter; bonus?: boolean; name?: string | null; theme?: PropTheme; fresh?: boolean; /** Small, for the suspect board. */ compact?: boolean }) {
  const text = bonus ? bonusClue(chapter) ?? '' : chapter.clue;
  return (
    <div className={`fq-clue-card ${bonus ? 'is-bonus' : ''} ${fresh ? 'is-fresh' : ''} ${compact ? 'is-compact' : ''}`} data-testid={`clue-card-${chapter.unit}${bonus ? '-bonus' : ''}`}>
      <ClueArt unit={chapter.unit} size={compact ? 30 : 48} />
      <span>
        <small>{bonus ? (compact ? 'Bonus clue' : `Bonus clue · you looked closely in chapter ${chapter.unit}`) : compact ? `Chapter ${chapter.unit}` : `Clue · chapter ${chapter.unit}`}</small>
        <strong>{withName(text, name, theme)}</strong>
      </span>
    </div>
  );
}

/* ---------- stickers ---------- */

const STICKER_COLORS = ['#FF6B6B', '#FFC800', '#58CC02', '#1CB0F6', '#9B5CFF', '#FF9F43', '#00B8A9', '#F368E0', '#54A0FF'];

/** The chapter's sticker picture (a pie slice for the bakery, a lily pad for the pond…), in the lesson's color. */
export function StickerArt({ unit, color, size = 56 }: { unit: number; color: string; size?: number }) {
  const art: Record<number, ReactElement> = {
    1: <path d="M28 28 L28 6 A22 22 0 0 1 47 39 Z" fill={color} stroke={INK} strokeWidth="2.4" />,
    2: <><circle cx="28" cy="30" r="18" fill={color} stroke={INK} strokeWidth="2.4" /><path d="M28 30 L28 12" stroke={INK} strokeWidth="2.4" /><circle cx="36" cy="22" r="4" fill="#FF8FA8" /></>,
    3: <><path d="M6 46 L28 14 L50 46 Z" fill={color} stroke={INK} strokeWidth="2.4" /><path d="M28 14 v-8 l10 3 l-10 3" fill="#FFC800" stroke={INK} strokeWidth="2" /></>,
    4: <><rect x="6" y="22" width="44" height="12" rx="3" fill={color} stroke={INK} strokeWidth="2.4" /><circle cx="12" cy="28" r="2" fill={INK} /><circle cx="44" cy="28" r="2" fill={INK} /></>,
    5: <><path d="M14 26 h28 l-4 22 h-20 Z" fill={color} stroke={INK} strokeWidth="2.4" /><path d="M14 26 q14 -20 28 0" fill="#fff" stroke={INK} strokeWidth="2.4" /></>,
    6: <><rect x="14" y="16" width="28" height="32" rx="6" fill={color} stroke={INK} strokeWidth="2.4" /><rect x="12" y="10" width="32" height="8" rx="3" fill="#8D6E63" stroke={INK} strokeWidth="2" /></>,
    7: <><circle cx="28" cy="28" r="14" fill={color} stroke={INK} strokeWidth="2.4" strokeDasharray="6 3" /><circle cx="28" cy="28" r="5" fill="#fff" stroke={INK} strokeWidth="2" /></>,
    8: <><rect x="16" y="16" width="24" height="32" rx="5" fill={color} stroke={INK} strokeWidth="2.4" /><rect x="14" y="10" width="28" height="8" rx="2" fill="#B0BEC5" stroke={INK} strokeWidth="2" /></>,
    9: <><path d="M28 50 C14 32 14 24 14 22 a14 14 0 0 1 28 0 c0 2 0 10 -14 28z" fill={color} stroke={INK} strokeWidth="2.4" /><circle cx="28" cy="22" r="5" fill="#fff" /></>,
    10: <><path d="M8 40 L28 12 L48 40 Z" fill="#FFE0B2" stroke={INK} strokeWidth="2.4" /><path d="M14 34 h28" stroke={color} strokeWidth="6" /></>,
    11: <><rect x="10" y="14" width="36" height="28" rx="6" fill={color} stroke={INK} strokeWidth="2.4" /><circle cx="22" cy="28" r="4" fill="#fff" /><circle cx="34" cy="28" r="4" fill="#fff" /></>,
    12: <><rect x="4" y="20" width="48" height="14" rx="2" fill={color} stroke={INK} strokeWidth="2.4" />{[10, 16, 22, 28, 34, 40, 46].map((x, i) => <path key={x} d={`M${x} 20 v${i % 2 ? 4 : 7}`} stroke={INK} strokeWidth="2" />)}</>,
    13: <>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={28 + 11 * Math.cos((a * Math.PI) / 180)} cy={28 + 11 * Math.sin((a * Math.PI) / 180)} r="8" fill={color} stroke={INK} strokeWidth="2" />)}<circle cx="28" cy="28" r="6" fill="#FFC800" stroke={INK} strokeWidth="2" /></>,
    14: <><circle cx="28" cy="28" r="18" fill={color} stroke={INK} strokeWidth="2.4" /><path d="M28 28 L28 14" stroke={INK} strokeWidth="3" strokeLinecap="round" /><circle cx="28" cy="28" r="3" fill={INK} /></>,
    15: <path d="M28 4 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2z" fill={color} stroke={INK} strokeWidth="2.4" />,
  };
  return <svg className="fq-sticker-art" width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">{art[unit] ?? art[15]}</svg>;
}

export type Sticker = { id: string; unit: number; label: string; color: string; character?: CharacterId };

/** Lesson `index` of a chapter's sticker. */
export function lessonSticker(chapter: Chapter, index: number, lessonTitle: string): Sticker {
  return { id: `lesson-${chapter.unit}-${index + 1}`, unit: chapter.unit, label: lessonTitle, color: STICKER_COLORS[(chapter.unit + index) % STICKER_COLORS.length] };
}
/** The thank-you sticker for helping the chapter friend (the first chapter choice). */
export function thanksSticker(chapter: Chapter): Sticker {
  return { id: `thanks-${chapter.unit}`, unit: chapter.unit, label: `${CHARACTERS[chapter.character].name} says thank you`, color: '#FF6B8B', character: chapter.character };
}

/** The thank-you sticker: straight away for helping the friend (the first choice, or any choice in a chapter
   without a bonus clue); a child who chose to look for the clue gets it when the chapter is finished. */
export const earnsThanks = (chapter: Chapter, choices: Record<string, 0 | 1>, chapterDone = false) => {
  const choice = choices[String(chapter.unit)];
  return choice === 0 || (choice === 1 && !bonusClue(chapter)) || (choice !== undefined && chapterDone);
};

export function StickerView({ sticker, earned = true, fresh = false, compact = false }: { sticker: Sticker; earned?: boolean; fresh?: boolean; /** Just the sticker, no caption. */ compact?: boolean }) {
  return (
    <figure className={`fq-sticker ${earned ? '' : 'is-locked'} ${fresh ? 'is-fresh' : ''} ${compact ? 'is-compact' : ''}`} data-testid={`sticker-${sticker.id}`}>
      <span className="fq-sticker-face">
        {!earned ? <span aria-hidden="true">?</span> : sticker.character ? <StoryCharacter id={sticker.character} size={46} happy /> : <StickerArt unit={sticker.unit} color={sticker.color} size={46} />}
      </span>
      {!compact && <figcaption>{earned ? sticker.label : sticker.character ? 'Help a friend' : 'Not yet'}</figcaption>}
    </figure>
  );
}

/* ---------- the suspect board ---------- */


/** "Who cracked the stone?": the clues found so far as picture cards, then a guess. The guess is saved and the
   story remembers it when the truth comes out. */
export function SuspectBoardView({ board, choices, saved, name, theme, onGuess, onBack }: {
  board: SuspectBoard; choices: Record<string, 0 | 1>; saved?: CharacterId; name: string | null; theme: PropTheme;
  onGuess: (suspect: CharacterId) => void; onBack: () => void;
}) {
  const [picked, setPicked] = useState<CharacterId | null>(saved ?? null);
  const [answered, setAnswered] = useState<CharacterId | null>(saved ?? null);
  const story = BOARD_CASES[board];
  // The "who cracked it" boards show the notebook's clue cards; a later board shows its own chapter's clues.
  const chapters = story ? [] : CHAPTERS.filter((chapter) => chapter.unit <= BOARD_AFTER[board]);
  const reply = answered ? suspectReply(board, answered) : null;
  return (
    <div className="fq-app fq-story-app">
      <main className="fq-shell fq-story-shell">
        <TaskBar onBack={onBack} backLabel="Back" testId="button-suspects-back" title="Detective time" />
        <section className="fq-suspect-board" aria-labelledby="suspect-title" data-testid="suspect-board">
          <h2 id="suspect-title"><Search size={20} aria-hidden="true" /> {story?.question ?? 'Who cracked the Whole Stone?'}</h2>
          <p>Look at your clues. Then pick who you think did it.</p>
          <div className="fq-suspect-clues" data-testid="suspect-clues">
            {chapters.map((chapter) => <ClueCard key={chapter.unit} chapter={chapter} name={name} theme={theme} compact />)}
            {chapters.filter((chapter) => choices[String(chapter.unit)] === 1 && bonusClue(chapter)).map((chapter) => <ClueCard key={`b${chapter.unit}`} chapter={chapter} bonus name={name} theme={theme} compact />)}
            {story?.clues.map((clue) => <p key={clue.text} className="fq-suspect-clue" data-testid="suspect-clue"><Search size={16} aria-hidden="true" /> {withName(clue.text, name, theme)}</p>)}
          </div>
          <div className="fq-suspects" role="radiogroup" aria-label="Suspects">
            {SUSPECTS[board].map((id) => (
              <button key={id} type="button" role="radio" aria-checked={picked === id} className={picked === id ? 'on' : ''}
                onClick={() => { setPicked(id); setAnswered(null); }} data-testid={`button-suspect-${id}`}>
                <StoryCharacter id={id} size={52} worried={picked === id} />
                <span>{CHARACTERS[id].name}</span>
              </button>
            ))}
          </div>
          {reply && answered ? (
            <div className={`fq-suspect-reply ${reply.good ? 'is-good' : ''}`} role="status" data-testid="suspect-reply">
              <StoryCharacter id="hoot" size={48} />
              <p>{reply.text}</p>
              <LearningListenButton text={reply.text} label="Listen to Hoot" />
            </div>
          ) : (
            <button type="button" className="fq-button fq-suspect-go" disabled={!picked} onClick={() => { if (picked) { setAnswered(picked); onGuess(picked); } }} data-testid="button-suspect-guess">
              {picked ? `I think it was ${CHARACTERS[picked].name}` : 'Pick a suspect'} <ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
          {reply && <button type="button" className="fq-button secondary" onClick={onBack} data-testid="button-suspects-done">Keep investigating</button>}
        </section>
      </main>
    </div>
  );
}

/* ---------- the town map ---------- */

const PLACES = ['Bakery', 'Pond', 'Hill', 'Bridge', 'Tower', 'Honey shop', 'Workshop', 'Den', 'Race track', 'Picnic', 'Machine', 'Stage', 'Garden', 'Glass case', 'Town square'];
/** Where each chapter's place sits on the town map, along one winding road (percent of the map). */
const PLACE_AT: [number, number][] = [
  [9, 22], [28, 18], [47, 22], [66, 18], [88, 24],
  [86, 52], [67, 56], [48, 52], [29, 56], [10, 54],
  [11, 84], [30, 86], [49, 82], [68, 86], [89, 82],
];

/** The town, with a place for every chapter: lit once its stone piece is home, glowing where the story is now.
   Tapping a place you have reached opens that chapter in the Storybook. */
export function TownMap({ completedUnits, reachedUnits, currentUnit, onPlace }: {
  completedUnits: Set<number>; reachedUnits: Set<number>; currentUnit?: number; onPlace: (unit: number) => void;
}) {
  const road = PLACE_AT.map(([x, y], index) => `${index ? 'L' : 'M'}${x * 3.4} ${y * 1.8}`).join(' ');
  return (
    <div className="fq-town" data-testid="town-map">
      <svg className="fq-town-ground" viewBox="0 0 340 180" preserveAspectRatio="none" aria-hidden="true">
        <path d={road} stroke="#C9B48A" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={road} stroke="#F3E6C4" strokeWidth="3" fill="none" strokeDasharray="5 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {CHAPTERS.map((chapter, index) => {
        const found = completedUnits.has(chapter.unit);
        const reached = reachedUnits.has(chapter.unit);
        const here = chapter.unit === currentUnit;
        const [x, y] = PLACE_AT[index];
        return (
          <button key={chapter.unit} type="button" className={`fq-town-place ${found ? 'is-found' : ''} ${here ? 'is-here' : ''} ${reached ? '' : 'is-locked'}`}
            style={{ left: `${x}%`, top: `${y}%` }} disabled={!reached} onClick={() => onPlace(chapter.unit)}
            aria-label={`Chapter ${chapter.unit}, ${PLACES[index]}: ${found ? 'stone piece found' : here ? 'the story is here now' : reached ? 'open' : 'not reached yet'}`}
            data-testid={`town-place-${chapter.unit}`}>
            {here ? <StoryCharacter id={chapter.character} size={34} worried /> : <StickerArt unit={chapter.unit} color={found ? '#FFC800' : reached ? '#FFFFFF' : '#B9B6CF'} size={26} />}
            {here && <span className={`fq-town-you ${x > 75 ? 'is-right' : x < 25 ? 'is-left' : ''}`} aria-hidden="true">{PLACES[index]}</span>}
          </button>
        );
      })}
    </div>
  );
}
