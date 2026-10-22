import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { Mission } from './game';
import { LESSON_INTROS, lessonIntroScript, type LessonIntro } from './lesson-intros';
import { LearningListenButton, LearningText } from './LearningText';
import { TaskBar } from './TaskBar';

/** The goal, the steps and why the method works: on the Teach first screen, and under "How it works" later. */
export function LessonIntroCard({ intro }: { intro: LessonIntro }) {
  return (
    <section className="fq-example-intro fq-teach-card" aria-labelledby="lesson-intro-heading" data-testid="lesson-introduction">
      <div className="fq-example-card-head">
        <h2 id="lesson-intro-heading">{intro.heading}</h2>
        <LearningListenButton text={lessonIntroScript(intro)} label={`Listen to ${intro.heading.charAt(0).toLowerCase()}${intro.heading.slice(1)}`} prefetch />
      </div>
      <section className="fq-example-section" aria-labelledby="lesson-intro-goal">
        <header className="fq-example-section-header"><h3 id="lesson-intro-goal">Goal</h3></header>
        <p><LearningText text={intro.goal} emphasize /></p>
      </section>
      <section className="fq-example-section" aria-labelledby="lesson-intro-steps">
        <header className="fq-example-section-header"><h3 id="lesson-intro-steps">Steps</h3></header>
        <ol className="fq-teach-steps">
          {intro.steps.map((step) => <li key={step}><LearningText text={step} emphasize /></li>)}
        </ol>
      </section>
      <section className="fq-example-section" aria-labelledby="lesson-intro-why">
        <header className="fq-example-section-header"><h3 id="lesson-intro-why">Why it works</h3></header>
        <p><LearningText text={intro.why} emphasize /></p>
      </section>
    </section>
  );
}

/** The first screen of a lesson the child has not started before: teach first, then see the worked example. */
export function TeachFirst({ mission, lessonNumber, onNext, onExit }: { mission: Mission; lessonNumber: number; onNext: () => void; onExit: () => void }) {
  const intro = LESSON_INTROS[mission.id];
  return (
    <div className="fq-app">
      <main className="fq-shell fq-teach-shell" data-testid="teach-first">
        <TaskBar onBack={onExit} backLabel="Map" title={mission.title} />
        <p className="fq-play-kicker">Lesson {String(lessonNumber).padStart(2, '0')} · Teach first</p>
        <h1 className="fq-teach-title">{mission.title}</h1>
        {intro && <LessonIntroCard intro={intro} />}
        <button type="button" className="fq-button primary fq-teach-next" onClick={onNext} data-testid="button-teach-next">
          Next: see it <ArrowRight size={18} aria-hidden="true" />
        </button>
      </main>
    </div>
  );
}
