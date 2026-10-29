import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Check } from 'lucide-react';
import { MathText } from './MathText';
import type { GrownUpPick } from './game';
import type { HomeIdea, MonthView, PracticeTip, SkillRow, SkillStep } from './parent-report';

/* The grown-ups' report: skills by standard, what to practice, and the last 4 weeks.
   Everything is read from saved progress. Only "Practice now" and "Add a Check-in" change anything: they put a card on the child's map. */

const STEP_NAME: Record<SkillStep, string> = { 0: 'Not started', 1: 'Learning', 2: 'Practiced in lessons', 3: 'Mastered in Check-ins' };
const SHOWN = 5;
/** "lesson 5", "lessons 5 and 6", "lessons 4, 5 and 9". */
const lessonList = (numbers: number[]) => numbers.length === 1 ? `lesson ${numbers[0]}`
  : `lessons ${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;

type Pick = (kind: GrownUpPick['kind'], id: string) => void;
const picked = (picks: GrownUpPick[], kind: GrownUpPick['kind'], id: string) => picks.some((pick) => pick.kind === kind && pick.id === id);

function stateLine(skill: SkillRow): string {
  const { mastery, nextLesson } = skill;
  if (skill.step === 3) return `Mastered · ${mastery.correct} of ${mastery.attempted} right over ${mastery.assessmentCount} Check-ins`;
  if (skill.step === 2) return 'Practiced in lessons · next: a Check-in';
  if (!nextLesson) return STEP_NAME[skill.step];
  if (skill.step === 1) return nextLesson.started ? `Learning · lesson ${nextLesson.number} in progress` : `Learning · next: lesson ${nextLesson.number}`;
  return `Not started · lesson ${nextLesson.number}`;
}

function lessonState(lesson: SkillRow['lessons'][number]) {
  if (lesson.status === 'done') return <span className="fq-skill-ok">Done{lesson.firstTry !== null ? ` · ${lesson.firstTry}% first try` : ''}</span>;
  if (lesson.status === 'started') return <span className="fq-skill-mid">In progress</span>;
  return <span className="fq-skill-no">{lesson.status === 'skipped' ? 'Skipped by quiz' : 'Not yet'}</span>;
}

function SkillList({ skills, name, picks, onPick }: { skills: SkillRow[]; name: string; picks: GrownUpPick[]; onPick: Pick }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="fq-skills">
      {skills.map((skill) => {
        const isOpen = open === skill.standard;
        const onMap = picked(picks, 'checkin', skill.checkinId);
        return (
          <li key={skill.standard} className={`fq-skill${isOpen ? ' is-open' : ''}`} data-testid={`parent-skill-${skill.standard}`} data-step={skill.step}>
            <button type="button" className="fq-skill-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : skill.standard)}>
              <span className="fq-skill-words"><strong><MathText text={skill.canDo} /></strong><small>{skill.standard}</small></span>
              <span className={`fq-skill-steps s${skill.step}`} role="img" aria-label={`${STEP_NAME[skill.step]}${skill.step ? `, step ${skill.step} of 3` : ''}`}><i /><i /><i /></span>
              <span className={`fq-skill-state s${skill.step}`}>{stateLine(skill)}</span>
            </button>
            {isOpen && (
              <div className="fq-skill-detail">
                <ul className="fq-skill-lessons">
                  {skill.lessons.map((lesson) => <li key={lesson.id}><b>{lesson.number}. {lesson.title}</b>{lessonState(lesson)}</li>)}
                </ul>
                {skill.step === 3 && <p className="fq-glance-note">{name} showed this in Check-ins on two different days, so it has stuck.</p>}
                {skill.step === 2 && <>
                  <p className="fq-glance-note">Lessons show {name} can do this with the pictures. A Check-in on two different days proves it sticks.</p>
                  <button type="button" className="fq-button" disabled={onMap} onClick={() => onPick('checkin', skill.checkinId)} data-testid={`button-pick-checkin-${skill.standard}`}>
                    {onMap ? <><Check size={18} aria-hidden="true" /> On {name}’s map</> : `Add a Check-in to ${name}’s map`}
                  </button>
                </>}
                {skill.step < 2 && skill.nextLesson && <p className="fq-glance-note">Next: lesson {skill.nextLesson.number}, {skill.nextLesson.title}.</p>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Furthest along first, so the skills in progress are in the first few; then in lesson order. */
const byStep = (skills: SkillRow[]) => [...skills].sort((a, b) => b.step - a.step || (a.lessons[0]?.number ?? 0) - (b.lessons[0]?.number ?? 0));

const gradeLine = (skills: SkillRow[]) => {
  const mastered = skills.filter((skill) => skill.step === 3).length;
  return skills.some((skill) => skill.step > 0) ? `${mastered} of ${skills.length} mastered` : `Not started · ${skills.length} skills`;
};

export function SkillsCard({ skills, grade, childName, picks, onPick }: { skills: SkillRow[]; grade: 3 | 4 | 5; childName: string | null; picks: GrownUpPick[]; onPick: Pick }) {
  const name = childName ?? 'your child';
  const [all, setAll] = useState(false);
  // A printout lists every skill, not just the first few: open the list for printing and put it back afterwards.
  const allNow = useRef(all); allNow.current = all;
  const restore = useRef<boolean | null>(null);
  useEffect(() => {
    const open = () => { restore.current = allNow.current; flushSync(() => setAll(true)); };
    const close = () => { if (restore.current !== null) { setAll(restore.current); restore.current = null; } };
    window.addEventListener('beforeprint', open); window.addEventListener('afterprint', close);
    return () => { window.removeEventListener('beforeprint', open); window.removeEventListener('afterprint', close); };
  }, []);
  const mine = byStep(skills.filter((skill) => skill.grade === grade));
  return (
    <>
      <section className="fq-glance-card" aria-labelledby="skills-title" data-testid="parent-skills">
        <div className="fq-skills-head"><h2 id="skills-title">Grade {grade} skills</h2><small>{gradeLine(mine)}</small></div>
        <p className="fq-skills-key" aria-hidden="true"><span><i className="s1" />Learning</span><span><i className="s2" />Practiced in lessons</span><span><i className="s3" />Mastered in Check-ins</span></p>
        <SkillList skills={all ? mine : mine.slice(0, SHOWN)} name={name} picks={picks} onPick={onPick} />
        {mine.length > SHOWN && <button type="button" className="fq-link-button" onClick={() => setAll(!all)} data-testid="button-skills-all">
          {all ? 'Show fewer' : `Show all ${mine.length}`}</button>}
        <p className="fq-glance-note">Only Check-ins can mark a skill mastered: 80% right, with model-and-answer items from two Check-ins at least a day apart.</p>
      </section>
      {([3, 4, 5] as const).filter((other) => other !== grade).map((other) => {
        const rows = byStep(skills.filter((skill) => skill.grade === other));
        return (
          <details key={other} className="fq-skills-other" data-testid={`parent-skills-grade-${other}`}>
            <summary><span>Grade {other} skills</span><small>{gradeLine(rows)}</small></summary>
            <SkillList skills={rows} name={name} picks={picks} onPick={onPick} />
          </details>
        );
      })}
    </>
  );
}

export function PracticeCard({ tips, homeIdea, strengths, childName, picks, onPick, onShowLesson }: {
  tips: PracticeTip[]; homeIdea: HomeIdea | null; strengths: string[]; childName: string | null; picks: GrownUpPick[]; onPick: Pick; onShowLesson: (missionId: string) => void;
}) {
  const name = childName ?? 'your child';
  return (
    <>
      <section className="fq-glance-card" aria-labelledby="practice-title" data-testid="parent-practice">
        <h2 id="practice-title">What to practice</h2>
        {tips.length === 0 && <p>No wrong tries yet. When there are some, they show up here, grouped by idea.</p>}
        {tips.length === 0 && homeIdea && (
          <div className="fq-glance-home" data-testid="parent-home-idea"><strong>Try this at home</strong>
            <p className="fq-glance-note">{homeIdea.why === 'next' ? 'Next up' : 'Worth another look'}: lesson {homeIdea.lessonNumber}, {homeIdea.lessonTitle} · {homeIdea.heading}</p>
            <p><MathText text={homeIdea.home} /></p></div>
        )}
        <ol className="fq-tips">
          {tips.map((tip, index) => {
            const onMap = picked(picks, 'practice', tip.missionId);
            return (
              <li key={tip.idea} className="fq-tip" data-testid={`parent-tip-${index}`}>
                <div className="fq-tip-head"><span className="fq-tip-num" aria-hidden="true">{index + 1}</span>
                  <p><strong><MathText text={tip.idea} /></strong>
                    <small>{tip.count} wrong {tip.count === 1 ? 'try' : 'tries'}{tip.inRedos ? ` (${tip.inRedos} in redos)` : ''} in {lessonList(tip.lessonNumbers)}{tip.standards.length ? ` · ${tip.standards.join(', ')}` : ''}</small></p>
                </div>
                <div className="fq-glance-home"><strong>Try this at home</strong><p><MathText text={tip.home} /></p></div>
                <div className="fq-tip-actions">
                  <button type="button" className="fq-button" disabled={onMap} onClick={() => onPick('practice', tip.missionId)} data-testid={`button-pick-practice-${index}`}>
                    {onMap ? <><Check size={18} aria-hidden="true" /> On {name}’s map</> : 'Practice now'}
                  </button>
                  <button type="button" className="fq-button secondary" onClick={() => onShowLesson(tip.missionId)}>Show the lesson</button>
                </div>
              </li>
            );
          })}
        </ol>
        {tips.length > 0 && <p className="fq-glance-note">“Practice now” puts 5 new questions from that lesson on {name}’s map.</p>}
      </section>
      <section className="fq-glance-card" aria-labelledby="strengths-title" data-testid="parent-strengths">
        <h2 id="strengths-title">Going well</h2>
        {strengths.length ? <><p className="fq-glance-note">Finished without hints and mostly right the first time.</p>
          <ul className="fq-skill-lessons">{strengths.map((title) => <li key={title}><b>{title}</b><span className="fq-skill-ok"><Check size={16} aria-hidden="true" /></span></li>)}</ul></>
          : <p>Finish a lesson without hints to see strengths here.</p>}
      </section>
    </>
  );
}

export function MonthCard({ month }: { month: MonthView }) {
  const top = Math.max(4, Math.ceil(Math.max(...month.weeks.map((week) => week.lessons)) / 2) * 2);
  const base = 104; const height = 84;
  const y = (value: number) => base - (value / top) * height;
  return (
    <section className="fq-glance-card" aria-labelledby="month-title" data-testid="parent-month">
      <h2 id="month-title">The last 4 weeks</h2>
      <svg className="fq-month-chart" viewBox="0 0 300 150" role="img" aria-label={`Lessons finished each week: ${month.weeks.map((week) => `${week.label} ${week.lessons}`).join(', ')}`}>
        {[0, top / 2, top].map((tick) => <g key={tick}><line className="grid" x1="30" x2="296" y1={y(tick)} y2={y(tick)} /><text x="22" y={y(tick) + 4} textAnchor="end">{tick}</text></g>)}
        {month.weeks.map((week, index) => {
          const x = 45 + index * 65;
          return (
            <g key={week.start}>
              {week.lessons > 0 && <rect className={index === 3 ? 'bar now' : 'bar'} x={x} y={y(week.lessons)} width="44" height={base - y(week.lessons)} rx="6" />}
              <text className="val" x={x + 22} y={y(week.lessons) - 6} textAnchor="middle">{week.lessons}</text>
              <text x={x + 22} y="124" textAnchor="middle">{week.label}</text>
            </g>
          );
        })}
        <text x="163" y="144" textAnchor="middle">Lessons finished each week</text>
      </svg>
      <div className="fq-month-facts">
        <div><strong>{month.lessonsFinished}</strong><span>{month.lessonsFinished === 1 ? 'lesson' : 'lessons'} finished</span></div>
        <div><strong>{month.skillsGained ? `+${month.skillsGained}` : '0'}</strong><span>skills mastered</span></div>
        <div data-testid="parent-month-first-try">{month.firstTry
          ? <><strong>{month.firstTry.first}→{month.firstTry.latest}%</strong><span>right the first time, earliest week to latest</span></>
          : <><strong>—</strong><span>right the first time: shown after two weeks of lessons</span></>}</div>
      </div>
    </section>
  );
}
