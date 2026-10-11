import { getMission } from './game';
import { guideForUnit } from './teaching-guide-data';
import './lesson-teaching-support.css';

export function LessonTeachingSupport({ missionId }: { missionId: string }) {
  const mission = getMission(missionId);
  const guide = guideForUnit(mission.unit);
  if (!guide) return null;

  return (
    <section className="fq-lesson-support" aria-label="Warm-up and thinking prompts" data-testid="lesson-teaching-support">
      <details>
        <summary>Warm up, use key words, and explain your thinking</summary>
        <div className="fq-lesson-support-content">
          <article>
            <h3>Quick warm-up</h3>
            <p>{guide.warmup.prompt}</p>
            <details className="fq-lesson-support-reveal">
              <summary>Show one way to think about it</summary>
              <p>{guide.warmup.reveal}</p>
            </details>
          </article>

          <article>
            <h3>Words to know</h3>
            <div className="fq-lesson-vocabulary">
              {guide.vocabulary.map(({ term, meaning }) => (
                <details key={term}>
                  <summary>{term}</summary>
                  <p>{meaning}</p>
                </details>
              ))}
            </div>
          </article>

          <article>
            <h3>Explain your thinking</h3>
            <p>{guide.explainFrame}</p>
            <p className="fq-lesson-support-note">Try saying it to someone or writing it on paper. Your response is not recorded.</p>
          </article>

          <article>
            <h3>Be the teacher</h3>
            <p>{guide.errorAnalysis.claim}</p>
            <details className="fq-lesson-support-reveal">
              <summary>Reveal a way to fix the idea</summary>
              <p>{guide.errorAnalysis.correction}</p>
            </details>
          </article>

          <article>
            <h3>Stretch your thinking</h3>
            <p>{guide.enrichment}</p>
          </article>
        </div>
      </details>
    </section>
  );
}
