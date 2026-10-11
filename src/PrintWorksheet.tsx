import { getMission, MISSIONS } from './game';
import { answerMatches, getBuildChecks, getWorksheet, type WorksheetProblem } from './learning-content';
import { learningSummary, worksheetCount, type LearningRecord } from './learning';
import { BarSvg, LineSvg, MODEL_CONCEPTS, ModelPair, ModelTag, SetSvg } from './models';

export type PrintMode = 'blank' | 'answers';

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
  mixed: 'Write a mixed number, like 1 2/3',
  decimal: 'Write a decimal, like 0.4',
  ordered: 'List them smallest to largest',
};

function ProblemModel({ problem }: { problem: WorksheetProblem }) {
  const m = problem.model;
  if (!m) return null;
  return (
    <div className="fq-print-model">
      <ModelTag kind={m.kind} />
      {m.kind === 'bar' && <BarSvg n={m.n} d={m.d} wholes={m.wholes} />}
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

/** A print-only worksheet. Hidden on screen; when printing from the Learning Lab it replaces the page. */
export default function PrintWorksheet({ missionId, record, mode }: { missionId: string; record: LearningRecord; mode: PrintMode }) {
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
          <p className="fq-print-kicker">Fraction Quest · Lesson {number} · {answers ? 'My answers' : 'Worksheet'}</p>
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
          <span>Model checks: {checks.map((check) => `${check.transfer ? 'Independent' : 'Guided'} ${record.checks[check.id]?.passed ? (record.checks[check.id].supported ? 'passed with help' : 'passed on my own') : 'not done yet'}`).join(' · ')}</span>
          <span>Hints and help used: {summary.helpUses}</span>
        </section>
      )}

      <ol className="fq-print-problems">
        {problems.map((problem) => {
          const status = statusOf(problem, record);
          const draft = record.worksheet[problem.id]?.draft.trim();
          return (
            <li key={problem.id}>
              <p className="fq-print-prompt">{problem.prompt}</p>
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
          <p className="fq-print-why">Explain: why do both models show the same fraction? <i /><i /></p>
        </section>
      )}

      <footer className="fq-print-foot">Fraction Quest · fractions for ages 8–10{answers ? ` · Printed ${printedOn}` : ''}</footer>
    </article>
  );
}
