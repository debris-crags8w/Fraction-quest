import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

/* The store-facing settings of the app: its ID, its build numbers, its EAS build profiles, no native module the app does not use,
   its privacy manifest, the encryption answer, the Android adaptive icon and the splash image. */
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

/* Every installed native module that reads a "required reason" API (file dates, settings, boot time, free space) says so in its own
   PrivacyInfo.xcprivacy. The app's privacy manifest lists exactly those APIs and reasons: none missing, none invented. */
function nativeModulePrivacyApis(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const resolve = (from: string, name: string): string | null => {
    for (let dir = from; ; dir = dirname(dir)) {
      const candidate = join(dir, 'node_modules', name);
      if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate);
      if (dirname(dir) === dir) return null;
    }
  };
  const manifests = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return manifests(path);
    return entry.name === 'PrivacyInfo.xcprivacy' ? [path] : [];
  });
  const isIosModule = (dir: string) => readdirSync(dir).some((name) => name.endsWith('.podspec')) || (existsSync(join(dir, 'ios')) && readdirSync(join(dir, 'ios')).some((name) => name.endsWith('.podspec')));
  const visit = (dir: string, top: boolean) => {
    if (seen.has(dir)) return;
    seen.add(dir);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>;
    if (!top && isIosModule(dir)) {
      for (const file of manifests(dir)) {
        const plist = readFileSync(file, 'utf8');
        for (const [, type, reasons] of plist.matchAll(/<key>NSPrivacyAccessedAPIType<\/key>\s*<string>([^<]+)<\/string>\s*<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>([\s\S]*?)<\/array>/g)) {
          const set = found.get(type!) ?? new Set<string>();
          for (const [, reason] of reasons!.matchAll(/<string>([^<]+)<\/string>/g)) set.add(reason!);
          found.set(type!, set);
        }
      }
    }
    const deps = { ...pkg.dependencies, ...pkg.optionalDependencies, ...(top ? pkg.devDependencies : {}) };
    for (const name of Object.keys(deps)) {
      const next = resolve(dir, name);
      if (next) visit(next, false);
    }
  };
  visit(realpathSync(fileURLToPath(root)), true);
  return found;
}

test('the iOS privacy manifest lists the required-reason APIs the native modules use, and no tracking', () => {
  const { expo } = json('app.json');
  const manifest = expo.ios.privacyManifests;
  assert.ok(manifest, 'ios.privacyManifests is set');
  assert.equal(manifest.NSPrivacyTracking, false);
  assert.deepEqual(manifest.NSPrivacyTrackingDomains ?? [], []);
  const used = nativeModulePrivacyApis();
  assert.ok(used.size > 0, 'the installed modules declare their APIs (is node_modules installed?)');
  const listed = new Map<string, string[]>((manifest.NSPrivacyAccessedAPITypes as { NSPrivacyAccessedAPIType: string; NSPrivacyAccessedAPITypeReasons: string[] }[])
    .map((entry) => [entry.NSPrivacyAccessedAPIType, [...entry.NSPrivacyAccessedAPITypeReasons].sort()]));
  assert.deepEqual(Object.fromEntries([...listed].sort()), Object.fromEntries([...used].map(([type, reasons]) => [type, [...reasons].sort()] as const).sort()));
});

test('the app says it uses no non-exempt encryption, and has an Android adaptive icon and a splash image', () => {
  const { expo } = json('app.json');
  assert.equal(expo.ios.infoPlist?.ITSAppUsesNonExemptEncryption, false);
  const icon = expo.android.adaptiveIcon;
  assert.ok(icon?.foregroundImage && icon.backgroundColor, 'adaptive icon foreground and background');
  assert.ok(existsSync(new URL(icon.foregroundImage, root)), 'the adaptive icon image exists');
  const splash = (expo.plugins as unknown[]).find((plugin): plugin is [string, Record<string, unknown>] => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen');
  assert.ok(splash, 'the splash screen plugin is configured');
  assert.equal(typeof splash[1].image, 'string');
  assert.ok(existsSync(new URL(splash[1].image as string, root)), 'the splash image exists');
  assert.ok(Number(splash[1].imageWidth) > 0);
});
