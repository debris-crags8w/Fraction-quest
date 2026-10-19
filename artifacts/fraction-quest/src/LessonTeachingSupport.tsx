import { getMission } from './game';
import { LearningListenButton, LearningText } from './LearningText';
import { supportSpeech } from './lab-copy';
import { guideForUnit } from './teaching-guide-data';
import './lesson-teaching-support.css';

export function LessonTeachingSupport({ missionId }: { missionId: string }) {
  const mission = getMission(missionId);
  const guide = guideForUnit(mission.unit);
  if (!guide) return null;
  const speech = supportSpeech(guide, mission);

  return (
    <section className="fq-lesson-support" aria-label="Warm-up and thinking prompts" data-testid="lesson-teaching-support">
      <details>
        <summary>Warm up, use key words, and explain your thinking</summary>
        <div className="fq-lesson-support-content">
          <article>
            <header className="fq-lesson-support-head">
              <h3>Quick warm-up</h3>
              <LearningListenButton text={speech.warmup} label="Listen to the warm-up" />
            </header>
            <p><LearningText text={guide.warmup.prompt} interactiveTerms={false} /></p>
            <details className="fq-lesson-support-reveal">
              <summary>Show one way to think about it</summary>
              <p><LearningText text={guide.warmup.reveal} interactiveTerms={false} /></p>
            </details>
          </article>

          <article>
            <header className="fq-lesson-support-head">
              <h3>Words to know</h3>
              <LearningListenButton text={speech.words} label="Listen to the words to know" />
            </header>
            <div className="fq-lesson-vocabulary">
              {guide.vocabulary.map(({ term, meaning }) => (
                <details key={term}>
                  <summary>{term}</summary>
                  <p><LearningText text={meaning} interactiveTerms={false} /></p>
                </details>
              ))}
            </div>
          </article>

          <article>
            <header className="fq-lesson-support-head">
              <h3>Explain your thinking</h3>
              <LearningListenButton text={speech.explain} label="Listen to explain your thinking" />
            </header>
            <p><LearningText text={mission.explainPrompt ?? guide.explainFrame} interactiveTerms={false} /></p>
            <p className="fq-lesson-support-note">Try saying it to someone or writing it on paper. Your response is not recorded.</p>
          </article>

          <article>
            <header className="fq-lesson-support-head">
              <h3>Be the teacher</h3>
              <LearningListenButton text={speech.teacher} label="Listen to be the teacher" />
            </header>
            <p><LearningText text={guide.errorAnalysis.claim} interactiveTerms={false} /></p>
            <details className="fq-lesson-support-reveal">
              <summary>Reveal a way to fix the idea</summary>
              <p><LearningText text={guide.errorAnalysis.correction} interactiveTerms={false} /></p>
            </details>
          </article>

          <article>
            <header className="fq-lesson-support-head">
              <h3>Stretch your thinking</h3>
              <LearningListenButton text={speech.stretch} label="Listen to stretch your thinking" />
            </header>
            <p><LearningText text={guide.enrichment} interactiveTerms={false} /></p>
          </article>
        </div>
      </details>
    </section>
  );
}
