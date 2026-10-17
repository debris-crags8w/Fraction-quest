import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDatabaseRuntimeEnvironment,
  assertDatabaseSchemaPushAllowed,
} from "@workspace/db/environment-guard";

test("development database access is allowed only outside a published deployment", () => {
  assert.doesNotThrow(() =>
    assertDatabaseRuntimeEnvironment({ NODE_ENV: "development" }),
  );
  assert.throws(
    () =>
      assertDatabaseRuntimeEnvironment({
        NODE_ENV: "development",
        REPLIT_DEPLOYMENT: "1",
      }),
    /does not match the Replit deployment context/,
  );
});

test("published database access requires production mode", () => {
  assert.doesNotThrow(() =>
    assertDatabaseRuntimeEnvironment({
      NODE_ENV: "production",
      REPLIT_DEPLOYMENT: "1",
    }),
  );
  assert.throws(
    () => assertDatabaseRuntimeEnvironment({ NODE_ENV: "production" }),
    /does not match the Replit deployment context/,
  );
});

test("schema pushes are allowed in development and blocked in production", () => {
  assert.doesNotThrow(() =>
    assertDatabaseSchemaPushAllowed({ NODE_ENV: "development" }),
  );
  assert.throws(
    () =>
      assertDatabaseSchemaPushAllowed({
        NODE_ENV: "production",
        REPLIT_DEPLOYMENT: "1",
      }),
    /schema pushes are disabled in production/,
  );
  assert.throws(
    () =>
      assertDatabaseSchemaPushAllowed({
        NODE_ENV: "development",
        REPLIT_DEPLOYMENT: "1",
      }),
    /does not match the Replit deployment context/,
  );
});
