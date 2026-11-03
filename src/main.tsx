import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { logger } from './observability/logger'
import { startWebVitals } from './observability/webVitals'
import './index.css'

async function boot(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { startMockBackend } = await import('./mocks/browser')
    await startMockBackend()
  }
  window.__mswReady = true

  window.addEventListener('error', (e) => logger.error('ui.unhandled_error', { message: e.message }))
  window.addEventListener('unhandledrejection', (e) => logger.error('ui.unhandled_rejection', { message: String(e.reason) }))
  startWebVitals()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
