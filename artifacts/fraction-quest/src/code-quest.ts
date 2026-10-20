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
export const CODE_LEVEL_COUNT = 6;

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
  if (s.kind === 'line') return `It made ${s.cursor} ${s.cursor === 1 ? 'jump' : 'jumps'} of 1/${s.parts}: ${s.cursor}/${s.parts}.`;
  if (s.kind === 'set') return `It picked ${s.marked.length} of ${s.parts} groups: ${s.marked.length}/${s.parts}.`;
  return `It shaded ${s.marked.length} pieces, ${s.parts} in each bar: ${s.marked.length}/${s.parts}.`;
}

/** A single next-step hint based on the model the learner actually built. Never returns a solution. */
export function getRunHint(result: RunResult, target: Target, program: Block[], requiresLoop = false): string {
  const state = result.final;
  if (result.error) {
    if (result.error.includes('missing a number')) return 'One number block is blank. Fill it in, then run the robot again.';
    if (/split .* first|make the groups first/i.test(result.error)) return 'The robot tried to mark the model before it was split. Move the split block before the action.';
    if (result.error.includes("can't make") && state.kind === 'set') return 'Those groups are not equal yet. Change the split block so every dot fits evenly.';
    if (result.error.includes('end of the line')) return 'The robot reached the end of the line. Check the split and jump blocks.';
    if (result.error.includes('end of the bar')) return 'The robot reached the end of the bar. Check the split and movement inside the loop.';
    if (result.error.includes('no more groups')) return 'The robot ran out of groups to pick. Check the split and repeat blocks.';
    return 'Look at the block where the robot stopped, then change one number or instruction.';
  }

  if (!state.parts) {
    return target.kind === 'line' ? 'Your number line is still one whole. Add a split block before the jumps.'
      : target.kind === 'set' ? 'Your dots are still ungrouped. Add a split block before picking groups.'
        : 'Your bar is still one whole. Add a split block before shading.';
  }
  if (state.parts !== target.d) {
    return `Your ${state.kind === 'line' ? 'line' : state.kind === 'set' ? 'dots' : 'bar'} is split into ${state.parts} equal parts. Check the split block.`;
  }

  if (state.kind === 'bar') {
    if (state.wholes !== target.wholes) return `Your model has ${state.wholes} whole bar${state.wholes === 1 ? '' : 's'}. Check the bars block.`;
    if (state.marked.length !== target.n) {
      const repeatSkipsMovement = (blocks: Block[]): boolean => blocks.some((block) => {
        if (block.op !== 'repeat') return false;
        const shadesWithoutMoving = block.n !== null && block.n > 1
          && block.body.some((child) => child.op === 'shade')
          && !block.body.some((child) => child.op === 'move');
        return shadesWithoutMoving || repeatSkipsMovement(block.body);
      });
      if (state.marked.length < target.n && repeatSkipsMovement(program)) {
        return 'The loop shades the same piece each time. Put a move block inside the loop too.';
      }
      return `Your bar has ${state.marked.length} shaded pieces. Check the repeat count or shade blocks.`;
    }
  } else if (state.kind === 'line' && state.cursor !== target.n) {
    return `The robot lands after ${state.cursor} ${state.cursor === 1 ? 'jump' : 'jumps'}. Check the repeat count or jump blocks.`;
  } else if (state.kind === 'set' && state.marked.length !== target.n) {
    return `Your model has ${state.marked.length} picked groups. Check the repeat count or pick blocks.`;
  }
  if (requiresLoop && matchesTarget(result, target) && !usesEffectiveLoop(program)) {
    return 'The model matches. Put the repeated actions in a repeat block.';
  }
  return 'Compare the blocks with the model, then change one instruction and try again.';
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

export type CodeLevel = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  goal: string;
  target: Target;
  start: Block[];
  palette: Block['op'][];
  mode: 'fill' | 'build' | 'debug' | 'predict';
  tip: string;
  requiresLoop?: boolean;
  transferFrom?: Target;
};

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
  : t.kind === 'set' ? `Make the robot pick ${fractionName(t)} of the ${t.total} dots.` : `Make the robot shade ${fractionName(t)}${t.wholes > 1 ? ' (more than one whole bar)' : ''}.`;

const LEVELS_CACHE = new Map<string, CodeLevel[]>();
/** Six levels per lesson, built from the lesson's own fractions and current block vocabulary (built once per lesson). */
export function getCodeLevels(missionId: string): CodeLevel[] {
  const cached = LEVELS_CACHE.get(missionId);
  if (cached) return cached;
  const levels = buildCodeLevels(missionId);
  LEVELS_CACHE.set(missionId, levels);
  return levels;
}

function buildCodeLevels(missionId: string): CodeLevel[] {
  const [build, transfer] = getBuildChecks(missionId);
  const t1 = toTarget(build.target); const t2 = toTarget(transfer.target);
  let t3 = toTarget(getReviewCheck(missionId, 1).target);
  if (t3.n === t2.n && t3.d === t2.d) t3 = toTarget(getReviewCheck(missionId, 2).target);
  const targets = sprintTargets(missionId);
  const foundation = [t1, t2, t3];
  const newTargets = targets.filter((target) => !foundation.some((used) => sameTarget(target, used)));
  const t4 = newTargets[0] ?? t2;
  const t5 = newTargets[1] ?? t3;
  const loopSeed = targets.find((target) => target.n >= 1 && target.n <= target.d && target.d <= 50)
    ?? targets.find((target) => target.n >= 1 && target.n <= target.d)
    ?? t2;
  const transferFrom = loopSeed.n === 1 && loopSeed.d <= 50
    ? { ...loopSeed, n: 2, d: loopSeed.d * 2 }
    : loopSeed;
  const t6 = transferToDifferentModel(transferFrom);
  const palette = (t: Target): Block['op'][] => ['split', ...(t.kind === 'bar' && t.wholes > 1 ? ['bars' as const] : []), 'repeat', ...action(t.kind).map((b) => b.op)];
  const bug = makeBug(t3);
  return [
    { level: 1, mode: 'fill', title: 'Fill in the numbers', goal: goalText(t1), target: t1, start: solution(t1, true), palette: [],
      tip: t1.kind === 'line' ? 'Split: spaces in one whole (the denominator). Repeat: how many jumps (the numerator).' : t1.kind === 'set' ? 'Split: how many equal groups (the denominator). Repeat: how many to pick (the numerator).' : 'Split: pieces in 1 bar (the denominator). Repeat: how many to shade (the numerator).' },
    { level: 2, mode: 'build', title: 'Build the program', goal: goalText(t2), target: t2, start: [], palette: palette(t2),
      tip: 'Tap blocks to add them. Split first. A repeat loop saves lots of blocks!' },
    { level: 3, mode: 'debug', title: 'Fix the bug', goal: goalText(t3), target: t3, start: bug, palette: palette(t3),
      tip: 'Run it and watch what goes wrong. Then change one number.' },
    { level: 4, mode: 'predict', title: 'Predict before you run', goal: 'Read the blocks. What fraction will the robot make?', target: t4, start: solution(t4), palette: [],
      tip: 'The split number tells how many equal parts make one whole. Count the loop passes to find how many parts the robot marks.' },
    { level: 5, mode: 'debug', title: 'Find two mistakes', goal: goalText(t5), target: t5, start: makeMultiBug(t5), palette: palette(t5),
      tip: 'Two numbers are wrong. Check how the whole is split and how many times the robot repeats.' },
    { level: 6, mode: 'build', title: 'Transfer to a new model', goal: goalText(t6), target: t6, start: [], palette: palette(t6), requiresLoop: t6.n > 1, transferFrom,
      tip: t6.n > 1 ? 'Make the same fraction in this new model. Use repeat to combine the actions that happen again and again.' : 'Make the same fraction in this new model. Build the program, then try a repeat block where it helps.' },
  ];
}

function transferToDifferentModel(source: Target): Target {
  if (source.kind === 'set') {
    return { ...source, kind: 'line', wholes: numberLineWholeCount(source.n, source.d), total: undefined };
  }
  if (source.n <= source.d) {
    return { ...source, kind: 'set', wholes: 1, total: source.d };
  }
  if (source.kind === 'bar') {
    return { ...source, kind: 'line', wholes: numberLineWholeCount(source.n, source.d), total: undefined };
  }
  return { ...source, kind: 'bar', wholes: numberLineWholeCount(source.n, source.d), total: undefined };
}

/** A two-number debugging challenge: the partition and repeat count are both wrong. */
export function makeMultiBug(t: Target): Block[] {
  const change = (n: number) => n < LIMIT ? n + 1 : Math.max(1, n - 1);
  return solution(t).map((block): Block => {
    if (block.op === 'split') return { ...block, n: change(block.n ?? t.d) };
    if (block.op === 'repeat') return { ...block, n: change(block.n ?? t.n) };
    return block;
  });
}

/** Exact fraction-entry check used by the prediction level. */
export function predictionMatchesTarget(target: Target, numerator: string, denominator: string): boolean {
  if (!/^\d+$/.test(numerator) || !/^\d+$/.test(denominator)) return false;
  return Number(numerator) === target.n && Number(denominator) === target.d;
}

export function usesEffectiveLoop(program: Block[]): boolean {
  return program.some((block) => block.op === 'repeat'
    ? ((block.n ?? 0) > 1 && block.body.length > 0) || usesEffectiveLoop(block.body)
    : false);
}

export function passesCodeLevel(level: CodeLevel, result: RunResult, program: Block[]): boolean {
  return matchesTarget(result, level.target) && (!level.requiresLoop || usesEffectiveLoop(program));
}

/** A believable bug for a target: the loop runs the denominator of times instead of the numerator
    (a classic fraction mix-up), or for a unit or whole fraction, the bar is split into the wrong number of pieces. */
export function makeBug(t: Target): Block[] {
  return solution(t).map((b): Block => {
    if (b.op === 'repeat' && t.n !== t.d && t.n > 1) return { ...b, n: Math.min(t.d, LIMIT) };
    if (b.op === 'split' && (t.n === 1 || t.n === t.d)) return { ...b, n: t.d + 1 };
    return b;
  });
}

const sameTarget = (a: Target, b: Target) => a.kind === b.kind && a.n === b.n && a.d === b.d && a.wholes === b.wholes && a.total === b.total;
/** Every different fraction the lesson builds (its two checks and its review rounds), for Code Sprint. */
/** What a sprint round asks for ("shade 3/4"); read aloud as "Make the robot shade 3/4." */
export const goal = (t: Target) => t.kind === 'line' ? `land on ${t.n}/${t.d}` : t.kind === 'set' ? `pick ${t.n}/${t.d} of the ${t.total} dots` : `shade ${t.n}/${t.d}`;

export function sprintTargets(missionId: string): Target[] {
  const all = [...getBuildChecks(missionId).map((c) => toTarget(c.target)), ...[0, 1, 2, 3, 4, 5].map((r) => toTarget(getReviewCheck(missionId, r).target))];
  return all.filter((t, i) => all.findIndex((u) => sameTarget(t, u)) === i && t.n <= 60);
}

/** Three programs for "Which program works?": the right one and two that look close but build something else. */
export function readChoices(t: Target): Block[][] {
  const right = solution(t);
  const withNumbers = (split: number, times: number): Block[] => solution({ ...t, d: split, n: times });
  const candidates = [
    t.n !== t.d && t.n >= 1 ? withNumbers(t.n, t.d) : withNumbers(t.d + 1, t.n),   // top and bottom swapped
    withNumbers(t.d, t.n + 1),                                                       // one too many
    withNumbers(t.d, Math.max(1, t.n - 1)),                                          // one too few
  ];
  const wrong = candidates.filter((prog) => !matchesTarget(runProgram(prog, t), t))
    .filter((prog, i, list) => list.findIndex((other) => JSON.stringify(other) === JSON.stringify(prog)) === i)
    .slice(0, 2);
  return [right, ...wrong];
}
