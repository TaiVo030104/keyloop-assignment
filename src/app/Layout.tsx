import { lazy, Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { RouteErrorBoundary } from '@/observability/RouteErrorBoundary'

const MockDevPanel = lazy(() => import('@/devtools/MockDevPanel'))
export const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS !== 'false'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-blue-700 text-white' : 'text-slate-800 hover:bg-slate-200'}`

export function Layout({ showDevPanel = mocksEnabled }: { showDevPanel?: boolean }) {
  const location = useLocation()
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to main content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <p className="text-base font-semibold">Keyloop Service Scheduler</p>
          <nav aria-label="Main">
            <ul className="flex gap-2">
              <li>
                <NavLink to="/book" className={navClass}>
                  Book appointment
                </NavLink>
              </li>
              <li>
                <NavLink to="/schedule" className={navClass}>
                  Schedule
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-8 focus:outline-none">
        <RouteErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      {showDevPanel && (
        <Suspense fallback={null}>
          <MockDevPanel />
        </Suspense>
      )}
    </>
  )
}
