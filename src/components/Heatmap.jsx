import { useEffect, useMemo, useRef } from 'react'
import { addDays, parseIso, today, weekStartOf } from '../api/math'
import { kg, shortDate } from '../format'

const WEEKS = 53
const SHADES = [0, 1, 2, 3, 4].map((i) => `var(--color-heat-${i})`)
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

/** GitHub-style year of training. One brick per day, darker = more volume lifted. */
export default function Heatmap({ days }) {
  const scroller = useRef(null)

  const { columns, months, thresholds } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]))
    const volumes = days.map((d) => d.volumeKg).filter((v) => v > 0).sort((a, b) => a - b)
    const q = (p) => volumes[Math.min(volumes.length - 1, Math.floor(volumes.length * p))] || 0
    const thresholds = [q(0.25), q(0.5), q(0.8)]
    const end = today()
    const start = addDays(weekStartOf(end), -7 * (WEEKS - 1))
    const columns = []
    const months = []
    let lastMonth = -1
    for (let w = 0; w < WEEKS; w++) {
      const weekStart = addDays(start, w * 7)
      const month = parseIso(weekStart).getMonth()
      if (month !== lastMonth) {
        months.push({ column: w, label: parseIso(weekStart).toLocaleDateString('en-GB', { month: 'short' }) })
        lastMonth = month
      }
      columns.push(Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i)
        return date > end ? null : { date, ...(byDate.get(date) || { volumeKg: 0, sessions: 0 }) }
      }))
    }
    return { columns, months, thresholds }
  }, [days])

  // Start scrolled to the most recent weeks on narrow screens.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [columns])

  const shade = (v) => (v <= 0 ? 0 : v <= thresholds[0] ? 1 : v <= thresholds[1] ? 2 : v <= thresholds[2] ? 3 : 4)

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto px-4 pb-2">
        <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: `28px repeat(${WEEKS}, 13px)`, gridTemplateRows: 'auto repeat(7, 13px)' }}>
          {months.map((m) => (
            <span key={m.column} className="text-[11px] leading-4 text-mute" style={{ gridColumn: m.column + 2, gridRow: 1 }}>{m.label}</span>
          ))}
          {DAY_LABELS.map((label, i) => (
            <span key={i} className="text-[11px] leading-[13px] text-mute" style={{ gridColumn: 1, gridRow: i + 2 }}>{label}</span>
          ))}
          {columns.map((week, w) =>
            week.map((day, i) =>
              day && (
                <span
                  key={day.date}
                  title={day.sessions ? `${shortDate(day.date)}: ${kg(day.volumeKg)} lifted` : `${shortDate(day.date)}: rest`}
                  className="brick-in rounded-[3px]"
                  style={{ gridColumn: w + 2, gridRow: i + 2, background: SHADES[shade(day.volumeKg)], animationDelay: `${w * 12}ms` }}
                />
              ),
            ),
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 px-4 pb-4 text-[11px] text-mute">
        Less
        {SHADES.map((c) => <span key={c} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: c }} />)}
        More volume
      </div>
    </div>
  )
}
