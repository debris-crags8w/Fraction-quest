import { createRoot } from 'react-dom/client';

import App from './App';
import { startNativeSaving } from './lib/native';
import { startSubscriptionChecks } from './lib/subscription';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';
import './theme-pop.css';

// On iOS, restore saved progress (device storage + iCloud) before the app reads it. On the web this resolves at once.
void startNativeSaving().catch(() => {}).finally(() => { startSubscriptionChecks(); }).finally(() => createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
));
