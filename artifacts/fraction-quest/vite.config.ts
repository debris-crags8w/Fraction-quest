import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { build as viteBuild, defineConfig, type Plugin } from 'vite';
import { createHash } from 'crypto';
import { readdirSync, readFileSync, statSync } from 'fs';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

/** Every file under a folder, as paths relative to it. */
const filesIn = (dir: string, prefix = ''): string[] => readdirSync(dir).flatMap((name) => {
  const full = path.join(dir, name);
  return statSync(full).isDirectory() ? filesIn(full, `${prefix}${name}/`) : [`${prefix}${name}`];
});

/** Builds the service worker (src/sw.ts) after the app: it saves every built file, so the app opens offline. Its
    name is a hash of those files, so a new version replaces the old one. */
function offlineServiceWorker(base: string): Plugin {
  let outDir = '';
  return {
    name: 'fraction-quest-offline',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    async closeBundle() {
      const files = filesIn(outDir).filter((file) => file !== 'sw.js').sort();
      const hash = createHash('sha256');
      for (const file of files) hash.update(file).update(readFileSync(path.join(outDir, file)));
      await viteBuild({
        configFile: false,
        logLevel: 'warn',
        define: { __PRECACHE__: JSON.stringify(files), __VERSION__: JSON.stringify(hash.digest('hex').slice(0, 12)), __BASE__: JSON.stringify(base) },
        build: {
          outDir, emptyOutDir: false, copyPublicDir: false,
          lib: { entry: path.resolve(import.meta.dirname, 'src/sw.ts'), formats: ['iife'], name: 'fractionQuestWorker', fileName: () => 'sw.js' },
        },
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    offlineServiceWorker(basePath),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
      { find: '@assets', replacement: path.resolve(import.meta.dirname, '..', '..', 'attached_assets') },
    ],
    // One copy each: the shared API client (lib/api-client-react) must use the app's react-query, or its hooks can't
    // find the app's QueryClientProvider (the Expo app in the workspace pulls in another React version).
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
