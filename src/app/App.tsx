import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { createRoutes } from './routes'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: true },
      mutations: { retry: 0 },
    },
  })
}

const queryClient = createQueryClient()
const router = createBrowserRouter(createRoutes(), { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' })

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
