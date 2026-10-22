import { useState } from 'react';
import { StoryCharacter } from './characters';
import { GrownUpGate } from './GrownUpGate';
import { LearningListenButton } from './LearningText';
import { ADD_MINUTES } from './lib/fun';
import { TIME_UP_SPEECH } from './time-up-copy';
import './subscribe.css';

/* The grown-up's daily time limit is used up: Hoot says goodbye for today. The Storybook stays open, and a grown-up
   can add ten more minutes after the grown-up check. */
export function TimeUp({ answeredToday, onStorybook, onAddMinutes }: { answeredToday: number; onStorybook: () => void; onAddMinutes: () => void }) {
  const [gate, setGate] = useState(false);
  if (gate) {
    return <div className="fq-app"><GrownUpGate onPass={() => { setGate(false); onAddMinutes(); }} onBack={() => setGate(false)} backLabel="Back"
      reason={`A grown-up can add ${ADD_MINUTES} more minutes for today. Please answer to continue.`} /></div>;
  }
  return (
    <div className="fq-app fq-subscribe-night">
      <main className="fq-shell fq-subscribe-ask" data-testid="time-up">
        <div className="fq-subscribe-hero" aria-hidden="true"><StoryCharacter id="hoot" size={120} /></div>
        <h1>That’s today’s time!</h1>
        <section className="fq-subscribe-say">
          <p><b>Hoot: </b>Great work today! That’s all the <u>time</u> for today. Everything you did is <u>saved</u>. See you tomorrow!</p>
          <LearningListenButton text={TIME_UP_SPEECH} label="Listen to Hoot" />
        </section>
        {answeredToday > 0 && <p className="fq-subscribe-note" data-testid="time-up-answered">{answeredToday} {answeredToday === 1 ? 'question' : 'questions'} right today</p>}
        <p className="fq-subscribe-note">You can still read the Storybook.</p>
        <div className="fq-subscribe-actions">
          <button className="fq-button fq-subscribe-go" onClick={onStorybook} data-testid="button-time-up-storybook">Open the Storybook</button>
          <button className="fq-button ghost" onClick={() => setGate(true)} data-testid="button-time-up-add">Grown-up: add {ADD_MINUTES} minutes</button>
        </div>
      </main>
    </div>
  );
}
