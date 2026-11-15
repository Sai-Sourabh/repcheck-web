import { daysBetween, parseIso, today } from './api/math'

/** 82.5 -> "82.5", 80 -> "80", 1234.5 -> "1,234.5" */
export const num = (v, digits = 1) =>
  v == null ? '-' : Number(v).toLocaleString('en-US', { maximumFractionDigits: digits })

export const kg = (v) => `${num(v)} kg`

/** 0.5-step set counts: 12 -> "12", 12.5 -> "12.5" */
export const sets = (v) => num(v, 1)

export const shortDate = (isoDate) =>
  parseIso(isoDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export const dayMonth = (isoDate) => parseIso(isoDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function ago(isoDate) {
  const days = daysBetween(isoDate, today())
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.round(days / 7)} weeks ago`
  return `${Math.round(days / 30)} months ago`
}

/** "100 × 8", or "100 × 8 (6 clean)" when form broke before the end. */
export function setText(set) {
  const base = `${num(set.weightKg)} × ${set.reps}`
  return set.cleanReps != null && set.cleanReps < set.reps ? `${base} (${set.cleanReps} clean)` : base
}

export const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '')

export function clock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
