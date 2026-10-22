import { useState } from 'react';
import { legalUrl } from './lib/legal';
import { Check, X } from 'lucide-react';
import { StoryCharacter } from './characters';
import { GrownUpGate } from './GrownUpGate';
import { LearningListenButton } from './LearningText';
import { LanternIcon } from './riddle-ui';
import { MISSIONS } from './game';
import { askShell, LISTED_PRICE, LISTED_YEARLY_PRICE, perMonth, planChoices, useSubscription, yearlySaving, type Plan, type Subscription } from './lib/subscription';
import './subscribe.css';

/* What a child sees when a lesson needs the subscription: ask a grown-up, the grown-up check (Apple requires one before
   any purchase in a children's app), then the free-trial screen for the grown-up. The purchase itself happens in
   Apple's or Google's own sheet; when it goes through, the lesson that was asked for opens by itself. */

/** Where the app is listed; set for the published website once the store listings are live. */
const APP_STORE_URL = String(import.meta.env?.VITE_APP_STORE_URL ?? '').trim();
const GOOGLE_PLAY_URL = String(import.meta.env?.VITE_GOOGLE_PLAY_URL ?? '').trim();
const PRIVACY = 'Fraction Quest saves the account username and display name, learner nicknames, lesson answers and progress, and app preferences so learning can continue on another device. We do not ask for email, record audio, show ads, or sell anything to anyone.';

type Step = 'ask' | 'gate' | 'paywall';

export function SubscribeFlow({ subscription, lapsed, lessonsDone, piecesFound, onBack, onStorybook }: {
  subscription: Subscription; lapsed: boolean; lessonsDone: number; piecesFound: number; onBack: () => void; onStorybook: () => void;
}) {
  const [step, setStep] = useState<Step>('ask');
  if (step === 'gate') {
    return <div className="fq-app"><GrownUpGate onPass={() => setStep('paywall')} onBack={() => setStep('ask')} backLabel="Back"
      reason="Subscriptions are for grown-ups. Please answer to continue." /></div>;
  }
  if (step === 'paywall') return <Paywall subscription={subscription} onClose={onBack} />;
  return <AskGrownUp lapsed={lapsed} lessonsDone={lessonsDone} piecesFound={piecesFound} onGrownUp={() => setStep('gate')} onBack={onBack} onStorybook={onStorybook} />;
}

/** In a plain browser: the first lesson is free, and the rest of the adventure is in the app. A grown-up passes the
    check to see the store links (links out of Fraction Quest are for grown-ups). */
export function WebAppOnlyFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'ask' | 'gate' | 'app'>('ask');
  if (step === 'gate') {
    return <div className="fq-app"><GrownUpGate onPass={() => setStep('app')} onBack={() => setStep('ask')} backLabel="Back"
      reason="This part is for grown-ups. Please answer to continue." /></div>;
  }
  if (step === 'app') return <GetTheApp onClose={onBack} />;
  const say = 'The rest of the adventure is in the Fraction Quest app. Ask a grown-up to get it on a phone or tablet.';
  return (
    <div className="fq-app fq-subscribe-night">
      <main className="fq-shell fq-subscribe-ask" data-testid="web-app-only">
        <div className="fq-subscribe-hero" aria-hidden="true"><StoryCharacter id="hoot" size={120} /></div>
        <h1>You found the first clue!</h1>
        <section className="fq-subscribe-say">
          <p><b>Hoot: </b>The rest of the adventure is in the Fraction Quest <u>app</u>. Ask a <u>grown-up</u> to get it on a phone or tablet.</p>
          <LearningListenButton text={say} label="Listen to Hoot" />
        </section>
        <p className="fq-subscribe-note">You can still play lesson 1 again and read the Storybook here.</p>
        <div className="fq-subscribe-actions">
          <button className="fq-button fq-subscribe-go" onClick={() => setStep('gate')} data-testid="button-get-grown-up">Get a grown-up</button>
          <button className="fq-button ghost" onClick={onBack} data-testid="button-subscribe-back">Back to the map</button>
        </div>
      </main>
    </div>
  );
}

function GetTheApp({ onClose }: { onClose: () => void }) {
  // On a phone, list its own store first.
  const android = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const stores = [
    { id: 'app-store', label: 'Get it on the App Store', url: APP_STORE_URL },
    { id: 'google-play', label: 'Get it on Google Play', url: GOOGLE_PLAY_URL },
  ].filter((store) => store.url);
  if (android) stores.reverse();
  return (
    <div className="fq-app">
      <main className="fq-shell fq-paywall" data-testid="get-the-app">
        <div className="fq-paywall-top">
          <span>For grown-ups</span>
          <button className="fq-icon-button" onClick={onClose} aria-label="Close" data-testid="button-get-app-close"><X size={18} /></button>
        </div>
        <h1>Fraction Quest continues in the app</h1>
        <p>Your child finished the free first lesson. The full course is in the app for iPhone, iPad and Android: 7 days free, then {LISTED_YEARLY_PRICE} a year or {LISTED_PRICE} a month.</p>
        <ul className="fq-paywall-list">
          <li><Check size={16} strokeWidth={3} aria-hidden="true" /><span><strong>{MISSIONS.length} lessons</strong> that teach first, then practise, with a picture for every question</span></li>
          <li><Check size={16} strokeWidth={3} aria-hidden="true" /><span><strong>A weekly report</strong> showing what your child learned and how to help at home</span></li>
          <li><Check size={16} strokeWidth={3} aria-hidden="true" /><span><strong>No ads</strong>, and nothing sold to anyone</span></li>
        </ul>
        <div className="fq-get-app-stores">
          {stores.length
            ? stores.map((store) => <a key={store.id} className="fq-get-app-store" href={store.url} target="_blank" rel="noreferrer" data-testid={`link-${store.id}`}>{store.label}</a>)
            : <p className="fq-get-app-soon" data-testid="get-app-soon">The app is coming soon to the App Store and Google Play.</p>}
        </div>
        <p className="fq-get-app-note">Lessons done here stay saved in this browser. The app starts fresh with its own level quiz.</p>
        <button className="fq-button ghost fq-get-app-back" onClick={onClose} data-testid="button-get-app-back">Back to the map</button>
      </main>
    </div>
  );
}

function AskGrownUp({ lapsed, lessonsDone, piecesFound, onGrownUp, onBack, onStorybook }: {
  lapsed: boolean; lessonsDone: number; piecesFound: number; onGrownUp: () => void; onBack: () => void; onStorybook: () => void;
}) {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const say = lapsed
    ? `Fraction Quest needs a grown-up to keep going. Everything you learned is saved: ${plural(piecesFound, 'stone piece', 'stone pieces')} and ${plural(lessonsDone, 'lesson', 'lessons')}.`
    : 'You found the first clue! To find all 15 pieces of the Whole Stone, ask a grown-up to unlock Fraction Quest.';
  return (
    <div className="fq-app fq-subscribe-night">
      <main className="fq-shell fq-subscribe-ask" data-testid="subscribe-ask" data-lapsed={lapsed}>
        <div className="fq-subscribe-hero" aria-hidden="true">{lapsed ? <LanternIcon lit={false} waiting size={110} /> : <StoryCharacter id="hoot" size={120} />}</div>
        <h1>{lapsed ? 'Hoot’s lantern is waiting' : 'The adventure is ready!'}</h1>
        <section className="fq-subscribe-say">
          <p><b>Hoot: </b>{lapsed
            ? <>Fraction Quest needs a <u>grown-up</u> to keep going. Everything you learned is saved: {plural(piecesFound, 'stone piece', 'stone pieces')} and {plural(lessonsDone, 'lesson', 'lessons')}.</>
            : <>You found the first clue! To find all 15 pieces of the Whole Stone, ask a <u>grown-up</u> to unlock Fraction Quest.</>}</p>
          <LearningListenButton text={say} label="Listen to Hoot" />
        </section>
        <p className="fq-subscribe-note">{lapsed ? 'You can still read the Storybook and see your stone pieces.' : 'Your level quiz and everything you did so far are saved.'}</p>
        <div className="fq-subscribe-actions">
          <button className="fq-button fq-subscribe-go" onClick={onGrownUp} data-testid="button-get-grown-up">Get a grown-up</button>
          {lapsed
            ? <button className="fq-button ghost" onClick={onStorybook} data-testid="button-subscribe-storybook">Open the Storybook</button>
            : <button className="fq-button ghost" onClick={onBack} data-testid="button-subscribe-back">Back to the map</button>}
        </div>
      </main>
    </div>
  );
}

function Paywall({ subscription, onClose }: { subscription: Subscription; onClose: () => void }) {
  const plans = planChoices(subscription);
  const [chosen, setChosen] = useState<Plan>(plans[0].plan);
  const offer = plans.find((item) => item.plan === chosen) ?? plans[0];
  const saving = yearlySaving(plans);
  const per = (plan: Plan) => (plan === 'yearly' ? 'a year' : 'a month');
  return (
    <div className="fq-app">
      <main className="fq-shell fq-paywall" data-testid="paywall">
        <div className="fq-paywall-top">
          <span>For grown-ups</span>
          <button className="fq-icon-button" onClick={onClose} aria-label="Close" data-testid="button-paywall-close"><X size={18} /></button>
        </div>
        <h1>Try Fraction Quest free for 7 days</h1>
        <p>A full fraction course for grades 3 to 5, built to the Common Core standards.</p>
        <ul className="fq-paywall-list">
          <li><Check size={16} strokeWidth={3} aria-hidden="true" /><span><strong>{MISSIONS.length} lessons</strong> that teach first, then practise</span></li>
          <li><Check size={16} strokeWidth={3} aria-hidden="true" /><span><strong>Every answer checked</strong> before it ships</span></li>
          <li><Check size={16} strokeWidth={3} aria-hidden="true" /><span><strong>A weekly report</strong> for grown-ups</span></li>
          <li><Check size={16} strokeWidth={3} aria-hidden="true" /><span><strong>No ads</strong>, and nothing sold to anyone</span></li>
        </ul>
        {plans.length > 1 && (
          <fieldset className="fq-paywall-plans" data-testid="paywall-plans">
            <legend>Choose a plan</legend>
            {plans.map((item) => {
              const monthly = item.plan === 'yearly' ? perMonth(item) : null;
              return (
                <label key={item.plan} className="fq-paywall-plan" data-chosen={item.plan === chosen} data-testid={`plan-${item.plan}`}>
                  <input type="radio" name="plan" value={item.plan} checked={item.plan === chosen} onChange={() => setChosen(item.plan)} />
                  <span className="fq-paywall-plan-text">
                    <strong>{item.plan === 'yearly' ? 'Yearly' : 'Monthly'}</strong>
                    <span>{item.price} {per(item.plan)}{monthly ? `, about ${monthly} a month` : ''}</span>
                  </span>
                  {item.plan === 'yearly' && saving && <span className="fq-paywall-save">Save {saving}%</span>}
                </label>
              );
            })}
          </fieldset>
        )}
        <div className="fq-paywall-terms">
          <strong data-testid="paywall-price">7 days free, then {offer.price} {per(offer.plan)}</strong>
          <span>Renews until cancelled. Cancel anytime in your phone’s Settings, at least a day before the trial ends, and you won’t be charged.</span>
        </div>
        {subscription.error && <p className="fq-paywall-error" role="alert">{subscription.error}</p>}
        <button className="fq-button fq-paywall-start" onClick={() => askShell('buy', plans.length > 1 ? offer.plan : undefined)} disabled={subscription.busy} data-testid="button-start-trial">
          {subscription.busy ? 'One moment…' : 'Start free trial'}
        </button>
        <div className="fq-paywall-links">
          <button className="fq-paywall-restore" onClick={() => askShell('restore')} disabled={subscription.busy} data-testid="button-restore">Restore purchase</button>
          <span><a href={legalUrl('terms')} target="_blank" rel="noreferrer" data-testid="link-terms">Terms</a> · <details className="fq-paywall-privacy"><summary>Privacy</summary><p>{PRIVACY} <a href={legalUrl('privacy')} target="_blank" rel="noreferrer" data-testid="link-privacy">Read the full privacy notice</a></p></details></span>
        </div>
      </main>
    </div>
  );
}

/** The grown-ups' page in the app: whether the subscription is on, when it renews, and the store's own controls.
    Hidden in a browser, where there is nothing to buy. */
export function SubscriptionSettings() {
  const subscription = useSubscription();
  if (!subscription) return null;
  const renews = subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : null;
  return (
    <section className="fq-parent-section fq-subscription-settings" aria-labelledby="subscription-title" data-testid="section-subscription" data-state={subscription.state}>
      <h2 id="subscription-title">Subscription</h2>
      <p data-testid="subscription-status">{subscription.state === 'active'
        ? <>Fraction Quest is on{renews ? <>. It renews on <strong>{renews}</strong></> : null}.</>
        : subscription.state === 'none'
          ? <>Lessons are locked. Start the 7-day free trial, then {planChoices(subscription).map((item) => `${item.price} a ${item.plan === 'yearly' ? 'year' : 'month'}`).join(' or ')}.</>
          : <>The store can’t be reached right now, so all lessons stay open.</>}</p>
      {subscription.error && <p className="fq-paywall-error" role="alert">{subscription.error}</p>}
      <div className="fq-subscription-actions">
        {subscription.state === 'active'
          ? <button className="fq-button" onClick={() => askShell('manage')} data-testid="button-manage-subscription">Manage or cancel</button>
          : subscription.state === 'none' && <ParentStartTrial subscription={subscription} />}
        <button className="fq-button ghost" onClick={() => askShell('restore')} disabled={subscription.busy} data-testid="button-parent-restore">Restore purchase</button>
      </div>
    </section>
  );
}

/** The grown-ups' page starts the trial on the paywall's plans: one button for each plan the store sells. */
function ParentStartTrial({ subscription }: { subscription: Subscription }) {
  const plans = planChoices(subscription);
  if (plans.length === 1) {
    return <button className="fq-button" onClick={() => askShell('buy')} disabled={subscription.busy} data-testid="button-parent-start-trial">Start free trial</button>;
  }
  return <>{plans.map((item) => (
    <button key={item.plan} className="fq-button" onClick={() => askShell('buy', item.plan)} disabled={subscription.busy} data-testid={`button-parent-start-trial-${item.plan}`}>
      {item.plan === 'yearly' ? 'Start yearly trial' : 'Start monthly trial'}
    </button>
  ))}</>;
}
