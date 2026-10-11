import { type CSSProperties, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Compass, Flame, Lightbulb, LogIn, LogOut, Map as MapIcon, RotateCcw, Sparkles, Star, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  completeMission,
  completeSkillReview,
  deferSkillReview,
  getDelayedReviewQuestions,
  getDueSkillReviewCount,
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
import { getLearningRecord, hasLearningGate, learningSummary, updateLearning, worksheetCount } from './learning';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { trackEvent } from './lib/analytics';
import { loadFun, playCue, recordCorrect, resetFun, setSound, type FunState } from './lib/fun';
import { ModelTag } from './models';
import { AccountGate, useAccount, useAccountSync } from './account';
import LoginPage from './LoginPage';
import { Confetti, DailyRing, denomColor, FunContext, LessonPath, Mascot, TapModel, unitColor, useFun, type MascotMood, type PathNode } from './fun-ui';

const queryClient = new QueryClient();

type View =
  | { type: 'map' }
  | { type: 'play'; missionId: string; questionIndex: number; firstTryAnswers: number; reviewQuestions: PracticeQuestion[] }
  | { type: 'review'; questionIndex: number; reviewQuestions: PracticeQuestion[] }
  | { type: 'review-complete'; reviewedCount: number }
  | { type: 'reward'; missionId: string; stars: number };
type LabView = { type: 'lab'; missionId: string; stars: number };
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
];

function Fraction({ numerator, denominator }: { numerator: number; denominator: number }) {
  return (
    <span className="fq-fraction" aria-label={`${numerator} over ${denominator}`}>
      <span>{numerator}</span><span className="slash" /><span>{denominator}</span>
    </span>
  );
}

function FractionBar({ numerator, denominator }: { numerator: number; denominator: number }) {
  return (
    <div style={{ display: 'grid', gap: 8, flex: 1 }} role="img" aria-label={`${numerator}/${denominator}, with ${denominator} equal parts per whole`}>
      {Array.from({ length: Math.max(1, Math.ceil(numerator / denominator)) }, (_, whole) => (
        <div className="fq-bar" style={{ '--pieces': denominator, '--piece': denomColor(denominator) } as CSSProperties} key={whole}>
          {Array.from({ length: denominator }, (_, index) => <span className={whole * denominator + index < numerator ? '' : 'empty'} key={index} />)}
        </div>
      ))}
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
              <Fraction numerator={item.numerator} denominator={item.denominator} />
            </div>
          ))}
        </div>
      )}
      {model.kind === 'set' && (
        <div className="fq-set-wrap">
          <div className="fq-counter-set" role="img" aria-label={`${model.selected} of ${model.total} counters highlighted`}>
            {Array.from({ length: model.total }, (_, index) => <span className={`fq-counter ${index < model.selected ? 'selected' : ''}`} key={index} />)}
          </div>
        </div>
      )}
      {model.kind === 'line' && (() => {
        const wholes = model.wholes ?? numberLineWholeCount(model.numerator, model.denominator);
        const divisions = model.denominator * wholes;
        const value = model.numerator / divisions;
        const range = Array.from({ length: wholes + 1 }, (_, index) => index).join(' to ');
        return (
          <div className="fq-numberline-wrap">
            <div className="fq-visual-numberline" role="img" aria-label={'Number line from 0 to ' + wholes + ', marked at ' + model.numerator + '/' + model.denominator}>
              <div className="fq-numberline-track" />
              <span className="fq-numberline-marker" style={{ left: (value * 100) + '%' }} />
              {Array.from({ length: divisions + 1 }, (_, tick) => (
                <span className="fq-numberline-tick" style={{ left: ((tick / divisions) * 100) + '%' }} key={tick}>
                  {tick === 0 ? '0' : tick === divisions ? String(wholes) : tick % model.denominator === 0 ? String(tick / model.denominator) : ''}
                </span>
              ))}
            </div>
            <p className="fq-numberline-range" data-testid="text-model-numberline-range">{wholes === 1 ? 'The whole interval runs from 0 to 1.' : 'Each whole is one interval: ' + range + '.'}</p>
            <div className="fq-line-readout"><Fraction numerator={model.numerator} denominator={model.denominator} /></div>
          </div>
        );
      })()}
      {model.kind === 'partition' && (
        <div className="fq-partition-whole" role="img" aria-label={`A whole split into ${model.parts.length} pieces`}>
          {model.parts.map((size, index) => <span style={{ flexBasis: `${size}%` }} key={`${size}-${index}`} />)}
        </div>
      )}
      {model.kind === 'equation' && <div className="fq-model-equation" role="img" aria-label={`Visual equation ${model.text}`}>{model.text}</div>}
      {model.kind === 'decimal' && (
        <div className="fq-decimal-model">
          <FractionBar numerator={model.tenths} denominator={10} />
          <span>{(model.tenths / 10).toFixed(1)}</span>
        </div>
      )}
      {model.caption && <p className="fq-model-caption">{model.caption}</p>}
    </div>
  );
}

function Topbar({ progress, onReset, onHome }: { progress: Progress; onReset: () => void; onHome: () => void }) {
  const stars = Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0);
  const { fun, setFun } = useFun();
  return (
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
        <AccountChip />
        <button className="fq-icon-button" onClick={() => setFun(setSound(fun, !fun.sound))} aria-label={fun.sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={fun.sound} data-testid="button-toggle-sound">{fun.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
        <button className="fq-icon-button" onClick={onReset} aria-label="Reset progress" data-testid="button-reset-progress"><RotateCcw size={18} /></button>
      </div>
    </header>
  );
}

function AccountChip() {
  const { user, syncStatus, signOut, goToSignIn } = useAccount();
  if (!user) {
    return <button className="fq-button ghost fq-account-signin" onClick={goToSignIn} data-testid="button-go-sign-in"><LogIn size={16} /> Sign in</button>;
  }
  return (
    <div className="fq-account" data-testid="status-account">
      <span className="fq-account-avatar" aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</span>
      <span className="fq-account-name">
        <strong>{user.displayName}</strong>
        <small className={`sync-${syncStatus}`} data-testid="status-sync">{syncStatus === 'saving' ? 'Saving…' : syncStatus === 'offline' ? 'Not saved yet' : 'Saved'}</small>
      </span>
      <button className="fq-icon-button" onClick={() => { void signOut(); }} aria-label={`Sign out ${user.displayName}`} data-testid="button-sign-out"><LogOut size={18} /></button>
    </div>
  );
}

function MissionMap({ progress, onStart, onStartReview, onReset }: { progress: Progress; onStart: (missionId: string) => void; onStartReview: () => void; onReset: () => void }) {
  const totalStars = Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0);
  const nextMission = getNextMission(progress);
  const dueReviewCount = getDueSkillReviewCount(progress);
  const [selectedId, setSelectedId] = useState<string | null>(() => nextMission?.id ?? null);
  const { user } = useAccount();
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
              <span className="fq-continue-copy"><strong>{progress.completedMissionIds.length ? 'Keep exploring' : 'Start your first lesson'}</strong><span>Lesson {String(MISSIONS.indexOf(nextMission) + 1).padStart(2, '0')} · {nextMission.title}</span></span>
              <ArrowRight className="fq-continue-arrow" size={20} />
            </button>
          ) : (
            <div className="fq-course-finished" data-testid="status-course-complete"><Trophy size={24} /> You explored every lesson. Replay any one to practice again.</div>
          )}

          {dueReviewCount > 0 && (
            <button className="fq-continue-card fq-review-continue-card" onClick={onStartReview} data-testid="button-start-due-review">
              <span className="fq-continue-icon"><RotateCcw size={20} /></span>
              <span className="fq-continue-copy">
                <strong>Quick skill review</strong>
                <span>{dueReviewCount} due {dueReviewCount === 1 ? 'skill' : 'skills'} ready for a short retry round</span>
              </span>
              <ArrowRight className="fq-continue-arrow" size={20} />
            </button>
          )}

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
                              Worksheet {worksheetCount(learning, mission.id)}/12 · Builds on my own {summary.independentChecks}/2
                              <br />Remembered: {summary.retention}
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
  onFinishReview,
}: {
  mission: Mission;
  questionIndex: number;
  firstTryAnswers: number;
  combo: number;
  onBack: () => void;
  onNext: (firstTryAnswers: number) => void;
  onFinish: (stars: number) => void;
  onMissed: (missionId: string, questionId: string) => void;
  onReviewCompleted: (missionId: string) => void;
  onReviewDeferred: (missionId: string) => void;
  onPracticeSignal: (missionId: string, misconception?: string) => void;
  onCorrect: (firstTry: boolean) => void;
  onWrong: () => void;
  isQuickReview?: boolean;
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
      onFinish(stars);
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
  const steps = mission.questions.length + (isQuickReview ? 0 : 1);
  const doneSteps = (isQuickReview ? 0 : 1) + Math.max(0, questionIndex) + (feedback === 'correct' ? 1 : 0) - (isExample ? 1 : 0);
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
              : isExample
                ? `Lesson ${lessonNumber} · See it first`
                : `Lesson ${lessonNumber} · ${mission.shortTitle} · ${questionIndex + 1} of ${mission.questions.length}`}
          </p>
          <h1 id="lesson-title">{isExample ? mission.title : question?.prompt}</h1>
          {isExample ? (
            <div className="fq-example">
              <div className="fq-mascot-say">
                <Mascot mood="happy" size={64} />
                <p className="fq-skill-statement">{mission.skill}</p>
              </div>
              <div className="fq-model-area"><ModelView model={mission.example.model} /></div>
              <div className="fq-example-answer">
                <span className="fq-example-label"><Lightbulb size={16} /> Let's think it through</span>
                <p><strong>{mission.example.prompt}</strong></p>
                <p className="fq-example-result">{mission.example.answer}</p>
                <p>{mission.example.explanation}</p>
              </div>
              <TapModel model={mission.example.model} />
            </div>
          ) : question && (
            <>
              {question.isReview && <div className="fq-review-label"><RotateCcw size={15} />{question.isOptionalReview ? `${isQuickReview ? 'Due skill' : 'Optional review'} · ${question.reviewTopicTitle}` : ' A quick revisit to help it stick'}</div>}
              {question.isMastery && <div className="fq-mastery-label"><Star size={15} /> Practice checkpoint · models and worksheet come next</div>}
              <div className="fq-model-area">
                <ModelView model={useSimplerModel ? question.simplerModel : question.model} />
              </div>
              {hintOpen && <div className="fq-hint" data-testid="text-question-hint"><Lightbulb size={18} /> <span><strong>Try this idea:</strong> {question.hint}</span></div>}
              {attempts >= 2 && (
                <div className="fq-remediation" role="note" data-testid="status-remediation">
                  <strong>Let's make it simpler.</strong>
                  <span>{question.hint}</span>
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
                    <span className="fq-choice-marker" aria-hidden="true">{index + 1}</span>
                    <span>{choice}<span className="fq-sr">{selection === index ? ` (${feedback === 'correct' ? 'correct' : feedback === 'retry' ? 'try again' : 'selected, not checked yet'})` : ''}</span></span>
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
                  ? <><strong>{cheer}</strong><span>{question.hint}</span></>
                  : <><strong>Not quite!</strong><span>{question.retryFeedback}</span></>}
              </div>
              {feedback === 'correct' ? (
                <button className="fq-button fq-sheet-button" onClick={moveOn} data-testid={isLastQuestion ? 'button-finish-mission' : 'button-next-question'}>
                  {isLastQuestion ? isQuickReview ? 'Finish review' : 'Build & explain next' : 'Continue'} <ArrowRight size={17} />
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
           <p>You built it two ways, explained it, and got all 12 worksheet answers. The next lesson is open!</p>
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
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [view, setView] = useState<View | LabView | RetentionView>({ type: 'map' });
  const [pendingRetention, setPendingRetention] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [fun, setFun] = useState<FunState>(() => loadFun());
  const [combo, setCombo] = useState(0);
  const { user } = useAccount();
  useAccountSync(progress, fun);

  const startMission = (missionId: string) => {
    if (!isMissionUnlocked(progress, missionId)) return;
    if (getLearningRecord(progress, missionId).practiceDone && !hasLearningGate(progress, missionId)) {
      setView({ type: 'lab', missionId, stars: progress.starsByMission[missionId] ?? 1 });
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
      {view.type === 'map' && <MissionMap progress={progress} onStart={startMission} onStartReview={startReview} onReset={() => setResetOpen(true)} />}
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
            persistProgress(updateLearning(progress, activeMission.id, { ...record, practiceDone: true }));
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
      {view.type === 'lab' && <LearningLab missionId={view.missionId} progress={progress} onChange={persistProgress} onFinish={() => finishMission(view.missionId, view.stars)} onBack={returnToMap} />}
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
            <p id="reset-description">{user ? `This clears ${user.displayName}'s lesson progress, worksheet answers, learning evidence, stars, XP, streaks and saved skill reviews, on every device.` : 'This clears lesson progress, worksheet answers, learning evidence, stars, XP, streaks and saved skill reviews on this device.'} This cannot be undone.</p>
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

function Root() {
  return (
    <AccountGate
      renderLoading={() => (
        <div className="fq-app fq-login-app" role="status" aria-live="polite">
          <div className="fq-loading"><Mascot mood="thinking" size={90} /><p>Getting your map ready…</p></div>
        </div>
      )}
      renderLogin={(props) => <LoginPage {...props} />}
    >
      {(key) => <Game key={key} />}
    </AccountGate>
  );
}

function AppRouter() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={Root} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;