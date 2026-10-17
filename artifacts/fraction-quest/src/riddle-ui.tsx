import { StoryCharacter } from './characters';
import { dailySecret, lanternWeek, riddleSetup } from './riddles';
import type { DayActivity } from './lib/fun';

/** Hoot's lantern: lit for a night with a right answer, dashed for tonight while it waits. */
export function LanternIcon({ lit, waiting = false, size = 24 }: { lit: boolean; waiting?: boolean; size?: number }) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 16 20" aria-hidden="true" className={`fq-lantern ${lit ? 'lit' : ''}`}>
      <rect x="5" y="0" width="6" height="3" rx="1" fill={lit ? '#C9A227' : '#8C8EA8'} />
      {waiting
        ? <rect x="2" y="3" width="12" height="15" rx="4" fill="none" stroke="#FFE27A" strokeWidth="1.6" strokeDasharray="2 2" />
        : <rect x="2" y="3" width="12" height="15" rx="4" fill={lit ? '#FFC800' : '#3D3F5C'} />}
      {lit && <circle cx="8" cy="11" r="3" fill="#FFF6D6" />}
    </svg>
  );
}

/** The last 7 nights as lanterns, with the streak. */
export function LanternWeek({ activity, streak }: { activity?: Record<string, DayActivity>; streak: number }) {
  const nights = lanternWeek(activity);
  return (
    <section className="fq-lantern-week" aria-labelledby="lantern-title" data-testid="lantern-week">
      <h2 id="lantern-title">Hoot’s lantern · {streak} {streak === 1 ? 'night' : 'nights'} in a row</h2>
      <p>Get one answer right each day to keep it glowing.</p>
      <ol role="img" aria-label={`${nights.filter((night) => night.lit).length} of the last 7 nights lit`}>
        {nights.map((night) => (
          <li key={night.day} className={night.today ? 'today' : ''} data-lit={night.lit}>
            <LanternIcon lit={night.lit} waiting={night.today && !night.lit} size={30} />
            <span>{night.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Chomp sets up each daily question. Words only: never a number, never a hint. */
export function RiddleSetup({ index, total }: { index: number; total: number }) {
  return (
    <div className="fq-story-say fq-riddle-setup" data-testid="riddle-setup">
      <StoryCharacter id="chomp" size={44} />
      <p><span className="fq-sr">Chomp says: </span>{riddleSetup(index, total)}</p>
    </div>
  );
}

/** The prize for finishing today's riddles: Chomp's secret of the day. */
export function RiddleSecret() {
  return (
    <div className="fq-riddle-secret" data-testid="riddle-secret">
      <StoryCharacter id="chomp" size={64} happy />
      <p><b>Chomp:</b> You solved all my riddles! Okay, okay. Here’s today’s secret: <span>{dailySecret()}</span></p>
    </div>
  );
}
