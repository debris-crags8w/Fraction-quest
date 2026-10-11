import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Lock, RotateCcw, Sparkles, X } from 'lucide-react';
import { GrownUpGate } from './ParentView';
import { FALLBACK_PRICE, FREE_UNITS, PRIVACY_POLICY_URL, TERMS_URL } from './lib/access';
import { MISSIONS } from './game';
import { isNativeApp } from './lib/native';
import {
  getEntitlement, isActive, loadProduct, manageSubscription, onEntitlement, purchase, restorePurchases, setPreviewSubscribed,
  type Entitlement, type ProductInfo,
} from './lib/subscription';
import { Mascot } from './fun-ui';

/* The subscription screens. Children only ever see "ask a grown-up"; buying is behind the grown-up gate
   (Apple's rule for kids' apps). Unit 1 is free; the subscription unlocks units 2–14. */

export function useEntitlement(): Entitlement {
  const [e, setE] = useState(getEntitlement());
  useEffect(() => onEntitlement(setE), []);
  return e;
}

/** What a child sees when they tap something locked. */
export function LockedSheet({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  return (
    <div className="fq-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fq-modal fq-locked-sheet" role="dialog" aria-modal="true" aria-labelledby="locked-title" data-testid="locked-sheet">
        <button className="fq-icon-button fq-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="fq-locked-mascot" aria-hidden="true"><Mascot mood="thinking" size={72} /></div>
        <h2 id="locked-title"><Lock size={20} /> This part is locked</h2>
        <p>Unit 1 is free to play. Ask a grown-up to unlock all 14 units, with every lesson, game and printable.</p>
        <div className="fq-modal-actions">
          <button type="button" className="fq-button ghost" onClick={onClose} data-testid="button-locked-close">Keep playing Unit 1</button>
          <button type="button" className="fq-button" onClick={onUnlock} data-testid="button-locked-grownup">I'm a grown-up</button>
        </div>
      </div>
    </div>
  );
}

/** Grown-up gate, then the subscription offer. */
export function UnlockView({ onBack, onUnlocked }: { onBack: () => void; onUnlocked: () => void }) {
  const [passed, setPassed] = useState(false);
  if (!passed) return <div className="fq-app"><GrownUpGate onPass={() => setPassed(true)} onBack={onBack} reason="Subscriptions are for grown-ups." /></div>;
  return (
    <div className="fq-app">
      <main className="fq-shell fq-paywall fq-appear" data-testid="paywall">
        <button className="fq-back" onClick={onBack} data-testid="button-paywall-back"><ArrowLeft size={17} /> Back to the map</button>
        <PaywallPanel onUnlocked={onUnlocked} />
      </main>
    </div>
  );
}

// Counted from the course itself, so the promise stays right when lessons are added.
const lockedLessons = MISSIONS.filter((mission) => !FREE_UNITS.has(mission.unit));
const lockedUnits = new Set(lockedLessons.map((mission) => mission.unit)).size;
const fullCourse = [
  `${lockedUnits} more units: ${lockedLessons.length} more lessons, from comparing and equivalent fractions to multiplying and percents`,
  'Every game: Fraction Race, coding levels, Code Sprint and Part Finder',
  'Printable worksheets, answer keys and unit challenges',
  'Daily practice and reviews across the whole course',
];

export function PaywallPanel({ onUnlocked }: { onUnlocked: () => void }) {
  const native = isNativeApp();
  const entitlement = useEntitlement();
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const load = () => { setProduct(null); void loadProduct().then(setProduct); };
  useEffect(load, []);
  useEffect(() => { if (isActive(entitlement)) onUnlocked(); }, [entitlement, onUnlocked]);

  const price = product?.displayPrice ?? FALLBACK_PRICE;
  const trial = product?.introOffer?.eligible ? product.introOffer.days : 0;
  const offer = trial ? `Free for ${trial} days, then ${price} a month` : `${price} a month`;

  const buy = async () => {
    setBusy('buy'); setMessage(null);
    try {
      const result = await purchase();
      if (result.status === 'pending') setMessage({ ok: true, text: 'Waiting for approval. When it is approved (for example through Ask to Buy), everything unlocks automatically.' });
      else if (result.status === 'cancelled') setMessage(null);
    } catch {
      setMessage({ ok: false, text: 'The purchase did not go through. You have not been charged. Please try again.' });
    } finally { setBusy(null); }
  };
  const restore = async () => {
    setBusy('restore'); setMessage(null);
    try {
      const e = await restorePurchases();
      if (!isActive(e)) setMessage({ ok: false, text: 'No active subscription was found for this Apple ID.' });
    } catch { setMessage({ ok: false, text: 'Could not reach the App Store. Please try again.' }); }
    finally { setBusy(null); }
  };

  return (
    <section className="fq-paywall-card" aria-labelledby="paywall-title">
      <span className="fq-paywall-badge"><Sparkles size={16} /> Full course</span>
      <h1 id="paywall-title">Unlock all of Fraction Quest</h1>
      <ul className="fq-paywall-list">
        {fullCourse.map((line) => <li key={line}><Check size={17} /> {line}</li>)}
      </ul>
      <p className="fq-paywall-note">Progress is never lost. If the subscription ends, everything your child has done stays saved, and Unit 1 stays free.</p>

      {native && product && !product.available && (
        <p className="fq-paywall-message bad" role="status">The App Store can't be reached right now. <button type="button" className="fq-link-button" onClick={load}>Try again</button></p>
      )}
      {!native && (
        <div className="fq-paywall-preview" data-testid="paywall-web-preview">
          <p><b>Website preview.</b> Subscriptions are bought in the iPhone and iPad app. This test switch pretends to subscribe on this browser only.</p>
          <button type="button" className="fq-button secondary" onClick={() => setPreviewSubscribed(true)} data-testid="button-preview-subscribe">Pretend to subscribe (testing)</button>
        </div>
      )}

      {native && (
        <>
          <p className="fq-paywall-offer" data-testid="text-paywall-offer">{product ? offer : 'Loading…'}</p>
          <button type="button" className="fq-button fq-paywall-buy" onClick={() => void buy()} disabled={!product?.available || busy !== null} data-testid="button-subscribe">
            {busy === 'buy' ? 'Opening the App Store…' : trial ? `Start ${trial}-day free trial` : 'Subscribe'}
          </button>
          <button type="button" className="fq-button ghost" onClick={() => void restore()} disabled={busy !== null} data-testid="button-restore-purchases">
            <RotateCcw size={16} /> {busy === 'restore' ? 'Checking…' : 'Restore purchases'}
          </button>
        </>
      )}
      {message && <p className={`fq-paywall-message ${message.ok ? 'ok' : 'bad'}`} role="status">{message.text}</p>}

      <p className="fq-paywall-terms" data-testid="text-paywall-terms">
        Monthly subscription, {price} a month{trial ? ` after a ${trial}-day free trial` : ''}. Payment is charged to your Apple ID
        {trial ? ' when the free trial ends' : ' when you confirm the purchase'}. It renews every month unless you cancel at least 24 hours before
        the end of the current period. Manage or cancel any time in Settings › your name › Subscriptions.{trial ? ' The free trial is for new subscribers only.' : ''}
      </p>
      <p className="fq-paywall-links">
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms of Use</a>
        {PRIVACY_POLICY_URL && <> · <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">Privacy Policy</a></>}
      </p>
    </section>
  );
}

/** Grown-ups' page: subscription status, manage, restore. */
export function SubscriptionSection({ onUnlock }: { onUnlock: () => void }) {
  const native = isNativeApp();
  const e = useEntitlement();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const active = isActive(e);
  const until = e.expiresAt ? new Date(e.expiresAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : null;
  const status = !active ? 'Not subscribed. Unit 1 is free; units 2–14 are locked.'
    : e.inTrial ? `Free trial${until ? ` until ${until}` : ''}. ${e.willRenew === false ? 'It will not renew.' : 'The monthly subscription starts after that unless you cancel.'}`
    : `Subscribed. ${until ? (e.willRenew === false ? `Ends ${until}.` : `Renews ${until}.`) : ''}`;
  return (
    <section className="fq-parent-section fq-subscription" data-testid="subscription-section" aria-labelledby="subscription-title">
      <h2 id="subscription-title"><Sparkles size={20} /> Subscription</h2>
      <p data-testid="text-subscription-status">{status}</p>
      <div className="fq-backup-buttons">
        {!active && <button type="button" className="fq-button" onClick={onUnlock} data-testid="button-open-paywall">Unlock all units</button>}
        {native && active && <button type="button" className="fq-button secondary" onClick={() => { void manageSubscription().catch(() => setNote('Open Settings › your name › Subscriptions to manage it.')); }} data-testid="button-manage-subscription">Manage subscription</button>}
        {native && <button type="button" className="fq-button ghost" disabled={busy} onClick={() => { setBusy(true); setNote(null); void restorePurchases().then((r) => setNote(isActive(r) ? 'Your subscription is active.' : 'No active subscription was found for this Apple ID.')).catch(() => setNote('Could not reach the App Store.')).finally(() => setBusy(false)); }} data-testid="button-restore-purchases-parent"><RotateCcw size={16} /> Restore purchases</button>}
        {!native && active && <button type="button" className="fq-button ghost" onClick={() => setPreviewSubscribed(false)} data-testid="button-preview-unsubscribe">Stop pretending (testing)</button>}
      </div>
      {note && <p className="fq-parent-note" role="status">{note}</p>}
    </section>
  );
}
