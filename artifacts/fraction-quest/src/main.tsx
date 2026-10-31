import { createRoot } from 'react-dom/client';

import App from './App';
import { inExpoShell } from './lib/native-shell';
import { deviceId } from './lib/fun';
import { ErrorBoundary } from '@/components/error-boundary';

import './fonts.css';
import './index.css';
import './theme-pop.css';
import './season.css';
import './story.css';
import './answer-tiles.css';

// This device's id is made once, at start, so later play only reads it (per-device day counts in lib/fun.ts).
deviceId();

// Inside the app (iPhone and Android) the page needs no room for a browser toolbar (see theme-pop.css).
if (inExpoShell()) document.documentElement.classList.add('fq-in-app');

// The published app saves itself on the device (src/sw.ts), so it opens and plays without a connection.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => undefined);
  });
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
