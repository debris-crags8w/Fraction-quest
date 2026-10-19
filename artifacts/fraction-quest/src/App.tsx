import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, Check, ClipboardCheck, Code2, Compass, Dumbbell, Flame, Lightbulb, Map as MapIcon, RotateCcw, Sparkles, Star, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { MathText } from './MathText';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  completeMission,
  completeSkillReview,
  countsTowardLessonStars,
  deferSkillReview,
  getDelayedReviewQuestions,
  getDueSkillReviewQuestions,
  getMission,
  getDueSkillReviewCount,
  getNextMission,
  isCorrectAnswer,
  isMissionUnlocked,
  loadProgress,
  FRACTION_ORDER_ROUNDS,
  MISSIONS,
  numberLineWholeCount,
  recordMissedSkill,
  resetProgress as resetSavedProgress,
  sameFractionValue,
  saveProgress,
  setModelLayout,
  starsFromFirstTryAnswers,
  type Answer,
  type Mission,
  type ModelSpec,
  type PracticeQuestion,
  type Progress,
} from './game';
import { createDeveloperLessonProgress } from './developer-test';
import { BOARD_AFTER, SuspectBoardView, TownMap, lessonSticker, thanksSticker, type SuspectBoard } from './quest';
import { DeveloperChip } from './DeveloperTesting';
import { saveAssessmentAttempt } from './assessments';
import type { AssessmentDefinition } from './assessments';
import NotFound from '@/pages/not-found';
import LearningLab, { RedoLab } from './LearningLab';
import { useLessonHelper } from './model-intro';
import { LearningListenButton, LearningText, LearningTextSection, prefetchReading, primeReadAloud, sectionsScript, useReadAloud } from './LearningText';
import { numberLineDescription } from './lab-copy';
import { CHAPTER_SCENES, filmedLines } from './story-cinema';
import './learning-text.css';
import { PieFraction, TickLabel } from './fraction-ui';
import { getWorksheet } from './learning-content';
import { getLearningRecord, hasLearningGate, lessonSteps, learningSummary, requiredBuildChecks, resetUnitLearningProgress, worksheetCount, startRedo, updateLearning, type RedoPart } from './learning';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { trackEvent } from './lib/analytics';
import { DAILY_GOAL, loadFun, playCue, playHaptic, recordCodeLevel, recordCorrect, recordMinute, recordRace, recordSeasonLesson, recordStory, recordSprint, recordWorksheetCorrect, resetFun, resetMissionGameProgress, shownStreak, setBreakPreferences, setDisplayPreferences, setFunStorageEnabled, setSound, type FunState } from './lib/fun';
import { summarizeCodeProgress } from './code-progress';
import { CODE_LEVEL_COUNT } from './code-quest';
import { ModelTag, SetSvg, WholeBracket } from './models';
import { SeasonPointsIcon, Confetti, DailyRing, denomColor, FunContext, Hoot, LessonPath, Mascot, SeasonBanner, SeasonReward, SeasonSay, StoryPrompt, TapModel, unitColor, useFun, useSeason, type PathNode } from './fun-ui';
import { activeSeason } from './seasons';
import { CHAPTERS, EPILOGUE, HANDS_ON_ASKS, PROLOGUE, chapterEnd, chapterFor, choiceNotes, detectiveNote, type CharacterId, lessonComic, propTheme, storyProblemFor, storyScript, withName, type PropTheme } from './story';
import { ChapterBanner, PrologueCard, StoneBanner, StorybookView, StoryComicView, StoryPayoff, StorySay, type StorybookChapter, type StorybookTab } from './story-ui';
import { LanternIcon } from './riddle-ui';
import { retryOpener, wrongChoiceReason } from './wrong-answer';
import { useRevealWhen } from './lib/reveal';
import PaperCheck from './PaperCheck';
import Challenge from './Challenge';
import { freshSeed, generateQuestions, getExtraPractice, hasGenerator } from './practice-bank';
import { CHALLENGES, challengeMaxPoints } from './challenges';
import { PrintMenu } from './Printables';
import { PaperFold } from './PaperFold';
import { AreaSvg, SameSizeIdea, SHAPE_LESSONS } from './AreaModel';
import ParentView from './ParentView';
import FractionRace from './FractionRace';
import CodeQuest from './CodeQuest';
import PlacementQuiz from './PlacementQuiz';
import { applyPlacement } from './placement';
import { AccountGate, useAccount, useAccountSync } from './account';
import LoginPage from './LoginPage';
import { getRouterBasePath } from './app-routing';
import DailyPractice from './DailyPractice';
import { applyAdaptiveDailyPracticeUpdate, createDailyPractice, dailyPracticeDay, recordDailyPracticeStart } from './daily-practice';
import PartFinder from './PartFinder';
import FractionSortActivity from './FractionSortActivity';
import { AssessmentHub, AssessmentRunner } from './Assessment';
import { PART_FINDER_LESSONS, partFinderRoundsFor } from './part-finder';
import ConceptGames, { type LessonGame } from './ConceptGames';
import { BrainBreakOffer } from './BrainBreakOffer';
import { downloadWholeVoicePack, naturalVoiceId, warmUpNaturalVoice } from './lib/natural-voice';
import { appShell, onAppShellChange } from './lib/app-shell';
import { StatTip } from './StatTip';
import { AppMenu } from './AppMenu';
const queryClient = new QueryClient();

type View =
  | { type: 'map' }
  | { type: 'play'; missionId: string; questionIndex: number; firstTryAnswers: number; reviewQuestions: PracticeQuestion[]; showExample?: boolean }
  | { type: 'review'; questionIndex: number; reviewQuestions: PracticeQuestion[] }
  | { type: 'review-complete'; reviewedCount: number }
  | { type: 'daily' }
  | { type: 'concept-games' }
  | { type: 'assessments' }
  | { type: 'assessment'; definition: AssessmentDefinition; seed: number }
  | { type: 'reward'; missionId: string; stars: number }
  /** The story comic before a lesson starts. */
  | { type: 'story'; missionId: string; /** The one-time opening before the first lesson. */ prologue?: boolean; /** Reading a finished lesson's comic again: where it was opened from, to go back there. */ replay?: 'map' | 'storybook';
    /** From the Storybook: a finished chapter's ending, or the epilogue after the last chapter. */
    part?: 'end' | 'epilogue' }
  /** Every story part to read again, the clue notebook and the friends' cards. */
  | { type: 'storybook'; tab: StorybookTab; unit?: number }
  /** "Who cracked the stone?" after chapters 4 and 7 (opened from the lesson's payoff or the Storybook). */
  | { type: 'suspects'; board: SuspectBoard; from: 'reward' | 'storybook' }
  /** The lesson's hands-on cake rounds (Part Finder), between the worked example and the questions. */
  | { type: 'hands-on'; missionId: string; reviewQuestions: PracticeQuestion[] }
  /** Local card arrangement before scored questions; it does not save lesson evidence. */
  | { type: 'fraction-sort'; missionId: string; reviewQuestions: PracticeQuestion[] };
type LabView = { type: 'lab'; missionId: string; stars: number };
type PaperView = { type: 'paper'; missionId: string; /** Opened from the lesson lab: Back returns there. */ fromLab?: boolean };
type RedoView = { type: 'redo'; missionId: string };
type ChallengeView = { type: 'challenge'; unit: number };
type ParentPage = { type: 'parent' };
type GameView = { type: 'race' | 'code'; missionId: string; /** Opened from the Games menu: go back there. */ fromGames?: boolean };
type PlacementView = { type: 'placement' };
// seed 0 = the fixed 12 "Practice more" questions; any other seed = freshly generated questions.
type ExtraView = { type: 'extra'; missionId: string; seed: number; questionIndex: number; firstTry: number } | { type: 'extra-done'; missionId: string; seed: number; firstTry: number; total: number };
const FRESH_ROUND = 10;
const worksheetLength = (missionId: string) => getWorksheet(missionId).length;
/** Paper answers count once the lesson's worked example, hands-on step and questions are done in the app,
    so paper never skips the order: see it, try it, then the worksheet. */
const paperCheckOpen = (progress: Progress, missionId: string) =>
  progress.completedMissionIds.includes(missionId) || !!progress.learning?.[missionId]?.practiceDone;

/** Extra bank questions mixed into a lesson's own practice (the full bank is in "Practice more"). */
const EXTRA_IN_LESSON = 4;
type RetentionView = { type: 'retention'; missionId: string; startedAt: number; nextView: View };

type UnitInfo = { title: string; subtitle: string };
const UNIT_INFO: UnitInfo[] = [
  { title: 'Meet fractions', subtitle: 'Fair shares, fraction names, and unit fractions' },
  { title: 'Fractions in groups', subtitle: 'Find equal shares and parts of collections' },
  { title: 'Size and landmarks', subtitle: 'Estimate with zero, one-half, and one whole' },
  { title: 'Fraction number lines', subtitle: 'Mark equal jumps, including past one' },
  { title: 'Compare and order', subtitle: 'Use equal pieces and benchmarks to reason' },
  { title: 'Equivalent fractions', subtitle: 'Rename an amount without changing its size' },
  { title: 'Put fractions together', subtitle: 'Compose, decompose, and go beyond one' },
  { title: 'Operations and decimals', subtitle: 'Add, subtract, and connect fractions to decimals' },
  { title: 'Rename and compare', subtitle: 'Grades 3–5 · Whole numbers as fractions and equivalent names' },
  { title: 'Mixed numbers and amounts', subtitle: 'Grades 4–5 · Unlike denominators, mixed numbers, and estimates' },
  { title: 'Multiply and divide', subtitle: 'Grades 4–5 · Unit fractions, scaling, multiplication, and sharing' },
  { title: 'Fractions in measurement', subtitle: 'Grades 3–5 · Rulers, line plots, conversions, and stories' },
  { title: 'Fraction models in context', subtitle: 'Grade 3 and 5 · Equal-area shapes and fractional-side area; chance is bonus' },
  { title: 'Fractions and decimals', subtitle: 'Grades 4–5 · Decimal comparison; percent is bonus' },
  { title: 'Problem solving', subtitle: 'Grades 4–5 · Find the whole, spot the mistake, fraction of the rest; dividing fractions is bonus' },
];

// Folding paper lives in the equivalence lesson only, where folding again shows 1/2 = 2/4 = 4/8.
const FOLD_LESSONS: Record<string, { intro: string; allowThirds?: boolean; shadeHalf?: boolean }> = {
  'equivalent-models': { intro: 'Half the paper is shaded. Fold it again and unfold: 1/2 = 2/4 = 4/8.', allowThirds: false, shadeHalf: true },
};

const UNIT_TITLES = UNIT_INFO.map((unit) => unit.title);
/** Units whose every lesson is done: each one returns a piece of the Whole Stone. */
/** Story mode: on a lesson's first question the chapter friend asks for this lesson's help (the comic's scene). */
const lessonAsk = (mission: Mission) => {
  const chapter = chapterFor(mission.unit);
  if (!chapter) return undefined;
  const index = MISSIONS.filter((item) => item.unit === mission.unit).findIndex((item) => item.id === mission.id);
  return index > 0 ? chapter.scenes[index - 1] ?? chapter.scenes[chapter.scenes.length - 1] : chapter.asks[0];
};
/** Story mode: the four friends sharing in a hands-on lesson are the chapter friend, Numi, Hoot and one more friend. */
const storyCast = (chapter: { character: string }) => {
  const friend = CHARACTER_NAMES[chapter.character] ?? 'Chomp';
  return [friend, 'Numi', 'Hoot', friend === 'Pip' ? 'Chomp' : 'Pip'];
};
const CHARACTER_NAMES: Record<string, string> = { chomp: 'Chomp', pip: 'Pip', tilly: 'Tilly', bolt: 'Bolt', bea: 'Bea' };

const completedStoryUnits = (progress: Progress) =>
  new Set(CHAPTERS.map((chapter) => chapter.unit).filter((unit) => MISSIONS.filter((item) => item.unit === unit).every((item) => hasLearningGate(progress, item.id))));

function getUnitResetPreview(progress: Progress, fun: FunState, unit: number) {
  const missions = MISSIONS.filter((mission) => mission.unit === unit);
  const missionIds = new Set(missions.map((mission) => mission.id));
  const lessons = missions.map((mission) => {
    const record = progress.learning?.[mission.id];
    const reviewCount = progress.reviewQueue.filter((review) => review.missionId === mission.id).length;
    const gameResults = [
      fun.raceBest?.[mission.id] !== undefined || fun.robotBeaten?.[mission.id] !== undefined ? 'Fraction Race' : null,
      fun.codeLevels?.[mission.id] !== undefined ? 'Code Quest' : null,
      fun.sprintBest?.[mission.id] !== undefined ? 'Code Sprint' : null,
    ].filter((label): label is string => label !== null);
    const hasSavedLessonWork = !!record && (
      !!record.practiceDone || typeof record.completedAt === 'number' || typeof record.confirmedAt === 'number'
      || record.helpUses > 0 || Object.keys(record.checks ?? {}).length > 0
      || Object.keys(record.worksheet ?? {}).length > 0 || Object.keys(record.misconceptions ?? {}).length > 0
      || !!record.redo || (record.redoRounds ?? 0) > 0 || (record.redosFinished ?? 0) > 0
    );
    const activity = [
      progress.completedMissionIds.includes(mission.id) ? 'completed lesson' : null,
      progress.starsByMission[mission.id] !== undefined ? `${progress.starsByMission[mission.id]} stars` : null,
      hasSavedLessonWork ? 'saved answers, builds, and lesson evidence' : null,
      reviewCount ? `${reviewCount} saved skill ${reviewCount === 1 ? 'review' : 'reviews'}` : null,
      gameResults.length ? `${gameResults.join(', ')} results` : null,
    ].filter((label): label is string => label !== null);
    return { id: mission.id, title: mission.title, activity };
  });
  const dailyTopics = progress.dailyPractice?.questions
    .filter((question) => missionIds.has(question.missionId))
    .map((question) => question.topicTitle) ?? [];
  const challengeBest = progress.challengeBest?.[String(unit)];
  return { lessons, dailyTopics, challengeBest };
}

function Fraction({ numerator, denominator }: { numerator: number; denominator: number }) {
  return (
    <span className="fq-fraction" aria-label={`${numerator} over ${denominator}`}>
      <span>{numerator}</span><span className="slash" /><span>{denominator}</span>
    </span>
  );
}

/** `quiet`: practice pictures where the fraction is the answer. Screen readers then hear only "a bar model",
    not the fraction (sighted children count the parts themselves). */
/** `guide`: after a compare question, a dashed line at this point of the whole (0–1), drawn through every bar,
    so kids see which amount reaches further. */
/** `walk`: after a miss, count along the picture: 1, 2, 3… pops onto each part (from part `start`), then the
    shaded parts glow. A new number replays it. */
/** `gutter`: another bar in the same picture has a label, so this one keeps an empty label-width space and every
    whole stays the same length (a shorter whole would make its fraction look smaller). */
function FractionBar({ numerator, denominator, quiet = false, label = false, gutter = false, guide, walk = null, start = 0 }: { numerator: number; denominator: number; quiet?: boolean; label?: boolean; gutter?: boolean; guide?: number; walk?: number | null; start?: number }) {
  const total = Math.max(1, Math.ceil(numerator / denominator)) * denominator;
  return (
    <div className="fq-bar-model-labelled" style={{ '--piece': denomColor(denominator) } as CSSProperties}>
    {label
      ? <span className="fq-bar-label" data-testid="bar-fraction-label"><Fraction numerator={numerator} denominator={denominator} /></span>
      : gutter && <span className="fq-bar-label is-blank" aria-hidden="true" />}
    <div key={walk ?? 'still'} className={`fq-bar-model ${walk !== null ? 'fq-walking' : ''}`} style={{ '--pieces': denominator, '--piece': denomColor(denominator), '--start': start, '--count': start + total } as CSSProperties} role="img" aria-label={quiet ? 'A bar model. Count the equal parts and the shaded parts.' : `${numerator} over ${denominator}: each whole is split into ${denominator} equal parts, with ${numerator} parts shaded`}>
      {Array.from({ length: Math.max(1, Math.ceil(numerator / denominator)) }, (_, whole) => (
        <div className="fq-bar-whole" key={whole}>
          <div className="fq-bar">
            {guide !== undefined && whole === 0 && <i className="fq-compare-guide" style={{ left: `${guide * 100}%` }} aria-hidden="true" data-testid="compare-guide" />}
            {Array.from({ length: denominator }, (_, index) => (
              <span className={whole * denominator + index < numerator ? '' : 'empty'} style={{ '--i': whole * denominator + index } as CSSProperties} key={index}>
                {walk !== null && <b className="fq-count-badge" aria-hidden="true">{index + 1}</b>}
              </span>
            ))}
          </div>
          <WholeBracket />
        </div>
      ))}
    </div>
    </div>
  );
}

export function OrderNumberLine({
  points,
  benchmark,
  equivalentNames = [],
}: {
  points: { numerator: number; denominator: number }[];
  benchmark: { numerator: number; denominator: number };
  equivalentNames?: { fraction: { numerator: number; denominator: number }; equivalentTo: { numerator: number; denominator: number } }[];
}) {
  // Labels on the line are stacked fractions ("1/4 = 2/8" through MathText); the description says them in words.
  const slashName = ({ numerator, denominator }: { numerator: number; denominator: number }) => `${numerator}/${denominator}`;
  const equivalentNamesFor = (point: { numerator: number; denominator: number }) =>
    equivalentNames.filter(({ equivalentTo }) => sameFractionValue(point, equivalentTo));
  const benchmarkNames = equivalentNamesFor(benchmark);
  const description = numberLineDescription(points, benchmark, equivalentNames);

  return (
    <figure className="fq-order-line-figure" data-testid="fraction-order-numberline">
      <div
        className="fq-order-line"
        role="img"
        aria-label={description}
      >
        <span className="fq-order-line-axis" aria-hidden="true" />
        {[0, 1].map((end) => <span className="fq-order-line-end" style={{ left: `${end * 100}%` }} key={end} aria-hidden="true" />)}
        <span
          className="fq-order-line-benchmark"
          style={{ left: `${(benchmark.numerator / benchmark.denominator) * 100}%` }}
          data-testid="fraction-order-benchmark"
          data-equivalent-names={benchmarkNames.map(({ fraction }) => slashName(fraction)).join(',')}
          aria-hidden="true"
        >
          <span><MathText text={[slashName(benchmark), ...benchmarkNames.map(({ fraction }) => slashName(fraction))].join(' = ')} /></span>
        </span>
        {points.map((point, index) => {
          const position = (point.numerator / point.denominator) * 100;
          const names = equivalentNamesFor(point);
          const label = [slashName(point), ...names.map(({ fraction }) => slashName(fraction))].join(' = ');
          return (
            <span
              className="fq-order-line-point"
              style={{ left: `${position}%`, '--lane': index % 2 } as CSSProperties}
              key={`${point.numerator}/${point.denominator}`}
              data-testid={`fraction-order-point-${point.numerator}-${point.denominator}`}
              data-position={position}
              data-equivalent-names={names.map(({ fraction }) => slashName(fraction)).join(',')}
              aria-hidden="true"
            >
              <span><MathText text={label} /></span>
            </span>
          );
        })}
      </div>
      <figcaption className="fq-order-line-caption">
        <span>0</span><span>1 whole</span>
      </figcaption>
      <p className="fq-order-line-description" data-testid="text-fraction-order-line-description">
        <span className="fq-order-line-description-copy" data-testid="text-fraction-order-line-description-copy">
          {description}
        </span>
        <LearningListenButton text={description} label="Listen to the fraction number line" />
      </p>
    </figure>
  );
}
/** Two bars of one whole each, once answered: where the larger amount ends. */
function compareGuide(model: ModelSpec, reveal: boolean): number | undefined {
  if (!reveal || model.kind !== 'bars' || model.bars.length !== 2) return undefined;
  if (model.bars.some((bar) => bar.denominator < 1 || bar.numerator < 1 || bar.numerator > bar.denominator)) return undefined;
  return Math.max(...model.bars.map((bar) => bar.numerator / bar.denominator));
}

/** `reveal`: the question is answered, so every bar shows its fraction label. */
/** `asked`: the picture belongs to a question, so number-line labels (1/5, 2/5…) and the readout stay hidden until it is answered. */
/** `walk`: after a miss, a "count with me" walk along the picture (see FractionBar); a new value replays it. */
function ModelView({ model, compact = false, reveal = false, asked = false, walk = null }: { model: ModelSpec; compact?: boolean; reveal?: boolean; asked?: boolean; walk?: number | null }) {
  const setLayout = model.kind === 'set' ? setModelLayout(model) : null;
  return (
    <div className={`fq-visual-model ${compact ? 'compact' : ''}`} data-testid="visual-fraction-model">
      {!compact && (model.kind === 'bars' || model.kind === 'decimal') && <ModelTag kind="bar" />}
      {!compact && model.kind === 'line' && <ModelTag kind="line" />}
      {!compact && model.kind === 'set' && <ModelTag kind="set" />}
      {model.kind === 'bars' && (() => {
        // A bar that shows the answer waits until the question is answered.
        const shownBars = asked && !reveal ? model.bars.filter((bar) => !bar.untilAnswered) : model.bars;
        const labelled = reveal || shownBars.some((bar) => bar.named); return (
        <div className="fq-visual-bars">
          {shownBars.map((item, index) => {
            // Bars are counted one after another, so each later bar starts where the one before stopped.
            const start = shownBars.slice(0, index).reduce((sum, bar) => sum + Math.max(1, Math.ceil(bar.numerator / bar.denominator)) * bar.denominator, 0);
            return (
            <div className="fq-visual-bar-row" key={`${item.numerator}-${item.denominator}-${index}`}>
              <FractionBar numerator={item.numerator} denominator={item.denominator} quiet={(model.hideLabels || asked) && !item.named && !reveal} label={!!item.named || reveal} gutter={labelled} guide={compareGuide(model, reveal)} walk={walk} start={start} />
            </div>
            );
          })}
        </div>
      ); })()}
      {model.kind === 'set' && (
        <div className="fq-set-wrap">
          {setLayout
            ? <SetSvg n={setLayout.selectedGroups} d={setLayout.groupCount} total={model.total} />
            : <div className="fq-counter-set" role="img" aria-label={`${model.selected} of ${model.total} counters highlighted`}>
              {Array.from({ length: model.total }, (_, index) => <span className={`fq-counter ${index < model.selected ? 'selected' : ''}`} style={{ '--i': index } as CSSProperties} key={index} />)}
            </div>}
        </div>
      )}
      {model.kind === 'line' && (() => {
        const labelled = (!model.hideLabels && !asked) || reveal;
        const wholes = model.wholes ?? numberLineWholeCount(model.numerator, model.denominator);
        const divisions = model.denominator * wholes;
        const value = model.numerator / divisions;
        return (
          <div className="fq-numberline-wrap">
            <div className="fq-visual-numberline" role="img" aria-label={!labelled ? `Number line from 0 to ${wholes} with ${divisions} equal spaces and a dot` : 'Number line from 0 to ' + wholes + ', marked at ' + model.numerator + '/' + model.denominator}>
              <div className="fq-numberline-track" />
              {/* Hop arcs: one per jump from 0, drawn one after another, then the dot lands. */}
              <svg className="fq-numberline-hops" viewBox={`0 0 ${divisions} 1`} preserveAspectRatio="none" aria-hidden="true">
                {Array.from({ length: model.numerator }, (_, j) => (
                  <path key={j} d={`M${j + 0.06} 1 Q${j + 0.5} -0.6 ${j + 0.94} 1`} style={{ '--i': j } as CSSProperties} pathLength={1} vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
              <span className="fq-numberline-marker" style={{ left: (value * 100) + '%', '--jumps': model.numerator } as CSSProperties} />
              {walk !== null && divisions <= 24 && (
                <span key={walk} className="fq-walking fq-line-walk" style={{ '--start': 0, '--count': divisions } as CSSProperties} aria-hidden="true">
                  {Array.from({ length: divisions }, (_, space) => (
                    <b className="fq-count-badge" style={{ left: `${((space + 0.5) / divisions) * 100}%`, '--i': space } as CSSProperties} key={space}>{(space % model.denominator) + 1}</b>
                  ))}
                </span>
              )}
              {Array.from({ length: divisions + 1 }, (_, tick) => (
                <span className={`fq-numberline-tick ${tick % model.denominator === 0 ? 'whole' : ''}`} style={{ left: ((tick / divisions) * 100) + '%' }} key={tick}>
                  {/* Every tick reads 1/5, 2/5… Practice pictures (hideLabels) show only the wholes until the child answers,
                      so the labels can't give the answer away. Very crowded lines keep just the wholes. */}
                  {tick % model.denominator === 0 || (labelled && divisions <= 16)
                    ? <TickLabel i={tick} d={model.denominator} /> : null}
                </span>
              ))}
            </div>
            <p className="fq-numberline-range" data-testid="text-model-numberline-range">{wholes === 1 ? 'The line goes from 0 to 1.' : `The line goes from 0 to ${wholes}. Each whole has the same spaces.`}</p>
            {/* Practice pictures hide the readout so the picture doesn't give the answer away. */}
            {labelled && <div className="fq-line-readout"><Fraction numerator={model.numerator} denominator={model.denominator} /></div>}
          </div>
        );
      })()}
      {model.kind === 'partition' && (
        <div className="fq-partition-model" role="img" aria-label={`One whole split into ${model.parts.length} pieces; the first piece is one part`}>
          <div className="fq-partition-whole">
            {model.parts.map((size, index) => (
              <span className={`${index === 0 ? 'part-sample' : ''} ${walk !== null ? 'fq-walk-part' : ''}`} style={{ flexBasis: `${size}%`, '--i': index } as CSSProperties} key={`${size}-${index}-${walk ?? ''}`}>
                {walk !== null && <b className="fq-count-badge" aria-hidden="true">{index + 1}</b>}
              </span>
            ))}
          </div>
          <WholeBracket />
        </div>
      )}
      {model.kind === 'area' && <div className="fq-area-model"><AreaSvg figure={{ cut: model.cut, shaded: model.shaded }} /></div>}
      {model.kind === 'equation' && <div className="fq-model-equation" role="img" aria-label={`Visual equation ${model.text}`}><MathText text={model.text} /></div>}
      {model.kind === 'decimal' && (
        <div className="fq-decimal-model">
          <FractionBar numerator={model.tenths} denominator={10} quiet={model.hideLabels || (asked && !reveal)} />
          {/* The decimal is shown once the question is answered (it was the answer to "Write 3/10 as a decimal"). */}
          {!model.hideLabels && (!asked || reveal) && <span>{(model.tenths / 10).toFixed(1)}</span>}
        </div>
      )}
      {model.caption && <p className="fq-model-caption">{model.caption}</p>}
    </div>
  );
}

function Topbar({ progress, onReset, onHome, menu }: { progress: Progress; onReset: () => void; onHome: () => void; menu?: ReactNode }) {
  const stars = Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0);
  const lessonsDone = MISSIONS.filter(item => hasLearningGate(progress, item.id)).length;
  const { fun, setFun } = useFun();
  const streak = shownStreak(fun);
  const storyOn = fun.displayPreferences?.storyMode !== false;
  const { season } = useSeason();
  const points = season?.points ?? 'points';
  const account = useAccount();
  const [signingOut, setSigningOut] = useState(false);
  const syncLabel = account.user
    ? account.syncStatus === 'saving' ? 'Saving…' : account.syncStatus === 'offline' ? 'Not synced' : 'Saved'
    : 'On this device';
  return (
    <>
      <header className="fq-shell fq-topbar">
        <button className="fq-brand" onClick={onHome} aria-label="Fraction Quest home" data-testid="button-home">
          <span className="fq-brand-mark" aria-hidden="true"><PieFraction n={3} d={4} size={30} fill="var(--fq-sun)" stroke="#4b23c9" /></span>
          <span>Fraction Quest</span>
        </button>
        <div className="fq-topbar-actions">
          <div className="fq-fun-stats">
            {/* Each symbol is a button: tap it to read what it means. */}
            <StatTip testId="button-tip-streak" label={`Day streak: ${streak}. What is this?`}
              tip={storyOn
                ? <><strong>Hoot’s lantern: {streak} {streak === 1 ? 'night' : 'nights'} in a row.</strong> This is your streak. Get one answer right each day to keep it glowing.</>
                : streak > 0 ? <><strong>{streak} {streak === 1 ? 'day' : 'days'} in a row!</strong> Get one answer right each day to keep your streak going.</> : <><strong>Day streak.</strong> Get one answer right today to start a streak!</>}>
              <span className="fq-stat fq-stat-streak" data-testid="status-day-streak">{storyOn ? <LanternIcon lit={streak > 0} size={20} /> : <Flame size={18} strokeWidth={2.75} fill="currentColor" aria-hidden="true" />}<strong>{streak}</strong><span className="fq-sr">day streak</span></span>
            </StatTip>
            <StatTip testId="button-tip-xp" label={`${fun.xp} ${points}. What is this?`}
              tip={<><strong>{fun.xp} {points}!</strong> You get 10 {points} for every right answer.</>}>
              <span className="fq-stat fq-stat-xp" data-testid="status-xp">{season ? <SeasonPointsIcon /> : <Zap size={18} strokeWidth={2.75} fill="currentColor" aria-hidden="true" />}<strong>{fun.xp}</strong><span className="fq-stat-unit">{season ? points : 'XP'}</span></span>
            </StatTip>
            <StatTip testId="button-tip-daily" label={`Today's goal: ${Math.min(fun.answeredToday, DAILY_GOAL)} of ${DAILY_GOAL}. What is this?`}
              tip={fun.answeredToday >= DAILY_GOAL ? <><strong>Today's goal is done!</strong> You got {DAILY_GOAL} answers right today.</> : <><strong>Today's goal: {fun.answeredToday} of {DAILY_GOAL}.</strong> Each slice fills in when you get an answer right.</>}>
              <DailyRing answered={fun.answeredToday} />
            </StatTip>
          </div>
          <StatTip testId="button-tip-progress" className="fq-progress-tip" label={`${stars} stars, ${lessonsDone} of ${MISSIONS.length} lessons. What is this?`}
            tip={<><strong>{stars} stars</strong> from lesson practice (up to 3 per lesson). <strong>{lessonsDone} of {MISSIONS.length} lessons</strong> done.</>}>
          <div className="fq-progress-pill" data-testid="status-overall-progress" aria-live="polite">
            <Star size={15} className="filled" aria-hidden="true" />
            <span><strong>{stars}</strong> stars</span><span aria-hidden="true">·</span>
            <span><strong>{lessonsDone}</strong>/{MISSIONS.length} lessons</span>
          </div>
          </StatTip>
          {menu}
          <button className="fq-icon-button" onClick={() => setFun(setSound(fun, !fun.sound))} aria-label={fun.sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={fun.sound} data-testid="button-toggle-sound">{fun.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          {/* With a menu (the map), reset lives in it under Grown-ups so the bar fits a phone. */}
          {!menu && <button className="fq-icon-button" onClick={onReset} aria-label="Reset a unit or all learner progress" data-testid="button-reset-progress"><RotateCcw size={18} /></button>}
          <div className="fq-account">
            <StatTip testId="button-tip-account" label={`Playing as ${account.activeProfile?.displayName ?? 'a guest'}. What is this?`}
              tip={<><strong>{account.activeProfile ? `Playing as ${account.activeProfile.displayName}.` : 'Playing as a guest.'}</strong> {account.user ? 'Progress is saved to your family account.' : 'Progress stays on this device.'}
                {/* On phones the Sign in / Sign out button lives here, so the top bar fits. */}
                <span className="fq-stat-bubble-action">{account.user
                  ? <button type="button" className="fq-hint-button" disabled={signingOut} onClick={async () => { setSigningOut(true); await account.signOut(); setSigningOut(false); }} data-testid="button-sign-out-tip">{signingOut ? 'Saving…' : 'Sign out'}</button>
                  : <button type="button" className="fq-hint-button" onClick={account.goToSignIn} data-testid="button-sign-in-tip">Sign in</button>}</span></>}>
              <span className="fq-account-avatar" aria-hidden="true">{account.activeProfile?.displayName.trim().charAt(0).toUpperCase() ?? 'G'}</span>
            </StatTip>
            <span className="fq-account-name">
              <strong>{account.activeProfile?.displayName ?? 'Guest learner'}</strong>
              <small className={account.syncStatus === 'saving' ? 'sync-saving' : account.syncStatus === 'offline' ? 'sync-offline' : ''} aria-live="polite">{syncLabel}</small>
            </span>
            {account.user
              ? <button className="fq-hint-button fq-account-signin" disabled={signingOut} onClick={async () => { setSigningOut(true); await account.signOut(); setSigningOut(false); }} data-testid="button-sign-out">{signingOut ? 'Saving…' : 'Sign out'}</button>
              : <button className="fq-hint-button fq-account-signin" onClick={account.goToSignIn} data-testid="button-sign-in">Sign in</button>}
          </div>
        </div>
      </header>
      {account.accountError && <p className="fq-account-error fq-shell" role="alert" data-testid="status-account-error">{account.accountError}</p>}
    </>
  );
}

/** The Storybook's chapters: a chapter is reached once one of its lessons is open; a lesson's comic can be read once
   the lesson is done or started, and the next lesson's comic is marked new. */
function storybookChapters(progress: Progress): StorybookChapter[] {
  const next = getNextMission(progress);
  return CHAPTERS.map((chapter) => {
    const missions = MISSIONS.filter((item) => item.unit === chapter.unit);
    return {
      chapter,
      reached: missions.some((item) => isMissionUnlocked(progress, item.id)),
      ended: missions.length > 0 && missions.every((item) => hasLearningGate(progress, item.id)),
      lessons: missions.map((item) => ({
        id: item.id,
        title: item.title,
        done: hasLearningGate(progress, item.id),
        state: hasLearningGate(progress, item.id) || getLearningRecord(progress, item.id).practiceDone ? 'read' as const
          : item.id === next?.id ? 'new' as const : 'locked' as const,
      })),
    };
  });
}

function MissionMap({ progress, onStart, onDeveloperTest, onOpenLab, onStartReview, onStartDaily, onConceptGames, onAssessments, onReset, onPaper, onChallenge, onExtra, onParent, onGame, onPlacement, onStorybook, onStory, onPrologue }: { progress: Progress; onStart: (missionId: string) => void; onStorybook: (tab: StorybookTab, unit?: number) => void; onStory: (missionId: string) => void; onPrologue: () => void; onDeveloperTest: (missionId: string) => void; onOpenLab: (missionId: string) => void; onStartReview: () => void; onStartDaily: () => void; onConceptGames: () => void; onAssessments: () => void; onReset: () => void; onPaper: (missionId: string) => void; onChallenge: (unit: number) => void; onExtra: (missionId: string) => void; onParent: () => void; onGame: (type: 'race' | 'code', missionId: string) => void; onPlacement: () => void }) {
  const account = useAccount();
  const { user } = account;
  const { fun } = useFun();
  const storyOn = fun.displayPreferences?.storyMode !== false;
  const codeSummary = summarizeCodeProgress(fun.codeLevels, MISSIONS.map((mission) => mission.id));
  const nextCodeMission = MISSIONS.find((mission) => isMissionUnlocked(progress, mission.id) && (fun.codeLevels?.[mission.id] ?? 0) < CODE_LEVEL_COUNT);
  const totalStars = Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0);
  const nextMission = getNextMission(progress);
  // Lessons skipped by the level quiz don't count as "pending" for the recommendation message.
  const firstPendingMission = MISSIONS.find(item => !hasLearningGate(progress, item.id)
    && !(progress.placement && item.unit < progress.placement.unit && !progress.learning?.[item.id]));
  const evidenceRecommendation = !!nextMission && nextMission.id !== firstPendingMission?.id;
  const [selectedId, setSelectedId] = useState<string | null>(() => nextMission?.id ?? null);
  const units = UNIT_INFO.map((unit, index) => ({
    ...unit,
    number: index + 1,
    missions: MISSIONS.filter((item) => item.unit === index + 1),
  }));
  const assignedUnits = (account.activeProfile?.assignedUnitIds ?? [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id >= 1 && id <= UNIT_TITLES.length);

  // The current lesson's node: open it and bring it into view ("Jump to current section").
  const jumpToCurrent = () => {
    if (!nextMission) return;
    setSelectedId(nextMission.id);
    requestAnimationFrame(() => {
      const node = document.querySelector<HTMLElement>(`[data-testid="card-mission-${nextMission.id}"]`);
      node?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      node?.querySelector<HTMLButtonElement>('.fq-node')?.focus({ preventScroll: true });
    });
  };
  const firstLessonDone = progress.completedMissionIds.length > 0 || MISSIONS.some((item) => hasLearningGate(progress, item.id));
  // In story mode the first chapter's banner carries the first step, so the separate "Start your first lesson" card goes.
  const storyStartsHere = storyOn && !firstLessonDone && nextMission?.unit === 1 && !!chapterFor(1);
  const today = progress.dailyPractice?.day === dailyPracticeDay() ? progress.dailyPractice : null;
  const dailyDone = !!today?.completedAt;
  const dueReviews = getDueSkillReviewCount(progress);
  const menu = (
    <AppMenu
      sections={[
        { title: 'Practice', items: [
          { id: 'daily', icon: <Sparkles size={18} />, label: 'Daily practice', testId: 'button-start-daily-practice', onSelect: onStartDaily, waiting: !dailyDone,
            note: dailyDone ? 'Done for today. Review it anytime.' : today ? `Pick up where you left off: ${today.index + 1} of ${today.questions.length}` : storyOn ? 'Chomp’s five riddles, about 5 minutes' : 'Five quick questions, about 5 minutes' },
          ...(dueReviews > 0 ? [{ id: 'review', icon: <RotateCcw size={18} />, label: 'Quick skill review', testId: 'button-start-due-review', onSelect: onStartReview, waiting: true,
            note: `${dueReviews} ${dueReviews === 1 ? 'skill is' : 'skills are'} ready for a short retry` }] : []),
        ] },
        { title: 'Games', items: [
          { id: 'games', icon: <Dumbbell size={18} />, label: 'Games', testId: 'button-open-concept-games', onSelect: onConceptGames, note: 'Fraction Race and the fraction workshop' },
          ...(nextCodeMission ? [{ id: 'code', icon: <Code2 size={18} />, label: codeSummary.missionsStarted ? 'Continue coding' : 'Try coding', testId: 'button-continue-coding',
            onSelect: () => onGame('code', nextCodeMission.id), note: codeSummary.levelsPassed ? `${codeSummary.levelsPassed} coding levels passed` : 'Make a robot draw fractions' }] : []),
          ...(storyOn ? [{ id: 'cards', icon: <BookOpen size={18} />, label: 'Storybook', testId: 'button-open-story-cards', onSelect: () => onStorybook('story'), note: 'Read the story again, with clues and cards the story' }] : []),
        ] },
        { title: 'Check what you know', items: [
          { id: 'checkins', icon: <ClipboardCheck size={18} />, label: 'Check-ins', testId: 'button-open-assessments', onSelect: onAssessments, note: 'Build a model, answer, and see what to practice next' },
          { id: 'level', icon: <Compass size={18} />, label: 'Find my level', testId: 'button-find-level', onSelect: onPlacement, note: 'A short quiz to find where to start' },
        ] },
        { title: 'Grown-ups', items: [
          { id: 'parent', icon: <BarChart3 size={18} />, label: 'Progress report and settings', testId: 'button-open-parent', onSelect: onParent, note: 'Time this week, what to practice, voices, answer keys' },
          { id: 'reset', icon: <RotateCcw size={18} />, label: 'Reset a unit or all progress', testId: 'button-reset-progress', onSelect: onReset, note: 'Choose what to clear while keeping other units safe' },
        ] },
      ]}
      footer={<details className="fq-menu-about"><summary>About this learning path</summary><p>
        A broad U.S. grades 3–5 bridge (roughly ages 8–10), from equal shares and number lines through operations and decimals.
        This is not a complete or standards-aligned course.</p></details>}
    />
  );

  return (
    <div className="fq-app fq-map-app">
      <Topbar progress={progress} onReset={onReset} onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} menu={menu} />
      <main className="fq-shell">
        <section className="fq-map fq-course-map" aria-labelledby="course-title">
          <div className="fq-section-heading">
            <div>
              <h1 id="course-title">Your learning map</h1>
              <p data-testid="text-map-subtitle">
                 {nextMission
                   ? `${MISSIONS.filter(item => hasLearningGate(progress, item.id)).length} of ${MISSIONS.length} lessons completed · ${totalStars} practice stars`
                  : `Course complete · ${totalStars} stars collected`}
              </p>
            </div>
            <DeveloperChip unitTitles={UNIT_TITLES} onOpen={onDeveloperTest} />
          </div>
          <SeasonBanner />
          {storyOn && <StoneBanner completedUnits={completedStoryUnits(progress)} onStorybook={() => onStorybook('story')}
            town={<TownMap completedUnits={completedStoryUnits(progress)} currentUnit={nextMission?.unit}
              reachedUnits={new Set(CHAPTERS.filter((chapter) => MISSIONS.some((item) => item.unit === chapter.unit && isMissionUnlocked(progress, item.id))).map((chapter) => chapter.unit))}
              onPlace={(unit) => onStorybook('story', unit)} />} />}
          {assignedUnits.length > 0 && <p className="fq-assigned-units" role="note" data-testid="text-assigned-units">
            Your teacher suggested: {assignedUnits.map((unit) => `Unit ${unit}: ${UNIT_TITLES[unit - 1]}`).join(' · ')}.
            These suggestions do not change which lessons are unlocked.
          </p>}

          {!nextMission ? (
            <div className="fq-course-finished" data-testid="status-course-complete"><Trophy size={24} /> You explored every lesson. Replay any one to practice again.</div>
          ) : storyStartsHere ? null : !firstLessonDone ? (
            <button className="fq-continue-card" onClick={() => onStart(nextMission.id)} data-testid="button-continue-course">
              <span className="fq-continue-icon"><ArrowRight size={21} /></span>
              <span className="fq-continue-copy">
                <strong>Start your first lesson</strong>
                <span>Lesson {String(MISSIONS.indexOf(nextMission) + 1).padStart(2, '0')} · {nextMission.title}</span>
              </span>
              <ArrowRight className="fq-continue-arrow" size={20} />
            </button>
          ) : (
            <button className="fq-continue-card fq-jump-card" onClick={jumpToCurrent} data-testid="button-jump-current">
              <span className="fq-continue-icon"><MapIcon size={20} /></span>
              <span className="fq-continue-copy">
                <strong>Jump to current section</strong>
                <span>Unit {nextMission.unit} · Lesson {String(MISSIONS.indexOf(nextMission) + 1).padStart(2, '0')} · {nextMission.title}{evidenceRecommendation ? ' · Practice what was tricky' : ''}</span>
              </span>
              <ArrowRight className="fq-continue-arrow" size={20} />
            </button>
          )}
          {progress.placement && <p className="fq-place-note" data-testid="text-placement-note">Started at unit {progress.placement.unit} after the level quiz. Earlier lessons are still open.</p>}

          <div className="fq-unit-list">
            {units.map((unit) => {
               const completedInUnit = unit.missions.filter((item) => hasLearningGate(progress, item.id)).length;
              return (
                <section className="fq-unit" key={unit.number} aria-labelledby={`unit-${unit.number}`} style={{ '--unit': unitColor(unit.number) } as CSSProperties}>
                  {storyOn && chapterFor(unit.number) ? (() => {
                    const chapter = chapterFor(unit.number)!;
                    const current = nextMission?.unit === unit.number;
                    const reached = unit.missions.some((item) => isMissionUnlocked(progress, item.id));
                    const index = current ? unit.missions.indexOf(nextMission!) : 0;
                    const previous = chapterFor(unit.number - 1);
                    const teaser = !current ? undefined : index > 0 ? chapter.cliffs[index - 1] ?? chapter.cliff
                      : previous ? previous.cliff : 'The Whole Stone just cracked. Chomp’s bakery is a mess. Can you find the first piece?';
                    return <>
                      {unit.number === 1 && <PrologueCard seen={!!fun.story?.prologueSeen} onWatch={onPrologue} />}
                      <ChapterBanner chapter={chapter} unitTitle={unit.title} done={completedInUnit} total={unit.missions.length}
                        state={current ? 'current' : reached ? 'reached' : 'locked'} teaser={teaser} onRead={() => onStorybook('story', unit.number)} />
                    </>;
                  })() : (
                    <div className="fq-unit-heading">
                      <div>
                        <span className="fq-unit-kicker">Unit {unit.number}</span>
                        <h3 id={`unit-${unit.number}`}>{unit.title}</h3>
                        <p>{unit.subtitle}</p>
                      </div>
                      <span className="fq-unit-count" aria-label={`${completedInUnit} of ${unit.missions.length} lessons mastered`}>{completedInUnit}/{unit.missions.length}</span>
                    </div>
                  )}
                  <LessonPath
                    unit={unit.number}
                    color={unitColor(unit.number)}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
                    allDone={completedInUnit === unit.missions.length}
                    challenge={CHALLENGES[unit.number] ? { best: progress.challengeBest?.[String(unit.number)] ?? null, max: challengeMaxPoints(unit.number), onStart: () => onChallenge(unit.number) } : undefined}
                    nodes={unit.missions.map((mission): PathNode => {
                      const unlocked = isMissionUnlocked(progress, mission.id);
                      const completed = hasLearningGate(progress, mission.id);
                      const learning = getLearningRecord(progress, mission.id);
                      const summary = learningSummary(learning);
                      const buildsNeeded = requiredBuildChecks(progress, mission.id).length;
                      const buildsPassed = requiredBuildChecks(progress, mission.id).filter((check) => learning.checks[check.id]?.passed).length;
                      const codeLevels = Math.min(CODE_LEVEL_COUNT, Math.floor(fun.codeLevels?.[mission.id] ?? 0));
                      const missionNumber = MISSIONS.indexOf(mission) + 1;
                      return {
                        id: mission.id,
                        number: missionNumber,
                        title: mission.title,
                        stars: progress.starsByMission[mission.id] ?? 0,
                        steps: lessonSteps(progress, mission.id),
                        state: completed ? 'done' : !unlocked ? 'lock' : mission.id === nextMission?.id ? 'now' : 'open',
                        story: storyOn && !!chapterFor(mission.unit) && unlocked && !completed && !learning.practiceDone,
                        detail: (
                          <>
                            <span className="fq-node-kicker">Lesson {String(missionNumber).padStart(2, '0')}</span>
                            <h4>{mission.title}</h4>
                            <p>{mission.description}</p>
                            {(mission.gradeBand || mission.enrichment) && <p className="fq-node-standard">
                              {mission.enrichment ? 'Bonus enrichment' : `Grade ${mission.gradeBand}`}
                              {mission.standards?.length ? ` · ${mission.standards.join(', ')}` : ''}
                            </p>}
                            <p className="fq-node-status" data-testid={`status-learning-${mission.id}`}>
                              {/* Short, kid-sized status: only what matters for this lesson right now. */}
                              {completed
                                ? <>Done! Worksheet handed in.{codeLevels > 0 && <><br />Code levels: {codeLevels} of {CODE_LEVEL_COUNT}.</>}</>
                                : !unlocked
                                  ? <>Finish the lessons before this one to open it.</>
                                  : learning.practiceDone
                                    ? <>Builds: {buildsPassed} of {buildsNeeded}. Worksheet: {worksheetCount(learning, mission.id)} of {worksheetLength(mission.id)}.</>
                                    : <>Practice, build it, then do the worksheet.</>}
                              {progress.completedMissionIds.includes(mission.id) && !completed && <><br />Your work is saved. A few new steps are waiting.</>}
                            </p>
                            <button
                              className={`fq-button ${completed ? 'ghost' : ''}`}
                              onClick={() => onStart(mission.id)}
                              disabled={!unlocked}
                              data-testid={`button-start-mission-${mission.id}`}
                            >
                              {completed ? 'Practice again' : unlocked ? learning.practiceDone ? 'Resume worksheet & models' : 'Start lesson' : 'Finish earlier lessons first'}
                              {unlocked && <ArrowRight size={16} />}
                            </button>
                            {completed && (
                              <button className="fq-button ghost" onClick={() => onOpenLab(mission.id)} data-testid={`button-redo-${mission.id}`}>
                                <RotateCcw size={16} /> Redo a part
                              </button>
                            )}
                            {completed && storyOn && chapterFor(mission.unit) && (
                              <button className="fq-button ghost" onClick={() => onStory(mission.id)} data-testid={`button-story-replay-${mission.id}`}>
                                <BookOpen size={16} /> Read the story
                              </button>
                            )}
                            {unlocked && (
                              <div className="fq-node-tools">
                                {hasGenerator(mission.id) && <button className="fq-button ghost" onClick={() => onExtra(mission.id)} data-testid={`button-practice-more-${mission.id}`}><Dumbbell size={17} /> Practice more</button>}
                                <PrintMenu missionId={mission.id} />
                                {paperCheckOpen(progress, mission.id) && <button className="fq-button ghost" onClick={() => onPaper(mission.id)} data-testid={`button-check-paper-${mission.id}`}><ClipboardCheck size={17} /> Check my paper</button>}
                                <button className="fq-button ghost" onClick={() => onGame('race', mission.id)} data-testid={`button-race-${mission.id}`}><Zap size={17} /> Race</button>
                                <button className="fq-button ghost" onClick={() => onGame('code', mission.id)} data-testid={`button-code-${mission.id}`}><Code2 size={17} /> Code</button>
                              </div>
                            )}
                          </>
                        ),
                      };
                    })}
                  />
                </section>
              );
            })}
          </div>
          <div className="fq-trail-note"><Lightbulb size={17} color="hsl(var(--accent-foreground))" /><span>No timer, no traps. Use a hint, try a simpler model, and keep going.</span></div>
        </section>
        <footer className="fq-footer"><span>Made for curious minds, ages 8–10. {user ? 'Progress is saved to this family account.' : 'Progress stays on this device.'}</span><button onClick={onReset} data-testid="button-reset-progress-footer">{user ? 'Reset this learner’s progress' : "Reset this device's progress"}</button></footer>
      </main>
    </div>
  );
}

function GuidedExample({ mission, title, lessonLabel, hideMascot = false, withTap = true }: { mission: Mission; title?: string; lessonLabel?: string; /** Numi already introduced this screen. */ hideMascot?: boolean; /** The "Your turn" tap model. Off when a graded question sits on the same screen, so there is one thing to do. */ withTap?: boolean }) {
  return (
    <div className="fq-example" data-testid="lesson-example">
      {lessonLabel && <p className="fq-play-kicker">{lessonLabel} · See it first</p>}
      {title && <h2 className="fq-example-heading">{title}</h2>}
      <div className={`fq-mascot-say ${hideMascot ? 'no-mascot' : ''}`}>
        {!hideMascot && <Mascot mood="happy" size={64} />}
        <div className="fq-skill-bubble">
          <div className="fq-skill-header">
            <span className="fq-skill-label">Lesson idea</span>
            <LearningListenButton text={mission.skill} label="Listen to the lesson idea" prefetch />
          </div>
          <p className="fq-skill-copy"><LearningText text={mission.skill} /></p>
        </div>
      </div>
      {FOLD_LESSONS[mission.id] && <PaperFold {...FOLD_LESSONS[mission.id]} />}
      {SHAPE_LESSONS.includes(mission.id) && <SameSizeIdea />}
      {mission.learningIntro && (
        <section className="fq-example-intro" aria-label="How to order fractions" data-testid="lesson-introduction">
          <div className="fq-example-card-head">
            <h3>How to order fractions</h3>
            <LearningListenButton text={sectionsScript([
              { heading: 'Goal', text: mission.learningIntro.goal },
              { heading: 'Process', text: mission.learningIntro.process },
              { heading: 'Why it works', text: mission.learningIntro.why },
            ])} label="Listen to how to order fractions" prefetch />
          </div>
          <LearningTextSection
            id="lesson-intro-goal"
            heading="Goal"
            text={mission.learningIntro.goal}
            className="fq-example-section"
            listen={false}
          />
          <LearningTextSection
            id="lesson-intro-process"
            heading="Process"
            text={mission.learningIntro.process}
            className="fq-example-section"
            listen={false}
          />
          <LearningTextSection
            id="lesson-intro-why"
            heading="Why it works"
            text={mission.learningIntro.why}
            className="fq-example-section"
            listen={false}
          />
        </section>
      )}
      <div className="fq-model-area"><ModelView model={mission.example.model} /></div>
      {mission.example.numberLine && (
        <OrderNumberLine
          points={mission.example.numberLine.points}
          benchmark={mission.example.numberLine.benchmark}
          equivalentNames={mission.example.numberLine.equivalentNames}
        />
      )}
      <div className="fq-example-answer">
        <div className="fq-example-card-head">
          <span className="fq-example-label"><Lightbulb size={16} /> Let's think it through</span>
          <LearningListenButton text={sectionsScript([
            { heading: 'Question', text: mission.example.prompt },
            { heading: 'Worked answer', text: mission.example.answer },
            { heading: 'Explanation', text: mission.example.explanation },
          ])} label="Listen to the whole example" prefetch />
        </div>
        <LearningTextSection
          id="example-question-heading"
          heading="Question"
          text={mission.example.prompt}
          className="fq-example-section"
          emphasize
          bold
          listen={false}
        />
        <LearningTextSection
          id="example-worked-answer-heading"
          heading="Worked answer"
          text={mission.example.answer}
          className="fq-example-section"
          paragraphClassName="fq-example-result"
          listen={false}
        />
        <LearningTextSection
          id="example-explanation-heading"
          heading="Explanation"
          text={mission.example.explanation}
          className="fq-example-section"
          listen={false}
        />
      </div>
      {withTap && <TapModel model={mission.example.model} />}
    </div>
  );
}

function PlayView({
  mission,
  questionIndex,
  showExample = false,
  firstTryAnswers,
  combo,
  onBack,
  onNext,
  onFinish,
  onMissed,
  onReviewCompleted,
  onReviewDeferred,
  onPracticeSignal,
  onCorrect,
  onWrong,
  isQuickReview = false,
  isExtraPractice = false,
  starEligibleQuestionIds,
  onFinishReview,
}: {
  mission: Mission;
  questionIndex: number;
  showExample?: boolean;
  firstTryAnswers: number;
  combo: number;
  onBack: () => void;
  onNext: (firstTryAnswers: number) => void;
  onFinish: (stars: number, firstTryAnswers: number) => void;
  onMissed: (missionId: string, questionId: string) => void;
  onReviewCompleted: (missionId: string) => void;
  onReviewDeferred: (missionId: string) => void;
  onPracticeSignal: (missionId: string, misconception?: string) => void;
  onCorrect: (firstTry: boolean) => void;
  onWrong: () => void;
  isQuickReview?: boolean;
  isExtraPractice?: boolean;
  starEligibleQuestionIds?: string[];
  onFinishReview?: () => void;
}) {
  const [selection, setSelection] = useState<Answer | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'retry' | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [useSimplerModel, setUseSimplerModel] = useState(false);
  /** Choices already tried and wrong on this question: greyed out with an ✗, so a retry is not a blind guess. */
  const [ruledOut, setRuledOut] = useState<number[]>([]);
  /** What Hoot says about the last wrong choice (the exact slip when we can name it). */
  const [retryText, setRetryText] = useState('');
  const [burst, setBurst] = useState(0);
  const [shake, setShake] = useState(0);
  const [reviewingPastIndex, setReviewingPastIndex] = useState<number | null>(null);
  const { fun } = useFun();
  const storyOn = fun.displayPreferences?.storyMode !== false;
  // A lesson's first question teaches first: the idea and a worked example, then (in story mode) the friend asks and
  // the child tries.
  const actionFirst = showExample && storyOn && !!chapterFor(mission.unit);
  const seasonOn = !!useSeason().season;
  const question: PracticeQuestion | null = mission.questions[questionIndex] ?? null;
  const isLastQuestion = question ? questionIndex === mission.questions.length - 1 : false;
  const lessonStarIds = new Set(starEligibleQuestionIds ?? mission.questions.filter((item) => !item.isOptionalReview).map((item) => item.id));

  const checkAnswer = () => {
    if (selection === null || !question) return;
    if (isCorrectAnswer(question, selection)) {
      if (question.isOptionalReview && question.reviewMissionId) {
        if (attempts === 0 && !hintOpen) onReviewCompleted(question.reviewMissionId);
        else onReviewDeferred(question.reviewMissionId);
      }
      setFeedback('correct');
      setBurst((n) => n + 1);
      playCue('correct', fun.sound);
      onCorrect(attempts === 0 && !hintOpen);
    } else {
      if (attempts === 0) {
        if (question.isOptionalReview && question.reviewMissionId) {
          onReviewDeferred(question.reviewMissionId);
        } else {
          onMissed(
            question.reviewMissionId ?? mission.id,
            question.reviewQuestionId ?? question.id,
          );
        }
      }
      setAttempts((current) => current + 1);
      setRuledOut((current) => current.includes(selection as number) ? current : [...current, selection as number]);
      // The guiding hint, not the worked explanation (that one names the answer; it shows after a right answer).
      setRetryText(wrongChoiceReason(question.prompt, question.choices, question.correctChoice, selection as number) ?? question.hint);
      if (!isQuickReview && !question.isOptionalReview) onPracticeSignal(question.reviewMissionId ?? mission.id, question.retryFeedback);
      setFeedback('retry');
      setShake((n) => n + 1);
      playCue('retry', fun.sound);
      onWrong();
      if (attempts + 1 >= 2) setUseSimplerModel(true);
    }
  };

  const moveOn = () => {
    if (!question) {
      onNext(firstTryAnswers);
      return;
    }
    const correctOnFirstTry = countsTowardLessonStars(question, lessonStarIds) && feedback === 'correct' && attempts === 0 ? 1 : 0;
    const updatedFirstTryAnswers = firstTryAnswers + correctOnFirstTry;
    if (isLastQuestion) {
      if (isQuickReview) {
        onFinishReview?.();
        return;
      }
      const stars = starsFromFirstTryAnswers(updatedFirstTryAnswers, lessonStarIds.size);
      onFinish(stars, updatedFirstTryAnswers);
      return;
    }
    onNext(updatedFirstTryAnswers);
  };

  const skipOptionalReview = () => {
    if (!question?.isOptionalReview) return;
    if (isQuickReview) trackEvent('quick_review_skipped');
    if (question.reviewMissionId) onReviewDeferred(question.reviewMissionId);
    if (isQuickReview && isLastQuestion) {
      onFinishReview?.();
      return;
    }
    onNext(firstTryAnswers);
  };

  const hintRef = useRef<HTMLDivElement>(null);
  const remediationRef = useRef<HTMLDivElement>(null);
  const [hintFlash, setHintFlash] = useState(0);
  const toggleHint = () => {
    if (!question) return;
    // After two misses the help already shows as "Let's make it simpler": the bulb points to it instead.
    const opening = !hintOpen || attempts >= 2;
    if (!hintOpen) { onPracticeSignal(question.reviewMissionId ?? mission.id); setAttempts(current => Math.max(1, current)); }
    if (attempts < 2) setHintOpen((open) => !open);
    if (opening) setHintFlash((count) => count + 1);
  };
  // The hint can open below the fold (under a worked example or a tall model), so bring it into view.
  useEffect(() => {
    if (!hintFlash) return;
    const target = (attempts >= 2 ? remediationRef : hintRef).current;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }, [hintFlash]);
  // `mission` can be a copy with review questions mixed in, so look it up by id.
  const lessonNumber = String(MISSIONS.findIndex((item) => item.id === mission.id) + 1).padStart(2, '0');
  const steps = mission.questions.length;
  const doneSteps = questionIndex + (feedback === 'correct' ? 1 : 0);
  const opener = question ? retryOpener(`${question.id}:${attempts}`) : '';
  // After a miss, Hoot's help is read aloud (with sound on), so a child who can't read it all still hears why.
  useReadAloud(reviewingPastIndex === null && feedback === 'retry' && fun.sound ? `${opener} ${retryText}` : null, reviewingPastIndex === null && feedback === 'retry' ? `${question?.id}:${attempts}` : null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useRevealWhen(sheetRef, feedback !== null);
  // On a short phone the choices can push Check below the screen: once an answer is picked, bring it into view.
  const checkButtonRef = useRef<HTMLButtonElement>(null);
  useRevealWhen(checkButtonRef, selection !== null && feedback === null);
  const helper = useLessonHelper({ compact: true });
  const cheer = combo >= 3 ? `${combo} in a row! You're on fire.` : question?.isMastery ? 'Practice checkpoint passed!' : ['Nice work!', 'You found it!', 'Great thinking!', 'Yes, that\'s it!'][(questionIndex + 4) % 4];

  return (
    <div className={`fq-app fq-lesson-app ${question ? 'has-inline-check' : ''}`} style={{ '--unit': unitColor(mission.unit) } as CSSProperties}>
      <Confetti burst={burst} />
      <main className="fq-shell fq-play-shell fq-appear">
        <div className="fq-lesson-top">
          <button className="fq-icon-button fq-lesson-close" onClick={onBack} aria-label="Back to learning map" data-testid="button-back-map"><X size={22} strokeWidth={3} /></button>
          <div className="fq-segments" role="group" aria-label={`Lesson question progress: ${doneSteps} of ${steps} completed`} data-testid="status-lesson-progress">
            {Array.from({ length: steps }, (_, index) => index < doneSteps
              ? <button key={index} type="button" className="fq-segment on" onClick={() => setReviewingPastIndex(index)} aria-label={`Review completed question ${index + 1}`} title={`Review question ${index + 1}`} data-testid={`button-review-question-${index + 1}`} />
              : <span key={index} className={`fq-segment ${index === doneSteps ? 'now' : ''}`} aria-hidden="true" />)}
            <span className="fq-sr" aria-live="polite">Question {Math.min(questionIndex + 1, steps)} of {steps}; {doneSteps} completed.</span>
          </div>
          {combo >= 2 && <span className="fq-combo" data-testid="status-combo"><Flame size={16} fill="currentColor" /> {combo}</span>}
          {helper.button}
          {question && reviewingPastIndex === null && (
            <button className={`fq-bulb ${hintOpen ? 'open' : ''}`} onClick={toggleHint} aria-expanded={hintOpen} aria-label={hintOpen ? 'Hide hint' : 'Show a hint'} data-testid="button-show-hint">
              <Lightbulb size={20} strokeWidth={2.75} />
            </button>
          )}
        </div>

        {helper.panel}
        <section className="fq-play-card" aria-labelledby={reviewingPastIndex === null ? 'lesson-title' : 'past-review-heading'}>
          {reviewingPastIndex !== null && mission.questions[reviewingPastIndex] ? (
            <PastQuestionReview
              question={mission.questions[reviewingPastIndex]}
              questionNumber={reviewingPastIndex + 1}
              currentQuestionNumber={questionIndex + 1}
              onReturn={() => setReviewingPastIndex(null)}
            />
          ) : (
            <>
          <p className="fq-play-kicker">
            {question?.storySetup && <span className="fq-story-problem-tag" data-testid="story-problem-tag">Story problem</span>}
            {isQuickReview
              ? `Quick skill review · ${question?.reviewTopicTitle ?? mission.shortTitle} · Question ${questionIndex + 1} of ${mission.questions.length}`
              : isExtraPractice
                ? `Practice more · Lesson ${lessonNumber} · Question ${questionIndex + 1} of ${mission.questions.length}`
              : showExample
                ? `Lesson ${lessonNumber} · ${mission.shortTitle} · See it, then try it · Question ${questionIndex + 1} of ${mission.questions.length}`
                : `Lesson ${lessonNumber} · ${mission.shortTitle} · Question ${questionIndex + 1} of ${mission.questions.length}`}
          </p>
          {(mission.gradeBand || mission.enrichment) && <p className="fq-node-standard">
            {mission.enrichment ? 'Bonus enrichment' : `Grade ${mission.gradeBand}`}
            {mission.standards?.length ? ` · ${mission.standards.join(', ')}` : ''}
          </p>}
          {/* One friendly line per question: the story friend's (in the season's props) when the story is on, else the seasonal one. */}
          {question && !showExample && (storyOn && chapterFor(mission.unit)
            ? <StorySay chapter={chapterFor(mission.unit)!} questionId={question.id} result={feedback} setup={question.storySetup} />
            : seasonOn && <SeasonSay kind={question.model.kind} id={question.id} />)}
          {showExample
            ? <h1 id="lesson-title">{mission.title}</h1>
            : <StoryPrompt prompt={question?.prompt ?? ''} id="lesson-title" />}
          {showExample && <GuidedExample mission={mission} withTap={false} />}
          {question && (
            <>
              {actionFirst && <StorySay chapter={chapterFor(mission.unit)!} questionId={question.id} result={feedback} setup={question.storySetup ?? lessonAsk(mission)} />}
              {showExample && <StoryPrompt prompt={question.prompt} id="lesson-question-title" />}
              {question.isReview && <div className="fq-review-label"><RotateCcw size={15} />{question.isOptionalReview ? `${isQuickReview ? 'Due skill' : 'Optional review'} · ${question.reviewTopicTitle}` : ' A quick revisit to help it stick'}</div>}
              {question.isMastery && <div className="fq-mastery-label"><Star size={15} /> Practice checkpoint · Models and worksheet come next</div>}
              <div className="fq-model-area" data-testid="question-model-area">
                <ModelView model={useSimplerModel ? question.simplerModel : question.model} reveal={feedback === 'correct'} asked={!useSimplerModel} walk={feedback === 'retry' ? attempts : null} />
              </div>
              {hintOpen && attempts < 2 && <div ref={hintRef} key={`hint-${hintFlash}`} className="fq-hint fq-hint-flash" data-testid="text-question-hint"><Lightbulb size={18} /> <span className="fq-hint-copy"><strong>Try this idea:</strong> <LearningListenButton text={question.hint} label="Listen to the hint" /><span><LearningText text={question.hint} /></span></span></div>}
              {attempts >= 2 && (
                <div ref={remediationRef} key={`remediation-${hintFlash}`} className={`fq-remediation ${hintFlash ? 'fq-hint-flash' : ''}`} role="note" data-testid="status-remediation">
                  <div className="fq-remediation-heading"><strong>Let's make it simpler.</strong><LearningListenButton text={question.hint} label="Listen to the simpler explanation" /></div>
                  <span><LearningText text={question.hint} /></span>
                  <ModelView model={question.simplerModel} compact />
                </div>
              )}
              <div className="fq-answer-choices" role="group" aria-label="Choose an answer">
                {question.choices.map((choice, index) => {
                  const out = ruledOut.includes(index) && !(selection === index && feedback === 'retry');
                  return (
                  <button
                    key={`${question.id}-${index}${selection === index && feedback === 'retry' ? `-shake-${shake}` : ''}`}
                    className={`fq-answer-choice ${selection === index ? `selected ${feedback ?? ''}` : ''} ${selection === index && feedback === 'retry' ? 'fq-shake' : ''} ${out ? 'ruled-out' : ''}`}
                    disabled={out}
                    onClick={() => {
                      if (feedback === 'correct' || out) return;
                      if (selection !== index) playHaptic('selection');
                      setSelection(index);
                      if (feedback === 'retry') setFeedback(null);
                    }}
                    aria-pressed={selection === index}
                    data-testid={`button-answer-${question.id}-${index}`}
                  >
                    <span className="fq-choice-marker" aria-hidden="true">{out ? <X size={16} strokeWidth={3} /> : String.fromCharCode(65 + index)}</span>
                    <span><MathText text={choice} /><span className="fq-sr">{out ? ' (already tried)' : selection === index ? ` (${feedback === 'correct' ? 'correct' : feedback === 'retry' ? 'try again' : 'selected, not checked yet'})` : ''}</span></span>
                  </button>
                  );
                })}
              </div>
              {/* Check sits right under the answers (not in a bar over them) so every answer stays in view. */}
              {feedback ? (
                <div ref={sheetRef} className={`fq-sheet fq-inline-feedback ${feedback}`} role="status" data-testid="status-feedback" data-result={feedback}>
                  {feedback === 'correct' ? <Mascot mood="cheer" size={56} /> : <Hoot size={60} />}
                  <div className="fq-sheet-copy">
                    {feedback === 'correct'
                      ? <><strong className="fq-feedback-heading">{cheer}<LearningListenButton text={question.retryFeedback} label="Listen to the feedback" /></strong><span><LearningText text={question.retryFeedback} /></span></>
                      : <><strong>{opener}</strong><span><LearningText text={retryText} /></span></>}
                  </div>
                  {feedback === 'correct' ? (
                    <button className="fq-button fq-sheet-button" onClick={moveOn} data-testid={isLastQuestion ? 'button-finish-mission' : 'button-next-question'}>
                      {isLastQuestion ? isQuickReview ? 'Finish review' : isExtraPractice ? 'Finish practice' : 'Build & explain next' : 'Continue'} <ArrowRight size={17} />
                    </button>
                  ) : (
                    <button className="fq-button fq-sheet-button" onClick={() => { setFeedback(null); setSelection(null); }} data-testid="button-try-again">
                      Try again
                    </button>
                  )}
                </div>
              ) : (
                <div className="fq-inline-check">
                  {question.isOptionalReview ? (
                    <button className="fq-hint-button" onClick={skipOptionalReview} data-testid="button-skip-review">Skip this review</button>
                  ) : <span />}
                  <button ref={checkButtonRef} className="fq-button" onClick={checkAnswer} disabled={selection === null} data-testid="button-check-answer">
                    Check <Check size={17} strokeWidth={3} />
                  </button>
                </div>
              )}
            </>
          )}
            </>
          )}
        </section>
      </main>

    </div>
  );
}

function PastQuestionReview({
  question,
  questionNumber,
  currentQuestionNumber,
  onReturn,
}: {
  question: PracticeQuestion;
  questionNumber: number;
  currentQuestionNumber: number;
  onReturn: () => void;
}) {
  return (
    <div className="fq-past-review" data-testid="panel-past-question-review">
      <p className="fq-play-kicker">Completed problem · Question {questionNumber}</p>
      <h1 id="past-review-heading">Review question {questionNumber}</h1>
      <p className="fq-past-review-note">You’re still on question {currentQuestionNumber}. Reviewing this problem will not change your lesson progress.</p>
      <StoryPrompt prompt={question.prompt} id={`past-review-prompt-${questionNumber}`} />
      <div className="fq-model-area" data-testid="past-review-model">
        <ModelView model={question.model} reveal />
      </div>
      <div className="fq-past-review-answer" role="note">
        <strong>Correct answer: <MathText text={question.choices[question.correctChoice] ?? ''} /></strong>
        <div className="fq-past-review-explanation">
          <LearningListenButton text={question.retryFeedback} label="Listen to the explanation" />
          <span><LearningText text={question.retryFeedback} /></span>
        </div>
      </div>
      <button className="fq-button secondary" onClick={onReturn} data-testid="button-return-to-current-question">
        Back to question {currentQuestionNumber}
      </button>
    </div>
  );
}

/** A lesson's last question as its story problem (story mode): same model, answer and numbers, told in the chapter
   with the season's props. Lessons without a written story problem keep their question as it is. */
function storyQuestion(mission: Mission, question: PracticeQuestion, storyOn: boolean, theme: PropTheme): PracticeQuestion {
  const problem = storyOn && chapterFor(mission.unit) ? storyProblemFor(mission.id) : null;
  if (!problem) return question;
  return { ...question, prompt: withName(problem.prompt, null, theme), choices: (problem.choices ?? question.choices).map((choice) => withName(choice, null, theme)), storySetup: problem.setup };
}

function RewardView({ mission, stars, progress, onMap, onNext, onReset, onGame, onSuspects }: { mission: Mission; stars: number; progress: Progress; onMap: () => void; onNext: (missionId: string) => void; onReset: () => void; onGame: (type: 'race' | 'code') => void; onSuspects: (board: SuspectBoard) => void }) {
  const nextMission = getNextMission(progress);
  // Units 9+ open only after every lesson in the unit before is done, so "next lesson is open" is not always true.
  const following = MISSIONS[MISSIONS.findIndex((item) => item.id === mission.id) + 1];
  const nextLessonOpen = !following || isMissionUnlocked(progress, following.id);
  const { fun } = useFun();
  const storyOn = fun.displayPreferences?.storyMode !== false;
  const account = useAccount();
  const chapter = chapterFor(mission.unit);
  const unitMissions = MISSIONS.filter((item) => item.unit === mission.unit);
  const { season } = useSeason();
  useEffect(() => {
    playCue('complete', fun.sound);
    const timers = Array.from({ length: stars }, (_, index) => window.setTimeout(() => playCue('star', fun.sound), 700 + index * 380));
    return () => timers.forEach(window.clearTimeout);
    // Play once when the reward screen opens.
  }, []);
  return (
    <div className="fq-app">
      <Confetti burst={1} />
      <Topbar progress={progress} onReset={onReset} onHome={onMap} />
      <main className="fq-shell">
        <section className="fq-reward fq-appear" data-testid="status-mission-complete">
          {/* With the story on, the chapter friend does the cheering, so the screen stays short (a season keeps Numi for the costume). */}
          {!(storyOn && chapter && !season) && <div className="fq-reward-mascot" aria-hidden="true"><Mascot mood="cheer" size={120} /><span className="fq-reward-trophy"><Trophy size={30} strokeWidth={2.5} /></span></div>}
           <div className="fq-eyebrow" style={{ justifyContent: 'center' }}><Sparkles size={14} fill="currentColor" /> Lesson completed</div>
          <h1>{season && <>{season.cheer}<br /></>}{mission.title}<br />is on your map.</h1>
           <p className={storyOn && chapter ? 'fq-reward-note' : undefined}>{storyOn && chapter ? '' : 'You built it two ways, explained it, and finished the worksheet. '}{nextLessonOpen ? 'The next lesson is open!' : 'Finish the other lessons in this unit to open the next unit.'}</p>
          <SeasonReward missionId={mission.id} />
          {storyOn && chapter && <StoryPayoff chapter={chapter} lessonIndex={unitMissions.indexOf(mission)} lessonsTotal={unitMissions.length}
            chapterDone={unitMissions.every((item) => hasLearningGate(progress, item.id))} piecesFound={completedStoryUnits(progress).size} name={account.activeProfile?.displayName ?? null}
            problem={storyProblemFor(mission.id) ?? undefined}
            sticker={lessonSticker(chapter, unitMissions.indexOf(mission), mission.title)}
            onSuspects={([1, 2] as SuspectBoard[]).filter((board) => BOARD_AFTER[board] === chapter.unit).map((board) => () => onSuspects(board))[0]} />}
          <div className="fq-reward-stars" data-testid="status-mission-stars" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((star) => <Star key={star} size={44} strokeWidth={2.5} className={star < stars ? 'filled' : ''} style={{ animationDelay: `${0.7 + star * 0.38}s` }} />)}</div>
          <div className="fq-reward-actions">
            {nextMission ? <button className="fq-button secondary" onClick={() => onNext(nextMission.id)} data-testid={`button-next-mission-${nextMission.id}`}>Next lesson <ArrowRight size={17} /></button> : <span className="fq-course-finished">Course complete!</span>}
            <button className="fq-button ghost" onClick={onMap} data-testid="button-return-map"><MapIcon size={17} /> Learning map</button>
          </div>
          <div className="fq-reward-play">
            <span>Play it:</span>
            <button className="fq-button ghost" onClick={() => onGame('race')} data-testid="button-reward-race"><Zap size={17} /> Race</button>
            <button className="fq-button ghost" onClick={() => onGame('code')} data-testid="button-reward-code"><Code2 size={17} /> Code</button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ExtraDoneView({ mission, firstTry, total, fresh, progress, onMap, onAgain, onNew, onReset }: { mission: Mission; firstTry: number; total: number; fresh: boolean; progress: Progress; onMap: () => void; onAgain: () => void; onNew: () => void; onReset: () => void }) {
  const { fun } = useFun();
  useEffect(() => { playCue('complete', fun.sound); }, []); // once, when the round ends
  return (
    <div className="fq-app">
      <Confetti burst={firstTry >= total - 2 ? 1 : 0} />
      <Topbar progress={progress} onReset={onReset} onHome={onMap} />
      <main className="fq-shell">
        <section className="fq-reward fq-appear" data-testid="status-extra-complete">
          <div className="fq-reward-mascot" aria-hidden="true"><Mascot mood="cheer" size={110} /></div>
          <div className="fq-eyebrow" style={{ justifyContent: 'center' }}><Dumbbell size={14} /> {fresh ? 'New questions' : 'Practice more'} · {mission.shortTitle}</div>
          <h1>Practice round done!</h1>
          <p data-testid="text-extra-score"><strong>{firstTry}</strong> of {total} right on the first try. {fresh ? 'Want more? Every round of new questions is different.' : 'Practice again any time; it gets easier every round.'}</p>
          <div className="fq-reward-actions">
            <button className="fq-button" onClick={onNew} data-testid="button-extra-new"><Sparkles size={17} /> New questions</button>
            <button className="fq-button secondary" onClick={onAgain} data-testid="button-extra-again"><RotateCcw size={17} /> {fresh ? 'Same questions again' : 'Practice again'}</button>
            <button className="fq-button ghost" onClick={onMap} data-testid="button-extra-map"><MapIcon size={17} /> Learning map</button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ReviewCompleteView({ reviewedCount, progress, onMap, onReset }: { reviewedCount: number; progress: Progress; onMap: () => void; onReset: () => void }) {
  return (
    <div className="fq-app">
      <Topbar progress={progress} onReset={onReset} onHome={onMap} />
      <main className="fq-shell">
        <section className="fq-reward fq-appear" data-testid="status-review-complete">
          <div className="fq-reward-badge" aria-hidden="true"><Check size={49} strokeWidth={2.8} /></div>
          <div className="fq-eyebrow" style={{ justifyContent: 'center' }}><RotateCcw size={14} /> Quick skill review</div>
          <h1>Quick round complete.</h1>
          <p>You finished {reviewedCount} quick {reviewedCount === 1 ? 'question' : 'questions'}. Anything you missed will come back another day.</p>
          <div className="fq-reward-actions">
            <button className="fq-button secondary" onClick={onMap} data-testid="button-review-return-map"><MapIcon size={17} /> Learning map</button>
          </div>
        </section>
      </main>
    </div>
  );
}

function Game() {
  const account = useAccount();
  const [progress, setProgress] = useState<Progress>(() => account.initialProgress ?? loadProgress());
  const [moduleTestActive, setModuleTestActive] = useState(false);
  const originalModuleTestProgress = useRef<Progress | null>(null);
  const originalModuleTestFun = useRef<FunState | null>(null);
  const [view, setView] = useState<View | LabView | RetentionView | PaperView | RedoView | ChallengeView | ExtraView | ParentPage | GameView | PlacementView>({ type: 'map' });
  const [pendingRetention, setPendingRetention] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetAllConfirm, setResetAllConfirm] = useState(false);
  const [resetUnit, setResetUnit] = useState(1);
  const [saveError, setSaveError] = useState(false);
  const [fun, setFun] = useState<FunState>(() => account.initialFun ?? loadFun());
  const storyMode = fun.displayPreferences?.storyMode !== false;
  const storyTheme = propTheme(useSeason().season?.id);
  const [combo, setCombo] = useState(0);
  const [breakReason, setBreakReason] = useState<'interval' | 'mistakes' | 'lesson-part' | null>(null);
  const activeStudyMilliseconds = useRef(0);
  const consecutiveWrongAnswers = useRef(0);
  const breakIntervalMinutes = fun.breakPreferences?.intervalMinutes ?? 15;
  const quietBreaks = fun.breakPreferences?.quietMode ?? false;
  const activeStudyView = ['play', 'review', 'daily', 'lab', 'redo', 'extra', 'retention'].includes(view.type);
  useAccountSync(progress, fun, !moduleTestActive);
  const openResetDialog = () => {
    if (moduleTestActive) { returnToMap(); return; }
    setResetAllConfirm(false);
    setResetOpen(true);
  };

  // The next story comic reads itself aloud as it opens: fetch its voice while the map is showing, so it starts at
  // once (the prologue too, before the first lesson).
  const onMap = view.type === 'map';
  const prologueSeen = !!fun.story?.prologueSeen;
  useEffect(() => {
    if (!onMap || !storyMode || fun.sound === false) return;
    const timer = setTimeout(() => {
      const next = getNextMission(progress);
      const chapter = next && chapterFor(next.unit);
      if (!next || !chapter) return;
      const index = MISSIONS.filter((item) => item.unit === next.unit).indexOf(next);
      // Filmed comics (the prologue, chapter openings with a scene) read just the lines; plain ones say who speaks.
      if (!prologueSeen) prefetchReading(filmedLines(PROLOGUE, storyTheme).join(' '));
      const panels = lessonComic(chapter, next, index);
      prefetchReading(index === 0 && CHAPTER_SCENES[chapter.unit] ? filmedLines(panels, storyTheme).join(' ') : storyScript(panels, storyTheme));
    }, 1500);
    return () => clearTimeout(timer);
  }, [onMap, progress, storyMode, fun.sound, prologueSeen, storyTheme]);

  // Inside the app (iPhone and Android), on Wi-Fi, keep the whole voice pack on the phone so every sentence plays at once. It
  // pauses when Wi-Fi drops or the app goes to the background, and picks up where it left off.
  useEffect(() => {
    let running = false;
    let stopped = false;
    const canRun = () => !stopped && !!appShell()?.wifi && !document.hidden && naturalVoiceId() !== null;
    const start = () => {
      if (running || !canRun()) return;
      running = true;
      void warmUpNaturalVoice()
        .then((engine) => { const voice = naturalVoiceId(); return engine && voice ? downloadWholeVoicePack(voice, canRun) : null; })
        .catch(() => null)
        .finally(() => { running = false; });
    };
    const timer = setTimeout(start, 8000); // after the first screen has what it needs
    const stopListening = onAppShellChange(start);
    document.addEventListener('visibilitychange', start);
    return () => { stopped = true; clearTimeout(timer); stopListening(); document.removeEventListener('visibilitychange', start); };
  }, []);

  // Check the natural voice soon after opening (a tiny request; it also wakes the server's voice), so the very
  // first Listen already uses it instead of the device voice.
  useEffect(() => {
    const timer = setTimeout(() => { void warmUpNaturalVoice(); }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const preferences = fun.displayPreferences ?? { textSize: 'standard', highContrast: false, reducedMotion: false };
    root.dataset.fqTextSize = preferences.textSize;
    root.classList.toggle('fq-high-contrast', preferences.highContrast);
    root.classList.toggle('fq-reduced-motion', preferences.reducedMotion);
    const season = activeSeason(fun);
    if (season) root.dataset.fqSeason = season.id; else delete root.dataset.fqSeason;
    return () => {
      delete root.dataset.fqTextSize;
      delete root.dataset.fqSeason;
      root.classList.remove('fq-high-contrast', 'fq-reduced-motion');
    };
  }, [fun.displayPreferences]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Count report time only while the tab is visible and recently used. On lesson screens,
  // accumulate active time toward an optional break reminder; the break itself never counts.
  useEffect(() => {
    let lastInput = Date.now();
    let lastTick = Date.now();
    const touch = () => { lastInput = Date.now(); };
    window.addEventListener('pointerdown', touch); window.addEventListener('keydown', touch);
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      lastTick = now;
      if (document.visibilityState !== 'visible' || now - lastInput >= 120_000) return;
      if (!breakReason) setFun((current) => recordMinute(current));
      if (activeStudyView && breakIntervalMinutes > 0 && !breakReason) {
        activeStudyMilliseconds.current += elapsed;
        if (activeStudyMilliseconds.current >= breakIntervalMinutes * 60_000) {
          consecutiveWrongAnswers.current = 0;
          setBreakReason('interval');
        }
      }
    }, 60_000);
    return () => { window.clearInterval(timer); window.removeEventListener('pointerdown', touch); window.removeEventListener('keydown', touch); };
  }, [view.type, activeStudyView, breakIntervalMinutes, breakReason]);

  useEffect(() => {
    activeStudyMilliseconds.current = 0;
    consecutiveWrongAnswers.current = 0;
  }, [breakIntervalMinutes]);

  const startMission = (missionId: string, testProgress?: Progress, afterStory = false) => {
    const activeProgress = testProgress ?? progress;
    if (!testProgress && !isMissionUnlocked(activeProgress, missionId)) return;
    const record = getLearningRecord(activeProgress, missionId);
    // A lesson started for the first time opens with its story comic (when story mode is on).
    const mission = MISSIONS.find((item) => item.id === missionId);
    // Practice already under way: go back to the same question, past the story and the hands-on start.
    const at = record.practiceAt;
    if (!testProgress && !record.practiceDone && at && at.index > 0 && mission) {
      const reviewQuestions = getDelayedReviewQuestions(activeProgress, missionId);
      const extra = hasGenerator(missionId) ? getExtraPractice(missionId, mission.questions.map((q) => q.id)).slice(0, EXTRA_IN_LESSON).length : 0;
      if (at.index < mission.questions.length + extra + reviewQuestions.length) {
        setView({ type: 'play', missionId, questionIndex: at.index, firstTryAnswers: at.firstTry, reviewQuestions });
        return;
      }
    }
    if (!afterStory && !testProgress && storyMode && mission && chapterFor(mission.unit) && !record.practiceDone && !hasLearningGate(activeProgress, missionId)) {
      // The comic starts reading by itself, so unlock sound while still inside the tap that opened it.
      primeReadAloud();
      // The very first lesson opens with the one-time comic prologue (it introduces the Whole Stone).
      setView(fun.story?.prologueSeen
        ? { type: 'story', missionId }
        : { type: 'story', missionId, prologue: true });
      return;
    }
    // Unfinished work, or every step done but "Finish lesson" not pressed yet: go back to the lab, where the
    // finish button waits. Only a finished lesson replays from the start.
    if (record.practiceDone && (!hasLearningGate(progress, missionId) || !progress.completedMissionIds.includes(missionId))) {
      setView({ type: 'lab', missionId, stars: progress.starsByMission[missionId] ?? record.practiceStars ?? 1 });
      return;
    }
    const reviewQuestions = getDelayedReviewQuestions(activeProgress, missionId);
    if (missionId === 'order-unlike-fractions') {
      setView({ type: 'fraction-sort', missionId, reviewQuestions });
      return;
    }
    if (PART_FINDER_LESSONS.has(missionId)) {
      setView({ type: 'hands-on', missionId, reviewQuestions });
      return;
    }
    setView({
      type: 'play',
      missionId,
      questionIndex: 0,
      firstTryAnswers: 0,
      reviewQuestions,
      showExample: true,
    });
  };
  const startDeveloperLessonTest = (missionId: string) => {
    if (!import.meta.env.DEV || moduleTestActive) return;
    const previewProgress = createDeveloperLessonProgress(progress, missionId);
    if (!previewProgress) return;
    originalModuleTestProgress.current = progress;
    originalModuleTestFun.current = fun;
    setFunStorageEnabled(false);
    setModuleTestActive(true);
    setProgress(previewProgress);
    startMission(missionId, previewProgress);
  };

  const startReview = () => {
    setPendingRetention(null);
    const reviewQuestions = getDueSkillReviewQuestions(progress);
    if (reviewQuestions.length === 0) return;
    trackEvent('quick_review_started');
    setView({ type: 'review', questionIndex: 0, reviewQuestions });
  };

  const startDailyPractice = () => {
    const saved = progress.dailyPractice;
    const session = saved?.day === dailyPracticeDay() ? saved : createDailyPractice(progress);
    if (session !== saved) persistProgress(recordDailyPracticeStart(progress, session));
    setView({ type: 'daily' });
  };

  const persistProgress = (nextProgress: Progress) => {
    if (!moduleTestActive) setSaveError(!saveProgress(nextProgress));
    setProgress(nextProgress);
  };

  const finishMission = (missionId: string, stars: number) => {
    const nextProgress = completeMission(progress, missionId, stars);
    if (!hasLearningGate(nextProgress, missionId)) return;
    persistProgress(nextProgress);
    const season = activeSeason(fun);
    if (season) setFun((current) => recordSeasonLesson(current, season.key, missionId));
    setView({ type: 'reward', missionId, stars: nextProgress.starsByMission[missionId] ?? stars });
    if (breakIntervalMinutes > 0) setBreakReason('lesson-part');
  };

  const resetProgress = () => {
    persistProgress(resetSavedProgress());
    setFun(resetFun());
    setCombo(0);
    setView({ type: 'map' });
    setResetOpen(false);
  };

  const resetSelectedUnit = () => {
    const missionIds = new Set(MISSIONS.filter((mission) => mission.unit === resetUnit).map((mission) => mission.id));
    persistProgress(resetUnitLearningProgress(progress, missionIds, resetUnit));
    setFun(resetMissionGameProgress(fun, missionIds));
    setCombo(0);
    setView({ type: 'map' });
    setResetOpen(false);
  };

  const baseMission = view.type === 'play' || view.type === 'reward' || view.type === 'lab' || view.type === 'retention'
    ? getMission(view.missionId)
    : view.type === 'review'
      ? getMission(view.reviewQuestions[0].reviewMissionId!)
      : null;
  const activeMission = view.type === 'play' && baseMission
    ? {
        ...baseMission,
        questions: [
          ...baseMission.questions.slice(0, -1),
          ...(hasGenerator(baseMission.id) ? getExtraPractice(baseMission.id, baseMission.questions.map((q) => q.id)).slice(0, EXTRA_IN_LESSON) : []),
          ...view.reviewQuestions,
          storyQuestion(baseMission, baseMission.questions[baseMission.questions.length - 1], storyMode, propTheme(activeSeason(fun)?.id)),
        ],
      }
    : view.type === 'review' && baseMission
      ? { ...baseMission, questions: view.reviewQuestions }
      : baseMission;
  /** Practice a finished lesson's builds or worksheet again (keeps an unfinished redo of the same part). */
  const startRedoPart = (missionId: string, part: RedoPart) => {
    if (!hasLearningGate(progress, missionId)) return;
    const record = getLearningRecord(progress, missionId);
    if (!(record.redo?.part === part && !record.redo.finishedAt)) persistProgress(updateLearning(progress, missionId, startRedo(record, part)));
    setView({ type: 'redo', missionId });
  };
  const exitGame = () => { if ((view.type === 'race' || view.type === 'code') && view.fromGames) setView({ type: 'concept-games' }); else returnToMap(); };
  const returnToMap = () => {
    setPendingRetention(null);
    setCombo(0);
    consecutiveWrongAnswers.current = 0;
    const savedProgress = originalModuleTestProgress.current;
    const savedFun = originalModuleTestFun.current;
    if (savedProgress) {
      setFunStorageEnabled(true);
      setProgress(savedProgress);
      if (savedFun) setFun(savedFun);
      originalModuleTestProgress.current = null;
      originalModuleTestFun.current = null;
      setModuleTestActive(false);
    }
    setView({ type: 'map' });
  };
  // The browser's back button returns to the map instead of leaving Fraction Quest: opening any screen adds one
  // history entry, and going back from it closes the screen. Coming back to the map in the app removes that entry.
  const viewOnMap = useRef(onMap);
  viewOnMap.current = onMap;
  const returnToMapRef = useRef(returnToMap);
  returnToMapRef.current = returnToMap;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const inScreen = (window.history.state as { fqScreen?: boolean } | null)?.fqScreen === true;
    if (!onMap && !inScreen) window.history.pushState({ fqScreen: true }, '');
    if (onMap && inScreen) window.history.back();
  }, [onMap]);
  useEffect(() => {
    const onPop = () => { if (!viewOnMap.current) returnToMapRef.current(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const nextReviewView = (nextView: View) => {
    if (pendingRetention) {
      setView({ type: 'retention', missionId: pendingRetention, startedAt: Date.now(), nextView });
      setPendingRetention(null);
    } else {
      if (nextView.type === 'review-complete') trackEvent('quick_review_completed');
      setView(nextView);
    }
  };
  const closeBreak = () => {
    activeStudyMilliseconds.current = 0;
    consecutiveWrongAnswers.current = 0;
    setBreakReason(null);
  };
  const onPracticeCorrect = (firstTry: boolean) => {
    consecutiveWrongAnswers.current = 0;
    setFun((current) => recordCorrect(current));
    setCombo((current) => (firstTry ? current + 1 : 0));
  };
  const onWorksheetAnswerCorrect = (missionId: string, problemId: string) => {
    setFun((current) => recordWorksheetCorrect(current, missionId, problemId));
  };
  const onPracticeSuccess = () => { consecutiveWrongAnswers.current = 0; };
  /** Daily practice answers count like lesson answers: XP, today's goal, streak and the weekly report. */
  const onDailyCorrect = () => { consecutiveWrongAnswers.current = 0; setFun((current) => recordCorrect(current)); };
  const onPracticeWrong = () => {
    setCombo(0);
    consecutiveWrongAnswers.current += 1;
    if (breakIntervalMinutes > 0 && activeStudyView && consecutiveWrongAnswers.current >= 3 && !breakReason) {
      consecutiveWrongAnswers.current = 0;
      setBreakReason('mistakes');
    }
  };

  return (
    <FunContext.Provider value={{ fun, setFun }}>
      {moduleTestActive && <div className="fq-developer-test-banner" role="status" data-testid="developer-test-banner">
        Developer lesson test · progress is temporary and will not be saved.
        <button type="button" onClick={returnToMap} data-testid="button-exit-developer-test">Exit test</button>
      </div>}
      {saveError && <div className="fq-feedback retry fq-shell" role="alert" data-testid="status-save-error">This browser could not save your work. Keep this tab open; worksheet answers may be lost on reload. Enable browser storage to save progress.</div>}
      {view.type === 'map' && <MissionMap progress={progress} onStart={startMission} onDeveloperTest={startDeveloperLessonTest} onOpenLab={(missionId) => { if (hasLearningGate(progress, missionId)) setView({ type: 'lab', missionId, stars: progress.starsByMission[missionId] ?? 1 }); }} onStartReview={startReview} onStartDaily={startDailyPractice} onConceptGames={() => setView({ type: 'concept-games' })} onAssessments={() => setView({ type: 'assessments' })} onReset={openResetDialog} onPaper={(missionId) => { if (isMissionUnlocked(progress, missionId) && paperCheckOpen(progress, missionId)) setView({ type: 'paper', missionId }); }} onChallenge={(unit) => setView({ type: 'challenge', unit })} onExtra={(missionId) => { if (isMissionUnlocked(progress, missionId) && hasGenerator(missionId)) setView({ type: 'extra', missionId, seed: 0, questionIndex: 0, firstTry: 0 }); }} onParent={() => setView({ type: 'parent' })} onGame={(type, missionId) => { if (isMissionUnlocked(progress, missionId)) setView({ type, missionId }); }} onPlacement={() => setView({ type: 'placement' })} onStorybook={(tab, unit) => setView({ type: 'storybook', tab, unit })} onStory={(missionId) => { primeReadAloud(); setView({ type: 'story', missionId, replay: 'map' }); }}
        onPrologue={() => {
          // Not seen yet: the same start as the next lesson's (the prologue, then that lesson). Seen: watch it again.
          const next = getNextMission(progress) ?? MISSIONS[0];
          primeReadAloud();
          if (next) setView(fun.story?.prologueSeen ? { type: 'story', missionId: next.id, prologue: true, replay: 'map' } : { type: 'story', missionId: next.id, prologue: true });
        }} />}
      {view.type === 'daily' && progress.dailyPractice && <DailyPractice session={progress.dailyPractice} renderModel={(model, reveal) => <ModelView model={model} reveal={reveal} asked />} onChange={(session) => persistProgress(applyAdaptiveDailyPracticeUpdate(progress, session))} onBack={returnToMap} onWrong={onPracticeWrong} onSuccess={onDailyCorrect} />}
      {view.type === 'concept-games' && (() => {
        // The lesson games use the lesson the child is on (or the last open one).
        const open = MISSIONS.filter((mission) => isMissionUnlocked(progress, mission.id));
        const lesson = getNextMission(progress) ?? open[open.length - 1] ?? MISSIONS[0];
        const name = (mission: Mission) => `Lesson ${MISSIONS.indexOf(mission) + 1}: ${mission.shortTitle}`;
        const games: LessonGame[] = [
          { id: 'race', title: 'Fraction Race', blurb: 'Race a robot or a friend with quick questions.', icon: Zap, lessonTitle: name(lesson), onOpen: () => setView({ type: 'race', missionId: lesson.id, fromGames: true }) },
          { id: 'code', title: 'Coding', blurb: 'Write a little program that builds the fraction.', icon: Code2, lessonTitle: name(lesson), onOpen: () => setView({ type: 'code', missionId: lesson.id, fromGames: true }) },
        ];
        return <ConceptGames onExit={returnToMap} lessonGames={games} />;
      })()}
      {view.type === 'assessments' && <AssessmentHub attempts={progress.assessments ?? []} onStart={definition => setView({ type: 'assessment', definition, seed: freshSeed() })} onBack={returnToMap} />}
      {view.type === 'assessment' && <AssessmentRunner key={`${view.definition.id}:${view.seed}`} definition={view.definition} seed={view.seed}
        onComplete={attempt => persistProgress(saveAssessmentAttempt(progress, attempt))} onExit={() => setView({ type: 'assessments' })} />}
      {view.type === 'placement' && <PlacementQuiz unitTitles={UNIT_TITLES} onExit={returnToMap} onDone={(passed) => { persistProgress(applyPlacement(progress, passed)); returnToMap(); }} />}
      {view.type === 'race' && (
        <FractionRace key={view.missionId} mission={getMission(view.missionId)} best={fun.raceBest?.[view.missionId] ?? null} robotBeaten={fun.robotBeaten?.[view.missionId] ?? 0} sprintBest={fun.sprintBest?.[view.missionId] ?? null}
          onSprintFinish={(seconds) => setFun((current) => recordSprint(current, view.missionId, seconds))}
          onExit={exitGame} onFinish={(seconds, level) => setFun((current) => recordRace(current, view.missionId, seconds, level))}
          renderModel={(model) => <ModelView model={model} compact asked />} />
      )}
      {view.type === 'code' && (
        <CodeQuest key={view.missionId} mission={getMission(view.missionId)} solved={fun.codeLevels?.[view.missionId] ?? 0}
          onExit={exitGame} onSolved={(level) => setFun((current) => recordCodeLevel(current, view.missionId, level))} />
      )}
      {view.type === 'hands-on' && (() => {
        const mission = getMission(view.missionId);
        const toQuestions = () => setView({ type: 'play', missionId: view.missionId, questionIndex: 0, firstTryAnswers: 0, reviewQuestions: view.reviewQuestions });
        const activityTitle = view.missionId === 'equal-parts' ? 'Make fair shares'
          : view.missionId === 'unit-fractions' ? 'Build a fraction'
            : 'Find the same amount';
        const chapter = chapterFor(mission.unit);
        return <PartFinder key={view.missionId} rounds={partFinderRoundsFor(view.missionId)} lessonLabel={`Lesson ${String(MISSIONS.indexOf(mission) + 1).padStart(2, '0')}`}
          activityTitle={activityTitle} showFirstIntroduction={view.missionId === 'equal-parts'}
          intro={<GuidedExample mission={mission} title={mission.title} lessonLabel={`Lesson ${String(MISSIONS.indexOf(mission) + 1).padStart(2, '0')}`} hideMascot={view.missionId === 'equal-parts'} />}
          onExit={returnToMap} onDone={toQuestions} onSkip={progress.completedMissionIds.includes(view.missionId) || hasLearningGate(progress, view.missionId) ? toQuestions : undefined}
          {...(storyMode && chapter ? {
            friends: storyCast(chapter),
            storyLine: (result: 'correct' | 'retry' | null) => <StorySay chapter={chapter} questionId={`${view.missionId}-hands-on`} result={result} setup={HANDS_ON_ASKS[partFinderRoundsFor(view.missionId)[0]?.id ?? 'sort']} />,
          } : {})} />;
      })()}
      {view.type === 'fraction-sort' && (() => {
        const mission = getMission(view.missionId);
        const toQuestions = () => setView({ type: 'play', missionId: view.missionId, questionIndex: 0, firstTryAnswers: 0, reviewQuestions: view.reviewQuestions });
        return <FractionSortActivity key={view.missionId} rounds={FRACTION_ORDER_ROUNDS}
          lessonLabel={`Lesson ${String(MISSIONS.indexOf(mission) + 1).padStart(2, '0')}`}
          intro={<GuidedExample mission={mission} title={mission.title} lessonLabel={`Lesson ${String(MISSIONS.indexOf(mission) + 1).padStart(2, '0')}`} />}
          onExit={returnToMap} onDone={toQuestions} />;
      })()}
      {view.type === 'parent' && <ParentView progress={progress} fun={fun} unitTitles={UNIT_TITLES} childName={account.activeProfile?.displayName ?? null} onBack={returnToMap} onDeveloperTest={startDeveloperLessonTest} onBreakPreferencesChange={(preferences) => setFun((current) => setBreakPreferences(current, preferences))} onDisplayPreferencesChange={(preferences) => setFun((current) => setDisplayPreferences(current, preferences))} />}
      {view.type === 'extra' && (() => {
        const base = getMission(view.missionId);
        const baseIds = base.questions.map((q) => q.id);
        const practiceMission = { ...base, questions: view.seed ? generateQuestions(base.id, baseIds, view.seed, FRESH_ROUND) : getExtraPractice(base.id, baseIds) };
        return (
          <PlayView
            key={`extra-${view.missionId}-${view.seed}-${view.questionIndex}`}
            mission={practiceMission}
            questionIndex={view.questionIndex}
            firstTryAnswers={view.firstTry}
            combo={combo}
            onBack={returnToMap}
            onCorrect={onPracticeCorrect}
            onWrong={onPracticeWrong}
            onNext={(firstTry) => setView({ type: 'extra', missionId: view.missionId, seed: view.seed, questionIndex: view.questionIndex + 1, firstTry })}
            onFinish={(_stars, firstTry) => setView({ type: 'extra-done', missionId: view.missionId, seed: view.seed, firstTry, total: practiceMission.questions.length })}
            onMissed={(missionId, questionId) => persistProgress(recordMissedSkill(progress, missionId, questionId))}
            onReviewCompleted={() => {}}
            onReviewDeferred={() => {}}
            onPracticeSignal={() => {}}
            isExtraPractice
          />
        );
      })()}
      {view.type === 'extra-done' && (
        <ExtraDoneView mission={getMission(view.missionId)} firstTry={view.firstTry} total={view.total} progress={progress} onMap={returnToMap} onReset={openResetDialog}
          fresh={view.seed !== 0}
          onAgain={() => setView({ type: 'extra', missionId: view.missionId, seed: view.seed, questionIndex: 0, firstTry: 0 })}
          onNew={() => setView({ type: 'extra', missionId: view.missionId, seed: freshSeed(), questionIndex: 0, firstTry: 0 })} />
      )}
      {view.type === 'challenge' && (
        <Challenge key={view.unit} unit={view.unit} unitTitle={UNIT_INFO[view.unit - 1].title} best={progress.challengeBest?.[String(view.unit)] ?? 0}
          onExit={returnToMap}
          onDone={(score) => {
            const key = String(view.unit);
            if (score > (progress.challengeBest?.[key] ?? -1)) persistProgress({ ...progress, challengeBest: { ...progress.challengeBest, [key]: score } });
          }} />
      )}
      {view.type === 'paper' && (
        <PaperCheck missionId={view.missionId} progress={progress} onChange={persistProgress} onBack={view.fromLab ? () => setView({ type: 'lab', missionId: view.missionId, stars: progress.starsByMission[view.missionId] ?? getLearningRecord(progress, view.missionId).practiceStars ?? 1 }) : returnToMap}
          onWorksheetCorrect={onWorksheetAnswerCorrect}
          onLab={() => setView({ type: 'lab', missionId: view.missionId, stars: progress.starsByMission[view.missionId] ?? getLearningRecord(progress, view.missionId).practiceStars ?? 1 })} />
      )}
      {(view.type === 'play' || view.type === 'review') && activeMission && (
        <PlayView
          key={`${activeMission.id}-${view.questionIndex}`}
          mission={activeMission}
          starEligibleQuestionIds={view.type === 'play' && baseMission ? baseMission.questions.map((question) => question.id) : undefined}
          questionIndex={view.questionIndex}
          showExample={view.type === 'play' && view.showExample}
          firstTryAnswers={view.type === 'play' ? view.firstTryAnswers : 0}
          isQuickReview={view.type === 'review'}
          combo={combo}
          onBack={returnToMap}
          onCorrect={onPracticeCorrect}
          onWrong={onPracticeWrong}
          onNext={(firstTryAnswers) => {
            if (view.type === 'review') {
              nextReviewView({ type: 'review', questionIndex: view.questionIndex + 1, reviewQuestions: view.reviewQuestions });
            } else {
              // Remember the place, so a reload or the back button comes back to this question.
              if (!moduleTestActive) {
                const record = getLearningRecord(progress, activeMission.id);
                if (!record.practiceDone) persistProgress(updateLearning(progress, activeMission.id, { ...record, practiceAt: { index: view.questionIndex + 1, firstTry: firstTryAnswers } }));
              }
              setView({
                type: 'play',
                missionId: activeMission.id,
                questionIndex: view.questionIndex + 1,
                firstTryAnswers,
                reviewQuestions: view.reviewQuestions,
              });
            }
          }}
          onFinish={(stars) => {
            const record = getLearningRecord(progress, activeMission.id);
            persistProgress(updateLearning(progress, activeMission.id, { ...record, practiceDone: true, practiceAt: undefined, practiceStars: Math.max(stars, record.practiceStars ?? 0) }));
            setView({ type: 'lab', missionId: activeMission.id, stars });
            if (breakIntervalMinutes > 0) setBreakReason('lesson-part');
          }}
          onFinishReview={view.type === 'review' ? () => nextReviewView({ type: 'review-complete', reviewedCount: view.reviewQuestions.length }) : undefined}
          onMissed={(missionId, questionId) => persistProgress(recordMissedSkill(progress, missionId, questionId))}
          onReviewCompleted={(missionId) => {
            if (progress.learning?.[missionId]) {
              if (view.type === 'review') setPendingRetention(missionId);
              else persistProgress(deferSkillReview(progress, missionId));
            } else persistProgress(completeSkillReview(progress, missionId));
          }}
          onReviewDeferred={(missionId) => persistProgress(deferSkillReview(progress, missionId))}
          onPracticeSignal={(missionId, misconception) => {
            const record = getLearningRecord(progress, missionId);
            persistProgress(updateLearning(progress, missionId, { ...record, helpUses: record.helpUses + (misconception ? 0 : 1),
              misconceptions: misconception ? { ...record.misconceptions, [misconception]: (record.misconceptions[misconception] ?? 0) + 1 } : record.misconceptions }));
          }}
        />
      )}
      {view.type === 'lab' && <LearningLab missionId={view.missionId} progress={progress} onChange={persistProgress} onFinish={() => finishMission(view.missionId, view.stars)} onBack={returnToMap} onPaper={() => setView({ type: 'paper', missionId: view.missionId, fromLab: true })} onRedo={(part) => startRedoPart(view.missionId, part)} onWrong={onPracticeWrong} onSuccess={onPracticeSuccess} onWorksheetCorrect={onWorksheetAnswerCorrect} />}
      {view.type === 'redo' && <RedoLab missionId={view.missionId} progress={progress} onChange={persistProgress} onBack={() => setView({ type: 'lab', missionId: view.missionId, stars: progress.starsByMission[view.missionId] ?? 1 })} onWrong={onPracticeWrong} onSuccess={onPracticeSuccess} onWorksheetCorrect={onWorksheetAnswerCorrect} />}
      {view.type === 'retention' && <LearningLab key={`retention-${view.startedAt}`} review missionId={view.missionId} progress={progress} onChange={persistProgress} onBack={returnToMap} onWrong={onPracticeWrong} onSuccess={onPracticeSuccess} onFinish={(updated) => {
        const latest = updated ?? progress;
        const record = getLearningRecord(latest, view.missionId);
        persistProgress(record.confirmedAt && record.confirmedAt >= view.startedAt ? completeSkillReview(latest, view.missionId) : deferSkillReview(latest, view.missionId));
        if (view.nextView.type === 'review-complete') trackEvent('quick_review_completed');
        setView(view.nextView);
      }} />}
      {view.type === 'reward' && activeMission && (
        <RewardView mission={activeMission} stars={view.stars} progress={progress} onMap={returnToMap} onNext={startMission} onReset={openResetDialog} onGame={(type) => setView({ type, missionId: activeMission.id })} onSuspects={(board) => setView({ type: 'suspects', board, from: 'reward' })} />
      )}
      {view.type === 'story' && (() => {
        const mission = MISSIONS.find((item) => item.id === view.missionId);
        const chapter = mission && chapterFor(mission.unit);
        if (!mission || !chapter) return null;
        const name = account.activeProfile?.displayName ?? null;
        const toStorybook = () => setView({ type: 'storybook', tab: 'story', unit: chapter.unit });
        if (view.part) {
          const epilogue = view.part === 'epilogue';
          return <StoryComicView key={`${view.part}-${chapter.unit}`} title={epilogue ? 'The Whole Stone' : `Chapter ${chapter.unit} · ${chapter.title}`}
            kicker={epilogue ? 'Finale · Festival night' : 'Chapter end · The stone piece and a clue'} panels={epilogue ? EPILOGUE : chapterEnd(chapter)} name={name}
            scene={epilogue ? 'epilogue' : 'chapter-end'} unit={chapter.unit}
            goLabel="Back to the Storybook" onGo={toStorybook} onBack={toStorybook} />;
        }
        if (view.prologue) {
          if (view.replay === 'storybook') {
            return <StoryComicView key="prologue-replay" scene="prologue" title="The Whole Stone" kicker="Prologue · The night the stone cracked" panels={PROLOGUE} name={name} goLabel="Back to the Storybook"
              onGo={() => setView({ type: 'storybook', tab: 'story' })} onBack={() => setView({ type: 'storybook', tab: 'story' })} />;
          }
          if (view.replay === 'map') {
            return <StoryComicView key="prologue-replay-map" scene="prologue" title="The Whole Stone" kicker="Prologue · The night the stone cracked" panels={PROLOGUE} name={name} goLabel="Back to map"
              onGo={returnToMap} onBack={returnToMap} />;
          }
          return <StoryComicView key="prologue" scene="prologue" title="The Whole Stone" kicker="Prologue · The night the stone cracked" panels={PROLOGUE} name={name} goLabel="I’ll help!"
            onGo={() => { primeReadAloud(); setFun((current) => recordStory(current, { prologueSeen: true })); setView({ type: 'story', missionId: mission.id }); }} onBack={returnToMap} />;
        }
        const unitMissions = MISSIONS.filter((item) => item.unit === mission.unit);
        const index = unitMissions.indexOf(mission);
        // A replay shows the same comic (with the choice already made) and returns to the map instead of starting the lesson.
        const saved = fun.story?.choices?.[String(chapter.unit)];
        return <StoryComicView key={`${mission.id}-${view.replay ? 'replay' : 'new'}`} title={`Chapter ${chapter.unit} · ${chapter.title}`} kicker={`Lesson ${index + 1} of ${unitMissions.length} · ${mission.title}`}
          panels={lessonComic(chapter, mission, index)} name={name} choice={index === 0 ? chapter.choice : undefined} picked={view.replay ? saved : undefined}
          scene={index === 0 ? CHAPTER_SCENES[chapter.unit] : undefined} unit={chapter.unit}
          choiceNotes={index === 0 ? choiceNotes(chapter) : undefined}
          note={index === 0 ? detectiveNote(chapter.unit, fun.story?.guesses ?? {}) : undefined}
          goLabel={view.replay === 'storybook' ? 'Back to the Storybook' : view.replay ? 'Back to map' : index === 0 ? 'Let’s go!' : 'Let’s help!'}
          onGo={(choice) => {
            if (choice !== undefined) setFun((current) => recordStory(current, { unit: chapter.unit, choice }));
            if (view.replay === 'storybook') toStorybook(); else if (view.replay) returnToMap(); else startMission(mission.id, undefined, true);
          }} onBack={view.replay === 'storybook' ? toStorybook : returnToMap} />;
      })()}
      {view.type === 'suspects' && (
        <SuspectBoardView board={view.board} choices={fun.story?.choices ?? {}} saved={fun.story?.guesses?.[String(view.board)] as CharacterId | undefined}
          name={account.activeProfile?.displayName ?? null} theme={storyTheme}
          onGuess={(suspect) => setFun((current) => recordStory(current, { board: view.board, suspect }))}
          onBack={view.from === 'storybook' ? () => setView({ type: 'storybook', tab: 'clues' }) : returnToMap} />
      )}
      {view.type === 'storybook' && (
        <StorybookView tab={view.tab} focusUnit={view.unit} completedUnits={completedStoryUnits(progress)} prologueSeen={!!fun.story?.prologueSeen}
          name={account.activeProfile?.displayName ?? null} chapters={storybookChapters(progress)}
          choices={fun.story?.choices ?? {}} guesses={fun.story?.guesses ?? {}}
          onSuspects={(board) => setView({ type: 'suspects', board, from: 'storybook' })}
          onTab={(tab) => setView({ type: 'storybook', tab, unit: view.unit })} onBack={returnToMap}
          onPrologue={() => { primeReadAloud(); if (MISSIONS[0]) setView({ type: 'story', missionId: MISSIONS[0].id, prologue: true, replay: 'storybook' }); }}
          onLesson={(missionId) => { primeReadAloud(); setView({ type: 'story', missionId, replay: 'storybook' }); }}
          onEnding={(unit) => { const first = MISSIONS.find((item) => item.unit === unit); if (first) setView({ type: 'story', missionId: first.id, replay: 'storybook', part: 'end' }); }}
          onEpilogue={() => { const last = MISSIONS[MISSIONS.length - 1]; if (last) setView({ type: 'story', missionId: last.id, replay: 'storybook', part: 'epilogue' }); }} />
      )}
      {view.type === 'review-complete' && (
        <ReviewCompleteView reviewedCount={view.reviewedCount} progress={progress} onMap={returnToMap} onReset={openResetDialog} />
      )}
      {breakReason && <BrainBreakOffer reason={breakReason} quietMode={quietBreaks} onSkip={closeBreak} onFinish={closeBreak} />}
      {resetOpen && (
        <div className="fq-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResetOpen(false); }}>
          <div className="fq-modal fq-reset-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description">
            <button className="fq-icon-button fq-modal-close" onClick={() => setResetOpen(false)} aria-label="Close reset dialog" data-testid="button-close-reset"><X size={18} /></button>
            {resetAllConfirm ? (
              <>
                <h2 id="reset-title">Reset all learner progress?</h2>
                <p id="reset-description">{account.user ? `This clears ${account.activeProfile?.displayName ?? 'this learner'}’s progress, lesson answers, learning evidence, daily-practice work, stars, XP, streaks and saved skill reviews on every device.` : 'This clears progress, lesson answers, learning evidence, daily-practice work, stars, XP, streaks and saved skill reviews on this device.'} This cannot be undone.</p>
                <div className="fq-modal-actions">
                  <button className="fq-button ghost" onClick={() => setResetAllConfirm(false)} data-testid="button-back-to-unit-reset">Back to unit reset</button>
                  <button className="fq-button ghost" onClick={() => setResetOpen(false)} data-testid="button-cancel-reset">Keep exploring</button>
                  <button className="fq-button" onClick={resetProgress} data-testid="button-confirm-reset">Reset all units and activity</button>
                </div>
              </>
            ) : (
              <>
                <h2 id="reset-title">Reset one unit?</h2>
                <p id="reset-description">Choose a unit to clear its lesson work while keeping progress in every other unit and this learner’s family settings.</p>
                <label className="fq-reset-unit-select">
                  <strong>Unit to reset</strong>
                  <select aria-label="Unit to reset" value={resetUnit} onChange={(event) => setResetUnit(Number(event.target.value))} data-testid="select-reset-unit">
                    {UNIT_INFO.map((unit, index) => <option key={unit.title} value={index + 1}>Unit {index + 1} · {unit.title}</option>)}
                  </select>
                </label>
                {(() => {
                  const preview = getUnitResetPreview(progress, fun, resetUnit);
                  const savedLessons = preview.lessons.filter((lesson) => lesson.activity.length > 0);
                  const hasAnything = savedLessons.length > 0 || preview.dailyTopics.length > 0 || preview.challengeBest !== undefined;
                  return (
                    <section className="fq-reset-preview" aria-labelledby="reset-preview-title" aria-live="polite" data-testid="reset-unit-preview">
                      <h3 id="reset-preview-title">Exactly what will be cleared</h3>
                      {!hasAnything ? <p>No saved activity to clear in this unit yet.</p> : (
                        <>
                          {savedLessons.length > 0 && <ul>
                            {savedLessons.map((lesson) => <li key={lesson.id}><strong>{lesson.title}</strong>: {lesson.activity.join('; ')}</li>)}
                          </ul>}
                          {preview.dailyTopics.length > 0 && <p>Today’s practice: answers for {preview.dailyTopics.join(', ')}.</p>}
                          {preview.challengeBest !== undefined && <p>Unit {resetUnit} challenge: best score of {preview.challengeBest}.</p>}
                        </>
                      )}
                      <p>All other units, account settings, and unrelated progress will remain unchanged.</p>
                    </section>
                  );
                })()}
                <div className="fq-modal-actions">
                  <button className="fq-button ghost" onClick={() => setResetOpen(false)} data-testid="button-cancel-reset">Keep exploring</button>
                  <button className="fq-button" onClick={resetSelectedUnit} data-testid="button-confirm-unit-reset">Reset this unit</button>
                </div>
                <button className="fq-reset-all-link" onClick={() => setResetAllConfirm(true)} data-testid="button-reset-all-progress">Reset all units and learner activity…</button>
              </>
            )}
          </div>
        </div>
      )}
    </FunContext.Provider>
  );
}

function AppRouter() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={Game} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AccountGate
        renderLogin={(props) => <LoginPage {...props} />}
        renderLoading={() => <main className="fq-login-app" role="status" aria-live="polite">Loading your explorer account…</main>}
      >
        {(accountKey) => (
          <TooltipProvider>
            <WouterRouter base={getRouterBasePath(import.meta.env.BASE_URL, window.location.pathname)}>
              <AppRouter key={accountKey} />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        )}
      </AccountGate>
    </QueryClientProvider>
  );
}

export default App;
