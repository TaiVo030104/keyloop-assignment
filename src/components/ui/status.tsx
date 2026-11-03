import type { ReactNode } from 'react'
import { ApiError } from '@/api/errors'
import { Button } from './button'

/** Loading / empty / error states shared by every data view (FR-018). */
export function LoadingState({ children = 'Loading…' }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-700">
      <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
      {children}
    </p>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-700">{children}</p>
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Cannot reach the server. Check your connection and try again.'
    if (error.status >= 500) return 'The server had a problem. Please try again.'
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

export function ErrorState({ error, onRetry, title = 'Could not load data' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const correlationId = error instanceof ApiError ? error.correlationId : undefined
  return (
    <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-medium">{title}</p>
      <p>{errorMessage(error)}</p>
      {correlationId && <p className="mt-1 text-xs text-red-800">Reference: {correlationId}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
