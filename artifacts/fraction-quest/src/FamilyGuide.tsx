import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ClipboardList, Printer, Ruler, Sparkles } from 'lucide-react';
import { MISSIONS } from './game';
import { FRACTION_STANDARDS, standardsForMission } from './standard-catalog';
import { GRADE_PACING, UNIT_TEACHING_GUIDES, pacingSessionTotal } from './teaching-guide-data';
import './family-guide.css';
import { printPage } from './lib/print';

type FamilyGuideProps = { unitTitles: string[] };
type PrintMode = 'unit' | 'pacing' | null;

export function FamilyGuide({ unitTitles }: FamilyGuideProps) {
  const [selectedUnit, setSelectedUnit] = useState(1);
  const [printMode, setPrintMode] = useState<PrintMode>(null);
  const guide = UNIT_TEACHING_GUIDES.find((item) => item.unit === selectedUnit) ?? UNIT_TEACHING_GUIDES[0];
  const title = unitTitles[selectedUnit - 1] ?? `Unit ${selectedUnit}`;
  const lessons = useMemo(
    () => MISSIONS.filter((mission) => mission.unit === selectedUnit),
    [selectedUnit],
  );

  useEffect(() => {
    if (!printMode) return;
    document.body.classList.add('fq-family-printing');
    document.body.dataset.familyPrintMode = printMode;
    const finish = () => {
      document.body.classList.remove('fq-family-printing');
      delete document.body.dataset.familyPrintMode;
      setPrintMode(null);
    };
    window.addEventListener('afterprint', finish, { once: true });
    const frame = window.requestAnimationFrame(() => { void printPage('Fraction Quest family guide'); });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', finish);
      document.body.classList.remove('fq-family-printing');
      delete document.body.dataset.familyPrintMode;
    };
  }, [printMode]);

  return (
    <section className="fq-family-guide" data-testid="family-guide" aria-labelledby="family-guide-title">
      <header className="fq-family-hero">
        <div className="fq-family-hero-copy">
          <div className="fq-family-kicker"><BookOpen size={15} /> Family + teacher field guide</div>
          <h2 id="family-guide-title">Help fractions make sense.</h2>
          <p>Small prompts, simple materials, and clear next steps for learning together.</p>
        </div>
        <div className="fq-family-seal" aria-hidden="true"><Ruler size={25} /><span>Model<br />together</span></div>
      </header>

      <div className="fq-family-toolbar">
        <label htmlFor="family-guide-unit">Choose a unit</label>
        <div className="fq-family-select-wrap">
          <select id="family-guide-unit" value={selectedUnit} onChange={(event) => setSelectedUnit(Number(event.target.value))} data-testid="select-family-guide-unit">
            {UNIT_TEACHING_GUIDES.map((item) => (
              <option key={item.unit} value={item.unit}>Unit {item.unit}: {unitTitles[item.unit - 1] ?? `Unit ${item.unit}`}</option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </div>
        <div className="fq-family-print-actions">
          <button type="button" className="fq-family-print-button" onClick={() => setPrintMode('unit')} data-testid="button-print-family-unit">
            <Printer size={17} /> Print this guide
          </button>
          <button type="button" className="fq-family-print-button quiet" onClick={() => setPrintMode('pacing')} data-testid="button-print-family-pacing">
            <ClipboardList size={17} /> Print Grade 3–5 pacing
          </button>
        </div>
      </div>

      <article className="fq-family-document fq-family-unit-document">
        <div className="fq-family-document-head">
          <div>
            <span className="fq-family-unit-label">Unit {guide.unit} · Adult guide</span>
            <h3>{title}</h3>
          </div>
          <div className="fq-family-objective"><span>Learning aim</span><p>{guide.objective}</p></div>
        </div>

        <div className="fq-family-openers">
          <section className="fq-family-callout fq-family-warmup">
            <span className="fq-family-label"><Sparkles size={14} /> Start with a quick question</span>
            <p className="fq-family-prompt">{guide.warmup.prompt}</p>
            <details><summary>What to listen for</summary><p>{guide.warmup.reveal}</p></details>
          </section>
          <section className="fq-family-callout fq-family-frame">
            <span className="fq-family-label">A sentence to try</span>
            <p className="fq-family-prompt">“{guide.explainFrame}”</p>
          </section>
        </div>

        <div className="fq-family-grid">
          <section className="fq-family-panel">
            <h4>Words to use</h4>
            <dl className="fq-family-vocabulary">
              {guide.vocabulary.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.meaning}</dd></div>)}
            </dl>
          </section>
          <section className="fq-family-panel">
            <h4>Gather these</h4>
            <ul className="fq-family-checklist">{guide.materials.map((material) => <li key={material}><Check size={14} />{material}</li>)}</ul>
            <h4 className="fq-family-subhead">No-prep launch</h4>
            <p>{guide.offlineLaunch}</p>
          </section>
        </div>

        <section className="fq-family-panel fq-family-wide">
          <h4>Talk it through</h4>
          <ul className="fq-family-question-list">{guide.discussionQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
        </section>

        <div className="fq-family-grid">
          <section className="fq-family-panel fq-family-error">
            <h4>Look closely at an almost-right idea</h4>
            <p className="fq-family-claim">{guide.errorAnalysis.claim}</p>
            <p>{guide.errorAnalysis.correction}</p>
          </section>
          <section className="fq-family-panel">
            <h4>Common mix-ups</h4>
            <div className="fq-family-misconceptions">
              {guide.misconceptions.map((item) => <div key={item.belief}><b>{item.belief}</b><p>{item.response}</p></div>)}
            </div>
          </section>
        </div>

        <section className="fq-family-panel fq-family-wide">
          <h4>What shows understanding?</h4>
          <ul className="fq-family-mastery">{guide.mastery.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
        </section>

        <section className="fq-family-task">
          <div className="fq-family-task-heading">
            <div><span className="fq-family-label">Put learning to work</span><h4>{guide.performanceTask.title}</h4></div>
            <span className="fq-family-task-mark" aria-hidden="true">Make<br />& show</span>
          </div>
          <p>{guide.performanceTask.prompt}</p>
          <div className="fq-family-evidence"><b>Evidence to notice</b><span>{guide.performanceTask.evidence}</span></div>
          <div className="fq-family-rubric">
            {guide.performanceTask.rubric.map((criterion) => (
              <div key={criterion.criterion}>
                <b>{criterion.criterion}</b>
                <p><strong>Ready:</strong> {criterion.ready}</p>
                <p><strong>Try next:</strong> {criterion.nextStep}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="fq-family-grid fq-family-bottom">
          <section className="fq-family-panel">
            <h4>One step further</h4>
            <p>{guide.enrichment}</p>
          </section>
          <section className="fq-family-note">
            <span>Take-home note</span>
            <p>{guide.familyNote}</p>
          </section>
        </div>

        <section className="fq-family-lesson-standards">
          <div className="fq-family-standards-heading"><div><span className="fq-family-label">Lesson map</span><h4>Objectives and standards in this unit</h4></div><span>{lessons.length} lessons</span></div>
          {lessons.map((mission, index) => {
            const standardIds = standardsForMission(mission.id);
            const aligned = standardIds.map((id) => FRACTION_STANDARDS.find((standard) => standard.id === id)).filter((standard) => !!standard);
            return (
              <div className="fq-family-lesson" key={mission.id}>
                <span className="fq-family-lesson-index">{String(index + 1).padStart(2, '0')}</span>
                <div><h5>{mission.title}</h5><p>{mission.skill || mission.description}</p>
                  {aligned.length > 0
                    ? <ul className="fq-family-standard-list">{aligned.map((standard) => <li key={standard.id}><b>{standard.id}</b><span>{standard.title} — {standard.summary}</span></li>)}</ul>
                    : <p className="fq-family-no-standard"><b>Bonus topic:</b> outside the Grade 3–5 core standards.</p>}
                </div>
              </div>
            );
          })}
        </section>
      </article>

      <section className="fq-family-pacing-intro">
        <div><span className="fq-family-label">Plan the year</span><h3>Grade 3–5 pacing at a glance</h3><p>These are suggested sessions for the fraction strand, not a full math-year calendar. Use the grade labels in the lesson map; revisit a model or adjust the pace when the learner needs it. Percent and probability lessons are bonus topics.</p></div>
        <button type="button" className="fq-family-print-button" onClick={() => setPrintMode('pacing')} data-testid="button-print-family-pacing-bottom"><Printer size={17} /> Print pacing plan</button>
      </section>
      <div className="fq-family-pacing-grid fq-family-pacing-document">
        <header className="fq-family-pacing-print-title">
          <span className="fq-family-label">Fraction Quest · Family + teacher guide</span>
          <h2>Suggested Grade 3–5 fraction pacing</h2>
          <p>Session counts are a starting point. Adjust the pace using the learner’s models and explanations.</p>
        </header>
        {GRADE_PACING.map((plan) => (
          <article className="fq-family-pacing-card" key={plan.grade}>
            <header><span>Grade</span><strong>{plan.grade}</strong><div><b>{plan.totalSessions} sessions</b><small>{plan.minutesPerSession}</small></div></header>
            <div className="fq-family-pacing-rows">
              {plan.rows.map((row, index) => (
                <div className="fq-family-pacing-row" key={`${row.label ?? row.unit}-${index}`}>
                  <span>{row.unit ? `Unit ${row.unit}` : row.label}</span><b>{row.sessions} sessions</b><p>{row.focus}</p>
                </div>
              ))}
            </div>
            <footer>{pacingSessionTotal(plan)} planned sessions in this outline</footer>
          </article>
        ))}
      </div>
      <p className="fq-family-privacy-note">This guide is for the adult helping with learning. It contains teaching prompts and lesson standards, not a child’s private progress or answer keys.</p>
    </section>
  );
}

export default FamilyGuide;
