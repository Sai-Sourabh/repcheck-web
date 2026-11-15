import { num } from '../format'

export function Panel({ className = '', children, ...rest }) {
  return (
    <section className={`rounded-lg border border-line bg-panel ${className}`} {...rest}>
      {children}
    </section>
  )
}

export function PanelHead({ title, hint, action }) {
  return (
    <div className="flex items-end justify-between gap-3 px-4 pt-4 pb-3">
      <div className="min-w-0">
        <h2 className="text-[22px] leading-6 font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-mute">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

const BUTTON = {
  primary: 'bg-plate text-white hover:bg-plate-dark',
  quiet: 'bg-transparent text-ink border border-line hover:border-mute',
  danger: 'bg-transparent text-down border border-line hover:border-down',
  ink: 'bg-ink text-white hover:bg-black',
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }) {
  const sizing = size === 'sm' ? 'h-9 px-3 text-sm' : size === 'lg' ? 'h-12 px-5 text-base' : 'h-10 px-4 text-[15px]'
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${BUTTON[variant]} ${className}`}
      {...rest}
    />
  )
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-mute">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'h-10 w-full rounded-md border border-line bg-white px-3 text-ink placeholder:text-mute/70 focus:border-plate focus:outline-none focus:ring-2 focus:ring-plate/25'

export function Input(props) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${inputClass} ${props.className || ''}`}>
      {children}
    </select>
  )
}

const ARROW = {
  UP: { tone: 'bg-up-soft text-up', label: 'Up', path: 'M6 1.5 11 9H1z' },
  DOWN: { tone: 'bg-down-soft text-down', label: 'Down', path: 'M6 10.5 1 3h10z' },
  SAME: { tone: 'bg-same-soft text-same', label: 'Same', path: 'M1.5 4.75h9v2.5h-9z' },
}

/** The stock-ticker chip: green up, red down, amber dash for no change. */
export function Delta({ direction, pct, size = 'md' }) {
  if (direction === 'NEW' || !ARROW[direction]) {
    return <span className="inline-flex h-6 items-center rounded px-1.5 text-xs font-semibold text-mute ring-1 ring-line">First log</span>
  }
  const arrow = ARROW[direction]
  const big = size === 'lg'
  return (
    <span
      className={`num inline-flex items-center gap-1 rounded font-bold ${arrow.tone} ${big ? 'h-8 px-2.5 text-lg' : 'h-6 px-1.5 text-[15px]'}`}
      aria-label={`${arrow.label}${pct != null ? ` ${Math.abs(pct)} percent` : ''}`}
    >
      <svg viewBox="0 0 12 12" className={big ? 'h-3.5 w-3.5' : 'h-3 w-3'} aria-hidden="true">
        <path d={arrow.path} fill="currentColor" />
      </svg>
      {pct != null && <span>{num(Math.abs(pct), 1)}%</span>}
    </span>
  )
}

const STROKE = { UP: 'var(--color-up)', DOWN: 'var(--color-down)', SAME: 'var(--color-same)', NEW: 'var(--color-mute)' }

export function Spark({ values, direction = 'NEW', width = 72, height = 26 }) {
  if (!values || values.length < 2) return <span style={{ width, height }} className="inline-block" />
  const min = Math.min(...values)
  const range = Math.max(...values) - min || 1
  const step = (width - 4) / (values.length - 1)
  const points = values.map((v, i) => [2 + i * step, height - 3 - ((v - min) / range) * (height - 6)])
  const [lastX, lastY] = points.at(-1)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      <polyline points={points.map((p) => p.join(',')).join(' ')} fill="none" stroke={STROKE[direction]}
        strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={STROKE[direction]} />
    </svg>
  )
}

export function Notice({ tone = 'info', children }) {
  const tones = { info: 'bg-plate-soft text-plate-dark', error: 'bg-down-soft text-down', ok: 'bg-up-soft text-up', warn: 'bg-same-soft text-same' }
  return <p role={tone === 'error' ? 'alert' : undefined} className={`rounded-md px-3 py-2 text-sm font-medium ${tones[tone]}`}>{children}</p>
}

export function Loading({ label = 'Loading' }) {
  return <p className="px-4 py-6 text-sm text-mute" aria-live="polite">{label}…</p>
}

export function Empty({ title, children, action }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-mute">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Loading / error / data switch for a TanStack query. */
export function Async({ query, children, empty }) {
  if (query.isPending) return <Loading />
  if (query.isError) {
    return (
      <div className="p-4">
        <Notice tone="error">{query.error.message}</Notice>
        <Button variant="quiet" size="sm" className="mt-3" onClick={() => query.refetch()}>Try again</Button>
      </div>
    )
  }
  if (empty && (query.data == null || (Array.isArray(query.data) && query.data.length === 0))) return empty
  return children(query.data)
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-md border border-line bg-panel p-1">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-8 shrink-0 rounded px-3 text-sm font-semibold transition-colors ${value === option.value ? 'bg-ink text-white' : 'text-mute hover:text-ink'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="flex max-h-[88dvh] w-full flex-col rounded-t-xl bg-panel sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-md text-mute hover:text-ink">
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
