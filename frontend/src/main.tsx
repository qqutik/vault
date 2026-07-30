import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { VaultKeyProvider } from './features/encryption/vaultKey.tsx'
import { ToastProvider } from './components/ToastProvider.tsx'
import { DialogProvider } from './components/DialogProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <DialogProvider>
          <VaultKeyProvider>
            <App />
          </VaultKeyProvider>
        </DialogProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
