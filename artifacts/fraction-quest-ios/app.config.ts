/* Expo settings on top of app.json. The web app's domain is listed as the app's own (WKAppBoundDomains): iOS only lets
   a web view run a service worker for those, and the service worker is what lets Fraction Quest open offline. The
   domain comes from the same settings as lib/web-app.ts (Expo's config loader can't import app code). */
import type { ConfigContext, ExpoConfig } from 'expo/config';

function webAppHost(): string | null {
  const explicit = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();
  if (explicit) { try { return new URL(explicit).host; } catch { return null; } }
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return domain || null;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const host = webAppHost();
  return {
    ...config,
    name: config.name ?? 'Fraction Quest',
    slug: config.slug ?? 'fraction-quest-ios',
    ios: { ...config.ios, infoPlist: { ...config.ios?.infoPlist, ...(host ? { WKAppBoundDomains: [host] } : {}) } },
  };
};
