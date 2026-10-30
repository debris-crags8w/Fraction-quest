/* The "which idea explains why?" choices are true for the item they come with (wave 3).
   1. A scaling build with a factor of 1 or more is not told "part of a group is less", and its wrong reasons are false.
   2. Sharing items are not keyed with a fitting reason (or the other way), 3 batches not with a doubling reason, and
      3/6 + 1/6 not with "Rename so the parts match".
   3. A reason that names a thing (loaves, pizzas, friends, tables, children) names one the question is about. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSIONS } from './game';
import { getBuildChecks, getBuildPracticeChecks, getReviewCheck, type BuildCheck } from './learning-content';

/** Every Build-it "why" a lesson can ask: its three builds, many review rounds and three batches of extra builds. */
function everyCheck(id: string): [string, BuildCheck][] {
  return [
    ...getBuildChecks(id).map((check, i): [string, BuildCheck] => [`build ${i + 1}`, check]),
    ...Array.from({ length: 48 }, (_, round): [string, BuildCheck] => [`review ${round}`, getReviewCheck(id, round)]),
    ...[0, 1, 2].flatMap((batch) => getBuildPracticeChecks(id, batch).map((check, i): [string, BuildCheck] => [`practice ${batch}.${i}`, check])),
  ];
}

describe('key ideas fit the round they come with', () => {
  it('scaling lessons: "less" only for a factor below 1, "more" only above, "same" only at 1', () => {
    // multiplication-scaling builds the factor itself ("Build 3/4 of 12"); bigger-or-smaller says it first ("Make 5/4 × 2").
    const factor = (id: string, check: BuildCheck) => {
      if (id === 'multiplication-scaling') return check.target;
      const m = check.prompt.match(/^Make (\d+)\/(\d+) ×/);
      return m ? { n: Number(m[1]), d: Number(m[2]) } : null;
    };
    for (const id of ['multiplication-scaling', 'bigger-or-smaller']) for (const [where, check] of everyCheck(id)) {
      const f = factor(id, check);
      assert.ok(f, `${id} ${where}: no factor in "${check.prompt}"`);
      const { n, d } = f;
      const right = check.reasons[check.correctReason]!;
      const wrong = check.reasons.filter((_, i) => i !== check.correctReason);
      const label = `${id} ${where}: ${check.prompt} (${n}/${d}) right "${right}", wrong "${wrong.join('" / "')}"`;
      if (n >= d) assert.doesNotMatch(right, /\bless\b|part of a group/i, label);
      if (n <= d) assert.doesNotMatch(right, /\bmore\b/i, label);
      if (n !== d) assert.doesNotMatch(right, /\bsame\b|\bkeeps?\b/i, label);
      // A wrong reason that is true for this round would be a second right answer.
      if (n === d) for (const r of wrong) assert.doesNotMatch(r, /stays the same|keeps/i, label);
      if (n > d) for (const r of wrong) assert.doesNotMatch(r, /bigger|\bis more\b/i, label);
      if (n < d) for (const r of wrong) assert.doesNotMatch(r, /smaller|\bis less\b/i, label);
    }
  });

  it('share-or-fit, fraction-recipes and measurement-word-problems: the keyed reason fits the item', () => {
    const rights = (id: string) => everyCheck(id).map(([where, check]) => ({ where, check, right: check.reasons[check.correctReason]!,
      wrong: check.reasons.filter((_, i) => i !== check.correctReason) }));
    for (const { where, check, right, wrong } of rights('share-or-fit')) {
      const label = `share-or-fit ${where}: ${check.prompt} right "${right}" wrong "${wrong.join('" / "')}"`;
      if (/^Share\b/.test(check.prompt)) {
        assert.doesNotMatch(right, /^Fitting/, label);
        for (const r of wrong) assert.doesNotMatch(r, /smaller/i, label);
      }
      if (/^How many .+ fill\b/.test(check.prompt)) assert.doesNotMatch(right, /^Sharing/, label);
    }
    for (const { where, check, right } of rights('fraction-recipes')) {
      const batches = Number(check.prompt.match(/\b(\d+) batches\b/)?.[1] ?? 2);
      if (batches !== 2) assert.doesNotMatch(right, /doubl|twice|two batches|to itself/i, `fraction-recipes ${where}: ${check.prompt} right "${right}"`);
    }
    for (const { where, check, right } of rights('measurement-word-problems')) {
      const dens = [...check.prompt.matchAll(/\d+\/(\d+)/g)].map((m) => m[1]);
      if (dens.length >= 2 && new Set(dens).size === 1) assert.doesNotMatch(right, /match|rename/i, `measurement-word-problems ${where}: ${check.prompt} right "${right}"`);
    }
  });

  it('a reason names only things the question is about', () => {
    const things: [RegExp, RegExp][] = [
      [/\bloa(?:f|ves)\b/i, /\bloa(?:f|ves)\b/i], [/\bpizzas?\b/i, /\bpizzas?\b/i],
      [/\bfriends?\b/i, /\bfriends?\b/i], [/\btables?\b/i, /\btables?\b/i], [/\bchild(?:ren)?\b/i, /\bchild(?:ren)?\b/i],
    ];
    const bad: string[] = [];
    for (const mission of MISSIONS) for (const [where, check] of everyCheck(mission.id)) {
      for (const reason of check.reasons) for (const [inReason, inPrompt] of things) {
        if (inReason.test(reason) && !inPrompt.test(check.prompt)) bad.push(`${mission.id} ${where}: "${reason}" beside "${check.prompt}"`);
      }
    }
    assert.deepEqual([...new Set(bad.map((b) => b.replace(/ (build|review|practice) [\d.]+:/, ":")))], []);
  });
});
