import { ClipboardCheck, Sparkles } from 'lucide-react';
import { getAssessmentDefinitions } from './assessments';
import { getMission, GROWN_UP_PRACTICE_COUNT, PICKED_FOR_YOU_SPOKEN, type GrownUpPick } from './game';
import { LearningListenButton } from './LearningText';

/* On the child's map: practice a grown-up chose in the report. Each card goes away once it is done. */

export function PickedForYou({ picks, onOpen }: { picks: GrownUpPick[]; onOpen: (pick: GrownUpPick) => void }) {
  const definitions = getAssessmentDefinitions();
  const items = picks.flatMap((pick) => {
    if (pick.kind === 'practice') return [{ pick, label: `${GROWN_UP_PRACTICE_COUNT} questions`, title: getMission(pick.id).shortTitle }];
    const definition = definitions.find((item) => item.id === pick.id);
    return definition ? [{ pick, label: 'Check-in', title: definition.title }] : [];
  });
  if (!items.length) return null;
  return (
    <section className="fq-picked" aria-labelledby="picked-title" data-testid="picked-for-you">
      <div className="fq-picked-head">
        <span className="fq-picked-icon" aria-hidden="true"><Sparkles size={20} /></span>
        <div className="fq-picked-words">
          <h2 id="picked-title">Picked for you</h2>
          <p>A grown-up <u>picked</u> this practice for you.</p>
        </div>
        <LearningListenButton text={PICKED_FOR_YOU_SPOKEN} label="Listen to picked for you" compact />
      </div>
      {items.map(({ pick, label, title }) => (
        <button key={`${pick.kind}:${pick.id}`} type="button" className="fq-picked-go" onClick={() => onOpen(pick)} data-testid={`button-picked-${pick.kind}-${pick.id}`}>
          {pick.kind === 'checkin' ? <ClipboardCheck size={20} aria-hidden="true" /> : <Sparkles size={20} aria-hidden="true" />}
          <span><strong>{label}</strong><small>{title}</small></span>
        </button>
      ))}
    </section>
  );
}
