import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Bot, Check, Code2, Play, Plus, RotateCcw, Star, Trash2, X } from 'lucide-react';
import type { Mission } from './game';
import { MathText } from './MathText';
import { Confetti, Mascot, useFun } from './fun-ui';
import { playCue } from './lib/fun';
import { countBlocks, describe, getCodeLevels, matchesTarget, runProgram, toText, usesLoop, type Block, type CodeLevel, type RobotState, type RunResult } from './code-quest';

/* Code challenge: program a robot to build the lesson's fraction with blocks (or read it as Python). */

const LABEL: Record<Block['op'], string> = { split: 'split into', bars: 'use bars:', repeat: 'repeat', shade: 'shade', move: 'move right', jump: 'jump', pick: 'pick a group' };
const splitLabel = (kind: RobotState['kind']) => (kind === 'line' ? 'split each whole into' : kind === 'set' ? 'make equal groups:' : 'split each bar into');
const unitWord = (kind: RobotState['kind']) => (kind === 'line' ? 'spaces' : kind === 'set' ? '' : 'pieces');
const freshBlock = (op: Block['op'], kind: RobotState['kind']): Block =>
  op === 'repeat' ? { op, n: null, body: kind === 'line' ? [{ op: 'jump' }] : kind === 'set' ? [{ op: 'pick' }] : [{ op: 'shade' }, { op: 'move' }] }
    : op === 'split' || op === 'bars' ? { op, n: null } : { op } as Block;

function NumberSlot({ value, onChange, label, disabled }: { value: number | null; onChange: (n: number | null) => void; label: string; disabled?: boolean }) {
  return (
    <span className="fq-code-num">
      <button type="button" aria-label={`Less: ${label}`} disabled={disabled || !value} onClick={() => onChange(Math.max(0, (value ?? 1) - 1))}>−</button>
      <input inputMode="numeric" aria-label={label} value={value ?? ''} placeholder="?" disabled={disabled}
        onChange={(e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 3); onChange(digits === '' ? null : Number(digits)); }} data-testid={`code-input-${label.replace(/\W+/g, '-')}`} />
      <button type="button" aria-label={`More: ${label}`} disabled={disabled} onClick={() => onChange(Math.min(100, (value ?? 0) + 1))}>+</button>
    </span>
  );
}

function World({ state, target }: { state: RobotState | null; target: CodeLevel['target'] }) {
  const s = state ?? { kind: target.kind, parts: 0, wholes: target.kind === 'line' ? Math.max(1, Math.ceil(target.n / target.d)) : 1, cursor: 0, marked: [], total: target.total };
  if (s.kind === 'line') {
    const spaces = s.parts * s.wholes;
    return (
      <div className="fq-code-world line" role="img" aria-label={s.parts ? `Number line with ${spaces} spaces, robot at jump ${s.cursor}` : 'Number line from 0, not split yet'}>
        <div className="fq-code-line">
          <i className="axis" />
          {Array.from({ length: Math.max(spaces, 0) + 1 }, (_, k) => (
            <span key={k} className={`tick ${s.parts && k % s.parts === 0 ? 'whole' : ''}`} style={{ left: `${spaces ? (k / spaces) * 100 : 0}%` }}>{s.parts && k % s.parts === 0 ? k / s.parts : ''}</span>
          ))}
          {!s.parts && <span className="tick whole" style={{ left: '100%' }}>{s.wholes}</span>}
          <span className="fq-code-bot" style={{ left: `${spaces ? (s.cursor / spaces) * 100 : 0}%` }}><Bot size={22} /></span>
        </div>
      </div>
    );
  }
  if (s.kind === 'set') {
    const total = s.total ?? 12; const per = s.parts ? total / s.parts : total;
    return (
      <div className="fq-code-world set" role="img" aria-label={s.parts ? `${s.parts} groups, ${s.marked.length} picked` : `${total} dots, not grouped yet`}>
        {(s.parts ? Array.from({ length: s.parts }, (_, g) => g) : [0]).map((g) => (
          <span key={g} className={`fq-code-group ${s.marked.includes(g) ? 'on' : ''} ${s.parts && g === s.cursor ? 'here' : ''}`}>
            {Array.from({ length: per }, (_, k) => <i key={k} />)}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="fq-code-world bar" role="img" aria-label={s.parts ? `${s.wholes} bar(s) of ${s.parts} pieces, ${s.marked.length} shaded` : 'A whole bar, not split yet'}>
      {Array.from({ length: s.wholes }, (_, w) => (
        <div key={w} className="fq-code-bar" style={{ gridTemplateColumns: `repeat(${Math.max(1, s.parts)}, minmax(0, 1fr))` }}>
          {Array.from({ length: Math.max(1, s.parts) }, (_, p) => {
            const i = w * s.parts + p;
            return <span key={p} className={`${s.parts && s.marked.includes(i) ? 'on' : ''} ${s.parts && i === s.cursor ? 'here' : ''}`}>{s.parts && i === s.cursor && <Bot size={16} />}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

function Program({ blocks, kind, editable, reorder, active, onChange, prefix = [] }: {
  blocks: Block[]; kind: RobotState['kind']; editable: boolean; reorder: boolean; active: number[] | null; onChange: (blocks: Block[]) => void; prefix?: number[];
}) {
  const update = (i: number, next: Block | null) => { const copy = [...blocks]; if (next) copy[i] = next; else copy.splice(i, 1); onChange(copy); };
  const move = (i: number, by: number) => { const j = i + by; if (j < 0 || j >= blocks.length) return; const copy = [...blocks]; [copy[i], copy[j]] = [copy[j], copy[i]]; onChange(copy); };
  return (
    <ol className="fq-code-program">
      {blocks.map((b, i) => {
        const path = [...prefix, i];
        const isActive = !!active && active.length >= path.length && path.every((p, k) => active[k] === p) && (b.op !== 'repeat' || active.length === path.length);
        const label = b.op === 'split' ? splitLabel(kind) : LABEL[b.op];
        return (
          <li key={i} className={`fq-code-block op-${b.op} ${isActive ? 'active' : ''}`} data-testid={`code-block-${path.join('-')}`}>
            <div className="fq-code-block-row">
              <span className="fq-code-block-label">{label}</span>
              {'n' in b && <NumberSlot value={b.n} disabled={!editable} label={`${label} ${path.join('.')}`} onChange={(n) => update(i, { ...b, n } as Block)} />}
              {b.op === 'split' && <span className="fq-code-unit">{unitWord(kind)}</span>}
              {b.op === 'repeat' && <span className="fq-code-unit">times</span>}
              {reorder && prefix.length === 0 && (
                <span className="fq-code-tools">
                  <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={14} /></button>
                  <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><ArrowDown size={14} /></button>
                  <button type="button" aria-label="Remove block" onClick={() => update(i, null)}><Trash2 size={14} /></button>
                </span>
              )}
            </div>
            {b.op === 'repeat' && <Program blocks={b.body} kind={kind} editable={false} reorder={false} active={active} onChange={() => {}} prefix={path} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function CodeQuest({ mission, solved, onExit, onSolved }: { mission: Mission; solved: number; onExit: () => void; onSolved: (level: number) => void }) {
  const { fun } = useFun();
  const levels = useMemo(() => getCodeLevels(mission.id), [mission.id]);
  const [at, setAt] = useState(() => Math.min(solved, 2));
  const level = levels[at];
  const [program, setProgram] = useState<Block[]>(level.start);
  const [view, setView] = useState<'blocks' | 'text'>('blocks');
  const [result, setResult] = useState<RunResult | null>(null);
  const [frame, setFrame] = useState(-1);
  const [outcome, setOutcome] = useState<'win' | 'miss' | null>(null);
  const [burst, setBurst] = useState(0);
  const timer = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const kind = level.target.kind;

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  const stop = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } setRunning(false); };
  const goTo = (i: number) => { stop(); setAt(i); setProgram(levels[i].start); setResult(null); setFrame(-1); setOutcome(null); };
  const edit = (next: Block[]) => { stop(); setProgram(next); setResult(null); setFrame(-1); setOutcome(null); };

  const run = () => {
    stop();
    const r = runProgram(program, level.target);
    setResult(r); setOutcome(null); setFrame(0);
    const total = r.steps.length;
    const ms = Math.max(60, Math.min(320, 6000 / Math.max(1, total)));
    let k = 0;
    const finish = () => {
      const win = matchesTarget(r, level.target);
      setOutcome(win ? 'win' : 'miss'); playCue(win ? 'complete' : 'retry', fun.sound);
      if (win) { setBurst((b) => b + 1); if (level.level > solved) onSolved(level.level); }
    };
    if (!total) { finish(); return; }
    setRunning(true);
    timer.current = window.setInterval(() => {
      k += 1;
      if (k >= total) { stop(); setFrame(total - 1); finish(); return; }
      setFrame(k);
    }, ms);
  };

  const shown = result && frame >= 0 ? result.steps[Math.min(frame, result.steps.length - 1)] : null;
  const loopStar = level.mode === 'build' && outcome === 'win' && usesLoop(program);

  return (
    <div className="fq-app">
      <Confetti burst={burst} />
      <main className="fq-shell fq-code fq-appear" data-testid="code-quest">
        <button className="fq-back" onClick={onExit} data-testid="button-code-exit"><ArrowLeft size={17} /> Back to the map</button>
        <header className="fq-code-head">
          <span className="fq-code-badge"><Code2 size={16} /> Code challenge</span>
          <h1>{mission.title}</h1>
          <div className="fq-code-levels" role="tablist" aria-label="Levels">
            {levels.map((l, i) => (
              <button key={l.level} role="tab" aria-selected={i === at} className={i === at ? 'on' : ''} onClick={() => goTo(i)} disabled={i > solved} data-testid={`button-code-level-${l.level}`}>
                {solved >= l.level ? <Check size={14} /> : null} Level {l.level}
              </button>
            ))}
          </div>
        </header>

        <section className="fq-code-goal">
          <p className="fq-code-level-title">Level {level.level} · {level.title}</p>
          <h2><MathText text={level.goal} /></h2>
          <p className="fq-code-tip"><MathText text={level.tip} /></p>
        </section>

        <section className="fq-code-stage" aria-live="polite">
          <World state={shown?.state ?? null} target={level.target} />
          {shown?.note && <p className="fq-code-error" role="alert" data-testid="text-code-error">{shown.note}</p>}
        </section>

        <section className="fq-code-editor">
          <div className="fq-code-editor-head">
            <strong>Program</strong>
            <span className="fq-code-view" role="group" aria-label="How to show the program">
              <button type="button" className={view === 'blocks' ? 'on' : ''} onClick={() => setView('blocks')}>Blocks</button>
              <button type="button" className={view === 'text' ? 'on' : ''} onClick={() => setView('text')} data-testid="button-code-text">Python</button>
            </span>
          </div>
          {view === 'blocks' ? (
            program.length ? <Program blocks={program} kind={kind} editable reorder={level.mode !== 'fill'} active={shown?.path ?? null} onChange={edit} />
              : <p className="fq-code-empty">Tap the blocks below to build your program.</p>
          ) : <pre className="fq-code-text" data-testid="code-text">{toText(program, kind) || '# empty program'}</pre>}
          {level.palette.length > 0 && (
            <div className="fq-code-palette" aria-label="Blocks you can add">
              {level.palette.map((op) => (
                <button key={op} type="button" className={`fq-code-chip op-${op}`} disabled={countBlocks(program) >= 24} onClick={() => edit([...program, freshBlock(op, kind)])} data-testid={`button-code-add-${op}`}>
                  <Plus size={14} /> {op === 'split' ? splitLabel(kind) : op === 'repeat' ? `repeat ▢ { ${kind === 'line' ? 'jump' : kind === 'set' ? 'pick' : 'shade, move'} }` : LABEL[op]}
                </button>
              ))}
              {program.length > 0 && <button type="button" className="fq-code-chip clear" onClick={() => edit(level.mode === 'debug' ? level.start : [])}><X size={14} /> {level.mode === 'debug' ? 'Undo my changes' : 'Clear'}</button>}
            </div>
          )}
          <div className="fq-code-run">
            <button type="button" className="fq-button" onClick={run} disabled={!program.length || running} data-testid="button-code-run"><Play size={17} /> Run</button>
            <button type="button" className="fq-button ghost" onClick={() => { stop(); setResult(null); setFrame(-1); setOutcome(null); }}><RotateCcw size={16} /> Reset robot</button>
          </div>
        </section>

        {outcome && result && (
          <section className={`fq-code-result ${outcome}`} role="status" data-testid="code-result">
            <Mascot mood={outcome === 'win' ? 'cheer' : 'oops'} size={56} />
            <div>
              <strong>{outcome === 'win' ? 'It works!' : result.error ? 'Bug found!' : 'Not quite.'}</strong>
              <p><MathText text={result.error ?? describe(result)} /> {outcome === 'miss' && !result.error && <MathText text={`The goal is ${level.target.n}/${level.target.d}.`} />}</p>
              {loopStar && <p className="fq-code-star"><Star size={15} fill="currentColor" /> Bonus star: you used a loop!</p>}
              {outcome === 'win' && level.mode === 'build' && !usesLoop(program) && <p className="fq-code-note">Try again with a repeat loop: it's how coders avoid writing the same block again and again.</p>}
              {outcome === 'win' && at < 2 && <button type="button" className="fq-button" onClick={() => goTo(at + 1)} data-testid="button-code-next">Next level</button>}
              {outcome === 'win' && at === 2 && <p className="fq-code-note">All 3 levels done. You're a fraction coder!</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

