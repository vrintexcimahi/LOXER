import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { registerServiceWorker } from './registerSW.ts';
import { initGlobalErrorInterceptor } from './lib/logService.ts';
import { initSystemSettings } from './lib/systemSettingsService.ts';
import './index.css';
import './clay-theme.css';
import './compact-theme.css';
import './glass-theme.css';
import TenantGateway from './components/app/TenantGateway.tsx';

registerServiceWorker();
initGlobalErrorInterceptor();
initSystemSettings();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TenantGateway><App /></TenantGateway>
    </ThemeProvider>
  </StrictMode>
);
