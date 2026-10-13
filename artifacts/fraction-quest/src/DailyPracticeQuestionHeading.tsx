import React, { type ReactNode, type Ref } from 'react';
import { LearningListenButton } from './LearningText';

export function DailyPracticeQuestionHeading({
  title,
  speechText,
  label,
  headingRef,
}: {
  title: ReactNode;
  speechText: string;
  label: string;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <header className="fq-example-section-header fq-daily-question-heading" data-testid="daily-practice-question-header">
      <h2 id="daily-question-title" ref={headingRef} tabIndex={-1} className="fq-question-text">{title}</h2>
      <LearningListenButton text={speechText} label={label} />
    </header>
  );
}
