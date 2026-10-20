import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { MathText } from './MathText';
import { glanceShareText, type Glance, type GlanceLesson } from './parent-report';

/* The top of the grown-ups' report: the week in a sentence, grade level, what was learned, and one thing to help with at home.
   Everything is read from saved progress; the full report follows below it. */

const gradeTag = (lesson: GlanceLesson) => (lesson.grade ? `Grade ${lesson.grade}` : 'Bonus');

export function ParentGlance({ glance, firstTryRate, childName }: { glance: Glance; firstTryRate: number | null; childName: string | null }) {
  const name = childName ?? 'Your child';
  const [shared, setShared] = useState<'shared' | 'copied' | 'failed' | null>(null);
  const shareText = glanceShareText(glance, firstTryRate, childName);
  const share = async () => {
    try {
      if (typeof navigator.share === 'function') { await navigator.share({ text: shareText }); setShared('shared'); return; }
      await navigator.clipboard.writeText(shareText); setShared('copied');
    } catch (error) {
      // Closing the share sheet is not a failure.
      setShared((error as Error)?.name === 'AbortError' ? null : 'failed');
    }
  };
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

      <section className="fq-glance-card" aria-labelledby="glance-grades">
        <h2 id="glance-grades">On grade level</h2>
        {glance.grades.map((row) => (
          <div key={row.grade} className="fq-glance-grade" data-testid={`glance-grade-${row.grade}`}>
            <div><strong>Grade {row.grade}</strong><span>{row.started || row.mastered ? `${row.mastered} of ${row.total} skills mastered` : 'Not started yet'}</span></div>
            <span className="fq-glance-bar" role="img" aria-label={`Grade ${row.grade}: ${row.mastered} of ${row.total} skills mastered`}>
              <i className={row.mastered === row.total ? 'done' : ''} style={{ width: `${Math.round((row.mastered / row.total) * 100)}%` }} />
            </span>
          </div>
        ))}
        <p className="fq-glance-note">A skill is mastered when {childName ?? 'your child'} answers it correctly in Check-ins, not just in lessons.</p>
      </section>

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

      {glance.focus && (
        <section className="fq-glance-card fq-glance-focus" aria-labelledby="glance-focus" data-testid="glance-focus">
          <span className="fq-glance-eyebrow">Worth 5 minutes this week</span>
          <h2 id="glance-focus">{glance.focus.title}</h2>
          <p>{name} has had {glance.focus.misses} wrong {glance.focus.misses === 1 ? 'try' : 'tries'} in this {gradeTag(glance.focus)} lesson so far. The idea: <MathText text={glance.focus.idea} /></p>
          {glance.focus.homeActivity && <div className="fq-glance-home"><strong>Try at home</strong><p><MathText text={glance.focus.homeActivity} /></p></div>}
        </section>
      )}

      <section className="fq-glance-card" aria-labelledby="glance-share">
        <h2 id="glance-share">Share this week</h2>
        <p className="fq-glance-note">Send a short summary to a teacher or another grown-up. Nothing is shared unless you choose to.</p>
        <pre className="fq-glance-share-text" aria-label="Summary that will be shared" data-testid="glance-share-text">{shareText}</pre>
        <button className="fq-button" onClick={share} data-testid="button-share-week"><Share2 size={18} aria-hidden="true" /> Share summary</button>
        <p className="fq-glance-note" role="status">{shared === 'copied' ? 'Copied. Paste it into a message or email.' : shared === 'shared' ? 'Shared.' : shared === 'failed' ? 'Could not share on this device. Select the text above and copy it.' : ''}</p>
      </section>
    </div>
  );
}
