import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router'
import { createRoutes } from '@/app/routes'

const routes = createRoutes({ showDevPanel: false })
function AppRoutes() {
  return useRoutes(routes)
}

/**
 * Renders the real app (routes, providers, API client) against the MSW node server.
 * Uses the declarative MemoryRouter: the data router builds `Request`s with jsdom's
 * AbortSignal, which Node's fetch rejects.
 */
export function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const user = userEvent.setup()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, user, queryClient }
}
