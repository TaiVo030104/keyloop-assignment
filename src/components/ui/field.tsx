import type { ReactNode } from 'react'

/** Label + control + hint/error wired with `aria-describedby` (WCAG 1.3.1, 3.3.1). */
export function Field(props: {
  id: string
  label: string
  error?: string
  hint?: string
  children: (aria: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}) {
  const { id, label, error, hint, children } = props
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export const inputClass =
  'w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-sm aria-[invalid=true]:border-red-600 disabled:bg-slate-100'
