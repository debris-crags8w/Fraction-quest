import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildDashboard, LESSON_UNITS, MIN_GROUP, type AccountRow } from "./lib/dashboard";

const NOW = Date.parse("2026-03-20T12:00:00Z");
const day = (offset: number) => new Date(NOW - offset * 864e5).toISOString().slice(0, 10);

function learner(i: number, over: Partial<AccountRow> & { progress?: object; fun?: object } = {}): AccountRow {
  return {
    username: `kid${i}`, createdAt: new Date(NOW - 40 * 864e5), hasConsent: true, hasRecoveryCode: true,
    progress: {
      completedMissionIds: ["equal-parts", "fraction-names", "unit-fractions"],
      starsByMission: { "equal-parts": 3, "fraction-names": 2, "unit-fractions": 1 },
      reviewQueue: [{ missionId: "unit-size" }],
      learning: { "equal-parts": { checks: { a: { attempts: 1 } }, helpUses: 1, misconceptions: { "part-count": 2 } } },
      assessments: [{ responses: [{ correct: true }, { correct: false }] }],
    },
    fun: { dayStreak: 4, lastActiveDay: day(0), activity: { [day(0)]: { minutes: 10, answered: 20 }, [day(1)]: { minutes: 5, answered: 8 } }, raceBest: { "equal-parts": 30 } },
    ...over,
  };
}

describe("LESSON_UNITS", () => {
  it("matches every lesson id and unit in the web app curriculum", () => {
    const source = readFileSync(new URL("../../fraction-quest/src/game.ts", import.meta.url), "utf8");
    const found = [...source.matchAll(/id: '([a-z0-9-]+)', unit: (\d+)/g)].map((m) => [m[1], Number(m[2])] as const);
    assert.ok(found.length > 0);
    assert.deepEqual(Object.fromEntries(found), LESSON_UNITS);
  });
});

describe("buildDashboard", () => {
  const rows = [...Array(6)].map((_, i) => learner(i));
  rows.push({ ...learner(99), progress: null, fun: null, hasRecoveryCode: false, hasConsent: false });
  const d = buildDashboard(rows, 7, NOW);

  it("counts learners, activity and accounts with no saved progress", () => {
    assert.equal(d.cards.accounts, 7);
    assert.equal(d.cards.learnersWithProgress, 6);
    assert.equal(d.cards.noProgressYet, 1);
    assert.equal(d.cards.weeklyActive, 6);
    assert.equal(d.cards.current.minutes, 6 * 15);
    assert.equal(d.cards.avgMinutesPerActiveDay, 7.5);
    assert.equal(d.trend.points.at(-1)!.active, 6);
  });
  it("builds the unit funnel and outcome numbers", () => {
    const unit1 = d.funnel!.find((u) => u.unit === 1)!;
    assert.deepEqual([unit1.started, unit1.passedOne, unit1.finished], [6, 6, 6]);
    assert.equal(d.funnel!.find((u) => u.unit === 3)!.started, null);
    assert.equal(d.outcomes!.avgStars, 2);
    assert.equal(d.outcomes!.assessmentScores.from50, 6);
    assert.equal(d.modes!.race, 6);
  });
  it("ranks struggle spots and common misconceptions", () => {
    assert.equal(d.struggles!.lowestPassRate[0]!.id.length > 0, true);
    assert.deepEqual(d.struggles!.reviewQueueByLesson[0], { id: "unit-size", unit: 2, count: 6 });
    assert.deepEqual(d.struggles!.commonMisconceptions[0], { key: "part-count", count: 12 });
  });
  it("reports health and retention without exposing small groups", () => {
    assert.equal(d.health.noRecoveryCode, 1);
    assert.equal(d.health.consentPercent, 86);
    assert.equal(d.retention.day7.percent, 86);
  });
  it("hides every breakdown when fewer than the minimum learners exist", () => {
    const few = buildDashboard(rows.slice(0, MIN_GROUP - 1), 30, NOW);
    assert.equal(few.tooFewLearners, true);
    assert.equal(few.funnel, null);
    assert.equal(few.struggles, null);
    assert.equal(few.modes, null);
    assert.equal(few.streaks, null);
  });
  it("flags learners who went quiet after a streak", () => {
    const quiet = learner(50, { fun: { dayStreak: 5, lastActiveDay: day(10), activity: {} } });
    const out = buildDashboard([...rows, quiet], 30, NOW);
    assert.deepEqual(out.needsAttention.list, [{ username: "kid50", reason: "Inactive 7+ days after a streak" }]);
  });
  it("only compares with the previous period when activity history covers it", () => {
    assert.equal(buildDashboard(rows, 90, NOW).cards.previous, null);
    assert.notEqual(buildDashboard(rows, 7, NOW).cards.previous, null);
  });
});
