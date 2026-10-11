import type { LearningModel } from './learning-content';
import { getBuildChecks, getReviewCheck } from './learning-content';
import { numberLineWholeCount } from './game';

/* Code challenge: a tiny block language for a robot that builds fractions.
   Kept free of React so the interpreter and levels can be tested. */

export type ModelKind = LearningModel['kind'];
/** Blocks. `repeat` runs its body N times. Numbers start blank (null) when the child must fill them in. */
export type Block =
  | { op: 'split'; n: number | null }   // bar: pieces per bar · line: spaces per whole · set: equal groups
  | { op: 'bars'; n: number | null }    // bar only: how many whole bars
  | { op: 'repeat'; n: number | null; body: Block[] }
  | { op: 'shade' } | { op: 'move' }    // bar
  | { op: 'jump' }                      // line
  | { op: 'pick' };                     // set: pick the next group

export type RobotState = { kind: ModelKind; parts: number; wholes: number; cursor: number; marked: number[]; total?: number };
export type Step = { path: number[]; state: RobotState; note?: string };
export type RunResult = { steps: Step[]; final: RobotState; error?: string };
export type Target = { kind: ModelKind; n: number; d: number; wholes: number; total?: number };

const MAX_STEPS = 400;
const LIMIT = 100;

/** Run a program. `path` is the block's position (e.g. [2, 0] = first block inside the third block). */
export function runProgram(program: Block[], target: Target): RunResult {
  const state: RobotState = { kind: target.kind, parts: 0, wholes: target.kind === 'line' ? numberLineWholeCount(target.n, target.d) : 1, cursor: 0, marked: [], total: target.total };
  const steps: Step[] = [];
  let error: string | undefined;
  const snap = (path: number[], note?: string) => steps.push({ path, state: { ...state, marked: [...state.marked] }, note });
  const pieces = () => state.parts * (state.kind === 'set' ? 1 : state.wholes);

  const exec = (blocks: Block[], prefix: number[]) => {
    for (let i = 0; i < blocks.length && !error; i++) {
      const block = blocks[i]; const path = [...prefix, i];
      if (steps.length > MAX_STEPS) { error = 'The robot got tired. Is a loop too big?'; return; }
      if ('n' in block && (block.n === null || !Number.isInteger(block.n) || block.n < 0 || block.n > LIMIT)) { error = 'A block is missing a number.'; snap(path, error); return; }
      switch (block.op) {
        case 'split':
          if (block.n! < 1) { error = 'You cannot split into 0 parts.'; break; }
          if (state.kind === 'set' && state.total && state.total % block.n! !== 0) { error = `${state.total} dots can't make ${block.n} equal groups.`; break; }
          state.parts = block.n!; state.cursor = 0; state.marked = [];
          snap(path); break;
        case 'bars':
          if (state.kind !== 'bar') { error = 'Only bars can be added.'; break; }
          if (block.n! < 1 || block.n! > 3) { error = 'Use 1, 2 or 3 bars.'; break; }
          state.wholes = block.n!; snap(path); break;
        case 'repeat':
          for (let k = 0; k < block.n! && !error; k++) exec(block.body, path);
          break;
        case 'shade':
          if (!state.parts) { error = 'Split the bar first!'; break; }
          if (state.cursor >= pieces()) { error = 'The robot ran off the end of the bar!'; break; }
          if (!state.marked.includes(state.cursor)) state.marked.push(state.cursor);
          snap(path); break;
        case 'move':
          if (!state.parts) { error = 'Split the bar first!'; break; }
          state.cursor += 1; snap(path); break;
        case 'jump':
          if (!state.parts) { error = 'Split the line into spaces first!'; break; }
          if (state.cursor >= state.parts * state.wholes) { error = 'The robot jumped off the end of the line!'; break; }
          state.cursor += 1; state.marked = [state.cursor]; snap(path); break;
        case 'pick':
          if (!state.parts) { error = 'Make the groups first!'; break; }
          if (state.cursor >= state.parts) { error = 'There are no more groups to pick!'; break; }
          state.marked.push(state.cursor); state.cursor += 1; snap(path); break;
      }
      if (error && steps[steps.length - 1]?.note !== error) snap(path, error);
    }
  };
  exec(program, []);
  return { steps, final: { ...state, marked: [...state.marked] }, error };
}

/** Did the robot build exactly the target fraction? */
export function matchesTarget(result: RunResult, target: Target): boolean {
  if (result.error) return false;
  const s = result.final;
  if (s.parts !== target.d) return false;
  if (target.kind === 'bar') return s.wholes === target.wholes && s.marked.length === target.n;
  if (target.kind === 'line') return s.cursor === target.n;
  return s.marked.length === target.n;
}

/** What the robot made, in words and as a fraction (for feedback). */
export function describe(result: RunResult): string {
  const s = result.final;
  if (!s.parts) return 'Nothing yet.';
  if (s.kind === 'line') return `It jumped ${s.cursor} of ${s.parts} spaces: ${s.cursor}/${s.parts}.`;
  if (s.kind === 'set') return `It picked ${s.marked.length} of ${s.parts} groups: ${s.marked.length}/${s.parts}.`;
  return `It shaded ${s.marked.length} pieces, ${s.parts} in each bar: ${s.marked.length}/${s.parts}.`;
}

export const countBlocks = (program: Block[]): number => program.reduce((sum, b) => sum + 1 + (b.op === 'repeat' ? countBlocks(b.body) : 0), 0);
export const usesLoop = (program: Block[]) => program.some((b) => b.op === 'repeat');

/** Python-style text for the same program, for kids who want to see "real" code. */
export function toText(program: Block[], kind: ModelKind, indent = ''): string {
  const thing = kind === 'line' ? 'line' : kind === 'set' ? 'dots' : 'bar';
  return program.map((b) => {
    const n = 'n' in b ? (b.n ?? '?') : '';
    switch (b.op) {
      case 'split': return `${indent}${thing}.split(${n})`;
      case 'bars': return `${indent}bar.wholes(${n})`;
      case 'repeat': return `${indent}for i in range(${n}):\n${b.body.length ? toText(b.body, kind, indent + '    ') : `${indent}    pass`}`;
      case 'shade': return `${indent}robot.shade()`;
      case 'move': return `${indent}robot.move()`;
      case 'jump': return `${indent}robot.jump()`;
      case 'pick': return `${indent}robot.pick_group()`;
    }
  }).join('\n');
}

export type CodeLevel = { level: 1 | 2 | 3; title: string; goal: string; target: Target; start: Block[]; palette: Block['op'][]; mode: 'fill' | 'build' | 'debug'; tip: string };

const action = (kind: ModelKind): Block[] => (kind === 'line' ? [{ op: 'jump' }] : kind === 'set' ? [{ op: 'pick' }] : [{ op: 'shade' }, { op: 'move' }]);
/** A correct program for a target (used for the starting templates and in tests). */
export function solution(t: Target, blanks = false): Block[] {
  const v = (n: number) => (blanks ? null : n);
  return [
    { op: 'split', n: v(t.d) },
    ...(t.kind === 'bar' && t.wholes > 1 ? [{ op: 'bars', n: v(t.wholes) } as Block] : []),
    { op: 'repeat', n: v(t.n), body: action(t.kind) },
  ];
}
const toTarget = (m: LearningModel): Target => ({ kind: m.kind, n: m.n, d: m.d, wholes: m.wholes, total: m.total });
const fractionName = (t: Target) => `${t.n}/${t.d}`;
const goalText = (t: Target) => t.kind === 'line'
  ? `Make the robot land on ${fractionName(t)} on the number line.`
  : t.kind === 'set' ? `Make the robot pick ${fractionName(t)} of the ${t.total} dots.` : `Make the robot shade ${fractionName(t)}${t.wholes > 1 ? ' (more than 1 whole bar)' : ''}.`;

/** Three levels per lesson, built from the lesson's own fractions. */
export function getCodeLevels(missionId: string): CodeLevel[] {
  const [build, transfer] = getBuildChecks(missionId);
  const t1 = toTarget(build.target); const t2 = toTarget(transfer.target);
  let t3 = toTarget(getReviewCheck(missionId, 1).target);
  if (t3.n === t2.n && t3.d === t2.d) t3 = toTarget(getReviewCheck(missionId, 2).target);
  const palette = (t: Target): Block['op'][] => ['split', ...(t.kind === 'bar' && t.wholes > 1 ? ['bars' as const] : []), 'repeat', ...action(t.kind).map((b) => b.op)];
  // The bug: the loop runs the bottom number of times instead of the top (a classic fraction mix-up),
  // or for a unit fraction, the bar is split into the wrong number of pieces.
  const bug = solution(t3).map((b): Block => {
    if (b.op === 'repeat' && t3.n !== t3.d && t3.n > 1) return { ...b, n: Math.min(t3.d, LIMIT) };
    if (b.op === 'split' && (t3.n === 1 || t3.n === t3.d)) return { ...b, n: t3.d + 1 };
    return b;
  });
  return [
    { level: 1, mode: 'fill', title: 'Fill in the numbers', goal: goalText(t1), target: t1, start: solution(t1, true), palette: [],
      tip: t1.kind === 'line' ? 'Split: spaces in 1 whole (the bottom number). Repeat: how many jumps (the top number).' : t1.kind === 'set' ? 'Split: how many equal groups (the bottom number). Repeat: how many to pick (the top number).' : 'Split: pieces in 1 bar (the bottom number). Repeat: how many to shade (the top number).' },
    { level: 2, mode: 'build', title: 'Build the program', goal: goalText(t2), target: t2, start: [], palette: palette(t2),
      tip: 'Tap blocks to add them. Split first. A repeat loop saves lots of blocks!' },
    { level: 3, mode: 'debug', title: 'Fix the bug', goal: goalText(t3), target: t3, start: bug, palette: palette(t3),
      tip: 'Run it and watch what goes wrong. Then change one number.' },
  ];
}
