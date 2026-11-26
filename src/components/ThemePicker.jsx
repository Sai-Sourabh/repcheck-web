import { useEffect } from 'react'
import { usePrefs } from '../store'

export const THEMES = [
  { id: 'nocturne', name: 'Nocturne', swatches: ['#2b2b2e', '#6b5b7b', '#f2c14e'], meta: '#2B2B2E' },
  { id: 'swell', name: 'Swell', swatches: ['#1b2a4a', '#eee3c6', '#ff8c28'], meta: '#EEE3C6' },
  { id: 'chalk', name: 'Chalk', swatches: ['#12161c', '#e9ecef', '#2447e6'], meta: '#E9ECEF' },
]

/** Keeps <html data-theme> and the browser chrome colour in sync with the saved theme. */
export function useApplyTheme() {
  const theme = usePrefs((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'nocturne') delete root.dataset.theme
    else root.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    const current = THEMES.find((t) => t.id === theme)
    if (meta && current) meta.setAttribute('content', current.meta)
  }, [theme])
}

export default function ThemePicker({ variant = 'panel' }) {
  const { theme, setTheme } = usePrefs()
  const onRail = variant === 'rail'
  return (
    <div role="radiogroup" aria-label="Colour theme" className={onRail ? 'flex gap-2' : 'grid grid-cols-3 gap-2'}>
      {THEMES.map((t) => {
        const active = theme === t.id
        return (
          <button key={t.id} type="button" role="radio" aria-checked={active} onClick={() => setTheme(t.id)}
            title={t.name}
            className={`press flex items-center gap-2 rounded-md border text-left ${onRail
              ? `h-9 w-9 justify-center ${active ? 'border-rail-active' : 'border-white/25 hover:border-white/60'}`
              : `h-12 px-2.5 ${active ? 'border-accent bg-plate-soft' : 'border-line hover:border-mute'}`}`}>
            <span className="flex -space-x-1.5" aria-hidden="true">
              {(onRail ? t.swatches.slice(1) : t.swatches).map((c) => (
                <span key={c} className="h-4 w-4 rounded-full ring-2 ring-panel" style={{ background: c }} />
              ))}
            </span>
            {onRail ? <span className="sr-only">{t.name}</span> : <span className="text-sm font-semibold">{t.name}</span>}
          </button>
        )
      })}
    </div>
  )
}
