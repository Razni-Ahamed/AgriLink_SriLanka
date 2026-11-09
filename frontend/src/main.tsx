import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { reloadOnStaleChunks } from './lib/lazyPage'
import { storedLanguageReady } from './i18n/config'

reloadOnStaleChunks()

// '@/i18n/config' is already loaded through App; this waits only for a stored Sinhala or Tamil.
void storedLanguageReady.then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)
