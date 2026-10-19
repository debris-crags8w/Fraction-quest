import type { Block, Target } from './code-quest';
import { CODE_LEVEL_COUNT, getCodeLevels, runProgram, solution } from './code-quest';
import { MISSIONS } from './game';

export type CodeExample = { title: string; target: Target; program: Block[]; note: string };

/** Worked examples use real lesson targets, solved with the shared program interpreter. */
const exampleFor = (kind: Target['kind'], title: string, note: (target: Target) => string): CodeExample => {
  const candidates = MISSIONS.map((mission) => ({ mission, target: getCodeLevels(mission.id)[0].target }))
    .filter((item) => item.target.kind === kind);
  const selected = candidates.find((item) => item.target.n > 1) ?? candidates[0];
  if (!selected) throw new Error(`No lesson target found for the ${kind} model.`);
  const { target } = selected;
  return { title, target, program: solution(target), note: note(target) };
};

let examples: CodeExample[] | null = null;
/** The three worked examples, built the first time Code Quest needs them (building them at import time held up the
    app's first paint by seconds on a phone). */
export function codeExamples(): CodeExample[] {
  examples ??= [
    exampleFor('bar', 'Shade a bar', (target) => `Split each bar into ${target.d} equal parts. Repeat shade and move ${target.n} times.`),
    exampleFor('line', 'Hop on a line', (target) => `Split each whole into ${target.d} equal spaces. Repeat one jump ${target.n} times.`),
    exampleFor('set', 'Pick groups', (target) => `Make ${target.d} equal groups. Repeat pick a group ${target.n} times.`),
  ];
  return examples;
}

/** Names the active instruction and, inside a loop, tells the learner which pass is running. */
export function exampleStepInstruction(
  example: CodeExample,
  stepIndex: number,
  steps: ReturnType<typeof runProgram>['steps'],
): string {
  const step = steps[stepIndex];
  if (!step) return 'Choose Next instruction to start.';
  const [rootIndex, bodyIndex] = step.path;
  const block = example.program[rootIndex];
  if (!block) return 'The robot follows the highlighted instruction.';

  if (block.op === 'repeat' && bodyIndex !== undefined) {
    const earlierLoopActions = steps.slice(0, stepIndex).filter((item) => item.path[0] === rootIndex).length;
    const pass = Math.floor(earlierLoopActions / Math.max(1, block.body.length)) + 1;
    const action = block.body[bodyIndex];
    const actionText = action?.op === 'shade' ? 'shade one piece'
      : action?.op === 'move' ? 'move to the next piece'
        : action?.op === 'jump' ? 'make one equal jump'
          : action?.op === 'pick' ? 'pick one group'
            : 'follow the next instruction';
    return `Loop pass ${pass} of ${block.n ?? 'some'}: ${actionText}.`;
  }

  if (block.op === 'split') {
    const partName = example.target.kind === 'line' ? 'spaces'
      : example.target.kind === 'set' ? 'groups' : 'pieces';
    return `First, split each whole into ${block.n ?? example.target.d} equal ${partName}.`;
  }
  if (block.op === 'bars') return 'First, build the whole bar model.';
  if (block.op === 'shade') return 'Shade one equal piece.';
  if (block.op === 'move') return 'Move to the next piece.';
  if (block.op === 'jump') return 'Make one equal jump.';
  if (block.op === 'pick') return 'Pick one equal group.';
  return 'The robot follows the highlighted instruction.';
}

export type CodeProgressSummary = {
  levelsPassed: number;
  levelsTotal: number;
  missionsStarted: number;
  missionsComplete: number;
};

/** Coding levels are counted separately from fraction lesson mastery. */
export function summarizeCodeProgress(codeLevels: Record<string, number> | undefined, missionIds: string[]): CodeProgressSummary {
  const scores = missionIds.map((id) => Math.max(0, Math.min(CODE_LEVEL_COUNT, Math.floor(codeLevels?.[id] ?? 0))));
  return {
    levelsPassed: scores.reduce((sum, score) => sum + score, 0),
    levelsTotal: missionIds.length * CODE_LEVEL_COUNT,
    missionsStarted: scores.filter((score) => score > 0).length,
    missionsComplete: scores.filter((score) => score === CODE_LEVEL_COUNT).length,
  };
}
