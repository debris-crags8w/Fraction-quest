import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { captureLog, logSummary, recentLogs, resetLogsForTests } from "./lib/log-buffer";

describe("log buffer", () => {
  beforeEach(resetLogsForTests);

  it("keeps warnings and errors, newest first, with only safe fields", () => {
    captureLog(40, { ip: "1.2.3.4" }, "admin auth failed", 1000);
    captureLog(50, { err: { message: "boom token=abc123", stack: "SECRET STACK" }, method: "GET", path: "/api/x?password=hunter2" }, "Unhandled request error", 2000);
    const out = recentLogs({ level: "warn", now: 3000 });
    assert.deepEqual(out.map((e) => e.level), ["error", "warn"]);
    assert.equal(out[0]!.error, "boom token=[hidden]");
    assert.equal(out[0]!.path, "/api/x");
    assert.ok(!JSON.stringify(out).includes("SECRET STACK"));
  });
  it("drops fast successful requests but counts them, and keeps failed or slow ones", () => {
    captureLog(30, { req: { method: "GET", url: "/api/ok" }, res: { statusCode: 200 }, responseTime: 12 }, "request completed", 1);
    captureLog(30, { req: { method: "GET", url: "/api/slow" }, res: { statusCode: 200 }, responseTime: 2500 }, "request completed", 2);
    captureLog(50, { req: { method: "POST", url: "/api/bad" }, res: { statusCode: 500 }, responseTime: 5 }, "request errored", 3);
    captureLog(30, { req: { method: "GET", url: "/api/missing" }, res: { statusCode: 404 }, responseTime: 5 }, "request completed", 4);
    assert.deepEqual(recentLogs({ level: "info" }).map((e) => e.path), ["/api/missing", "/api/bad", "/api/slow"]);
    const s = logSummary(10);
    assert.deepEqual([s.requestsSinceStart, s.status5xxSinceStart, s.status4xxSinceStart], [4, 1, 1]);
  });
  it("caps the buffer and filters by level and age", () => {
    for (let i = 0; i < 600; i++) captureLog(40, undefined, `w${i}`, i);
    assert.equal(recentLogs({ level: "info", limit: 1000 }).length, 500);
    captureLog(50, undefined, "e", 700);
    assert.deepEqual(recentLogs({ level: "error" }).map((e) => e.msg), ["e"]);
    assert.equal(recentLogs({ level: "warn", now: 700, sinceMs: 5, limit: 1000 }).length, 1);
    assert.equal(logSummary(1000).errors24h, 1);
  });
});
