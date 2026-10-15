import assert from "node:assert/strict";
import { it } from "node:test";

it("temporary required-checks smoke test (intentional failure; do not merge)", () => {
  assert.equal(1, 0, "Intentional failure to verify GitHub blocks a failing required check.");
});
