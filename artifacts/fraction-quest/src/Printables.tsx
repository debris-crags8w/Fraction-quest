import React, { useEffect, useState, type ReactElement } from 'react';
import { Printer } from 'lucide-react';
import { MathText } from './MathText';
import { getMission, MISSIONS, type Mission, type ModelSpec } from './game';
import { answerMatches, getBuildChecks, getWorksheet, paperPrompt, type WorksheetProblem } from './learning-content';
import { learningSummary, worksheetCount, type LearningRecord } from './learning';
import { BarSvg, ChallengeFigureView, LineSvg, MODEL_CONCEPTS, ModelPair, ModelTag, SetSvg } from './models';
import { CHALLENGES, challengeMaxPoints } from './challenges';
import { AreaSvg, ColorTwoWays, SameSizeIdea, SHAPE_LESSONS } from './AreaModel';
import { areaWhole } from './area-shapes';
import { freshSeed, generateQuestions } from './practice-bank';
import { printPage } from './lib/print';

export type PrintMode = 'lesson' | 'practice' | 'generated' | 'blank' | 'answers' | 'challenge';

export const lessonCode = (missionId: string) => `FQ-${String(MISSIONS.findIndex((item) => item.id === missionId) + 1).padStart(2, '0')}`;
const letter = (index: number) => String.fromCharCode(65 + index);

type Status = 'correct' | 'not-yet' | 'unchecked' | 'blank';
function statusOf(problem: WorksheetProblem, record: LearningRecord): Status {
  const entry = record.worksheet[problem.id];
  const draft = entry?.draft.trim() ?? '';
  if (!draft) return 'blank';
  if (entry!.checkedValue === entry!.draft && answerMatches(problem, entry!.draft)) return 'correct';
  return entry!.attempts > 0 ? 'not-yet' : 'unchecked';
}
const STATUS_TEXT: Record<Status, string> = { correct: '✓ Correct', 'not-yet': '✗ Not yet', unchecked: '• Not checked', blank: '— No answer' };

const ANSWER_FORMAT: Record<NonNullable<WorksheetProblem['form']>, string> = {
  symbol: 'Write <, = or >',
  word: 'Write yes or no',
  mixed: 'Write a mixed number, like 1 2/3',
  decimal: 'Write a decimal, like 0.4',
  ordered: 'List them smallest to largest',
};

function ProblemModel({ problem }: { problem: WorksheetProblem }) {
  const m = problem.model;
  if (problem.area) return <div className="fq-print-model"><span className="fq-model-tag kind-area">{areaWhole(problem.area.cut)[0].toUpperCase() + areaWhole(problem.area.cut).slice(1)} model</span><AreaSvg figure={problem.area} /></div>;
  if (!m) return null;
  return (
    <div className="fq-print-model">
      <ModelTag kind={m.kind} />
      {m.kind === 'bar' && <BarSvg n={m.n} d={m.d} wholes={m.wholes} sizes={m.sizes} />}
      {m.kind === 'line' && <LineSvg n={m.n} d={m.d} wholes={m.wholes} />}
      {m.kind === 'set' && <SetSvg n={m.n} d={m.d} total={m.total ?? m.d} />}
    </div>
  );
}

/** Example for the "two models" key that never matches this lesson's own build targets. */
function keyExample(missionId: string): [number, number] {
  const targets = getBuildChecks(missionId).map((check) => `${check.target.n}/${check.target.d}`);
  return targets.includes('3/4') ? [2, 3] : [3, 4];
}

/** The worksheet page (blank, or filled with the child's answers). */
function WorksheetPage({ missionId, record, mode }: { missionId: string; record: LearningRecord; mode: PrintMode }) {
  const mission = getMission(missionId);
  const number = String(MISSIONS.findIndex((item) => item.id === missionId) + 1).padStart(2, '0');
  const problems = getWorksheet(missionId);
  const checks = getBuildChecks(missionId);
  const [kn, kd] = keyExample(missionId);
  const answers = mode === 'answers';
  const isSet = checks[0].target.kind === 'set';
  const summary = learningSummary(record);
  const printedOn = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <article className="fq-print" aria-hidden="true" data-testid={`print-worksheet-${mode}`}>
      <header className="fq-print-head">
        <div>
          <p className="fq-print-kicker">Fraction Quest · Lesson {number} · {answers ? 'My answers' : 'Worksheet'} · Code {lessonCode(missionId)}</p>
          <h1>{mission.title}</h1>
          <p>{mission.skill}</p>
        </div>
        <div className="fq-print-fields">
          <span>Name <i /></span>
          <span>Date <i>{answers ? printedOn : ''}</i></span>
        </div>
      </header>

      <section className="fq-print-key">
        <h2>Two ways to see a fraction</h2>
        <div className="fq-print-key-grid">
          <p><ModelTag kind="bar" /> {MODEL_CONCEPTS.bar}</p>
          <p><ModelTag kind="line" /> {MODEL_CONCEPTS.line}</p>
        </div>
        <p className="fq-print-key-example">Example: {kn}/{kd}</p>
        <ModelPair n={kn} d={kd} />
      </section>

      {answers && (
        <section className="fq-print-summary">
          <strong>Worksheet: {worksheetCount(record, missionId)} of 12 correct</strong>
          <span>Builds: {checks.map((check) => `${check.transfer ? 'On your own' : 'Build it'}: ${record.checks[check.id]?.passed ? (record.checks[check.id].supported ? 'done with help' : 'done solo') : 'not yet'}`).join(' · ')}</span>
          <span>Hints and help used: {summary.helpUses}</span>
        </section>
      )}

      <ol className="fq-print-problems">
        {problems.map((problem) => {
          const status = statusOf(problem, record);
          const draft = record.worksheet[problem.id]?.draft.trim();
          return (
            <li key={problem.id}>
              <p className="fq-print-prompt"><MathText text={paperPrompt(problem)} /></p>
              <ProblemModel problem={problem} />
              <div className="fq-print-answer">
                <span>Answer:</span>
                <b>{answers ? draft || '' : ''}</b>
                {answers && <em className={`status-${status}`}>{STATUS_TEXT[status]}</em>}
              </div>
              {!answers && problem.form && <small>{ANSWER_FORMAT[problem.form]}</small>}
            </li>
          );
        })}
      </ol>

      {!answers && SHAPE_LESSONS.includes(missionId) && <ColorTwoWays />}
      {!answers && (
        <section className="fq-print-draw">
          <h2>Show it both ways</h2>
          <p>{checks[0].prompt} {isSet ? 'Circle equal groups' : 'Draw it on the bar'}, then show the same fraction on the number line.</p>
          <div className="fq-print-draw-grid">
            {isSet
              ? <div><ModelTag kind="set">Set model: circle equal groups and shade the ones you pick</ModelTag><SetSvg n={0} d={1} total={checks[0].target.total ?? 12} /></div>
              : <div><ModelTag kind="bar">Bar model: split the bar into equal pieces and shade</ModelTag><BarSvg /></div>}
            <div><ModelTag kind="line">Number line: add equal spaces, then mark your point</ModelTag><LineSvg /></div>
          </div>
          <p className="fq-print-why">Why do both show the same fraction? <i /><i /></p>
        </section>
      )}

      <footer className="fq-print-foot">Fraction Quest · fractions for ages 8–10{answers ? ` · Printed ${printedOn}` : ''}</footer>
    </article>
  );
}

/* ---------- other printable pages ---------- */

/** A lesson model drawn in black and white for paper. */
function PrintModel({ model, labels = true }: { model: ModelSpec; labels?: boolean }) {
  return (
    <div className="fq-print-model">
      {(model.kind === 'bars' || model.kind === 'decimal') && <ModelTag kind="bar" />}
      {model.kind === 'line' && <ModelTag kind="line" />}
      {model.kind === 'set' && <ModelTag kind="set" />}
      {model.kind === 'bars' && model.bars.map((bar, index) => (
        <div className="fq-print-bar-row" key={index}>
          <BarSvg n={bar.numerator} d={bar.denominator} wholes={Math.max(1, Math.ceil(bar.numerator / bar.denominator))} />
        </div>
      ))}
      {model.kind === 'decimal' && <div className="fq-print-bar-row"><BarSvg n={model.tenths} d={10} />{labels && <b className="fq-print-decimal-value">{(model.tenths / 10).toFixed(1)}</b>}</div>}
      {model.kind === 'line' && <LineSvg n={model.numerator} d={model.denominator} wholes={model.wholes ?? Math.max(1, Math.ceil(model.numerator / model.denominator))} />}
      {model.kind === 'set' && (
        <svg className="fq-svg-set" viewBox={`0 0 ${Math.min(model.total, 10) * 26 + 4} ${Math.ceil(model.total / 10) * 26 + 4}`} role="img" aria-label={`${model.selected} of ${model.total} counters shaded`}>
          {Array.from({ length: model.total }, (_, i) => <circle key={i} className={i < model.selected ? 'dot on' : 'dot'} cx={15 + (i % 10) * 26} cy={15 + Math.floor(i / 10) * 26} r={10} />)}
        </svg>
      )}
      {model.kind === 'partition' && (
        <svg className="fq-svg-bar" viewBox="0 0 364 74" role="img" aria-label={`One whole split into ${model.parts.length} pieces; the first piece is one part`}>
          <text className="fq-svg-model-label" x="182" y="11" textAnchor="middle">WHOLE</text>
          {model.parts.reduce<{ x: number; els: ReactElement[] }>((acc, size, i) => {
            const w = (size / 100) * 320;
            acc.els.push(<rect key={i} className={`empty ${i === 0 ? 'part-sample' : ''}`} x={22 + acc.x} y={17} width={w} height={32} />);
            acc.x += w; return acc;
          }, { x: 0, els: [] }).els}
          <rect className="frame" x={22} y={17} width={320} height={32} fill="none" />
          <line className="fq-svg-part-guide-line" x1="22" y1="50" x2="22" y2="57" />
          <text className="fq-svg-model-label part" x="22" y="69" textAnchor="middle">PART</text>
        </svg>
      )}
      {model.kind === 'area' && <AreaSvg figure={{ cut: model.cut, shaded: model.shaded }} />}
      {model.kind === 'equation' && <p className="fq-print-equation"><MathText text={model.text} /></p>}
      {labels && model.caption && <small>{model.caption}</small>}
    </div>
  );
}

function PrintHead({ missionId, kind, showName = true }: { missionId: string; kind: string; showName?: boolean }) {
  const mission = getMission(missionId);
  return (
    <header className="fq-print-head">
      <div>
        <p className="fq-print-kicker">Fraction Quest · {kind} · Code {lessonCode(missionId)}</p>
        <h1>{mission.title}</h1>
        <p>{mission.skill}</p>
      </div>
      {showName && <div className="fq-print-fields"><span>Name <i /></span><span>Date <i /></span></div>}
    </header>
  );
}

function LessonSheet({ mission }: { mission: Mission }) {
  const [kn, kd] = keyExample(mission.id);
  return (
    <article className="fq-print" aria-hidden="true" data-testid="print-lesson">
      <PrintHead missionId={mission.id} kind="Lesson" showName={false} />
      <section className="fq-print-key">
        <h2>Let&apos;s think it through</h2>
        <p className="fq-print-prompt"><MathText text={mission.example.prompt} /></p>
        <PrintModel model={mission.example.model} />
        <p className="fq-print-key-example"><MathText text={mission.example.answer} /></p>
        <p><MathText text={mission.example.explanation} /></p>
      </section>
      {SHAPE_LESSONS.includes(mission.id) && <div className="fq-print-key"><SameSizeIdea /></div>}
      <section className="fq-print-key">
        <h2>Two ways to see a fraction</h2>
        <div className="fq-print-key-grid">
          <p><ModelTag kind="bar" /> {MODEL_CONCEPTS.bar}</p>
          <p><ModelTag kind="line" /> {MODEL_CONCEPTS.line}</p>
        </div>
        <p className="fq-print-key-example">Example: {kn}/{kd}</p>
        <ModelPair n={kn} d={kd} />
      </section>
      <footer className="fq-print-foot">Next: the practice sheet, then the worksheet. Check your paper in the app with code {lessonCode(mission.id)}.</footer>
    </article>
  );
}

function PracticeSheet({ mission }: { mission: Mission }) {
  return (
    <article className="fq-print" aria-hidden="true" data-testid="print-practice">
      <PrintHead missionId={mission.id} kind="Practice" />
      <p className="fq-print-instructions">Circle one letter for each question. Then open “Check my paper” in the app and tap the letters you circled.</p>
      <ol className="fq-print-problems">
        {mission.questions.map((question) => (
          <li key={question.id}>
            <p className="fq-print-prompt"><MathText text={question.prompt} /></p>
            {/* No number labels: on paper they would give the answer away. */}
            <PrintModel model={question.model} labels={false} />
            <ul className="fq-print-choices">
              {question.choices.map((choice, index) => <li key={index}><span className="fq-print-circle">{letter(index)}</span> <MathText text={choice} /></li>)}
            </ul>
          </li>
        ))}
      </ol>
      <footer className="fq-print-foot">Fraction Quest · Practice · Code {lessonCode(mission.id)}</footer>
    </article>
  );
}

export function AnswerKey({ mission }: { mission: Mission }) {
  const checks = getBuildChecks(mission.id);
  return (
    <article className="fq-print" aria-hidden="true" data-testid="print-answer-key">
      <PrintHead missionId={mission.id} kind="Answer key for grown-ups" showName={false} />
      <section className="fq-print-key">
        <h2>Practice sheet</h2>
        <ol className="fq-print-key-list">
          {mission.questions.map((question) => <li key={question.id}><b>{letter(question.correctChoice)}</b> · <MathText text={question.choices[question.correctChoice]} /></li>)}
        </ol>
      </section>
      <section className="fq-print-key">
        <h2>Worksheet</h2>
        <ol className="fq-print-key-list two-col">
          {getWorksheet(mission.id).map((problem) => <li key={problem.id}><b><MathText text={problem.answer} /></b> <small><MathText text={paperPrompt(problem)} /></small></li>)}
        </ol>
      </section>
      {CHALLENGES[mission.unit] && <section className="fq-print-key">
        <h2>Unit {mission.unit} challenge</h2>
        <ol className="fq-print-key-list">
          {CHALLENGES[mission.unit].map((item) => (
            <li key={item.id}>
              <b>{letter(item.correct)}</b> · <MathText text={item.choices[item.correct]} /> <small>({item.points} points) <MathText text={item.explanation} /></small>
              {item.steps && item.steps.length > 0 && (
                <ol className="fq-print-challenge-steps">
                  {item.steps.map((step, index) => (
                    <li key={`${item.id}-step-${index}`}>
                      <MathText text={step.prompt} /> <b>Answer:</b> <MathText text={step.choices[step.correct]} />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      </section>}
      <section className="fq-print-key">
        <h2>Show it both ways</h2>
        <p><MathText text={checks[0].prompt} /> <b>Answer: <MathText text={`${checks[0].target.n}/${checks[0].target.d}`} /></b>. Why: <MathText text={checks[0].explanation} /></p>
        <ModelPair n={checks[0].target.n} d={checks[0].target.d} />
      </section>
      <footer className="fq-print-foot">Keep this page with a grown-up. Code {lessonCode(mission.id)}.</footer>
    </article>
  );
}

function ChallengeSheet({ mission }: { mission: Mission }) {
  const items = CHALLENGES[mission.unit];
  return (
    <article className="fq-print" aria-hidden="true" data-testid="print-challenge">
      <header className="fq-print-head">
        <div>
          <p className="fq-print-kicker">Fraction Quest · Unit {mission.unit} challenge · Code {lessonCode(mission.id)}</p>
          <h1>Unit {mission.unit} challenge</h1>
          <p>Puzzle time! Circle one letter for each question.</p>
        </div>
        <div className="fq-print-fields"><span>Name <i /></span><span>Score <i /> / {challengeMaxPoints(mission.unit)}</span></div>
      </header>
      <ol className="fq-print-problems">
        {items.map((item) => (
          <li key={item.id}>
            <p className="fq-print-prompt"><span className="fq-print-points">{item.points} pts</span> <MathText text={item.prompt} /></p>
            {item.figure && <div className="fq-print-model"><ChallengeFigureView figure={item.figure} /></div>}
            <ul className="fq-print-choices">
              {item.choices.map((choice, index) => <li key={index}><span className="fq-print-circle">{letter(index)}</span> <MathText text={choice} /></li>)}
            </ul>
          </li>
        ))}
      </ol>
      <footer className="fq-print-foot">Fraction Quest · Unit {mission.unit} challenge · Answers are in the answer key for grown-ups.</footer>
    </article>
  );
}

/** A brand-new student practice sheet from the question generator. */
function GeneratedSheet({ mission, seed }: { mission: Mission; seed: number }) {
  const questions = generateQuestions(mission.id, mission.questions.map((q) => q.id), seed, 12);
  const sheetCode = `${lessonCode(mission.id)}-${String(seed).slice(-4)}`;
  return (
    <article className="fq-print" aria-hidden="true" data-testid="print-generated">
      <PrintHead missionId={mission.id} kind={`New practice sheet ${sheetCode}`} />
      <p className="fq-print-instructions">Circle one letter for each question.</p>
      <ol className="fq-print-problems">
        {questions.map((question) => (
          <li key={question.id}>
            <p className="fq-print-prompt"><MathText text={question.prompt} /></p>
            {/* An equation picture would only repeat the question on paper. */}
            {question.model.kind !== 'equation' && <PrintModel model={question.model} labels={false} />}
            <ul className="fq-print-choices">
              {question.choices.map((choice, index) => <li key={index}><span className="fq-print-circle">{letter(index)}</span> <MathText text={choice} /></li>)}
            </ul>
          </li>
        ))}
      </ol>
    </article>
  );
}

/** A print-only page. Hidden on screen; while printing it replaces everything else. */
export default function Printable({ missionId, record, mode, seed = 1 }: { missionId: string; record: LearningRecord; mode: PrintMode; seed?: number }) {
  const mission = getMission(missionId);
  if (mode === 'generated') return <GeneratedSheet mission={mission} seed={seed} />;
  if (mode === 'lesson') return <LessonSheet mission={mission} />;
  if (mode === 'practice') return <PracticeSheet mission={mission} />;
  if (mode === 'challenge' && CHALLENGES[mission.unit]) return <ChallengeSheet mission={mission} />;
  return <WorksheetPage missionId={missionId} record={record} mode={mode} />;
}

export const STUDENT_PRINT_OPTIONS: { mode: PrintMode; label: string }[] = [
  { mode: 'lesson', label: 'Lesson' },
  { mode: 'practice', label: 'Practice questions' },
  { mode: 'generated', label: 'New practice sheet' },
  { mode: 'blank', label: 'Worksheet' },
  { mode: 'answers', label: 'My answers' },
  { mode: 'challenge', label: 'Unit challenge' },
];

/** "Print" button that opens a short list of printable pages for one lesson. */
export function PrintMenu({ missionId, record, className = '' }: { missionId: string; record: LearningRecord; className?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PrintMode>('blank');
  const [request, setRequest] = useState(0);
  const [seed, setSeed] = useState(1);
  useEffect(() => {
    if (!request) return;
    // Wait one frame so the chosen page is rendered before the print dialog opens.
    const frame = window.requestAnimationFrame(() => { void printPage('Fraction Quest worksheet'); });
    return () => window.cancelAnimationFrame(frame);
  }, [request]);
  return (
    <div className={`fq-print-menu ${className}`}>
      <button type="button" className="fq-button ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)} data-testid={`button-print-menu-${missionId}`}>
        <Printer size={17} /> Print
      </button>
      {open && (
        <div className="fq-print-options" role="group" aria-label="Choose what to print">
          {/* Units 9+ have no Unit challenge (yet), so there is nothing to print for it. */}
          {STUDENT_PRINT_OPTIONS.filter((option) => option.mode !== 'challenge' || CHALLENGES[getMission(missionId).unit]).map((option) => (
            <button type="button" key={option.mode} onClick={() => { if (option.mode === 'generated') setSeed(freshSeed()); setMode(option.mode); setRequest((n) => n + 1); }} data-testid={`button-print-${option.mode}`}>
              {option.label}
            </button>
          ))}
        </div>
      )}
      <Printable missionId={missionId} record={record} mode={mode} seed={seed} />
    </div>
  );
}
