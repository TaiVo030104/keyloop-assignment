import type { ReactNode } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/errors'
import { logger } from './logger'
import { track } from './telemetry'

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  const correlationId = error instanceof ApiError ? error.correlationId : undefined
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-red-900">Something went wrong</h1>
      <p className="mt-1 text-sm text-red-900">The page hit an unexpected error. Your data is safe; try again.</p>
      {correlationId && <p className="mt-1 text-xs text-red-800">Reference: {correlationId}</p>}
      <Button className="mt-4" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  )
}

/** Route-level boundary: logs, shows a recovery action (Constitution VI). */
export function RouteErrorBoundary({ children, resetKey }: { children: ReactNode; resetKey?: string }) {
  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      resetKeys={[resetKey]}
      onError={(error, info) => {
        logger.error('ui.error', { message: error instanceof Error ? error.message : String(error), componentStack: info.componentStack })
        track('ui.error')
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
