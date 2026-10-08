import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { AppAnalytics } from './components/AppAnalytics';
import './index.css';
import { registerServiceWorker } from './registerSW';
import { trackAppHeight } from './viewport';

trackAppHeight();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <AppAnalytics />
    </BrowserRouter>
  </StrictMode>,
);

registerServiceWorker();
