import type { CapacitorConfig } from '@capacitor/cli';

/**
 * iOS app wrapper. The web build in dist/public is bundled into the app, so lessons work offline.
 * appId: replace with your own reverse-DNS bundle id before the first App Store upload
 * (it must match the App ID and the iCloud container in your Apple Developer account).
 */
const config: CapacitorConfig = {
  appId: 'com.fractionquest.app',
  appName: 'Fraction Quest',
  webDir: 'dist/public',
  ios: {
    contentInset: 'always',
    // Kids' app: no link previews or text-selection menus that could lead out of the app.
    allowsLinkPreview: false,
  },
};

export default config;
