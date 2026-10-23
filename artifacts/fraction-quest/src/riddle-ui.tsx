import { StoryCharacter } from './characters';
import { Flame } from 'lucide-react';
import { dailySecret, lanternCard, lanternWeek, oilNoticeWords, oilWordsText, riddleReaction, riddleSetup } from './riddles';
import { LearningListenButton } from './LearningText';
import './spare-oil.css';
import { withName } from './story';
import { useStoryTheme } from './story-ui';
import { SPARE_OIL_MAX, today, type DayActivity, type OilNotice } from './lib/fun';

/** Hoot's lantern: lit for a night with a right answer, orange with a drop when spare oil kept it lit, dashed for tonight while it waits. */
export function LanternIcon({ lit, saved = false, waiting = false, size = 24 }: { lit: boolean; saved?: boolean; waiting?: boolean; size?: number }) {
  const glowing = lit || saved;
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 16 20" aria-hidden="true" className={`fq-lantern ${glowing ? 'lit' : ''} ${saved ? 'saved' : ''}`}>
      <rect x="5" y="0" width="6" height="3" rx="1" fill={glowing ? '#C9A227' : '#8C8EA8'} />
      {waiting
        ? <rect x="2" y="3" width="12" height="15" rx="4" fill="none" stroke="#FFE27A" strokeWidth="1.6" strokeDasharray="2 2" />
        : <rect x="2" y="3" width="12" height="15" rx="4" fill={saved ? '#FF9F1C' : lit ? '#FFC800' : '#3D3F5C'} />}
      {lit && <circle cx="8" cy="11" r="3" fill="#FFF6D6" />}
      {saved && <path d="M8 7.5 C8 7.5 6 10 6 11.4 A2 2 0 0 0 10 11.4 C10 10 8 7.5 8 7.5 Z" fill="#FFF6D6" />}
    </svg>
  );
}

/** A drop of spare oil: full, or a dashed outline for an empty place in the jar. */
export function OilDrop({ full, size = 24 }: { full: boolean; size?: number }) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 12 16" aria-hidden="true" className={`fq-oil-drop ${full ? 'full' : ''}`}>
      {full
        ? <><path d="M6 1 C6 1 1 7 1 10.5 A5 5 0 0 0 11 10.5 C11 7 6 1 6 1 Z" fill="#FF9F1C" stroke="#FFE27A" strokeWidth="1" /><circle cx="4.3" cy="10.5" r="1.2" fill="#FFE9C2" /></>
        : <path d="M6 1 C6 1 1 7 1 10.5 A5 5 0 0 0 11 10.5 C11 7 6 1 6 1 Z" fill="none" stroke="#8C8EA8" strokeWidth="1" strokeDasharray="1.6 1.4" />}
    </svg>
  );
}

/** The spare oil jar: how many drops are ready to keep the lantern lit. */
export function SpareOilJar({ oil }: { oil: number }) {
  return (
    <div className="fq-oil-jar" data-testid="spare-oil" data-oil={oil}>
      <span className="fq-oil-drops" role="img" aria-label={`Spare oil: ${oil} of ${SPARE_OIL_MAX} drops`}>
        {Array.from({ length: SPARE_OIL_MAX }, (_, i) => <OilDrop key={i} full={i < oil} />)}
      </span>
      <p><strong>Spare oil: {oil} of {SPARE_OIL_MAX}.</strong> {oil > 0
        ? <>If you miss a night, Hoot uses a drop to keep your lantern <u>lit</u>.</>
        : <>Light <u>7 nights in a row</u> to earn a drop.</>}</p>
    </div>
  );
}

/** The last 7 nights as lanterns, with the streak. */
export function LanternWeek({ activity, streak, savedDays, oil }: { activity?: Record<string, DayActivity>; streak: number; savedDays?: string[]; oil?: number }) {
  const nights = lanternWeek(activity, new Date(), savedDays);
  return (
    <section className="fq-lantern-week" aria-labelledby="lantern-title" data-testid="lantern-week">
      <h2 id="lantern-title">Hoot’s lantern · {streak} {streak === 1 ? 'night' : 'nights'} in a row</h2>
      <p>Get one answer right each day to keep it glowing.</p>
      <ol role="img" aria-label={`${nights.filter((night) => night.lit).length} of the last 7 nights lit${nights.some((night) => night.saved) ? `, ${nights.filter((night) => night.saved).length} kept lit with spare oil` : ''}`}>
        {nights.map((night) => (
          <li key={night.day} className={night.today ? 'today' : night.saved ? 'saved' : ''} data-lit={night.lit} data-saved={night.saved}>
            <LanternIcon lit={night.lit} saved={night.saved} waiting={night.today && !night.lit} size={30} />
            <span>{night.label}</span>
          </li>
        ))}
      </ol>
      {oil !== undefined && <SpareOilJar oil={oil} />}
    </section>
  );
}

/** Chomp sets up each daily question, then reacts once it is checked. Words only: never a number, never a hint. */
export function RiddleSetup({ index, total, result = null }: { index: number; total: number; result?: 'correct' | 'retry' | null }) {
  return (
    <div className={`fq-story-say fq-riddle-setup ${result ? `is-${result}` : ''}`} data-testid="riddle-setup" data-result={result ?? undefined}>
      <StoryCharacter id="chomp" size={40} happy={result === 'correct'} />
      <p aria-live="polite"><span className="fq-sr">Chomp says: </span>{result ? riddleReaction(result, index) : riddleSetup(index, total)}</p>
    </div>
  );
}

/** The prize for finishing today's riddles: Chomp's secret of the day. */
export function RiddleSecret() {
  const theme = useStoryTheme();
  return (
    <div className="fq-riddle-secret" data-testid="riddle-secret">
      <StoryCharacter id="chomp" size={64} happy />
      <p><b>Chomp:</b> You solved all my riddles! Okay, okay. Here’s today’s secret: <span>{withName(dailySecret(), null, theme)}</span></p>
    </div>
  );
}

/** After a missed night or a full week: Hoot (or a plain message with story mode off) says what the spare oil did. */
export function OilNoticeCard({ notice, storyOn, streak, onNext }: { notice: OilNotice; storyOn: boolean; streak: number; onNext: () => void }) {
  const words = oilNoticeWords(notice, storyOn, streak);
  const text = oilWordsText(words);
  return (
    <div className="fq-modal-backdrop fq-oil-backdrop" role="presentation">
      <section className="fq-oil-notice" role="dialog" aria-modal="true" aria-labelledby="oil-notice-title" data-testid="oil-notice" data-kind={notice.kind}>
        <div className="fq-oil-hero" aria-hidden="true">
          {notice.kind === 'used' ? <><LanternIcon lit size={120} /><span className="fq-oil-hero-drop"><OilDrop full size={44} /></span></> : <OilDrop full size={120} />}
        </div>
        <h2 id="oil-notice-title">{words.title}</h2>
        <div className="fq-oil-say">
          {words.speaker && <StoryCharacter id="hoot" size={52} />}
          <div>
            <p>{words.speaker && <b>{words.speaker}: </b>}{words.parts.map((part, i) => (typeof part === 'string' ? part : <u key={i}>{part.key}</u>))}</p>
            <LearningListenButton text={text} label={words.speaker ? `Listen to ${words.speaker}` : 'Listen'} />
          </div>
        </div>
        <button className="fq-button fq-oil-next" onClick={onNext} data-testid="button-oil-next" autoFocus>Next</button>
      </section>
    </div>
  );
}

/** Tonight's lantern, on the map: the week of lanterns and today's one task (Chomp's riddles). Once today's riddles
    are done the button goes, and the card says what comes tomorrow. Plain words, and dots, with the story off. */
export function TonightsLantern({ activity, streak, oil, savedDays, dailyDone, storyOn, onStart }: {
  activity?: Record<string, DayActivity>; streak: number; oil: number; savedDays?: string[]; dailyDone: boolean; storyOn: boolean; onStart: () => void;
}) {
  const nights = lanternWeek(activity, new Date(), savedDays);
  const litToday = (activity?.[today()]?.answered ?? 0) > 0;
  const card = lanternCard({ streak, oil, litToday, dailyDone, storyOn });
  return (
    <section className={`fq-tonight ${storyOn ? 'is-story' : 'is-plain'} is-${card.state}`} aria-labelledby="tonight-title" data-testid="tonights-lantern" data-state={card.state}>
      <div className="fq-tonight-head">
        {storyOn ? <StoryCharacter id="hoot" size={42} happy={card.state === 'lit'} /> : <span className="fq-tonight-flame" aria-hidden="true"><Flame size={22} /></span>}
        <div className="fq-tonight-words">
          <h2 id="tonight-title">{card.title}</h2>
          <p>{card.speaker && <b>{card.speaker}: </b>}{card.line}</p>
        </div>
        <LearningListenButton text={card.spoken} label="Listen to tonight’s lantern" compact />
      </div>
      <ol className="fq-tonight-week" role="img" aria-label={`${nights.filter((night) => night.lit).length} of the last 7 ${storyOn ? 'nights' : 'days'} lit`}>
        {nights.map((night) => (
          <li key={night.day} className={night.today ? 'today' : night.saved ? 'saved' : ''} data-lit={night.lit}>
            {storyOn ? <LanternIcon lit={night.lit} saved={night.saved} waiting={night.today && !night.lit} size={21} />
              : <span className={`fq-tonight-dot ${night.lit ? 'lit' : ''} ${night.today && !night.lit ? 'waiting' : ''}`} aria-hidden="true" />}
            <span>{night.label}</span>
          </li>
        ))}
      </ol>
      {card.facts.length > 0 && <p className="fq-tonight-facts">{card.facts.map((fact) => <span key={fact}>{fact}</span>)}</p>}
      {card.notes.length > 0 && <p className="fq-tonight-notes" data-testid="tonights-lantern-notes">{card.notes.map((note) => <span key={note}>{note}</span>)}</p>}
      {card.button && (
        <button type="button" className="fq-tonight-go" onClick={onStart} data-testid="button-tonights-lantern">
          <strong>{card.button}</strong><small>about 5 min</small>
        </button>
      )}
    </section>
  );
}
