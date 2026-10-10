import { type CSSProperties, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Compass, Lightbulb, LockKeyhole, Map as MapIcon, RotateCcw, Sparkles, Star, Trophy, X } from 'lucide-react';
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
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { trackEvent } from './lib/analytics';

const queryClient = new QueryClient();

type View =
  | { type: 'map' }
  | { type: 'play'; missionId: string; questionIndex: number; firstTryAnswers: number; reviewQuestions: PracticeQuestion[] }
  | { type: 'review'; questionIndex: number; reviewQuestions: PracticeQuestion[] }
  | { type: 'review-complete'; reviewedCount: number }
  | { type: 'reward'; missionId: string; stars: number };

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
    <div className="fq-bar" style={{ '--pieces': denominator } as CSSProperties} role="img" aria-label={`${numerator} of ${denominator} equal parts`}>
      {Array.from({ length: denominator }, (_, index) => <span className={index < numerator ? '' : 'empty'} key={index} />)}
    </div>
  );
}

function ModelView({ model, compact = false }: { model: ModelSpec; compact?: boolean }) {
  return (
    <div className={`fq-visual-model ${compact ? 'compact' : ''}`} data-testid="visual-fraction-model">
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
        const wholes = model.wholes ?? 1;
        const divisions = model.denominator * wholes;
        const value = Math.min(model.numerator / divisions, 1);
        return (
          <div className="fq-numberline-wrap">
            <div className="fq-visual-numberline" role="img" aria-label={`Number line from 0 to ${wholes}, marked at ${model.numerator}/${model.denominator}`}>
              <div className="fq-numberline-track" />
              <span className="fq-numberline-marker" style={{ left: `${value * 100}%` }} />
              {Array.from({ length: divisions + 1 }, (_, tick) => (
                <span className="fq-numberline-tick" style={{ left: `${(tick / divisions) * 100}%` }} key={tick}>
                  {tick === 0 ? '0' : tick === divisions ? String(wholes) : tick % model.denominator === 0 ? String(tick / model.denominator) : ''}
                </span>
              ))}
            </div>
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

function Stars({ count, size = 17 }: { count: number; size?: number }) {
  return (
    <span className="fq-stars" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((star) => <Star className={star < count ? 'filled' : ''} key={star} size={size} strokeWidth={2.5} />)}
    </span>
  );
}

function Topbar({ progress, onReset, onHome }: { progress: Progress; onReset: () => void; onHome: () => void }) {
  const stars = Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0);
  return (
    <header className="fq-shell fq-topbar">
      <button className="fq-brand" onClick={onHome} data-testid="button-home">
        <span className="fq-brand-mark" aria-hidden="true"><Compass size={22} strokeWidth={3} /></span>
        <span>Fraction Quest</span>
      </button>
      <div className="fq-topbar-actions">
        <div className="fq-progress-pill" data-testid="status-overall-progress" aria-live="polite">
          <Star size={15} className="filled" aria-hidden="true" />
          <span><strong>{stars}</strong> stars</span><span aria-hidden="true">·</span>
          <span><strong>{progress.completedMissionIds.length}</strong>/{MISSIONS.length} lessons</span>
        </div>
        <button className="fq-icon-button" onClick={onReset} aria-label="Reset progress" data-testid="button-reset-progress"><RotateCcw size={18} /></button>
      </div>
    </header>
  );
}

function MissionMap({ progress, onStart, onStartReview, onReset }: { progress: Progress; onStart: (missionId: string) => void; onStartReview: () => void; onReset: () => void }) {
  const totalStars = Object.values(progress.starsByMission).reduce((sum, value) => sum + value, 0);
  const nextMission = getNextMission(progress);
  const dueReviewCount = getDueSkillReviewCount(progress);
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
            <div className="fq-compass-disc"><div className="fq-compass-needle" /></div>
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
                  ? `${progress.completedMissionIds.length} of ${MISSIONS.length} lessons mastered · ${totalStars} stars collected`
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
              const completedInUnit = unit.missions.filter((item) => progress.completedMissionIds.includes(item.id)).length;
              return (
                <section className="fq-unit" key={unit.number} aria-labelledby={`unit-${unit.number}`}>
                  <div className="fq-unit-heading">
                    <div>
                      <span className="fq-unit-kicker">Unit {unit.number}</span>
                      <h3 id={`unit-${unit.number}`}>{unit.title}</h3>
                      <p>{unit.subtitle}</p>
                    </div>
                    <span className="fq-unit-count" aria-label={`${completedInUnit} of ${unit.missions.length} lessons mastered`}>{completedInUnit}/{unit.missions.length}</span>
                  </div>
                  <div className="fq-mission-grid">
                    {unit.missions.map((mission) => {
                      const unlocked = isMissionUnlocked(progress, mission.id);
                      const completed = progress.completedMissionIds.includes(mission.id);
                      const missionNumber = MISSIONS.indexOf(mission) + 1;
                      return (
                        <article className={`fq-mission-card ${unlocked ? '' : 'locked'} ${completed ? 'complete' : ''}`} key={mission.id} data-testid={`card-mission-${mission.id}`}>
                          <div className="fq-mission-number">
                            <span>Lesson {String(missionNumber).padStart(2, '0')}</span>
                            {completed ? <Check size={18} color="hsl(var(--secondary))" strokeWidth={3} aria-label="Mastered" /> : !unlocked ? <LockKeyhole size={17} aria-label="Locked" /> : null}
                          </div>
                          <div className="fq-mission-symbol" aria-hidden="true">{completed ? <Check size={26} /> : <Compass size={27} />}</div>
                          <h4>{mission.title}</h4>
                          <p>{mission.description}</p>
                          <div className="fq-mission-footer">
                            <Stars count={progress.starsByMission[mission.id] ?? 0} />
                            <button
                              className={`fq-button ${completed ? 'ghost' : ''}`}
                              onClick={() => onStart(mission.id)}
                              disabled={!unlocked}
                              data-testid={`button-start-mission-${mission.id}`}
                            >
                              {completed ? 'Practice again' : unlocked ? 'Start lesson' : 'Locked'}
                              {unlocked && <ArrowRight size={16} />}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
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
        <footer className="fq-footer"><span>Made for curious minds, ages 8–10. Progress stays on this device.</span><button onClick={onReset} data-testid="button-reset-progress-footer">Reset this device's progress</button></footer>
      </main>
    </div>
  );
}

function PlayView({
  mission,
  questionIndex,
  firstTryAnswers,
  onBack,
  onReset,
  onNext,
  onFinish,
  onMissed,
  onReviewCompleted,
  onReviewDeferred,
  isQuickReview = false,
  onFinishReview,
}: {
  mission: Mission;
  questionIndex: number;
  firstTryAnswers: number;
  onBack: () => void;
  onReset: () => void;
  onNext: (firstTryAnswers: number) => void;
  onFinish: (stars: number) => void;
  onMissed: (missionId: string, questionId: string) => void;
  onReviewCompleted: (missionId: string) => void;
  onReviewDeferred: (missionId: string) => void;
  isQuickReview?: boolean;
  onFinishReview?: () => void;
}) {
  const [selection, setSelection] = useState<Answer | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'retry' | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [useSimplerModel, setUseSimplerModel] = useState(false);
  const isExample = questionIndex < 0;
  const question: PracticeQuestion | null = isExample ? null : mission.questions[questionIndex];
  const isLastQuestion = question ? questionIndex === mission.questions.length - 1 : false;

  const checkAnswer = () => {
    if (selection === null || !question) return;
    if (isCorrectAnswer(question, selection)) {
      if (question.isOptionalReview && question.reviewMissionId) {
        onReviewCompleted(question.reviewMissionId);
      }
      setFeedback('correct');
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
      setFeedback('retry');
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

  return (
    <div className="fq-app">
      <Topbar progress={loadProgress()} onReset={onReset} onHome={onBack} />
      <main className="fq-shell fq-play-shell fq-appear">
        <div className="fq-play-top">
          <button className="fq-back" onClick={onBack} data-testid="button-back-map"><ArrowLeft size={17} /> Learning map</button>
          <div className="fq-play-count">
            {isExample ? 'Guided example' : isQuickReview ? `Quick review · Question ${questionIndex + 1} of ${mission.questions.length}` : `Question ${questionIndex + 1} of ${mission.questions.length}`}
          </div>
        </div>
        <section className="fq-play-card" aria-labelledby="lesson-title">
          <p className="fq-play-kicker">
            {isQuickReview
              ? `Quick skill review · ${question?.reviewTopicTitle ?? mission.shortTitle}`
              : `Lesson ${String(MISSIONS.indexOf(mission) + 1).padStart(2, '0')} · ${mission.shortTitle}`}
          </p>
          <h1 id="lesson-title">{isExample ? mission.title : question?.prompt}</h1>
          {isExample ? (
            <div className="fq-example">
              <p className="fq-skill-statement">{mission.skill}</p>
              <div className="fq-model-area"><ModelView model={mission.example.model} /></div>
              <div className="fq-example-answer">
                <span className="fq-example-label"><Lightbulb size={16} /> Let's think it through</span>
                <p><strong>{mission.example.prompt}</strong></p>
                <p className="fq-example-result">{mission.example.answer}</p>
                <p>{mission.example.explanation}</p>
              </div>
            </div>
          ) : question && (
            <>
              {question.isReview && <div className="fq-review-label"><RotateCcw size={15} />{question.isOptionalReview ? `${isQuickReview ? 'Due skill' : 'Optional review'} · ${question.reviewTopicTitle}` : ' A quick revisit to help it stick'}</div>}
              {question.isMastery && <div className="fq-mastery-label"><Star size={15} /> Your mastery check</div>}
              <div className="fq-model-area">
                <ModelView model={useSimplerModel ? question.simplerModel : question.model} />
              </div>
              {feedback === 'retry' && (
                <div className="fq-feedback retry" role="status" data-testid="status-feedback">
                  <CircleHelp size={20} />
                  <div><strong>Not quite yet. Let's look at the pieces.</strong><br />{question.retryFeedback}</div>
                </div>
              )}
              {feedback === 'correct' && (
                <div className="fq-feedback success" role="status" data-testid="status-feedback">
                  <Check size={20} strokeWidth={3} />
                  <div><strong>{question.isMastery ? 'Mastery check passed!' : 'You found it.'}</strong> {question.hint}</div>
                </div>
              )}
              {attempts >= 2 && (
                <div className="fq-remediation" role="note" data-testid="status-remediation">
                  <strong>Let's make it simpler.</strong>
                  <span>{question.hint}</span>
                  <ModelView model={question.simplerModel} compact />
                </div>
              )}
              {hintOpen && <div className="fq-hint" data-testid="text-question-hint"><strong>Try this idea:</strong> {question.hint}</div>}
              <div className="fq-answer-choices" role="group" aria-label="Choose an answer">
                {question.choices.map((choice, index) => (
                  <button
                    key={`${question.id}-${index}`}
                    className={`fq-answer-choice ${selection === index ? 'selected' : ''}`}
                    onClick={() => {
                      if (feedback === 'correct') return;
                      setSelection(index);
                      if (feedback === 'retry') setFeedback(null);
                    }}
                    aria-pressed={selection === index}
                    data-testid={`button-answer-${question.id}-${index}`}
                  >
                    <span className="fq-choice-marker" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                    <span>{choice}</span>
                  </button>
                ))}
              </div>
              <div className="fq-question-bottom">
                <button className="fq-hint-button" onClick={() => setHintOpen((open) => !open)} aria-expanded={hintOpen} data-testid="button-show-hint">
                  <Lightbulb size={17} /> {hintOpen ? 'Hide hint' : 'Need a hint?'}
                </button>
                {question.isOptionalReview && (
                  <button className="fq-hint-button" onClick={skipOptionalReview} data-testid="button-skip-review">
                    Skip this review
                  </button>
                )}
                {feedback === 'correct' ? (
                  <button className="fq-button secondary" onClick={moveOn} data-testid={isLastQuestion ? 'button-finish-mission' : 'button-next-question'}>
                    {isLastQuestion ? isQuickReview ? 'Finish review' : 'Finish lesson' : 'Next question'} <ArrowRight size={17} />
                  </button>
                ) : (
                  <button className="fq-button" onClick={checkAnswer} disabled={selection === null} data-testid="button-check-answer">
                    Check my answer <Check size={17} />
                  </button>
                )}
              </div>
            </>
          )}
          {isExample && (
            <div className="fq-question-bottom fq-example-bottom">
              <button className="fq-hint-button" onClick={onBack} data-testid="button-back-example">Back to map</button>
              <button className="fq-button secondary" onClick={moveOn} data-testid="button-start-practice">I understand — let's practice <ArrowRight size={17} /></button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function RewardView({ mission, stars, progress, onMap, onNext, onReset }: { mission: Mission; stars: number; progress: Progress; onMap: () => void; onNext: (missionId: string) => void; onReset: () => void }) {
  const nextMission = getNextMission(progress);
  return (
    <div className="fq-app">
      <Topbar progress={progress} onReset={onReset} onHome={onMap} />
      <main className="fq-shell">
        <section className="fq-reward fq-appear" data-testid="status-mission-complete">
          <div className="fq-reward-badge" aria-hidden="true"><Trophy size={49} strokeWidth={2.2} /></div>
          <div className="fq-eyebrow" style={{ justifyContent: 'center' }}><Sparkles size={14} fill="currentColor" /> Lesson mastered</div>
          <h1>{mission.title}<br />is on your map.</h1>
          <p>You solved the mastery check. Your progress and stars are saved on this device.</p>
          <div className="fq-reward-stars" data-testid="status-mission-stars">{[0, 1, 2].map((star) => <Star key={star} size={34} className={star < stars ? 'filled' : ''} />)}</div>
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
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [view, setView] = useState<View>({ type: 'map' });
  const [resetOpen, setResetOpen] = useState(false);

  const startMission = (missionId: string) => {
    if (!isMissionUnlocked(progress, missionId)) return;
    setView({
      type: 'play',
      missionId,
      questionIndex: -1,
      firstTryAnswers: 0,
      reviewQuestions: getDelayedReviewQuestions(progress, missionId),
    });
  };

  const startReview = () => {
    const reviewQuestions = getDueSkillReviewQuestions(progress);
    if (reviewQuestions.length === 0) return;
    trackEvent('quick_review_started');
    setView({ type: 'review', questionIndex: 0, reviewQuestions });
  };

  const persistProgress = (nextProgress: Progress) => {
    saveProgress(nextProgress);
    setProgress(nextProgress);
  };

  const finishMission = (missionId: string, stars: number) => {
    const nextProgress = completeMission(progress, missionId, stars);
    persistProgress(nextProgress);
    setView({ type: 'reward', missionId, stars: nextProgress.starsByMission[missionId] ?? stars });
  };

  const resetProgress = () => {
    setProgress(resetSavedProgress());
    setView({ type: 'map' });
    setResetOpen(false);
  };

  const baseMission = view.type === 'play' || view.type === 'reward'
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
  const returnToMap = () => setView({ type: 'map' });

  return (
    <>
      {view.type === 'map' && <MissionMap progress={progress} onStart={startMission} onStartReview={startReview} onReset={() => setResetOpen(true)} />}
      {(view.type === 'play' || view.type === 'review') && activeMission && (
        <PlayView
          key={`${activeMission.id}-${view.questionIndex}`}
          mission={activeMission}
          questionIndex={view.questionIndex}
          firstTryAnswers={view.type === 'play' ? view.firstTryAnswers : 0}
          isQuickReview={view.type === 'review'}
          onBack={returnToMap}
          onReset={() => setResetOpen(true)}
          onNext={(firstTryAnswers) => {
            if (view.type === 'review') {
              setView({ type: 'review', questionIndex: view.questionIndex + 1, reviewQuestions: view.reviewQuestions });
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
          onFinish={(stars) => finishMission(activeMission.id, stars)}
          onFinishReview={view.type === 'review' ? () => {
            trackEvent('quick_review_completed');
            setView({ type: 'review-complete', reviewedCount: view.reviewQuestions.length });
          } : undefined}
          onMissed={(missionId, questionId) => persistProgress(recordMissedSkill(progress, missionId, questionId))}
          onReviewCompleted={(missionId) => persistProgress(completeSkillReview(progress, missionId))}
          onReviewDeferred={(missionId) => persistProgress(deferSkillReview(progress, missionId))}
        />
      )}
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
            <p id="reset-description">This clears lesson progress, stars, and saved skill reviews on this device. This cannot be undone.</p>
            <div className="fq-modal-actions">
              <button className="fq-button ghost" onClick={() => setResetOpen(false)} data-testid="button-cancel-reset">Keep exploring</button>
              <button className="fq-button" onClick={resetProgress} data-testid="button-confirm-reset">Reset progress</button>
            </div>
          </div>
        </div>
      )}
    </>
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