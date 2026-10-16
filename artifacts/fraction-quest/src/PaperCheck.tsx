import { useRef, useState } from 'react';
import { MathText } from './MathText';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, RotateCcw, Trophy, X } from 'lucide-react';
import { CHALLENGES, challengeMaxPoints, challengeTrophy } from './challenges';
import { getMission, type Progress } from './game';
import { answerMatches, getWorksheet } from './learning-content';
import { checkWorksheet, editWorksheet, getLearningRecord, optionalWorksheetCount, requiredWorksheetDone, updateLearning, worksheetProblemProgress, type LearningRecord } from './learning';
import { Row } from './LearningLab';
import { lessonCode, PrintMenu } from './Printables';
import { Mascot } from './fun-ui';
import { playHaptic } from './lib/fun';
import './learning-lab.css';

const letter = (index: number) => String.fromCharCode(65 + index);
const TROPHY = { gold: 'Gold trophy!', silver: 'Silver trophy!', bronze: 'Bronze trophy!' };

/** Printed Unit challenge: tap the letters you circled, then check them all at once (like handing in the paper). */
function ChallengePaper({ unit, best, onScore }: { unit: number; best: number | null; onScore: (score: number) => void }) {
  const items = CHALLENGES[unit];
  const max = challengeMaxPoints(unit);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const allPicked = items.every((item) => item.id in picked);
  const score = items.reduce((sum, item) => sum + (picked[item.id] === item.correct ? item.points : 0), 0);
  const check = () => { setChecked(true); onScore(score); };
  return (
    <section className="fq-ll-check" aria-labelledby="paper-challenge" data-testid="paper-challenge">
      <h3 id="paper-challenge">Unit {unit} challenge</h3>
      <p className="fq-ll-note">Tap the letter you circled for each puzzle. Then press Check. {best != null && `Your best: ${best}/${max}.`}</p>
      <ol className="fq-paper-list">
        {items.map((item, i) => {
          const choice = picked[item.id];
          const right = choice === item.correct;
          return (
            <li key={item.id} className={!checked || choice === undefined ? '' : right ? 'ok' : 'bad'} data-testid={`paper-challenge-${i + 1}`}>
              <span className="fq-ll-num">{i + 1}</span>
              <span className="fq-paper-prompt"><span className="fq-ll-sequence">Puzzle {i + 1} of {items.length}</span><MathText text={item.prompt} /> <small className={`fq-points p${item.points}`}>{item.points} pts</small></span>
              <span className="fq-paper-letters" role="group" aria-label={`Puzzle ${i + 1} answer`}>
                {item.choices.map((c, k) => (
                  <button type="button" key={k} className={choice === k ? 'on' : ''} aria-pressed={choice === k} aria-label={`${letter(k)}: ${c}`} disabled={checked}
                    onClick={() => {
                      if (choice === k) return;
                      playHaptic('selection');
                      setPicked({ ...picked, [item.id]: k });
                    }} data-testid={`paper-challenge-${i + 1}-${letter(k)}`}>{letter(k)}</button>
                ))}
              </span>
              {checked && (
                <span className="fq-paper-mark">
                  {right ? <><Check size={16} strokeWidth={3} /> +{item.points} points</> : <><X size={16} strokeWidth={3} /> The answer is {letter(item.correct)}. <MathText text={item.explanation} /></>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {!checked
        ? <button type="button" className="fq-button secondary" onClick={check} disabled={!allPicked} data-testid="button-paper-challenge-check">{allPicked ? 'Check my challenge' : 'Tap a letter for every puzzle'} <Check size={17} /></button>
        : (
          <div className="fq-ll-feedback ok" role="status" data-testid="status-paper-challenge">
            <Trophy size={20} />
            <div><strong>{TROPHY[challengeTrophy(score, unit)]} {score} of {max} points.</strong> {best == null || score > best ? 'Saved as your best score.' : `Your best is still ${best}.`}
              <br /><button type="button" className="fq-hint-button" onClick={() => { setPicked({}); setChecked(false); }} data-testid="button-paper-challenge-again"><RotateCcw size={15} /> Enter another paper</button>
            </div>
          </div>
        )}
    </section>
  );
}

/** Check printed sheets: tap the circled letters from the practice sheet and build the worksheet answers with tiles. */
export default function PaperCheck({ missionId, progress, onChange, onBack, onLab, onWorksheetCorrect }: {
  missionId: string; progress: Progress; onChange: (progress: Progress) => void; onBack: () => void; onLab: () => void;
  onWorksheetCorrect?: (missionId: string, problemId: string) => void;
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
    if (picked[questionId] === choice) return;
    playHaptic('selection');
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
  const requiredDone = requiredWorksheetDone(rec, missionId);
  const optionalDone = optionalWorksheetCount(rec, missionId);
  const worksheetProgress = worksheetProblemProgress(rec, sheet);
  const checkAll = () => {
    let r = cur();
    for (const problem of sheet) {
      const entry = r.worksheet[problem.id];
      const wasCorrect = !!entry && entry.checkedValue === entry.draft && answerMatches(problem, entry.draft);
      if (entry?.draft.trim() && entry.checkedValue !== entry.draft) {
        r = checkWorksheet(r, problem);
        const checked = r.worksheet[problem.id];
        if (!wasCorrect && checked?.checkedValue === checked?.draft && answerMatches(problem, checked.draft)) {
          onWorksheetCorrect?.(missionId, problem.id);
        }
      }
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
          <p>Did it on paper? Put in your answers here: practice, worksheet and the Unit challenge. They count just like answers in the app.</p>
        </div>
      </header>
      <div className="fq-ll-print"><PrintMenu missionId={missionId} /></div>

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
                <span className="fq-paper-prompt"><span className="fq-ll-sequence">Question {i + 1} of {questions.length}</span><MathText text={q.prompt} /></span>
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
          <p className="fq-ll-note">Question 1 is required to finish the lesson. Questions 2–{sheet.length} are optional practice and do not block completion. Type what you wrote, then press Check.</p>
          <div className="fq-ll-meter" role="progressbar" aria-valuemin={0} aria-valuemax={sheet.length - 1} aria-valuenow={optionalDone} aria-valuetext={`Required question ${requiredDone ? 'complete' : 'not complete'} · Optional practice ${optionalDone} of ${sheet.length - 1} complete`} aria-label="Optional worksheet practice completed">
            <b style={{ width: `${((sheet.length - 1) ? optionalDone / (sheet.length - 1) : 1) * 100}%` }} /><span>Required Q1: {requiredDone ? 'done' : 'to do'} · Optional practice: {optionalDone} of {sheet.length - 1}</span>
          </div>
        </div>
        <ol className="fq-ll-rows">
          {sheet.map((p, index) => (
            <Row key={p.id} p={p} rec={rec} numberLabel={String(index + 1)}
              sequenceLabel={`Question ${index + 1} of ${sheet.length} · ${index === 0 ? 'Required' : 'Optional practice'} · ${worksheetProgress[index].status === 'complete' ? 'Complete' : worksheetProgress[index].status === 'retry' ? 'Needs another try' : worksheetProgress[index].status === 'current' ? 'Up next' : 'Not started'}`}
              onEdit={(v) => save(editWorksheet(cur(), p.id, v))}
              onCheck={() => save(checkWorksheet(cur(), p))}
              onSuccess={() => onWorksheetCorrect?.(missionId, p.id)}
              onHint={() => { const r = cur(); const e = r.worksheet[p.id] ?? { draft: '', attempts: 0, supported: false };
                save({ ...r, helpUses: r.helpUses + 1, worksheet: { ...r.worksheet, [p.id]: { ...e, supported: true } } }); }} />
          ))}
        </ol>
        <button type="button" className="fq-button secondary" onClick={checkAll} data-testid="button-paper-check-all">Check all <Check size={17} /></button>
      </section>

      {CHALLENGES[mission.unit] && <ChallengePaper unit={mission.unit} best={progress.challengeBest?.[String(mission.unit)] ?? null}
        onScore={(score) => {
          const key = String(mission.unit);
          const old = ref.current.challengeBest?.[key];
          if (old == null || score > old) { const next = { ...ref.current, challengeBest: { ...ref.current.challengeBest, [key]: score } }; ref.current = next; onChange(next); }
        }} />}

      <div className="fq-paper-foot">
        <button type="button" className="fq-button" onClick={onLab} disabled={!rec.practiceDone} data-testid="button-paper-to-lab">
          {rec.practiceDone ? 'Go to the Learning Lab' : 'Finish the practice sheet first'} {rec.practiceDone && <ArrowRight size={17} />}
        </button>
      </div>
    </div>
  );
}
