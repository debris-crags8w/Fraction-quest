import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, X } from 'lucide-react';
import { getMission, type Progress } from './game';
import { getWorksheet } from './learning-content';
import { checkWorksheet, editWorksheet, getLearningRecord, updateLearning, worksheetCount, type LearningRecord } from './learning';
import { Row } from './LearningLab';
import { lessonCode, PrintMenu } from './Printables';
import { Mascot } from './fun-ui';
import './learning-lab.css';

const letter = (index: number) => String.fromCharCode(65 + index);

/** Check printed sheets: tap the circled letters from the practice sheet and type the worksheet answers. */
export default function PaperCheck({ missionId, progress, onChange, onBack, onLab }: {
  missionId: string; progress: Progress; onChange: (progress: Progress) => void; onBack: () => void; onLab: () => void;
}) {
  const mission = getMission(missionId);
  const ref = useRef(progress); ref.current = progress;
  const cur = () => getLearningRecord(ref.current, missionId);
  const save = (record: LearningRecord) => { const next = updateLearning(ref.current, missionId, record); ref.current = next; onChange(next); };

  // Practice sheet: one tap per question; a wrong tap can be fixed, but only first taps count for stars.
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({});
  const questions = mission.questions;
  const rec = getLearningRecord(progress, missionId);
  const allRight = questions.every((q) => picked[q.id] === q.correctChoice);

  const pick = (questionId: string, choice: number, correct: number) => {
    const nextPicked = { ...picked, [questionId]: choice };
    const nextFirst = questionId in firstTry ? firstTry : { ...firstTry, [questionId]: choice === correct };
    setPicked(nextPicked); setFirstTry(nextFirst);
    if (questions.every((q) => nextPicked[q.id] === q.correctChoice) && !cur().practiceDone) {
      const firstTries = questions.filter((q) => nextFirst[q.id]).length;
      const stars = firstTries === questions.length ? 3 : firstTries >= questions.length - 1 ? 2 : 1;
      save({ ...cur(), practiceDone: true, practiceStars: Math.max(stars, cur().practiceStars ?? 0) });
    }
  };

  const sheet = getWorksheet(missionId);
  const count = worksheetCount(rec, missionId);
  const checkAll = () => {
    let r = cur();
    for (const problem of sheet) {
      const entry = r.worksheet[problem.id];
      if (entry?.draft.trim() && entry.checkedValue !== entry.draft) r = checkWorksheet(r, problem);
    }
    save(r);
  };

  return (
    <div className="fq-ll fq-paper" data-testid="paper-check">
      <button className="fq-back" onClick={onBack} data-testid="button-paper-back"><ArrowLeft size={17} /> Back</button>
      <header className="fq-ll-head fq-paper-head">
        <Mascot mood="happy" size={72} />
        <div>
          <span className="fq-ll-badge"><ClipboardCheck size={15} /> Check my paper · {lessonCode(missionId)}</span>
          <h2>{mission.title}</h2>
          <p>Did it on paper? Put in your answers here. They count just like answers in the app.</p>
        </div>
      </header>
      <div className="fq-ll-print"><PrintMenu missionId={missionId} record={rec} /></div>

      <section className="fq-ll-check" aria-labelledby="paper-practice">
        <h3 id="paper-practice">Practice sheet</h3>
        <p className="fq-ll-note">Tap the letter you circled.</p>
        <ol className="fq-paper-list">
          {questions.map((q, i) => {
            const choice = picked[q.id];
            const right = choice === q.correctChoice;
            return (
              <li key={q.id} className={choice === undefined ? '' : right ? 'ok' : 'bad'} data-testid={`paper-practice-${i + 1}`}>
                <span className="fq-ll-num">{i + 1}</span>
                <span className="fq-paper-prompt">{q.prompt}</span>
                <span className="fq-paper-letters" role="group" aria-label={`Question ${i + 1} answer`}>
                  {q.choices.map((c, k) => (
                    <button type="button" key={k} className={choice === k ? 'on' : ''} aria-pressed={choice === k} aria-label={`${letter(k)}: ${c}`} onClick={() => pick(q.id, k, q.correctChoice)} data-testid={`paper-practice-${i + 1}-${letter(k)}`}>{letter(k)}</button>
                  ))}
                </span>
                {choice !== undefined && <span className="fq-paper-mark" aria-live="polite">{right ? <><Check size={16} strokeWidth={3} /> Yes!</> : <><X size={16} strokeWidth={3} /> Look again</>}</span>}
              </li>
            );
          })}
        </ol>
        {(allRight || rec.practiceDone) && <div className="fq-ll-feedback ok" role="status" data-testid="status-paper-practice-done"><Check size={20} /><div><strong>Practice done!</strong> Next, build it in the Learning Lab.</div></div>}
      </section>

      <section className="fq-ll-sheet" aria-labelledby="paper-ws">
        <div className="fq-ll-sheet-head">
          <h3 id="paper-ws">Worksheet</h3>
          <p className="fq-ll-note">Type what you wrote in each box. Then press Check.</p>
          <div className="fq-ll-meter" role="progressbar" aria-valuemin={0} aria-valuemax={12} aria-valuenow={count} aria-label="Worksheet problems correct">
            <b style={{ width: `${(count / 12) * 100}%` }} /><span>{count} of 12 correct</span>
          </div>
        </div>
        <ol className="fq-ll-rows">
          {sheet.map((p) => (
            <Row key={p.id} p={p} rec={rec}
              onEdit={(v) => save(editWorksheet(cur(), p.id, v))}
              onCheck={() => save(checkWorksheet(cur(), p))}
              onHint={() => { const r = cur(); const e = r.worksheet[p.id] ?? { draft: '', attempts: 0, supported: false };
                save({ ...r, helpUses: r.helpUses + 1, worksheet: { ...r.worksheet, [p.id]: { ...e, supported: true } } }); }} />
          ))}
        </ol>
        <button type="button" className="fq-button secondary" onClick={checkAll} data-testid="button-paper-check-all">Check all <Check size={17} /></button>
      </section>

      <div className="fq-paper-foot">
        <button type="button" className="fq-button" onClick={onLab} disabled={!rec.practiceDone} data-testid="button-paper-to-lab">
          {rec.practiceDone ? 'Go to the Learning Lab' : 'Finish the practice sheet first'} {rec.practiceDone && <ArrowRight size={17} />}
        </button>
      </div>
    </div>
  );
}
