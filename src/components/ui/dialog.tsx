import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

const overlay = 'fixed inset-0 bg-slate-900/50'
const panel =
  'fixed left-1/2 top-1/2 max-h-[90vh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl'

/** Accessible modal (Radix: focus trap, Escape to close, labelled by title). */
export function Dialog(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return (
    <DialogPrimitive.Root open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content className={panel}>
          <DialogPrimitive.Title className="text-lg font-semibold">{props.title}</DialogPrimitive.Title>
          {props.description ? (
            <DialogPrimitive.Description className="mt-1 text-sm text-slate-700">{props.description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{props.title}</DialogPrimitive.Description>
          )}
          <div className="mt-4">{props.children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Confirmation for destructive actions (cancel appointment). */
export function ConfirmDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  pending?: boolean
  onConfirm: () => void
  children?: ReactNode
}) {
  return (
    <AlertDialogPrimitive.Root open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlay} />
        <AlertDialogPrimitive.Content className={panel}>
          <AlertDialogPrimitive.Title className="text-lg font-semibold">{props.title}</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-2 text-sm text-slate-700">{props.description}</AlertDialogPrimitive.Description>
          {props.children}
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialogPrimitive.Cancel className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100">
              {props.cancelLabel ?? 'Keep'}
            </AlertDialogPrimitive.Cancel>
            <button
              type="button"
              disabled={props.pending}
              onClick={props.onConfirm}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:bg-red-300"
            >
              {props.pending ? 'Working…' : props.confirmLabel}
            </button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
