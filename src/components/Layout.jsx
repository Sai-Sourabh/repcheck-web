import { NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DEMO } from '../api'
import { resetDemo } from '../api/demo'
import { useDraft } from '../store'
import ThemePicker from './ThemePicker'

const icon = (d) => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const NAV = [
  { to: '/', label: 'Today', icon: icon('M4 19V9m5 10V5m5 14v-7m5 7V8') },
  { to: '/log', label: 'Log', icon: icon('M2 12h2m16 0h2M6 7v10M18 7v10M6 12h12M9 9v6m6-6v6') },
  { to: '/history', label: 'History', icon: icon('M5 6h14M5 12h14M5 18h9') },
  { to: '/progress', label: 'Progress', icon: icon('M4 17l5-6 4 3 7-9M15 5h5v5') },
  { to: '/plans', label: 'Plans', icon: icon('M7 4h10a1 1 0 011 1v15H6V5a1 1 0 011-1zm2 5h6m-6 4h6m-6 4h3') },
  { to: '/activity', label: 'Activity', icon: icon('M4 13h3l2-6 4 11 2-5h5') },
]

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="var(--color-plate)" />
        <path d="M8 20l6-8 4 5 6-8" fill="none" stroke="var(--color-on-plate)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="num text-2xl font-extrabold tracking-tight">RepCheck</span>
    </span>
  )
}

export default function Layout({ children }) {
  const queryClient = useQueryClient()
  const draftActive = useDraft((s) => s.active)

  const reset = () => {
    if (!window.confirm('Reset the demo? This restores the sample data and removes anything you logged here.')) return
    resetDemo()
    useDraft.getState().discard()
    queryClient.invalidateQueries()
  }

  return (
    <div className="min-h-dvh md:pl-56">
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col bg-rail px-3 py-5 text-on-solid md:flex">
        <div className="px-2"><Logo /></div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `press flex h-11 items-center gap-3 rounded-md px-3 text-[15px] font-semibold ${isActive ? 'bg-rail-active text-on-rail-active' : 'text-rail-text hover:bg-white/10 hover:text-on-solid'}`}>
              {item.icon}
              {item.label}
              {item.to === '/log' && draftActive && <span className="ml-auto h-2 w-2 rounded-full bg-up" aria-label="Workout in progress" />}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-1"><ThemePicker variant="rail" /></div>
      </aside>

      {DEMO && (
        <div className="flex items-center justify-between gap-3 bg-solid px-4 py-2 text-sm text-on-solid">
          <span>Demo data, saved in this browser only.</span>
          <button type="button" onClick={reset} className="shrink-0 font-semibold underline underline-offset-2">Reset demo</button>
        </div>
      )}

      <header className="flex items-center justify-between px-4 pt-4 md:hidden"><Logo /></header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-panel/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) => `press relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? 'text-accent' : 'text-mute'}`}>
            {item.icon}
            {item.label}
            {item.to === '/log' && draftActive && <span className="absolute top-2 right-1/4 h-2 w-2 rounded-full bg-up" aria-label="Workout in progress" />}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
