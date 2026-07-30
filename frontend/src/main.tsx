import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { VaultKeyProvider } from './features/encryption/vaultKey.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <VaultKeyProvider>
        <App />
      </VaultKeyProvider>
    </BrowserRouter>
  </StrictMode>,
)
