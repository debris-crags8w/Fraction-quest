import { useEffect, useRef, useState } from 'react';
import { Eye, Pause, Play, RotateCcw, Wind, X } from 'lucide-react';
import './brain-break.css';

type BreakReason = 'interval' | 'mistakes' | 'lesson-part';
type Activity = { id: string; title: string; detail: string; seconds: 30 | 45 | 60 | 90; quiet: boolean; icon: 'breath' | 'eyes' | 'stretch' | 'still' | 'move' };
const ACTIVITIES: Activity[] = [
  { id: 'slow-breath', title: 'Slow breathing', detail: 'Breathe in gently for four counts, then out for four. Let your shoulders soften.', seconds: 45, quiet: true, icon: 'breath' },
  { id: 'long-breath', title: 'A longer breathing pause', detail: 'Take a comfortable breath in and out. Repeat slowly, without needing to change how you feel.', seconds: 90, quiet: true, icon: 'breath' },
  { id: 'eye-rest', title: 'Far-away eyes', detail: 'Look at something across the room. Let your eyes rest there, then blink slowly.', seconds: 30, quiet: true, icon: 'eyes' },
  { id: 'gentle-stretch', title: 'Gentle stretch', detail: 'Reach up if that feels good, then let your arms rest. Stay in a comfortable space.', seconds: 60, quiet: true, icon: 'stretch' },
  { id: 'quiet-minute', title: 'Quiet pause', detail: 'Put the screen down. Notice one sound, one color, and one comfortable feeling.', seconds: 60, quiet: true, icon: 'still' },
  { id: 'march-break', title: 'March in place', detail: 'Stand beside your seat and march gently. Stop whenever you need to.', seconds: 45, quiet: false, icon: 'move' },
  { id: 'shake-out', title: 'Shake and settle', detail: 'Shake out your hands, roll your shoulders gently, and settle back in.', seconds: 30, quiet: false, icon: 'move' },
];
const REASONS: Record<BreakReason, string> = { interval: 'A little pause can help your brain reset.', mistakes: 'A tricky bit is a good time to pause. No rush.', 'lesson-part': 'You finished a part. Take a moment for yourself.' };

function ActivityMark({ kind }: { kind: Activity['icon'] }) {
  if (kind === 'eyes') return <Eye aria-hidden="true" />;
  return <Wind aria-hidden="true" />;
}

export function BrainBreakOffer({ reason, quietMode, onSkip, onFinish }: {
  reason: BreakReason; quietMode: boolean; onSkip: () => void; onFinish: () => void;
}) {
  const options = ACTIVITIES.filter(activity => !quietMode || activity.quiet);
  const [activityId, setActivityId] = useState(options[0].id);
  const [seconds, setSeconds] = useState<number>(options[0].seconds);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const selected = options.find(activity => activity.id === activityId) ?? options[0];

  useEffect(() => {
    if (!started || paused) return;
    if (seconds === 0) {
      finishRef.current();
      return;
    }
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [started, paused, seconds]);

  const choose = (activity: Activity) => {
    setActivityId(activity.id); setSeconds(activity.seconds); setStarted(false); setPaused(false);
  };
  const reset = () => { setSeconds(selected.seconds); setStarted(false); setPaused(false); };
  const minutes = `0:${String(seconds).padStart(2, '0')}`;
  return <div className="fq-break-backdrop" data-testid="brain-break-overlay">
    <section className="fq-break-card" role="dialog" aria-modal="true" aria-labelledby="break-title">
      <header className="fq-break-top"><span className="fq-break-kicker">A small pause</span><button type="button" className="fq-break-close" onClick={onSkip} aria-label="Skip break and return to lesson" data-testid="button-break-skip-top"><X size={19} /></button></header>
      <h2 id="break-title">Pause, if you’d like.</h2><p className="fq-break-reason">{REASONS[reason]}</p>
      {quietMode && <p className="fq-break-quiet" role="status" data-testid="status-break-quiet">Quiet mode is on. These choices are calm and low-noise.</p>}
      {!started ? <>
        <p className="fq-break-prompt">Choose a short reset. You can skip and return to your lesson at any time.</p>
        <div className="fq-break-options" role="group" aria-label="Choose a break activity">{options.map(activity => <button type="button" key={activity.id} className={`fq-break-option ${activityId === activity.id ? 'selected' : ''}`} aria-pressed={activityId === activity.id} onClick={() => choose(activity)} data-testid={`button-break-activity-${activity.id}`}>
          <span className="fq-break-symbol"><ActivityMark kind={activity.icon} /></span><span className="fq-break-option-copy"><strong>{activity.title}</strong><small>{activity.seconds} seconds</small></span>
        </button>)}</div>
        <p className="fq-break-detail" data-testid="text-break-instructions">{selected.detail}</p>
        <div className="fq-break-actions"><button type="button" className="fq-break-start" onClick={() => { setSeconds(selected.seconds); setStarted(true); setPaused(false); }} data-testid="button-break-start">Start {selected.seconds}-second break <Play size={16} /></button><button type="button" className="fq-break-skip" onClick={onSkip} data-testid="button-break-skip">Skip break</button></div>
      </> : <>
        <div className={`fq-break-live ${paused ? 'paused' : ''}`} aria-live="polite">
          <span className="fq-break-live-mark"><ActivityMark kind={selected.icon} /></span>
          <strong data-testid="status-break-countdown" aria-label={`${seconds} seconds remaining`}>{minutes}</strong>
          <span>{paused ? 'Paused' : selected.title}</span>
        </div>
        <p className="fq-break-detail">{selected.detail}</p>
        <div className="fq-break-actions"><button type="button" className="fq-break-start" onClick={() => setPaused(value => !value)} data-testid="button-break-pause">{paused ? <><Play size={16} /> Continue</> : <><Pause size={16} /> Pause</>}</button><button type="button" className="fq-break-reset" onClick={reset} data-testid="button-break-reset"><RotateCcw size={16} /> Restart</button><button type="button" className="fq-break-skip" onClick={onSkip} data-testid="button-break-skip">Return to lesson</button></div>
      </>}
    </section>
  </div>;
}
