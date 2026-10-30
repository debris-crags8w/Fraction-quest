import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { askGate, gateAnswerIsRight, gateWaitSeconds } from './lib/grown-up-gate';

/** A light check that a grown-up is here (not security; just keeps young kids on their own screens). */
export function GrownUpGate({ onPass, onBack, backLabel = 'Back to the map', reason = 'This page shows your child\'s progress. Please answer to continue.' }: {
  onPass: () => void; onBack: () => void; backLabel?: string;
  /** Why a grown-up is needed here. */ reason?: string;
}) {
  const [q, setQ] = useState(() => askGate());
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const [wrongInARow, setWrongInARow] = useState(0);
  const [waitLeft, setWaitLeft] = useState(0);
  const waiting = waitLeft > 0;
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = window.setInterval(() => setWaitLeft((left) => Math.max(0, left - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [waiting]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (waitLeft > 0) return;
    if (gateAnswerIsRight(q, value)) { onPass(); return; }
    const misses = wrongInARow + 1;
    setWrongInARow(misses); setWaitLeft(gateWaitSeconds(misses));
    setWrong(true); setValue(''); setQ((previous) => askGate(Math.random, previous));
  };
  return (
    <main className="fq-shell fq-parent-gate fq-appear" data-testid="parent-gate">
      <button className="fq-back" onClick={onBack} data-testid="button-parent-back"><ArrowLeft size={17} /> {backLabel}</button>
      <section className="fq-parent-card">
        <span className="fq-parent-lock" aria-hidden="true"><Lock size={26} /></span>
        <h1>For grown-ups</h1>
        <p>{reason}</p>
        <form onSubmit={submit} className="fq-parent-gate-form">
          <label htmlFor="parent-gate-answer">{q.a} × {q.b} =</label>
          <input id="parent-gate-answer" inputMode="numeric" autoComplete="off" value={value} onChange={(e) => { setValue(e.target.value.replace(/\D/g, '').slice(0, 3)); setWrong(false); }} data-testid="input-parent-gate" />
          <button type="submit" className="fq-button" disabled={!value || waitLeft > 0} data-testid="button-parent-gate">Continue</button>
        </form>
        {waitLeft > 0
          ? <p className="fq-parent-wrong" role="alert" data-testid="text-parent-gate-wait">Please wait {waitLeft} {waitLeft === 1 ? 'second' : 'seconds'}, then try again.</p>
          : wrong && <p className="fq-parent-wrong" role="alert" data-testid="text-parent-gate-wrong">Not quite. Here is a new one.</p>}
      </section>
    </main>
  );
}
