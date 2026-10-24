import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { MathText } from './MathText';
import { glanceShareText, type Glance, type GlanceLesson, type SkillRow } from './parent-report';

/* The top of the grown-ups' report: the week in a sentence and what was learned. The share card sends a short summary.
   Everything is read from saved progress. */

const gradeTag = (lesson: GlanceLesson) => (lesson.grade ? `Grade ${lesson.grade}` : 'Bonus');

export function ParentGlance({ glance, firstTryRate, childName }: { glance: Glance; firstTryRate: number | null; childName: string | null }) {
  const name = childName ?? 'Your child';
  const lessons = glance.learned.length;
  return (
    <div className="fq-glance" data-testid="parent-glance">
      <p className="fq-glance-summary" data-testid="glance-summary">
        {name} practiced on <strong>{glance.daysPracticed} of the last 7 days</strong> ({glance.minutes} minutes)
        {lessons ? <> and finished <strong>{lessons} {lessons === 1 ? 'lesson' : 'lessons'}</strong>.</> : '.'}
        {firstTryRate !== null && firstTryRate >= 70 ? ' Most answers were right the first time.' : ''}
      </p>
      <div className="fq-glance-tiles">
        <div><strong>{glance.daysPracticed} of 7</strong><span>days practiced</span>{glance.savedDays > 0 && <small>+{glance.savedDays} saved by spare oil</small>}</div>
        <div><strong>{lessons}</strong><span>{lessons === 1 ? 'lesson' : 'lessons'} finished</span></div>
        <div><strong>{firstTryRate === null ? '—' : `${firstTryRate}%`}</strong><span>right the first time</span></div>
      </div>

      {lessons > 0 && (
        <section className="fq-glance-card" aria-labelledby="glance-learned">
          <h2 id="glance-learned">Learned this week</h2>
          <ul className="fq-glance-learned">
            {glance.learned.map((lesson) => (
              <li key={lesson.id}><Check size={16} strokeWidth={3} aria-hidden="true" />
                <p><strong>{lesson.title}</strong> · {gradeTag(lesson)}<br /><MathText text={lesson.idea} /></p></li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}

export function ShareCard({ glance, firstTryRate, childName, skills }: { glance: Glance; firstTryRate: number | null; childName: string | null; skills: SkillRow[] }) {
  const [shared, setShared] = useState<'shared' | 'copied' | 'failed' | null>(null);
  const shareText = glanceShareText(glance, firstTryRate, childName, new Date(), skills);
  const share = async () => {
    try {
      if (typeof navigator.share === 'function') { await navigator.share({ text: shareText }); setShared('shared'); return; }
      await navigator.clipboard.writeText(shareText); setShared('copied');
    } catch (error) {
      // Closing the share sheet is not a failure.
      setShared((error as Error)?.name === 'AbortError' ? null : 'failed');
    }
  };
  return (
      <section className="fq-glance-card" aria-labelledby="glance-share" data-testid="parent-share">
        <h2 id="glance-share">Share with a teacher</h2>
        <p className="fq-glance-note">Send a short summary to a teacher or another grown-up. Nothing is shared unless you choose to.</p>
        <pre className="fq-glance-share-text" aria-label="Summary that will be shared" data-testid="glance-share-text">{shareText}</pre>
        <button className="fq-button" onClick={share} data-testid="button-share-week"><Share2 size={18} aria-hidden="true" /> Share summary</button>
        <p className="fq-glance-note" role="status">{shared === 'copied' ? 'Copied. Paste it into a message or email.' : shared === 'shared' ? 'Shared.' : shared === 'failed' ? 'Could not share on this device. Select the text above and copy it.' : ''}</p>
      </section>
  );
}
