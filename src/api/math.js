// Same rules as the backend's domain package (OneRMCalculator, FatigueCalculator,
// ProgressionRuleEngine). Used by demo mode and the 1RM calculator.

export const round2 = (v) => Math.round(v * 100) / 100

export function estimateOneRm(weightKg, reps) {
  if (!(weightKg > 0) || !(reps > 0)) return 0
  if (reps === 1) return round2(weightKg)
  return round2(weightKg * (1 + reps / 30))
}

export const SAME_THRESHOLD_PCT = 0.5

export function delta(previous, current) {
  if (previous == null) return { pct: null, direction: 'NEW' }
  if (previous === 0) return current > 0 ? { pct: 100, direction: 'UP' } : { pct: 0, direction: 'SAME' }
  const pct = round2(((current - previous) / previous) * 100)
  if (Math.abs(pct) < SAME_THRESHOLD_PCT) return { pct, direction: 'SAME' }
  return { pct, direction: pct > 0 ? 'UP' : 'DOWN' }
}

// ---- form check: only clean reps count toward 1RM, arrows and PRs
export const CLEAN_THRESHOLD_PCT = 80

/** Reps that count as progress. Blank or missing means every rep was clean. */
export function effectiveReps(reps, cleanReps) {
  const total = Number(reps) || 0
  if (cleanReps == null || cleanReps === '') return total
  return Math.min(Math.max(Number(cleanReps) || 0, 0), total)
}

export const formPct = (totalReps, cleanReps) => (totalReps > 0 ? Math.round((cleanReps * 1000) / totalReps) / 10 : null)

/** sessions: oldest first, each { topWeightKg, totalReps, cleanReps }. Returns a warning or null. */
export function egoLift(sessions) {
  const sloppy = (s) => {
    const pct = formPct(s.totalReps, s.cleanReps)
    return pct != null && pct < CLEAN_THRESHOLD_PCT
  }
  const n = sessions.length
  if (n < 2 || !sloppy(sessions[n - 1]) || !sloppy(sessions[n - 2])) return null
  const latest = sessions[n - 1]
  for (let i = n - 3; i >= 0; i--) {
    if (sloppy(sessions[i])) continue
    if (sessions[i].topWeightKg < latest.topWeightKg) {
      return {
        message: `Form has broken down for 2 sessions since the weight went up. Drop back to ${sessions[i].topWeightKg} kg and own every rep.`,
        suggestedWeightKg: sessions[i].topWeightKg,
      }
    }
    break
  }
  return { message: 'Form has broken down for 2 sessions in a row. Lower the weight until every rep is clean.', suggestedWeightKg: null }
}

// ---- fatigue (ATL 7d, CTL 28d, TSB = CTL - ATL)
const ATL_ALPHA = 1 - Math.exp(-1 / 7)
const CTL_ALPHA = 1 - Math.exp(-1 / 28)
export const SEED_DAYS = 14
export const OVERREACHING_PCT = -30

export function fatigueSeed(loads) {
  const n = Math.min(SEED_DAYS, loads.length)
  if (n === 0) return 0
  return loads.slice(0, n).reduce((a, b) => a + b, 0) / n
}

export function fatigueSeries(startAtl, startCtl, loads) {
  let atl = startAtl
  let ctl = startCtl
  return loads.map((load) => {
    atl += (load - atl) * ATL_ALPHA
    ctl += (load - ctl) * CTL_ALPHA
    return { atl, ctl, tsb: ctl - atl }
  })
}

export const tsbPercent = (atl, ctl) => (ctl < 1e-6 ? null : ((ctl - atl) / ctl) * 100)

export function fatigueStatus(atl, ctl, daysOfData) {
  const pct = tsbPercent(atl, ctl)
  if (pct == null || daysOfData < SEED_DAYS) return 'BUILDING_BASELINE'
  if (pct < OVERREACHING_PCT) return 'OVERREACHING'
  if (pct < -10) return 'FATIGUED'
  if (pct > 10) return 'FRESH'
  return 'BALANCED'
}

export const FATIGUE_MESSAGES = {
  BUILDING_BASELINE: 'Still learning your normal training load. Give it two weeks.',
  FRESH: 'You are fresher than usual. Good time to push for PRs.',
  BALANCED: 'Load matches what you are used to. Keep going.',
  FATIGUED: 'Carrying some fatigue. Normal in a hard block, watch your lifts.',
  OVERREACHING: 'Load is far above your baseline. Plan a deload.',
}

// ---- weekly volume landmarks (sets per week): MEV, MAV, MRV
export const LANDMARKS = {
  CHEST: [8, 16, 22],
  BACK: [10, 18, 25],
  SHOULDERS: [8, 16, 22],
  BICEPS: [6, 14, 20],
  TRICEPS: [6, 12, 18],
  QUADS: [8, 14, 20],
  HAMSTRINGS: [6, 12, 18],
  GLUTES: [4, 10, 16],
  CALVES: [8, 12, 20],
  ABS: [6, 16, 25],
}
export const MUSCLES = Object.keys(LANDMARKS)

export function recommend(muscle, weeklySets, avgDeltaPct, tsbPct) {
  const [mev, mav, mrv] = LANDMARKS[muscle] || [6, 12, 20]
  const done = Math.round(weeklySets)
  const deload = Math.max(1, Math.round(weeklySets * 0.6))
  const rec = (action, reason, suggestedSets) => ({ action, reason, suggestedSets })

  if (weeklySets <= 0) return rec('INCREASE', `No sets this week. Aim for at least ${mev}.`, mev)
  if (tsbPct != null && tsbPct < OVERREACHING_PCT)
    return rec('DELOAD', 'Fatigue is well above your baseline. Cut volume for a week.', deload)
  if (weeklySets > mrv) return rec('DELOAD', `Above the most you can recover from (${mrv} sets).`, mav)
  if (weeklySets < mev)
    return rec('INCREASE', `Below the minimum that drives growth (${mev} sets).`, Math.min(mev, done + 2))
  if (avgDeltaPct == null) return rec('MAINTAIN', 'Not enough history to compare yet. Repeat this week.', done)
  if (avgDeltaPct < -1) {
    if (weeklySets >= mav) return rec('DELOAD', 'Lifts dropped at high volume. Back off and recover.', deload)
    return rec('MAINTAIN', 'Lifts dipped. Hold volume and let strength come back.', done)
  }
  if (weeklySets < mav) {
    const more = Math.max(Math.ceil(weeklySets * 1.05), Math.floor(weeklySets) + 1)
    return rec('INCREASE', 'Lifts are holding or rising and you have room to recover.', Math.min(mav, more))
  }
  return rec('MAINTAIN', 'Productive volume, close to your ceiling. Push weight, not sets.', done)
}

// ---- dates as local YYYY-MM-DD strings; weeks run Monday to Sunday
export function iso(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
export const parseIso = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const today = () => iso(new Date())
export function addDays(isoDate, days) {
  const d = parseIso(isoDate)
  d.setDate(d.getDate() + days)
  return iso(d)
}
export function weekStartOf(isoDate) {
  const d = parseIso(isoDate)
  return addDays(isoDate, -((d.getDay() + 6) % 7))
}
export const daysBetween = (a, b) => Math.round((parseIso(b) - parseIso(a)) / 86400000)
