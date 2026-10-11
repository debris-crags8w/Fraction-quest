import { type CSSProperties, useEffect, useLayoutEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Compass, Dumbbell, Flame, Lightbulb, Map as MapIcon, RotateCcw, Sparkles, Star, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { MathText } from './MathText';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  completeMission,
  completeSkillReview,
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
  type Answer,
  type Mission,
  type ModelSpec,
  type PracticeQuestion,
  type Progress,
} from './game';
import NotFound from '@/pages/not-found';
import LearningLab from './LearningLab';
import { LearningText } from './LearningText';
import './learning-text.css';
import QuickReviewEntry from './QuickReviewEntry';
import { getLearningRecord, hasLearningGate, learningSummary, updateLearning, worksheetCount } from './learning';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { trackEvent } from './lib/analytics';
import { loadFun, playCue, recordCorrect, resetFun, setSound, type FunState } from './lib/fun';
import { ModelTag } from './models';
import { Confetti, DailyRing, denomColor, FunContext, LessonPath, Mascot, StoryPrompt, TapModel, unitColor, useFun, type MascotMood, type PathNode } from './fun-ui';
import PaperCheck from './PaperCheck';
import Challenge from './Challenge';
import { freshSeed, generateQuestions, getExtraPractice, hasGenerator } from './practice-bank';
import { CHALLENGES, challengeMaxPoints } from './challenges';
import { PrintMenu } from './Printables';
import { PaperFold } from './PaperFold';
import { AccountGate, useAccount, useAccountSync } from './account';
import LoginPage from './LoginPage';
const queryClient = new QueryClient();

type View =
  | { type: 'map' }
  | { type: 'play'; missionId: string; questionIndex: number; firstTryAnswers: number; reviewQuestions: PracticeQuestion[] }
  | { type: 'review'; questionIndex: number; reviewQuestions: PracticeQuestion[] }
  | { type: 'review-complete'; reviewedCount: number }
  | { type: 'reward'; missionId: string; stars: number };
type LabView = { type: 'lab'; missionId: string; stars: number };
type PaperView = { type: 'paper'; missionId: string };
type ChallengeView = { type: 'challenge'; unit: number };
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
  { title: 'Rename and compare', subtitle: 'Simplify, compare, and order unlike fractions' },
  { title: 'Mixed numbers and amounts', subtitle: 'Combine mixed numbers and find fractions of quantities' },
  { title: 'Multiply and divide', subtitle: 'Use fractions as factors, measures, and shares' },
  { title: 'Fractions in measurement', subtitle: 'Measure, share, and describe real quantities' },
  { title: 'Fraction models in context', subtitle: 'Explore probability, area, number lines, and recipes' },
  { title: 'Fractions, decimals, and percent', subtitle: 'Connect representations and solve multi-step stories' },
];

// Lessons where kids make fractions by folding a paper strip (1 → 1/2 → 1/4 → 1/8).
const FOLD_LESSONS: Record<string, { intro: string; allowThirds?: boolean; shadeHalf?: boolean }> = {
  'equal-parts': { intro: 'Fold the paper. Every fold makes equal pieces.' },
  'unit-fractions': { intro: 'Fold, then unfold. Each piece is a unit fraction.' },
  'unit-size': { intro: 'Fold in half again and again: 1/2, 1/4, 1/8. Watch the pieces get smaller.', allowThirds: false },
  'equivalent-models': { intro: 'Half the paper is shaded. Fold it again and unfold: 1/2 = 2/4 = 4/8.', allowThirds: false, shadeHalf: true },
};

function Fraction({ numerator, denominator }: { numerator: number; denominator: number }) {
  return (
    <span className="fq-fraction" aria-label={`${numerator} over ${denominator}`}>
      <span>{numerator}</span><span className="slash" /><span>{denominator}</span>
    </span>
  );
}

function FractionBar({ numerator, denominator }: { numerator: number; denominator: number }) {
  return (
    <div className="fq-bar-model" style={{ '--pieces': denominator, '--piece': denomColor(denominator) } as CSSProperties} role="img" aria-label={`${numerator}/${denominator}: each whole is split into ${denominator} equal parts, with ${numerator} parts shaded`}>
      {Array.from({ length: Math.max(1, Math.ceil(numerator / denominator)) }, (_, whole) => (
        <div className="fq-bar-whole" key={whole}>
          <span className="fq-bar-whole-label">Whole {whole + 1}</span>
          <div className="fq-bar">
            {Array.from({ length: denominator }, (_, index) => <span className={whole * denominator + index < numerator ? '' : 'empty'} style={{ '--i': whole * denominator + index } as CSSProperties} key={index} />)}
          </div>
          {whole === 0 && <span className="fq-bar-part-marker" style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}><b>PART</b></span>}
        </div>
      ))}
      <span className="fq-bar-part-guide"><i aria-hidden="true" /> Part · one section is one equal part</span>
    </div>
  );
}

function ModelView({ model, compact = false }: { model: ModelSpec; compact?: boolean }) {
  return (
    <div className={`fq-visual-model ${compact ? 'compact' : ''}`} data-testid="visual-fraction-model">
      {!compact && (model.kind === 'bars' || model.kind === 'decimal') && <ModelTag kind="bar" />}
      {!compact && model.kind === 'line' && <ModelTag kind="line" />}
      {!compact && model.kind === 'set' && <ModelTag kind="set" />}
      {model.kind === 'bars' && (
        <div className="fq-visual-bars">
          {model.bars.map((item, index) => (
            <div className="fq-visual-bar-row" key={`${item.numerator}-${item.denominator}-${index}`}>
              <FractionBar numerator={item.numerator} denominator={item.denominator} />
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
          <span className="fq-partition-whole-label">Whole</span>
          <div className="fq-partition-whole">
            {model.parts.map((size, index) => <span className={index === 0 ? 'part-sample' : ''} style={{ flexBasis: `${size}%`, '--i': index } as CSSProperties} key={`${size}-${index}`} />)}
          </div>
          <span className="fq-partition-part-label"><i aria-hidden="true" /> Part · one section</span>
        </div>
      )}
      {model.kind === 'equation' && <div className="fq-model-equation" role="img" aria-label={`Visual equation ${model.text}`}><MathText text={model.text} /></div>}
      {model.kind === 'decimal' && (
        <div className="fq-decimal-model">
          <FractionBar numerator={model.tenths} denominator={10} />
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
        <button className="fq-brand" onClick={onHome} data-testid="button-home">
          <span className="fq-brand-mark" aria-hidden="true"><Compass size={22} strokeWidth={3} /></span>
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
            <span className="fq-account-avatar" aria-hidden="true">{account.user?.displayName.trim().charAt(0).toUpperCase() ?? 'G'}</span>
            <span className="fq-account-name">
              <strong>{account.user?.displayName ?? 'Guest'}</strong>
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

function MissionMap({ progress, onStart, onStartReview, onReset, onPaper, onChallenge, onExtra }: { progress: Progress; onStart: (missionId: string) => void; onStartReview: () => void; onReset: () => void; onPaper: (missionId: string) => void; onChallenge: (unit: number) => void; onExtra: (missionId: string) => void }) {
  const { user } = useAccount();
  const totalStars = Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0);
  const nextMission = getNextMission(progress);
  const firstPendingMission = MISSIONS.find(item => !hasLearningGate(progress, item.id));
  const evidenceRecommendation = !!nextMission && nextMission.id !== firstPendingMission?.id;
  const [selectedId, setSelectedId] = useState<string | null>(() => nextMission?.id ?? null);
  const units = UNIT_INFO.map((unit, index) => ({
    ...unit,
    number: index + 1,
    missions: MISSIONS.filter((item) => item.unit === index + 1),
  }));

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

          {nextMission ? (
            <button className="fq-continue-card" onClick={() => onStart(nextMission.id)} data-testid="button-continue-course">
              <span className="fq-continue-icon"><ArrowRight size={21} /></span>
              <span className="fq-continue-copy">
                <strong>{evidenceRecommendation ? 'Recommended from your answers' : progress.completedMissionIds.length ? 'Keep exploring' : 'Start your first lesson'}</strong>
                <span>Lesson {String(MISSIONS.indexOf(nextMission) + 1).padStart(2, '0')} · {nextMission.title}{evidenceRecommendation ? ' · Revisit the skill that needs another try' : ''}</span>
              </span>
              <ArrowRight className="fq-continue-arrow" size={20} />
            </button>
          ) : (
            <div className="fq-course-finished" data-testid="status-course-complete"><Trophy size={24} /> You explored every lesson. Replay any one to practice again.</div>
          )}

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
                        state: completed ? 'done' : !unlocked ? 'lock' : mission.id === nextMission?.id ? 'now' : 'open',
                        detail: (
                          <>
                            <span className="fq-node-kicker">Lesson {String(missionNumber).padStart(2, '0')}</span>
                            <h4>{mission.title}</h4>
                            <p>{mission.description}</p>
                            <p className="fq-node-status" data-testid={`status-learning-${mission.id}`}>
                              Worksheet {worksheetCount(learning, mission.id)}/12 · {summary.independentChecks}/2 independent model checks
                              <br />{summary.transfer} · {summary.retention}
                              {!completed && unlocked && <><br />Finish the models, your reasoning and all worksheet answers to unlock the next lesson.</>}
                              {progress.completedMissionIds.includes(mission.id) && !completed && <><br />Earlier progress saved; new checks still needed.</>}
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
                            {unlocked && (
                              <div className="fq-node-tools">
                                {hasGenerator(mission.id) && <button className="fq-button ghost" onClick={() => onExtra(mission.id)} data-testid={`button-practice-more-${mission.id}`}><Dumbbell size={17} /> Practice more</button>}
                                <PrintMenu missionId={mission.id} record={learning} />
                                <button className="fq-button ghost" onClick={() => onPaper(mission.id)} data-testid={`button-check-paper-${mission.id}`}><ClipboardCheck size={17} /> Check my paper</button>
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
        <aside className="fq-course-note">
          <strong>About this learning path</strong>
          <p>
            Designed as a broad U.S. grades 3–5 bridge (roughly ages 8–10), from equal shares and number lines through operations and decimals.
            Topic-scope references: <a href="https://webassets.zearn.org/resources/G03_Course_Guide_Z1.pdf" target="_blank" rel="noreferrer">Zearn Grade 3 Course Guide</a> and <a href="https://www.dreambox.com/math/skills/fractions" target="_blank" rel="noreferrer">DreamBox fractions overview</a>.
            This is not a complete or standards-aligned course.
          </p>
        </aside>
        <footer className="fq-footer"><span>Made for curious minds, ages 8–10. {user ? `Progress is saved to ${user.displayName}'s account.` : 'Progress stays on this device.'}</span><button onClick={onReset} data-testid="button-reset-progress-footer">{user ? 'Reset my progress' : "Reset this device's progress"}</button></footer>
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
    const correctOnFirstTry = !question.isOptionalReview && feedback === 'correct' && attempts === 0 ? 1 : 0;
    const updatedFirstTryAnswers = firstTryAnswers + correctOnFirstTry;
    if (isLastQuestion) {
      if (isQuickReview) {
        onFinishReview?.();
        return;
      }
      const totalQuestions = mission.questions.filter((item) => !item.isOptionalReview).length;
      const stars = updatedFirstTryAnswers === totalQuestions ? 3 : updatedFirstTryAnswers >= totalQuestions - 1 ? 2 : 1;
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
                <p><strong><LearningText text={mission.example.prompt} /></strong></p>
                <p className="fq-example-result"><LearningText text={mission.example.answer} /></p>
                <p><LearningText text={mission.example.explanation} speak /></p>
              </div>
              {FOLD_LESSONS[mission.id] && <PaperFold {...FOLD_LESSONS[mission.id]} />}
              <TapModel model={mission.example.model} />
            </div>
          ) : question && (
            <>
              {question.isReview && <div className="fq-review-label"><RotateCcw size={15} />{question.isOptionalReview ? `${isQuickReview ? 'Due skill' : 'Optional review'} · ${question.reviewTopicTitle}` : ' A quick revisit to help it stick'}</div>}
              {question.isMastery && <div className="fq-mastery-label"><Star size={15} /> Practice checkpoint · models and worksheet come next</div>}
              <div className="fq-model-area">
                <ModelView model={useSimplerModel ? question.simplerModel : question.model} />
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
                  ? <><strong>{cheer}</strong><span><LearningText text={question.hint} /></span></>
                   : <><strong>Not quite yet. Let's look at the pieces.</strong><span><LearningText text={question.retryFeedback} speak /></span></>}
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

function RewardView({ mission, stars, progress, onMap, onNext, onReset }: { mission: Mission; stars: number; progress: Progress; onMap: () => void; onNext: (missionId: string) => void; onReset: () => void }) {
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
           <p>You built models, explained your thinking and corrected all 12 worksheet answers. The next lesson is unlocked. A later independent review will check what you remember.</p>
          <div className="fq-reward-stars" data-testid="status-mission-stars" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((star) => <Star key={star} size={44} strokeWidth={2.5} className={star < stars ? 'filled' : ''} style={{ animationDelay: `${0.7 + star * 0.38}s` }} />)}</div>
          <div className="fq-reward-actions">
            {nextMission ? <button className="fq-button secondary" onClick={() => onNext(nextMission.id)} data-testid={`button-next-mission-${nextMission.id}`}>Next lesson <ArrowRight size={17} /></button> : <span className="fq-course-finished">Course complete!</span>}
            <button className="fq-button ghost" onClick={onMap} data-testid="button-return-map"><MapIcon size={17} /> Learning map</button>
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
          <p>You reached the end of {reviewedCount} quick {reviewedCount === 1 ? 'question' : 'questions'}. Your progress is saved on this device. Correct answers clear a skill; skipped or missed skills can return tomorrow.</p>
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
  const [view, setView] = useState<View | LabView | RetentionView | PaperView | ChallengeView | ExtraView>({ type: 'map' });
  const [pendingRetention, setPendingRetention] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [fun, setFun] = useState<FunState>(() => account.initialFun ?? loadFun());
  const [combo, setCombo] = useState(0);
  useAccountSync(progress, fun);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

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

  const persistProgress = (nextProgress: Progress) => {
    setSaveError(!saveProgress(nextProgress));
    setProgress(nextProgress);
  };

  const finishMission = (missionId: string, stars: number) => {
    const nextProgress = completeMission(progress, missionId, stars);
    if (!hasLearningGate(nextProgress, missionId)) return;
    persistProgress(nextProgress);
    setView({ type: 'reward', missionId, stars: nextProgress.starsByMission[missionId] ?? stars });
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
  const returnToMap = () => { setPendingRetention(null); setCombo(0); setView({ type: 'map' }); };
  const nextReviewView = (nextView: View) => {
    if (pendingRetention) {
      setView({ type: 'retention', missionId: pendingRetention, startedAt: Date.now(), nextView });
      setPendingRetention(null);
    } else {
      if (nextView.type === 'review-complete') trackEvent('quick_review_completed');
      setView(nextView);
    }
  };

  return (
    <FunContext.Provider value={{ fun, setFun }}>
      {saveError && <div className="fq-feedback retry fq-shell" role="alert" data-testid="status-save-error">This browser could not save your work. Keep this tab open; worksheet answers may be lost on reload. Enable browser storage to save progress.</div>}
      {view.type === 'map' && <MissionMap progress={progress} onStart={startMission} onStartReview={startReview} onReset={() => setResetOpen(true)} onPaper={(missionId) => { if (isMissionUnlocked(progress, missionId)) setView({ type: 'paper', missionId }); }} onChallenge={(unit) => setView({ type: 'challenge', unit })} onExtra={(missionId) => { if (isMissionUnlocked(progress, missionId) && hasGenerator(missionId)) setView({ type: 'extra', missionId, seed: 0, questionIndex: 0, firstTry: 0 }); }} />}
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
            onCorrect={(firstTry) => { setFun((current) => recordCorrect(current)); setCombo((current) => (firstTry ? current + 1 : 0)); }}
            onWrong={() => setCombo(0)}
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
          questionIndex={view.questionIndex}
          firstTryAnswers={view.type === 'play' ? view.firstTryAnswers : 0}
          isQuickReview={view.type === 'review'}
          combo={combo}
          onBack={returnToMap}
          onCorrect={(firstTry) => { setFun((current) => recordCorrect(current)); setCombo((current) => (firstTry ? current + 1 : 0)); }}
          onWrong={() => setCombo(0)}
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
      {view.type === 'lab' && <LearningLab missionId={view.missionId} progress={progress} onChange={persistProgress} onFinish={() => finishMission(view.missionId, view.stars)} onBack={returnToMap} onPaper={() => setView({ type: 'paper', missionId: view.missionId })} />}
      {view.type === 'retention' && <LearningLab key={`retention-${view.startedAt}`} review missionId={view.missionId} progress={progress} onChange={persistProgress} onBack={returnToMap} onFinish={(updated) => {
        const latest = updated ?? progress;
        const record = getLearningRecord(latest, view.missionId);
        persistProgress(record.confirmedAt && record.confirmedAt >= view.startedAt ? completeSkillReview(latest, view.missionId) : deferSkillReview(latest, view.missionId));
        if (view.nextView.type === 'review-complete') trackEvent('quick_review_completed');
        setView(view.nextView);
      }} />}
      {view.type === 'reward' && activeMission && (
        <RewardView mission={activeMission} stars={view.stars} progress={progress} onMap={returnToMap} onNext={startMission} onReset={() => setResetOpen(true)} />
      )}
      {view.type === 'review-complete' && (
        <ReviewCompleteView reviewedCount={view.reviewedCount} progress={progress} onMap={returnToMap} onReset={() => setResetOpen(true)} />
      )}
      {resetOpen && (
        <div className="fq-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResetOpen(false); }}>
          <div className="fq-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description">
            <button className="fq-icon-button fq-modal-close" onClick={() => setResetOpen(false)} aria-label="Close reset dialog" data-testid="button-close-reset"><X size={18} /></button>
            <h2 id="reset-title">Start the map over?</h2>
            <p id="reset-description">{account.user ? `This clears ${account.user.displayName}'s lesson progress, worksheet answers, learning evidence, stars, XP, streaks and saved skill reviews, on every device.` : 'This clears lesson progress, worksheet answers, learning evidence, stars, XP, streaks and saved skill reviews on this device.'} This cannot be undone.</p>
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
