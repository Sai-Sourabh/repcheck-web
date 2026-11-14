import { describe, expect, it } from 'vitest'
import {
  addDays, delta, estimateOneRm, fatigueSeed, fatigueSeries, fatigueStatus, recommend, tsbPercent, weekStartOf,
} from './math'

// These mirror the backend unit tests so demo mode and the API agree.
describe('1RM and delta', () => {
  it('uses Epley', () => {
    expect(estimateOneRm(100, 5)).toBe(116.67)
    expect(estimateOneRm(60, 10)).toBe(80)
    expect(estimateOneRm(140, 1)).toBe(140)
    expect(estimateOneRm(0, 10)).toBe(0)
  })
  it('classifies direction', () => {
    expect(delta(null, 100)).toEqual({ pct: null, direction: 'NEW' })
    expect(delta(100, 105)).toEqual({ pct: 5, direction: 'UP' })
    expect(delta(100, 92.5)).toEqual({ pct: -7.5, direction: 'DOWN' })
    expect(delta(100, 100.4).direction).toBe('SAME')
    expect(delta(93.33, 99.17).pct).toBe(6.26)
  })
})

describe('fatigue', () => {
  const constant = (v, n) => Array(n).fill(v)
  it('balances at steady load', () => {
    const last = fatigueSeries(0, 0, constant(5000, 200)).at(-1)
    expect(Math.abs(last.tsb)).toBeLessThan(10)
  })
  it('flags a doubled week as overreaching and a rest week as fresh', () => {
    const hard = fatigueSeries(4000, 4000, [...constant(4000, 60), ...constant(9000, 7)]).at(-1)
    expect(fatigueStatus(hard.atl, hard.ctl, 67)).toBe('OVERREACHING')
    const rest = fatigueSeries(5000, 5000, [...constant(5000, 60), ...constant(0, 7)]).at(-1)
    expect(fatigueStatus(rest.atl, rest.ctl, 67)).toBe('FRESH')
  })
  it('seeds from the first two weeks', () => {
    expect(fatigueSeed([...constant(1000, 14), ...constant(9000, 14)])).toBe(1000)
    expect(tsbPercent(0, 0)).toBeNull()
  })
})

describe('progression rules', () => {
  const cases = [
    [0, null, null, 'INCREASE', 8], [4, 2, 0, 'INCREASE', 6], [12, 2.5, -5, 'INCREASE', 13],
    [15.5, 1, 0, 'INCREASE', 16], [18, 3, -5, 'MAINTAIN', 18], [12, -3, -5, 'MAINTAIN', 12],
    [20, -3, -5, 'DELOAD', 12], [26, 4, 0, 'DELOAD', 16], [14, 5, -45, 'DELOAD', 8],
    [12, null, null, 'MAINTAIN', 12], [12, -0.8, 0, 'INCREASE', 13],
  ]
  it.each(cases)('chest %s sets, delta %s, tsb %s -> %s %s', (sets, d, tsb, action, suggested) => {
    const rec = recommend('CHEST', sets, d, tsb)
    expect(rec.action).toBe(action)
    expect(rec.suggestedSets).toBe(suggested)
  })
})

describe('weeks', () => {
  it('start on Monday', () => {
    expect(weekStartOf('2026-11-14')).toBe('2026-11-09')
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09')
    expect(weekStartOf('2026-11-15')).toBe('2026-11-09')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})
