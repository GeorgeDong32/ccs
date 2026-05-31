import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AnalyticsOnlyApp from './AnalyticsOnlyApp.tsx';

const rootElement = document.getElementById('analytics-root');
if (!rootElement) {
  throw new Error('Analytics root element not found. Failed to mount analytics application.');
}
createRoot(rootElement).render(
  <StrictMode>
    <AnalyticsOnlyApp />
  </StrictMode>
);
