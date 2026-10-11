import React from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { getDueSkillReviewCount, type Progress } from './game';

export default function QuickReviewEntry({
  progress,
  onStart,
}: {
  progress: Progress;
  onStart: () => void;
}) {
  const dueReviewCount = getDueSkillReviewCount(progress);
  if (dueReviewCount === 0) return null;

  return (
    <button className="fq-continue-card fq-review-continue-card" onClick={onStart} data-testid="button-start-due-review">
      <span className="fq-continue-icon"><RotateCcw size={20} /></span>
      <span className="fq-continue-copy">
        <strong>Quick skill review</strong>
        <span>{dueReviewCount} due {dueReviewCount === 1 ? 'skill' : 'skills'} ready for a short retry round</span>
      </span>
      <ArrowRight className="fq-continue-arrow" size={20} />
    </button>
  );
}
