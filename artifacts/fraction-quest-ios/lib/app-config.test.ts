import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/* The store-facing settings of the app: its ID, its build numbers, its EAS build profiles, and no native module the app does not use. */
const root = new URL('..', import.meta.url);
const json = (file: string) => JSON.parse(readFileSync(new URL(file, root), 'utf8')) as Record<string, any>;

test('the iPhone and Android app have the agreed ID and a build number', () => {
  const { expo } = json('app.json');
  assert.equal(expo.ios.bundleIdentifier, 'com.fractionquest.app');
  assert.equal(expo.android.package, 'com.fractionquest.app');
  assert.match(String(expo.ios.buildNumber), /^[1-9]\d*$/);
  assert.ok(Number.isInteger(expo.android.versionCode) && expo.android.versionCode >= 1);
  assert.match(expo.version, /^\d+\.\d+\.\d+$/);
});

test('eas.json has development, preview and production builds, and no secret in it', () => {
  const text = readFileSync(new URL('eas.json', root), 'utf8');
  const eas = JSON.parse(text);
  for (const profile of ['development', 'preview', 'production']) assert.ok(eas.build[profile], `${profile} profile`);
  assert.equal(eas.build.development.developmentClient, true);
  assert.equal(eas.build.production.autoIncrement, true);
  assert.ok(!/password|secret|token|apiKey|ascAppId|appleTeamId|serviceAccountKeyPath/i.test(text), 'no credentials or store IDs in eas.json');
});

test('no native module is installed that the app never uses', () => {
  const pkg = json('package.json');
  const declared = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
  for (const unused of ['expo-location', 'expo-image-picker']) assert.equal(unused in declared, false, `${unused} is unused and would ask for a permission`);
});
