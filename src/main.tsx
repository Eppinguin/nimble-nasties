import { render } from 'preact';
import { App } from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import './fonts.css';
import './style.css';

render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  document.getElementById('app')!,
);

// Offline at the table: the service worker keeps the app shell, assets and fonts cached.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* runs without offline support */
    });
  });
}
