import { createRoot } from 'react-dom/client';

import App from './App';
import { inExpoShell } from './lib/native-shell';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';
import './theme-pop.css';
import './season.css';
import './story.css';
import './answer-tiles.css';

// Inside the app (iPhone and Android) the page needs no room for a browser toolbar (see theme-pop.css).
if (inExpoShell()) document.documentElement.classList.add('fq-in-app');

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
