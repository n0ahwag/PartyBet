import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { ConsentBanner } from './components/ConsentBanner.jsx';
// Schrift lokal ausliefern (keine Verbindung zu Google Fonts → DSGVO)
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-800.css';
import '@fontsource/outfit/latin-900.css';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ConsentBanner />
  </StrictMode>,
);
