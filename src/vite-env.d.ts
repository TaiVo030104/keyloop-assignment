/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_ENABLE_MOCKS?: string
  readonly VITE_API_BASE_URL?: string
}
interface Window {
  __mswReady?: boolean
}
