import { useState } from 'react';
import { Check, Clipboard, KeyRound, Printer } from 'lucide-react';
import { printPage } from './lib/print';
import './RecoveryCode.css';

/** A recovery code shown once (after sign-up, a reset, or "make a new code"), with copy and print. */
export function RecoveryCodeCard({ code, username, onDone, doneLabel = 'Continue' }: { code: string; username: string; onDone?: () => void; doneLabel?: string }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${username}: ${code}`); setCopied(true); } catch { setCopied(false); }
  };
  const print = () => {
    document.body.classList.add('fq-printing-recovery');
    const done = () => document.body.classList.remove('fq-printing-recovery');
    window.addEventListener('afterprint', done, { once: true });
    void printPage('Fraction Quest recovery code');
  };
  return (
    <section className="fq-recovery-card" data-testid="recovery-code-card" aria-labelledby="fq-recovery-title">
      <p className="fq-recovery-overline"><KeyRound size={16} /> For a grown-up</p>
      <h2 id="fq-recovery-title">Save this recovery code</h2>
      <p>If the password is ever forgotten, this code and the username let you set a new one. It is shown only now. Keep it somewhere safe at home, not with the child’s device.</p>
      <dl className="fq-recovery-code">
        <dt>Username</dt><dd data-testid="text-recovery-username">{username}</dd>
        <dt>Recovery code</dt><dd data-testid="text-recovery-code">{code}</dd>
      </dl>
      <div className="fq-recovery-actions">
        <button type="button" className="fq-button ghost" onClick={() => void copy()} data-testid="button-copy-recovery">{copied ? <Check size={16} /> : <Clipboard size={16} />} {copied ? 'Copied' : 'Copy'}</button>
        <button type="button" className="fq-button ghost" onClick={print} data-testid="button-print-recovery"><Printer size={16} /> Print</button>
      </div>
      {onDone && <>
        <label className="fq-recovery-saved">
          <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} data-testid="checkbox-recovery-saved" />
          <span>I wrote it down, printed it, or saved it.</span>
        </label>
        <button type="button" className="fq-button fq-login-submit" disabled={!saved} onClick={onDone} data-testid="button-recovery-continue">{doneLabel}</button>
      </>}
    </section>
  );
}
