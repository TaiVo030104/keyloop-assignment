import { useId, useState, type KeyboardEvent } from 'react'
import { useCustomerSearch, type Customer } from '@/api/queries'
import { inputClass } from '@/components/ui/field'
import { errorMessage } from '@/components/ui/status'
import { useDebouncedValue } from './useDebouncedValue'

/**
 * Accessible customer search (WAI-ARIA combobox with listbox popup). Search by name,
 * phone or email (FR-001). Arrow keys move, Enter selects, Escape closes.
 */
export function CustomerCombobox(props: {
  id: string
  value: Customer | null
  onChange: (c: Customer | null) => void
  invalid?: boolean
  describedBy?: string
}) {
  const { id, value, onChange } = props
  const listId = useId()
  const [query, setQuery] = useState(value ? fullName(value) : '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const term = useDebouncedValue(query, 250)
  const search = useCustomerSearch(value && query === fullName(value) ? '' : term)
  const results = search.data ?? []
  const showList = open && term.trim().length >= 2

  const select = (c: Customer) => {
    onChange(c)
    setQuery(fullName(c))
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && showList && results[active]) {
      e.preventDefault()
      select(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? `${listId}-${results[active].id}` : undefined}
        aria-invalid={props.invalid}
        aria-describedby={props.describedBy}
        autoComplete="off"
        placeholder="Name, phone or email"
        className={inputClass}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
          if (value) onChange(null)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Matching customers"
        hidden={!showList}
        className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-300 bg-white shadow-lg"
      >
        {search.isFetching && results.length === 0 && <li className="px-3 py-2 text-sm text-slate-700">Searching…</li>}
        {search.isError && (
          <li className="px-3 py-2 text-sm text-red-800">
            {errorMessage(search.error)}{' '}
            <button type="button" className="underline" onMouseDown={(e) => e.preventDefault()} onClick={() => void search.refetch()}>
              Retry
            </button>
          </li>
        )}
        {search.isSuccess && !search.isFetching && results.length === 0 && (
          <li className="px-3 py-2 text-sm text-slate-700">No customers found.</li>
        )}
        {results.map((c, i) => (
          // Keyboard interaction lives on the combobox input (aria-activedescendant pattern).
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <li
            key={c.id}
            id={`${listId}-${c.id}`}
            role="option"
            aria-selected={i === active}
            className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-blue-100' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(c)}
            onMouseEnter={() => setActive(i)}
          >
            <span className="font-medium">{fullName(c)}</span>
            <span className="block text-xs text-slate-600">
              {c.phone} · {c.email} · {c.vehicles.length} vehicle{c.vehicles.length === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function fullName(c: Pick<Customer, 'firstName' | 'lastName'>): string {
  return `${c.firstName} ${c.lastName}`
}
