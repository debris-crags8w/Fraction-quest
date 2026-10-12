import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BarChart3, Check, ClipboardCheck, Code2, Compass, Dumbbell, Flame, Lightbulb, Map as MapIcon, RotateCcw, Sparkles, Star, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react';
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
  getNextMission,
  isCorrectAnswer,
  isMissionUnlocked,
  loadProgress,
  MISSIONS,
  numberLineWholeCount,
  recordMissedSkill,
  resetProgress as resetSavedProgress,
  saveProgress,
  starsFromFirstTryAnswers,
  type Answer,
  type Mission,
  type ModelSpec,
  type PracticeQuestion,
  type Progress,
} from './game';
import { saveAssessmentAttempt } from './assessments';
import type { AssessmentDefinition } from './assessments';
import NotFound from '@/pages/not-found';
import LearningLab, { RedoLab } from './LearningLab';
import { LearningText } from './LearningText';
import './learning-text.css';
import QuickReviewEntry from './QuickReviewEntry';
import { PieFraction } from './fraction-ui';
import { getLearningRecord, hasLearningGate, lessonSteps, learningSummary, startRedo, updateLearning, worksheetCount, type RedoPart } from './learning';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { trackEvent } from './lib/analytics';
import { loadFun, playCue, recordCodeLevel, recordCorrect, recordMinute, recordPartFinder, recordRace, recordSprint, resetFun, setBreakPreferences, setDisplayPreferences, setSound, type FunState } from './lib/fun';
import { summarizeCodeProgress } from './code-progress';
import { CODE_LEVEL_COUNT } from './code-quest';
import { ModelTag, WholeBracket } from './models';
import { Confetti, DailyRing, denomColor, FunContext, LessonPath, Mascot, StoryPrompt, TapModel, unitColor, useFun, type MascotMood, type PathNode } from './fun-ui';
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
import DailyPractice from './DailyPractice';
import { createDailyPractice, dailyPracticeDay } from './daily-practice';
import PartFinder from './PartFinder';
import { AssessmentHub, AssessmentRunner } from './Assessment';
import { PART_FINDER_LESSONS, PART_FINDER_ROUNDS } from './part-finder';
import ConceptGames, { type LessonGame } from './ConceptGames';
import { BrainBreakOffer } from './BrainBreakOffer';
const queryClient = new QueryClient();

type View =
  | { type: 'map' }
  | { type: 'play'; missionId: string; questionIndex: number; firstTryAnswers: number; reviewQuestions: PracticeQuestion[] }
  | { type: 'review'; questionIndex: number; reviewQuestions: PracticeQuestion[] }
  | { type: 'review-complete'; reviewedCount: number }
  | { type: 'daily' }
  | { type: 'concept-games' }
  | { type: 'assessments' }
  | { type: 'assessment'; definition: AssessmentDefinition; seed: number }
  | { type: 'reward'; missionId: string; stars: number };
type LabView = { type: 'lab'; missionId: string; stars: number };
type PaperView = { type: 'paper'; missionId: string };
type RedoView = { type: 'redo'; missionId: string };
type ChallengeView = { type: 'challenge'; unit: number };
type ParentPage = { type: 'parent' };
type GameView = { type: 'race' | 'code' | 'part-finder'; missionId: string; /** Opened from the Games menu: go back there. */ fromGames?: boolean };
type PlacementView = { type: 'placement' };
// seed 0 = the fixed 12 "Practice more" questions; any other seed = freshly generated questions.
type ExtraView = { type: 'extra'; missionId: string; seed: number; questionIndex: number; firstTry: number } | { type: 'extra-done'; missionId: string; seed: number; firstTry: number; total: number };
const FRESH_ROUND = 10;

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
];

// Lessons where kids make fractions by folding a paper strip (1 → 1/2 → 1/4 → 1/8).
const FOLD_LESSONS: Record<string, { intro: string; allowThirds?: boolean; shadeHalf?: boolean }> = {
  'equal-parts': { intro: 'Fold the paper. Every fold makes equal pieces.' },
  'unit-fractions': { intro: 'Fold, then unfold. Each piece is a unit fraction.' },
  'unit-size': { intro: 'Fold in half again and again: 1/2, 1/4, 1/8. Watch the pieces get smaller.', allowThirds: false },
  'equivalent-models': { intro: 'Half the paper is shaded. Fold it again and unfold: 1/2 = 2/4 = 4/8.', allowThirds: false, shadeHalf: true },
};

const UNIT_TITLES = UNIT_INFO.map((unit) => unit.title);

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
function FractionBar({ numerator, denominator, quiet = false, label = false, guide }: { numerator: number; denominator: number; quiet?: boolean; label?: boolean; guide?: number }) {
  return (
    <div className="fq-bar-model-labelled" style={{ '--piece': denomColor(denominator) } as CSSProperties}>
    {label && <span className="fq-bar-label" data-testid="bar-fraction-label"><Fraction numerator={numerator} denominator={denominator} /></span>}
    <div className="fq-bar-model" style={{ '--pieces': denominator, '--piece': denomColor(denominator) } as CSSProperties} role="img" aria-label={quiet ? 'A bar model. Count the equal parts and the shaded parts.' : `${numerator}/${denominator}: each whole is split into ${denominator} equal parts, with ${numerator} parts shaded`}>
      {Array.from({ length: Math.max(1, Math.ceil(numerator / denominator)) }, (_, whole) => (
        <div className="fq-bar-whole" key={whole}>
          <div className="fq-bar">
            {guide !== undefined && whole === 0 && <i className="fq-compare-guide" style={{ left: `${guide * 100}%` }} aria-hidden="true" data-testid="compare-guide" />}
            {Array.from({ length: denominator }, (_, index) => <span className={whole * denominator + index < numerator ? '' : 'empty'} style={{ '--i': whole * denominator + index } as CSSProperties} key={index} />)}
          </div>
          <WholeBracket />
        </div>
      ))}
    </div>
    </div>
  );
}

/** Two bars of one whole each, once answered: where the larger amount ends. */
function compareGuide(model: ModelSpec, reveal: boolean): number | undefined {
  if (!reveal || model.kind !== 'bars' || model.bars.length !== 2) return undefined;
  if (model.bars.some((bar) => bar.denominator < 1 || bar.numerator < 1 || bar.numerator > bar.denominator)) return undefined;
  return Math.max(...model.bars.map((bar) => bar.numerator / bar.denominator));
}

/** `reveal`: the question is answered, so every bar shows its fraction label. */
function ModelView({ model, compact = false, reveal = false }: { model: ModelSpec; compact?: boolean; reveal?: boolean }) {
  return (
    <div className={`fq-visual-model ${compact ? 'compact' : ''}`} data-testid="visual-fraction-model">
      {!compact && (model.kind === 'bars' || model.kind === 'decimal') && <ModelTag kind="bar" />}
      {!compact && model.kind === 'line' && <ModelTag kind="line" />}
      {!compact && model.kind === 'set' && <ModelTag kind="set" />}
      {model.kind === 'bars' && (
        <div className="fq-visual-bars">
          {model.bars.map((item, index) => (
            <div className="fq-visual-bar-row" key={`${item.numerator}-${item.denominator}-${index}`}>
              <FractionBar numerator={item.numerator} denominator={item.denominator} quiet={model.hideLabels && !item.named && !reveal} label={!!item.named || reveal} guide={compareGuide(model, reveal)} />
            </div>
          ))}
        </div>
      )}
      {model.kind === 'set' && (
        <div className="fq-set-wrap">
          <div className="fq-counter-set" role="img" aria-label={`${model.selected} of ${model.total} counters highlighted`}>
            {Array.from({ length: model.total }, (_, index) => <span className={`fq-counter ${index < model.selected ? 'selected' : ''}`} style={{ '--i': index } as CSSProperties} key={index} />)}
          </div>
        </div>
      )}
      {model.kind === 'line' && (() => {
        const wholes = model.wholes ?? numberLineWholeCount(model.numerator, model.denominator);
        const divisions = model.denominator * wholes;
        const value = model.numerator / divisions;
        return (
          <div className="fq-numberline-wrap">
            <div className="fq-visual-numberline" role="img" aria-label={model.hideLabels ? `Number line from 0 to ${wholes} with ${divisions} equal spaces and a dot` : 'Number line from 0 to ' + wholes + ', marked at ' + model.numerator + '/' + model.denominator}>
              <div className="fq-numberline-track" />
              {/* Hop arcs: one per jump from 0, drawn one after another, then the dot lands. */}
              <svg className="fq-numberline-hops" viewBox={`0 0 ${divisions} 1`} preserveAspectRatio="none" aria-hidden="true">
                {Array.from({ length: model.numerator }, (_, j) => (
                  <path key={j} d={`M${j + 0.06} 1 Q${j + 0.5} -0.6 ${j + 0.94} 1`} style={{ '--i': j } as CSSProperties} pathLength={1} vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
              <span className="fq-numberline-marker" style={{ left: (value * 100) + '%', '--jumps': model.numerator } as CSSProperties} />
              {Array.from({ length: divisions + 1 }, (_, tick) => (
                <span className={`fq-numberline-tick ${tick % model.denominator === 0 ? 'whole' : ''}`} style={{ left: ((tick / divisions) * 100) + '%' }} key={tick}>
                  {tick === 0 ? '0' : tick === divisions ? String(wholes) : tick % model.denominator === 0 ? String(tick / model.denominator) : ''}
                </span>
              ))}
            </div>
            <p className="fq-numberline-range" data-testid="text-model-numberline-range">{wholes === 1 ? 'The line goes from 0 to 1.' : `The line goes from 0 to ${wholes}. Each whole has the same spaces.`}</p>
            {/* Practice pictures hide the readout so the picture doesn't give the answer away. */}
            {!model.hideLabels && <div className="fq-line-readout"><Fraction numerator={model.numerator} denominator={model.denominator} /></div>}
          </div>
        );
      })()}
      {model.kind === 'partition' && (
        <div className="fq-partition-model" role="img" aria-label={`One whole split into ${model.parts.length} pieces; the first piece is one part`}>
          <div className="fq-partition-whole">
            {model.parts.map((size, index) => <span className={index === 0 ? 'part-sample' : ''} style={{ flexBasis: `${size}%`, '--i': index } as CSSProperties} key={`${size}-${index}`} />)}
          </div>
          <WholeBracket />
        </div>
      )}
      {model.kind === 'area' && <div className="fq-area-model"><AreaSvg figure={{ cut: model.cut, shaded: model.shaded }} /></div>}
      {model.kind === 'equation' && <div className="fq-model-equation" role="img" aria-label={`Visual equation ${model.text}`}><MathText text={model.text} /></div>}
      {model.kind === 'decimal' && (
        <div className="fq-decimal-model">
          <FractionBar numerator={model.tenths} denominator={10} quiet={model.hideLabels} />
          {!model.hideLabels && <span>{(model.tenths / 10).toFixed(1)}</span>}
        </div>
      )}
      {model.caption && <p className="fq-model-caption">{model.caption}</p>}
    </div>
  );
}

function Topbar({ progress, onReset, onHome }: { progress: Progress; onReset: () => void; onHome: () => void }) {
  const stars = Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0);
  const { fun, setFun } = useFun();
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
            <span className="fq-stat fq-stat-streak" title="Day streak" data-testid="status-day-streak"><Flame size={18} strokeWidth={2.75} fill="currentColor" aria-hidden="true" /><strong>{fun.dayStreak}</strong><span className="fq-sr">day streak</span></span>
            <span className="fq-stat fq-stat-xp" title="XP earned" data-testid="status-xp"><Zap size={18} strokeWidth={2.75} fill="currentColor" aria-hidden="true" /><strong>{fun.xp}</strong><span className="fq-stat-unit">XP</span></span>
            <DailyRing answered={fun.answeredToday} />
          </div>
          <div className="fq-progress-pill" data-testid="status-overall-progress" aria-live="polite">
            <Star size={15} className="filled" aria-hidden="true" />
            <span><strong>{stars}</strong> stars</span><span aria-hidden="true">·</span>
            <span><strong>{MISSIONS.filter(item => hasLearningGate(progress, item.id)).length}</strong>/{MISSIONS.length} lessons</span>
          </div>
          <button className="fq-icon-button" onClick={() => setFun(setSound(fun, !fun.sound))} aria-label={fun.sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={fun.sound} data-testid="button-toggle-sound">{fun.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button className="fq-icon-button" onClick={onReset} aria-label="Reset progress" data-testid="button-reset-progress"><RotateCcw size={18} /></button>
          <div className="fq-account">
            <span className="fq-account-avatar" aria-hidden="true">{account.activeProfile?.displayName.trim().charAt(0).toUpperCase() ?? 'G'}</span>
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

function MissionMap({ progress, onStart, onOpenLab, onStartReview, onStartDaily, onConceptGames, onAssessments, onReset, onPaper, onChallenge, onExtra, onParent, onGame, onPlacement }: { progress: Progress; onStart: (missionId: string) => void; onOpenLab: (missionId: string) => void; onStartReview: () => void; onStartDaily: () => void; onConceptGames: () => void; onAssessments: () => void; onReset: () => void; onPaper: (missionId: string) => void; onChallenge: (unit: number) => void; onExtra: (missionId: string) => void; onParent: () => void; onGame: (type: 'race' | 'code' | 'part-finder', missionId: string) => void; onPlacement: () => void }) {
  const account = useAccount();
  const { user } = account;
  const { fun } = useFun();
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

  return (
    <div className="fq-app">
      <Topbar progress={progress} onReset={onReset} onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
      <main className="fq-shell">
        <section className="fq-hero fq-course-hero">
          <div className="fq-hero-copy">
            <div className="fq-eyebrow"><Sparkles size={14} fill="currentColor" /> Your fraction course</div>
            <h1>Fractions are <span>places</span> to explore.</h1>
            <p>Build, spot, compare, and combine fractions, one small discovery at a time.</p>
          </div>
          <div className="fq-compass" aria-hidden="true">
            <div className="fq-hero-mascot"><Mascot mood="happy" size={150} /></div>
            <div className="fq-compass-fraction one"><Fraction numerator={1} denominator={2} /></div>
            <div className="fq-compass-fraction two"><Fraction numerator={3} denominator={4} /></div>
            <div className="fq-compass-fraction three"><Fraction numerator={2} denominator={3} /></div>
          </div>
        </section>

        <section className="fq-map fq-course-map" aria-labelledby="course-title">
          <div className="fq-section-heading">
            <div>
              <h2 id="course-title">Your learning map</h2>
              <p data-testid="text-map-subtitle">
                 {nextMission
                   ? `${MISSIONS.filter(item => hasLearningGate(progress, item.id)).length} of ${MISSIONS.length} lessons completed · ${totalStars} practice stars`
                  : `Course complete · ${totalStars} stars collected`}
              </p>
            </div>
            <MapIcon size={27} color="hsl(var(--secondary))" aria-hidden="true" />
          </div>
          {assignedUnits.length > 0 && <p className="fq-assigned-units" role="note" data-testid="text-assigned-units">
            Your teacher suggested: {assignedUnits.map((unit) => `Unit ${unit}: ${UNIT_TITLES[unit - 1]}`).join(' · ')}.
            These suggestions do not change which lessons are unlocked.
          </p>}
          <div className="fq-map-code-summary" data-testid="status-map-code-progress">
            <Code2 size={19} aria-hidden="true" />
            <span><strong>{codeSummary.levelsPassed} of {codeSummary.levelsTotal} coding levels passed</strong><small>{codeSummary.missionsStarted} missions started · {codeSummary.missionsComplete} missions with all 3 levels passed</small></span>
            <span className="fq-map-code-separate">Separate from lesson progress</span>
            {nextCodeMission && <button className="fq-button ghost" onClick={() => onGame('code', nextCodeMission.id)} data-testid="button-continue-coding">{codeSummary.missionsStarted ? 'Continue coding' : 'Try coding'} <ArrowRight size={16} /></button>}
          </div>

          {nextMission ? (
            <button className="fq-continue-card" onClick={() => onStart(nextMission.id)} data-testid="button-continue-course">
              <span className="fq-continue-icon"><ArrowRight size={21} /></span>
              <span className="fq-continue-copy">
                <strong>{evidenceRecommendation ? 'Try this one next' : progress.completedMissionIds.length || progress.placement ? 'Keep exploring' : 'Start your first lesson'}</strong>
                <span>Lesson {String(MISSIONS.indexOf(nextMission) + 1).padStart(2, '0')} · {nextMission.title}{evidenceRecommendation ? ' · Practice what was tricky' : ''}</span>
              </span>
              <ArrowRight className="fq-continue-arrow" size={20} />
            </button>
          ) : (
            <div className="fq-course-finished" data-testid="status-course-complete"><Trophy size={24} /> You explored every lesson. Replay any one to practice again.</div>
          )}

          {!progress.completedMissionIds.length && !Object.keys(progress.learning ?? {}).length && !progress.placement && (
            <button className="fq-continue-card fq-place-entry" onClick={onPlacement} data-testid="button-find-level">
              <span className="fq-continue-icon"><Compass size={20} /></span>
              <span className="fq-continue-copy"><strong>Know some fractions already?</strong><span>Take a quick quiz to find your level</span></span>
              <ArrowRight className="fq-continue-arrow" size={20} />
            </button>
          )}
          {progress.placement && <p className="fq-place-note" data-testid="text-placement-note">Started at unit {progress.placement.unit} after the level quiz. Earlier lessons are still open.</p>}

          {(() => {
            const today = progress.dailyPractice?.day === dailyPracticeDay() ? progress.dailyPractice : null;
            const done = !!today?.completedAt;
            const current = today && !done;
            return (
              <section className="fq-daily-map-card" data-testid="section-daily-practice">
                <div className="fq-daily-map-icon" aria-hidden="true"><Sparkles size={21} /></div>
                <div className="fq-daily-map-copy">
                  <strong>{done ? 'Today’s practice is complete' : current ? 'Pick up today’s practice' : 'A little fraction practice each day'}</strong>
                  <span>{done ? 'Five models built and named. Your lesson progress is separate.' : current ? `${today.index + 1} of ${today.questions.length} models · Your work is saved` : 'Five quick model-and-answer questions, about 5 minutes, chosen from your learning.'}</span>
                </div>
                <button className="fq-button" onClick={onStartDaily} data-testid="button-start-daily-practice">
                  {done ? 'Review' : current ? 'Continue' : 'Start'} <ArrowRight size={16} />
                </button>
              </section>
            );
          })()}

          <button className="fq-assessment-entry fq-concept-games-entry" onClick={onConceptGames} data-testid="button-open-concept-games">
            <span className="fq-assessment-entry-icon" aria-hidden="true"><Dumbbell size={20} /></span>
            <span><strong>Games</strong><small>Fraction Race, coding, Part Finder and the fraction workshop. Games never change lesson progress.</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          <button className="fq-assessment-entry" onClick={onAssessments} data-testid="button-open-assessments">
            <span className="fq-assessment-entry-icon" aria-hidden="true"><ClipboardCheck size={20} /></span>
            <span><strong>Check what you know</strong><small>Build a model, make each answer with tiles, and see which ideas to practice next.</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          <QuickReviewEntry progress={progress} onStart={onStartReview} />

          <div className="fq-unit-list">
            {units.map((unit) => {
               const completedInUnit = unit.missions.filter((item) => hasLearningGate(progress, item.id)).length;
              return (
                <section className="fq-unit" key={unit.number} aria-labelledby={`unit-${unit.number}`} style={{ '--unit': unitColor(unit.number) } as CSSProperties}>
                  <div className="fq-unit-heading">
                    <div>
                      <span className="fq-unit-kicker">Unit {unit.number}</span>
                      <h3 id={`unit-${unit.number}`}>{unit.title}</h3>
                      <p>{unit.subtitle}</p>
                    </div>
                    <span className="fq-unit-count" aria-label={`${completedInUnit} of ${unit.missions.length} lessons mastered`}>{completedInUnit}/{unit.missions.length}</span>
                  </div>
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
                      const missionNumber = MISSIONS.indexOf(mission) + 1;
                      return {
                        id: mission.id,
                        number: missionNumber,
                        title: mission.title,
                        stars: progress.starsByMission[mission.id] ?? 0,
                        steps: lessonSteps(progress, mission.id),
                        state: completed ? 'done' : !unlocked ? 'lock' : mission.id === nextMission?.id ? 'now' : 'open',
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
                              Worksheet {worksheetCount(learning, mission.id)}/12 · Builds on my own {summary.independentChecks}/2
                              <br />Remembered: {summary.retention}
                              <br />Code levels passed: {Math.min(CODE_LEVEL_COUNT, Math.floor(fun.codeLevels?.[mission.id] ?? 0))}/{CODE_LEVEL_COUNT}
                              {!completed && unlocked && <><br />Finish the builds and the worksheet to open the next lesson.</>}
                              {progress.completedMissionIds.includes(mission.id) && !completed && <><br />Your old progress is saved. A few new steps are needed.</>}
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
                            {unlocked && (
                              <div className="fq-node-tools">
                                {hasGenerator(mission.id) && <button className="fq-button ghost" onClick={() => onExtra(mission.id)} data-testid={`button-practice-more-${mission.id}`}><Dumbbell size={17} /> Practice more</button>}
                                <PrintMenu missionId={mission.id} record={learning} />
                                <button className="fq-button ghost" onClick={() => onPaper(mission.id)} data-testid={`button-check-paper-${mission.id}`}><ClipboardCheck size={17} /> Check my paper</button>
                                <button className="fq-button ghost" onClick={() => onGame('race', mission.id)} data-testid={`button-race-${mission.id}`}><Zap size={17} /> Race</button>
                                <button className="fq-button ghost" onClick={() => onGame('code', mission.id)} data-testid={`button-code-${mission.id}`}><Code2 size={17} /> Code</button>
                                {PART_FINDER_LESSONS.has(mission.id) && <button className="fq-button ghost" onClick={() => onGame('part-finder', mission.id)} data-testid={`button-part-finder-${mission.id}`}><Compass size={17} /> Part Finder{fun.partFinderBest !== undefined ? ` · Best ${fun.partFinderBest}/${PART_FINDER_ROUNDS.length}` : ''}</button>}
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
        <section className="fq-grownups" data-testid="section-grownups">
          <span className="fq-grownups-icon" aria-hidden="true"><BarChart3 size={22} /></span>
          <span><strong>For grown-ups</strong><small>Progress, time this week, what to practice, and lesson answer keys. Printable.</small></span>
          <span className="fq-grownups-buttons">
            <button className="fq-button ghost" onClick={onParent} data-testid="button-open-parent">Open report</button>
            <button className="fq-button ghost" onClick={onPlacement} data-testid="button-open-placement">Level quiz</button>
          </span>
        </section>
        <aside className="fq-course-note">
          <strong>About this learning path</strong>
          <p>
            Designed as a broad U.S. grades 3–5 bridge (roughly ages 8–10), from equal shares and number lines through operations and decimals.
            Topic-scope references: <a href="https://webassets.zearn.org/resources/G03_Course_Guide_Z1.pdf" target="_blank" rel="noreferrer">Zearn Grade 3 Course Guide</a> and <a href="https://www.dreambox.com/math/skills/fractions" target="_blank" rel="noreferrer">DreamBox fractions overview</a>.
            This is not a complete or standards-aligned course.
          </p>
        </aside>
        <footer className="fq-footer"><span>Made for curious minds, ages 8–10. {user ? 'Progress is saved to this family account.' : 'Progress stays on this device.'}</span><button onClick={onReset} data-testid="button-reset-progress-footer">{user ? 'Reset this learner’s progress' : "Reset this device's progress"}</button></footer>
      </main>
    </div>
  );
}

function PlayView({
  mission,
  questionIndex,
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
  const [burst, setBurst] = useState(0);
  const [shake, setShake] = useState(0);
  const { fun } = useFun();
  const isExample = questionIndex < 0;
  const question: PracticeQuestion | null = isExample ? null : mission.questions[questionIndex];
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

  const toggleHint = () => {
    if (!question) return;
    if (!hintOpen) { onPracticeSignal(question.reviewMissionId ?? mission.id); setAttempts(current => Math.max(1, current)); }
    setHintOpen((open) => !open);
  };
  // `mission` can be a copy with review questions mixed in, so look it up by id.
  const lessonNumber = String(MISSIONS.findIndex((item) => item.id === mission.id) + 1).padStart(2, '0');
  const noExample = isQuickReview || isExtraPractice;
  const steps = mission.questions.length + (noExample ? 0 : 1);
  const doneSteps = (noExample ? 0 : 1) + Math.max(0, questionIndex) + (feedback === 'correct' ? 1 : 0) - (isExample ? 1 : 0);
  const mood: MascotMood = feedback === 'correct' ? 'cheer' : feedback === 'retry' ? 'oops' : 'thinking';
  const cheer = combo >= 3 ? `${combo} in a row! You're on fire.` : question?.isMastery ? 'Practice checkpoint passed!' : ['Nice work!', 'You found it!', 'Great thinking!', 'Yes, that\'s it!'][(questionIndex + 4) % 4];

  return (
    <div className="fq-app fq-lesson-app" style={{ '--unit': unitColor(mission.unit) } as CSSProperties}>
      <Confetti burst={burst} />
      <main className="fq-shell fq-play-shell fq-appear">
        <div className="fq-lesson-top">
          <button className="fq-icon-button fq-lesson-close" onClick={onBack} aria-label="Back to learning map" data-testid="button-back-map"><X size={22} strokeWidth={3} /></button>
          <div className="fq-segments" role="progressbar" aria-valuemin={0} aria-valuemax={steps} aria-valuenow={doneSteps} aria-label={isExample ? 'Guided example' : `${isQuickReview ? 'Quick review · ' : ''}Question ${questionIndex + 1} of ${mission.questions.length}`} data-testid="status-lesson-progress">
            {Array.from({ length: steps }, (_, index) => <i key={index} className={index < doneSteps ? 'on' : index === doneSteps ? 'now' : ''} />)}
          </div>
          {combo >= 2 && <span className="fq-combo" data-testid="status-combo"><Flame size={16} fill="currentColor" /> {combo}</span>}
          {question && (
            <button className={`fq-bulb ${hintOpen ? 'open' : ''}`} onClick={toggleHint} aria-expanded={hintOpen} aria-label={hintOpen ? 'Hide hint' : 'Show a hint'} data-testid="button-show-hint">
              <Lightbulb size={20} strokeWidth={2.75} />
            </button>
          )}
        </div>

        <section className="fq-play-card" aria-labelledby="lesson-title">
          <p className="fq-play-kicker">
            {isQuickReview
              ? `Quick skill review · ${question?.reviewTopicTitle ?? mission.shortTitle}`
              : isExtraPractice
                ? `Practice more · Lesson ${lessonNumber} · ${questionIndex + 1} of ${mission.questions.length}`
              : isExample
                ? `Lesson ${lessonNumber} · See it first`
                : `Lesson ${lessonNumber} · ${mission.shortTitle} · ${questionIndex + 1} of ${mission.questions.length}`}
          </p>
          {(mission.gradeBand || mission.enrichment) && <p className="fq-node-standard">
            {mission.enrichment ? 'Bonus enrichment' : `Grade ${mission.gradeBand}`}
            {mission.standards?.length ? ` · ${mission.standards.join(', ')}` : ''}
          </p>}
          {isExample ? <h1 id="lesson-title">{mission.title}</h1> : <StoryPrompt prompt={question?.prompt ?? ''} id="lesson-title" />}
          {isExample ? (
            <div className="fq-example">
              <div className="fq-mascot-say">
                <Mascot mood="happy" size={64} />
                <p className="fq-skill-statement"><LearningText text={mission.skill} speak /></p>
              </div>
              <div className="fq-model-area"><ModelView model={mission.example.model} /></div>
              <div className="fq-example-answer">
                <span className="fq-example-label"><Lightbulb size={16} /> Let's think it through</span>
                  <p><strong><LearningText text={mission.example.prompt} speak /></strong></p>
                  <p className="fq-example-result"><LearningText text={mission.example.answer} speak /></p>
                <p><LearningText text={mission.example.explanation} speak /></p>
              </div>
              {FOLD_LESSONS[mission.id] && <PaperFold {...FOLD_LESSONS[mission.id]} />}
              {SHAPE_LESSONS.includes(mission.id) && <SameSizeIdea />}
              <TapModel model={mission.example.model} />
            </div>
          ) : question && (
            <>
              {question.isReview && <div className="fq-review-label"><RotateCcw size={15} />{question.isOptionalReview ? `${isQuickReview ? 'Due skill' : 'Optional review'} · ${question.reviewTopicTitle}` : ' A quick revisit to help it stick'}</div>}
              {question.isMastery && <div className="fq-mastery-label"><Star size={15} /> Practice checkpoint · models and worksheet come next</div>}
              <div className="fq-model-area">
                <ModelView model={useSimplerModel ? question.simplerModel : question.model} reveal={feedback === 'correct'} />
              </div>
              {hintOpen && <div className="fq-hint" data-testid="text-question-hint"><Lightbulb size={18} /> <span><strong>Try this idea:</strong> <LearningText text={question.hint} speak /></span></div>}
              {attempts >= 2 && (
                <div className="fq-remediation" role="note" data-testid="status-remediation">
                  <strong>Let's make it simpler.</strong>
                  <span><LearningText text={question.hint} speak /></span>
                  <ModelView model={question.simplerModel} compact />
                </div>
              )}
              <div className="fq-answer-choices" role="group" aria-label="Choose an answer">
                {question.choices.map((choice, index) => (
                  <button
                    key={`${question.id}-${index}${selection === index && feedback === 'retry' ? `-shake-${shake}` : ''}`}
                    className={`fq-answer-choice ${selection === index ? `selected ${feedback ?? ''}` : ''} ${selection === index && feedback === 'retry' ? 'fq-shake' : ''}`}
                    onClick={() => {
                      if (feedback === 'correct') return;
                      setSelection(index);
                      if (feedback === 'retry') setFeedback(null);
                    }}
                    aria-pressed={selection === index}
                    data-testid={`button-answer-${question.id}-${index}`}
                  >
                    <span className="fq-choice-marker" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                    <span><MathText text={choice} /><span className="fq-sr">{selection === index ? ` (${feedback === 'correct' ? 'correct' : feedback === 'retry' ? 'try again' : 'selected, not checked yet'})` : ''}</span></span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <div className={`fq-lesson-footer ${feedback ? `show ${feedback}` : ''}`}>
        <div className="fq-shell fq-lesson-footer-inner">
          {feedback && question ? (
            <div className="fq-sheet" role="status" data-testid="status-feedback">
              <Mascot mood={mood} size={64} />
              <div className="fq-sheet-copy">
                {feedback === 'correct'
                  ? <><strong>{cheer}</strong><span><LearningText text={question.hint} speak /></span></>
                   : <><strong>Not quite!</strong><span><LearningText text={question.retryFeedback} speak /></span></>}
              </div>
              {feedback === 'correct' ? (
                <button className="fq-button fq-sheet-button" onClick={moveOn} data-testid={isLastQuestion ? 'button-finish-mission' : 'button-next-question'}>
                  {isLastQuestion ? isQuickReview ? 'Finish review' : isExtraPractice ? 'Finish practice' : 'Build & explain next' : 'Continue'} <ArrowRight size={17} />
                </button>
              ) : (
                <button className="fq-button fq-sheet-button" onClick={() => { setFeedback(null); setSelection(null); }} data-testid="button-try-again">
                  Got it, try again
                </button>
              )}
            </div>
          ) : isExample ? (
            <div className="fq-footer-actions">
              <button className="fq-hint-button" onClick={onBack} data-testid="button-back-example"><ArrowLeft size={17} /> Back to map</button>
              <button className="fq-button" onClick={moveOn} data-testid="button-start-practice">Let me try it <ArrowRight size={17} /></button>
            </div>
          ) : question && (
            <div className="fq-footer-actions">
              {question.isOptionalReview ? (
                <button className="fq-hint-button" onClick={skipOptionalReview} data-testid="button-skip-review">Skip this review</button>
              ) : <span />}
              <button className="fq-button" onClick={checkAnswer} disabled={selection === null} data-testid="button-check-answer">
                Check <Check size={17} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RewardView({ mission, stars, progress, onMap, onNext, onReset, onGame }: { mission: Mission; stars: number; progress: Progress; onMap: () => void; onNext: (missionId: string) => void; onReset: () => void; onGame: (type: 'race' | 'code' | 'part-finder') => void }) {
  const nextMission = getNextMission(progress);
  const { fun } = useFun();
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
          <div className="fq-reward-mascot" aria-hidden="true"><Mascot mood="cheer" size={120} /><span className="fq-reward-trophy"><Trophy size={30} strokeWidth={2.5} /></span></div>
           <div className="fq-eyebrow" style={{ justifyContent: 'center' }}><Sparkles size={14} fill="currentColor" /> Lesson completed</div>
          <h1>{mission.title}<br />is on your map.</h1>
           <p>You built it two ways, explained it, and got all 12 worksheet answers. The next lesson is open!</p>
          <div className="fq-reward-stars" data-testid="status-mission-stars" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((star) => <Star key={star} size={44} strokeWidth={2.5} className={star < stars ? 'filled' : ''} style={{ animationDelay: `${0.7 + star * 0.38}s` }} />)}</div>
          <div className="fq-reward-actions">
            {nextMission ? <button className="fq-button secondary" onClick={() => onNext(nextMission.id)} data-testid={`button-next-mission-${nextMission.id}`}>Next lesson <ArrowRight size={17} /></button> : <span className="fq-course-finished">Course complete!</span>}
            <button className="fq-button ghost" onClick={onMap} data-testid="button-return-map"><MapIcon size={17} /> Learning map</button>
          </div>
          <div className="fq-reward-play">
            <span>Play with this lesson:</span>
            <button className="fq-button ghost" onClick={() => onGame('race')} data-testid="button-reward-race"><Zap size={17} /> Race</button>
            <button className="fq-button ghost" onClick={() => onGame('code')} data-testid="button-reward-code"><Code2 size={17} /> Code</button>
            {PART_FINDER_LESSONS.has(mission.id) && <button className="fq-button ghost" onClick={() => onGame('part-finder')} data-testid="button-reward-part-finder"><Compass size={17} /> Part Finder</button>}
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
  const [view, setView] = useState<View | LabView | RetentionView | PaperView | RedoView | ChallengeView | ExtraView | ParentPage | GameView | PlacementView>({ type: 'map' });
  const [pendingRetention, setPendingRetention] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [fun, setFun] = useState<FunState>(() => account.initialFun ?? loadFun());
  const [combo, setCombo] = useState(0);
  const [breakReason, setBreakReason] = useState<'interval' | 'mistakes' | 'lesson-part' | null>(null);
  const activeStudyMilliseconds = useRef(0);
  const consecutiveWrongAnswers = useRef(0);
  const breakIntervalMinutes = fun.breakPreferences?.intervalMinutes ?? 15;
  const quietBreaks = fun.breakPreferences?.quietMode ?? false;
  const activeStudyView = ['play', 'review', 'daily', 'lab', 'redo', 'extra', 'retention'].includes(view.type);
  useAccountSync(progress, fun);

  useEffect(() => {
    const root = document.documentElement;
    const preferences = fun.displayPreferences ?? { textSize: 'standard', highContrast: false, reducedMotion: false };
    root.dataset.fqTextSize = preferences.textSize;
    root.classList.toggle('fq-high-contrast', preferences.highContrast);
    root.classList.toggle('fq-reduced-motion', preferences.reducedMotion);
    return () => {
      delete root.dataset.fqTextSize;
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

  const startMission = (missionId: string) => {
    if (!isMissionUnlocked(progress, missionId)) return;
    const record = getLearningRecord(progress, missionId);
    if (record.practiceDone && !hasLearningGate(progress, missionId)) {
      setView({ type: 'lab', missionId, stars: progress.starsByMission[missionId] ?? record.practiceStars ?? 1 });
      return;
    }
    setView({
      type: 'play',
      missionId,
      questionIndex: -1,
      firstTryAnswers: 0,
      reviewQuestions: getDelayedReviewQuestions(progress, missionId),
    });
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
    if (session !== saved) persistProgress({ ...progress, dailyPractice: session });
    setView({ type: 'daily' });
  };

  const persistProgress = (nextProgress: Progress) => {
    setSaveError(!saveProgress(nextProgress));
    setProgress(nextProgress);
  };

  const finishMission = (missionId: string, stars: number) => {
    const nextProgress = completeMission(progress, missionId, stars);
    if (!hasLearningGate(nextProgress, missionId)) return;
    persistProgress(nextProgress);
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
          baseMission.questions[baseMission.questions.length - 1],
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
  const exitGame = () => { if ((view.type === 'race' || view.type === 'code' || view.type === 'part-finder') && view.fromGames) setView({ type: 'concept-games' }); else returnToMap(); };
  const returnToMap = () => { setPendingRetention(null); setCombo(0); consecutiveWrongAnswers.current = 0; setView({ type: 'map' }); };
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
  const onPracticeSuccess = () => { consecutiveWrongAnswers.current = 0; };
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
      {saveError && <div className="fq-feedback retry fq-shell" role="alert" data-testid="status-save-error">This browser could not save your work. Keep this tab open; worksheet answers may be lost on reload. Enable browser storage to save progress.</div>}
      {view.type === 'map' && <MissionMap progress={progress} onStart={startMission} onOpenLab={(missionId) => { if (hasLearningGate(progress, missionId)) setView({ type: 'lab', missionId, stars: progress.starsByMission[missionId] ?? 1 }); }} onStartReview={startReview} onStartDaily={startDailyPractice} onConceptGames={() => setView({ type: 'concept-games' })} onAssessments={() => setView({ type: 'assessments' })} onReset={() => setResetOpen(true)} onPaper={(missionId) => { if (isMissionUnlocked(progress, missionId)) setView({ type: 'paper', missionId }); }} onChallenge={(unit) => setView({ type: 'challenge', unit })} onExtra={(missionId) => { if (isMissionUnlocked(progress, missionId) && hasGenerator(missionId)) setView({ type: 'extra', missionId, seed: 0, questionIndex: 0, firstTry: 0 }); }} onParent={() => setView({ type: 'parent' })} onGame={(type, missionId) => { if (isMissionUnlocked(progress, missionId)) setView({ type, missionId }); }} onPlacement={() => setView({ type: 'placement' })} />}
      {view.type === 'daily' && progress.dailyPractice && <DailyPractice session={progress.dailyPractice} renderModel={(model, reveal) => <ModelView model={model} reveal={reveal} />} onChange={(session) => persistProgress({ ...progress, dailyPractice: session })} onBack={returnToMap} onWrong={onPracticeWrong} onSuccess={onPracticeSuccess} />}
      {view.type === 'concept-games' && (() => {
        // The lesson games use the lesson the child is on (or the last open one); Part Finder uses the latest lesson it belongs to.
        const open = MISSIONS.filter((mission) => isMissionUnlocked(progress, mission.id));
        const lesson = getNextMission(progress) ?? open[open.length - 1] ?? MISSIONS[0];
        const finder = [...open].reverse().find((mission) => PART_FINDER_LESSONS.has(mission.id));
        const name = (mission: Mission) => `Lesson ${MISSIONS.indexOf(mission) + 1}: ${mission.shortTitle}`;
        const games: LessonGame[] = [
          { id: 'race', title: 'Fraction Race', blurb: 'Race a robot or a friend with quick questions.', icon: Zap, lessonTitle: name(lesson), onOpen: () => setView({ type: 'race', missionId: lesson.id, fromGames: true }) },
          { id: 'code', title: 'Coding', blurb: 'Write a little program that builds the fraction.', icon: Code2, lessonTitle: name(lesson), onOpen: () => setView({ type: 'code', missionId: lesson.id, fromGames: true }) },
          ...(finder ? [{ id: 'part-finder' as const, title: 'Part Finder', blurb: 'Find fair shares hidden in a square.', icon: Compass, lessonTitle: name(finder), onOpen: () => setView({ type: 'part-finder', missionId: finder.id, fromGames: true }) }] : []),
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
          renderModel={(model) => <ModelView model={model} compact />} />
      )}
      {view.type === 'code' && (
        <CodeQuest key={view.missionId} mission={getMission(view.missionId)} solved={fun.codeLevels?.[view.missionId] ?? 0}
          onExit={exitGame} onSolved={(level) => setFun((current) => recordCodeLevel(current, view.missionId, level))} />
      )}
      {view.type === 'part-finder' && <PartFinder best={fun.partFinderBest ?? null} onExit={exitGame} onFinish={(score) => setFun((current) => recordPartFinder(current, score))} />}
      {view.type === 'parent' && <ParentView progress={progress} fun={fun} unitTitles={UNIT_TITLES} childName={account.activeProfile?.displayName ?? null} onBack={returnToMap} onBreakPreferencesChange={(preferences) => setFun((current) => setBreakPreferences(current, preferences))} onDisplayPreferencesChange={(preferences) => setFun((current) => setDisplayPreferences(current, preferences))} />}
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
        <ExtraDoneView mission={getMission(view.missionId)} firstTry={view.firstTry} total={view.total} progress={progress} onMap={returnToMap} onReset={() => setResetOpen(true)}
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
        <PaperCheck missionId={view.missionId} progress={progress} onChange={persistProgress} onBack={returnToMap}
          onLab={() => setView({ type: 'lab', missionId: view.missionId, stars: progress.starsByMission[view.missionId] ?? getLearningRecord(progress, view.missionId).practiceStars ?? 1 })} />
      )}
      {(view.type === 'play' || view.type === 'review') && activeMission && (
        <PlayView
          key={`${activeMission.id}-${view.questionIndex}`}
          mission={activeMission}
          starEligibleQuestionIds={view.type === 'play' && baseMission ? baseMission.questions.map((question) => question.id) : undefined}
          questionIndex={view.questionIndex}
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
              setView({
                type: 'play',
                missionId: activeMission.id,
                questionIndex: view.questionIndex < 0 ? 0 : view.questionIndex + 1,
                firstTryAnswers,
                reviewQuestions: view.reviewQuestions,
              });
            }
          }}
          onFinish={(stars) => {
            const record = getLearningRecord(progress, activeMission.id);
            persistProgress(updateLearning(progress, activeMission.id, { ...record, practiceDone: true, practiceStars: Math.max(stars, record.practiceStars ?? 0) }));
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
      {view.type === 'lab' && <LearningLab missionId={view.missionId} progress={progress} onChange={persistProgress} onFinish={() => finishMission(view.missionId, view.stars)} onBack={returnToMap} onPaper={() => setView({ type: 'paper', missionId: view.missionId })} onRedo={(part) => startRedoPart(view.missionId, part)} onWrong={onPracticeWrong} onSuccess={onPracticeSuccess} />}
      {view.type === 'redo' && <RedoLab missionId={view.missionId} progress={progress} onChange={persistProgress} onBack={() => setView({ type: 'lab', missionId: view.missionId, stars: progress.starsByMission[view.missionId] ?? 1 })} onWrong={onPracticeWrong} onSuccess={onPracticeSuccess} />}
      {view.type === 'retention' && <LearningLab key={`retention-${view.startedAt}`} review missionId={view.missionId} progress={progress} onChange={persistProgress} onBack={returnToMap} onWrong={onPracticeWrong} onSuccess={onPracticeSuccess} onFinish={(updated) => {
        const latest = updated ?? progress;
        const record = getLearningRecord(latest, view.missionId);
        persistProgress(record.confirmedAt && record.confirmedAt >= view.startedAt ? completeSkillReview(latest, view.missionId) : deferSkillReview(latest, view.missionId));
        if (view.nextView.type === 'review-complete') trackEvent('quick_review_completed');
        setView(view.nextView);
      }} />}
      {view.type === 'reward' && activeMission && (
        <RewardView mission={activeMission} stars={view.stars} progress={progress} onMap={returnToMap} onNext={startMission} onReset={() => setResetOpen(true)} onGame={(type) => setView({ type, missionId: activeMission.id })} />
      )}
      {view.type === 'review-complete' && (
        <ReviewCompleteView reviewedCount={view.reviewedCount} progress={progress} onMap={returnToMap} onReset={() => setResetOpen(true)} />
      )}
      {breakReason && <BrainBreakOffer reason={breakReason} quietMode={quietBreaks} onSkip={closeBreak} onFinish={closeBreak} />}
      {resetOpen && (
        <div className="fq-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResetOpen(false); }}>
          <div className="fq-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description">
            <button className="fq-icon-button fq-modal-close" onClick={() => setResetOpen(false)} aria-label="Close reset dialog" data-testid="button-close-reset"><X size={18} /></button>
            <h2 id="reset-title">Start the map over?</h2>
            <p id="reset-description">{account.user ? `This clears ${account.activeProfile?.displayName ?? 'this learner'}’s lesson progress, worksheet answers, learning evidence, daily-practice work, stars, XP, streaks and saved skill reviews, on every device.` : 'This clears lesson progress, worksheet answers, learning evidence, daily-practice work, stars, XP, streaks and saved skill reviews on this device.'} This cannot be undone.</p>
            <div className="fq-modal-actions">
              <button className="fq-button ghost" onClick={() => setResetOpen(false)} data-testid="button-cancel-reset">Keep exploring</button>
              <button className="fq-button" onClick={resetProgress} data-testid="button-confirm-reset">Reset progress</button>
            </div>
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
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
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
