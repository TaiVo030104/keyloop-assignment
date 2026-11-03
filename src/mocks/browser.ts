import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { createSeed } from './seed'
import { LocalStorageStore } from './store/localStorageStore'
import { runtime } from './runtime'

/** Starts the in-browser mock backend (MSW service worker + localStorage store). */
export async function startMockBackend(): Promise<void> {
  runtime.configure({ store: new LocalStorageStore(() => createSeed(runtime.now())) })
  runtime.store.read() // seed on first visit
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
