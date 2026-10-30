import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideProgressSave } from "./lib/progress-save";

describe("saving a learner's progress from two devices", () => {
  it("saves a copy made from the latest version, and moves the version on by one", () => {
    assert.deepEqual(decideProgressSave({ version: 4, resetVersion: 0 }, 4), { kind: "save", nextVersion: 5 });
    assert.deepEqual(decideProgressSave({ version: 0, resetVersion: 0 }, 0), { kind: "save", nextVersion: 1 });
  });

  it("refuses a copy made from an older version: another device saved since", () => {
    assert.deepEqual(decideProgressSave({ version: 5, resetVersion: 0 }, 4), { kind: "conflict", clearedSince: false });
    // A version the server never gave (a restored database) is refused too, so the device merges and resends.
    assert.deepEqual(decideProgressSave({ version: 5, resetVersion: 0 }, 9), { kind: "conflict", clearedSince: false });
  });

  it("says when the progress was cleared after the device's version, so the device does not merge it back", () => {
    assert.deepEqual(decideProgressSave({ version: 7, resetVersion: 6 }, 4), { kind: "conflict", clearedSince: true });
    assert.deepEqual(decideProgressSave({ version: 7, resetVersion: 6 }, 6), { kind: "conflict", clearedSince: false });
  });

  it("still accepts a save with no version from an older app, as before (it replaces the saved copy)", () => {
    assert.deepEqual(decideProgressSave({ version: 5, resetVersion: 2 }, undefined), { kind: "save", nextVersion: 6 });
  });
});
