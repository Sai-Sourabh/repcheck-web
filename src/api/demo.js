// Demo mode: the whole API implemented in the browser on top of localStorage,
// returning the same shapes as the Spring Boot backend. Lets the site run
// with no server. Switch to the real API by setting VITE_API_URL.
import {
  FATIGUE_MESSAGES, LANDMARKS, MUSCLES, SEED_DAYS, addDays, daysBetween, delta, effectiveReps, egoLift,
  estimateOneRm, fatigueSeed, fatigueSeries, fatigueStatus, formPct, recommend, round2, today, tsbPercent,
  weekStartOf,
} from './math'
import { EXERCISES, buildDemoState } from './seed'

const KEY = 'repcheck-demo-v2'
let state = null

function load() {
  if (state) return state
  try {
    state = JSON.parse(localStorage.getItem(KEY))
  } catch {
    state = null
  }
  if (!state) {
    state = buildDemoState()
    save()
  }
  return state
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable: keep working from memory */
  }
}
export function resetDemo() {
  state = buildDemoState()
  save()
}

const uid = () => 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
const fail = (status, message) => Object.assign(new Error(message), { status })
const clone = (v) => JSON.parse(JSON.stringify(v))

const allExercises = () => [...EXERCISES, ...load().customExercises]
const exerciseMap = () => new Map(allExercises().map((e) => [e.id, e]))
const sortedSessions = () =>
  [...load().sessions].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.createdAt - b.createdAt)
const sessionVolume = (s) => round2(s.sets.reduce((sum, x) => sum + x.weightKg * x.reps, 0))

/** exerciseId -> chain of per-session rows, oldest first. Same logic as HistoryService. */
function histories() {
  const chains = new Map()
  for (const session of sortedSessions()) {
    const byExercise = new Map()
    for (const set of session.sets) {
      if (!byExercise.has(set.exerciseId)) byExercise.set(set.exerciseId, [])
      byExercise.get(set.exerciseId).push(set)
    }
    for (const [exerciseId, sets] of byExercise) {
      let best = null
      let volume = 0
      let topWeightKg = 0
      let totalReps = 0
      let cleanReps = 0
      for (const set of sets) {
        // Volume counts every rep; progress counts clean reps only.
        const clean = effectiveReps(set.reps, set.cleanReps)
        const oneRm = estimateOneRm(set.weightKg, clean)
        volume += set.weightKg * set.reps
        topWeightKg = Math.max(topWeightKg, set.weightKg)
        totalReps += set.reps
        cleanReps += clean
        if (!best || oneRm > best.oneRm || (oneRm === best.oneRm && clean > best.reps)) best = { ...set, reps: clean, oneRm }
      }
      const chain = chains.get(exerciseId) || []
      const metric = best.oneRm > 0 ? best.oneRm : best.reps
      const previous = chain.at(-1)
      const bestEver = chain.reduce((m, r) => Math.max(m, r.metric), 0)
      const d = delta(previous ? previous.metric : null, metric)
      chain.push({
        exerciseId, sessionId: session.id, sessionDate: session.sessionDate, metric, bestOneRm: best.oneRm,
        bestWeightKg: best.weightKg, bestReps: best.reps, totalVolumeKg: round2(volume), totalSets: sets.length,
        deltaPct: d.pct, deltaDirection: d.direction, pr: !!previous && metric > bestEver,
        topWeightKg, totalReps, cleanReps, formPct: formPct(totalReps, cleanReps),
      })
      chains.set(exerciseId, chain)
    }
  }
  return chains
}

function dailyLoad() {
  const sessions = sortedSessions()
  if (!sessions.length) return []
  const first = sessions[0].sessionDate
  const byDate = new Map()
  for (const s of sessions) byDate.set(s.sessionDate, (byDate.get(s.sessionDate) || 0) + sessionVolume(s))
  const loads = []
  const dates = []
  for (let d = first; d <= today(); d = addDays(d, 1)) {
    dates.push(d)
    loads.push(byDate.get(d) || 0)
  }
  const seed = fatigueSeed(loads)
  return fatigueSeries(seed, seed, loads).map((p, i) => ({
    date: dates[i], volumeKg: loads[i], atl: round2(p.atl), ctl: round2(p.ctl), tsb: round2(p.tsb),
  }))
}

function buildWeek(weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const exercises = exerciseMap()
  const totals = Object.fromEntries(MUSCLES.map((m) => [m, { sets: 0, volume: 0 }]))
  for (const session of load().sessions) {
    if (session.sessionDate < weekStart || session.sessionDate > weekEnd) continue
    for (const set of session.sets) {
      const exercise = exercises.get(set.exerciseId)
      if (!exercise || !totals[exercise.muscleGroup]) continue
      totals[exercise.muscleGroup].sets += 1
      totals[exercise.muscleGroup].volume += set.weightKg * set.reps
      for (const secondary of exercise.secondaryMuscles) if (totals[secondary]) totals[secondary].sets += 0.5
    }
  }
  const deltas = {}
  for (const [exerciseId, chain] of histories()) {
    const muscle = exercises.get(exerciseId)?.muscleGroup
    for (const row of chain) {
      if (row.sessionDate < weekStart || row.sessionDate > weekEnd || row.deltaPct == null) continue
      deltas[muscle] = deltas[muscle] || { sum: 0, count: 0 }
      deltas[muscle].sum += row.deltaPct
      deltas[muscle].count += 1
    }
  }
  const load_ = dailyLoad()
  const day = weekEnd > today() ? today() : weekEnd
  const point = [...load_].reverse().find((p) => p.date <= day)
  const tsbPct = point && daysBetween(load_[0].date, day) + 1 >= SEED_DAYS ? tsbPercent(point.atl, point.ctl) : null
  return MUSCLES.map((muscle) => {
    const avg = deltas[muscle] ? deltas[muscle].sum / deltas[muscle].count : null
    const rec = recommend(muscle, totals[muscle].sets, avg, tsbPct)
    return {
      muscleGroup: muscle, totalSets: totals[muscle].sets, totalVolumeKg: round2(totals[muscle].volume),
      recommendation: rec.action, reason: rec.reason, suggestedSets: rec.suggestedSets,
    }
  })
}

function weekProgress(type, weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const inWeek = (d) => d >= weekStart && d <= weekEnd
  if (type === 'WORKOUT') return load().sessions.filter((s) => inWeek(s.sessionDate)).length
  return load().cardio.filter((c) => inWeek(c.sessionDate)).reduce((sum, c) => sum + (c.steps || 0), 0)
}

function streak(type) {
  const { user, sessions, cardio } = load()
  const goal = type === 'WORKOUT' ? user.weeklyWorkoutGoal : user.weeklyStepsGoal
  const dates = (type === 'WORKOUT' ? sessions.map((s) => s.sessionDate) : cardio.map((c) => c.sessionDate)).sort()
  const thisWeek = weekStartOf(today())
  let current = 0
  let longest = 0
  let tokens = 1
  for (let week = dates.length ? weekStartOf(dates[0]) : thisWeek; week < thisWeek; week = addDays(week, 7)) {
    if (weekProgress(type, week) >= goal) {
      current += 1
      longest = Math.max(longest, current)
      if (current % 4 === 0 && tokens < 2) tokens += 1
    } else if (current > 0 && tokens > 0) {
      tokens -= 1
    } else {
      current = 0
    }
  }
  const progress = weekProgress(type, thisWeek)
  const met = progress >= goal
  const shown = current + (met ? 1 : 0)
  return {
    type, currentStreak: shown, longestStreak: Math.max(longest, shown), freezeTokens: tokens,
    weekProgress: progress, weekGoal: goal, goalMetThisWeek: met,
  }
}

function detail(session) {
  const exercises = exerciseMap()
  const chains = histories()
  const blocks = []
  const counters = {}
  for (const set of session.sets) {
    let block = blocks.find((b) => b.exerciseId === set.exerciseId)
    if (!block) {
      const exercise = exercises.get(set.exerciseId)
      const row = (chains.get(set.exerciseId) || []).find((r) => r.sessionId === session.id)
      block = {
        exerciseId: set.exerciseId, exerciseName: exercise?.name || 'Unknown', muscleGroup: exercise?.muscleGroup,
        bestOneRm: row?.bestOneRm || 0, deltaPct: row?.deltaPct ?? null, deltaDirection: row?.deltaDirection || 'NEW',
        pr: !!row?.pr, formPct: row?.formPct ?? null, sets: [],
      }
      blocks.push(block)
    }
    counters[set.exerciseId] = (counters[set.exerciseId] || 0) + 1
    block.sets.push({
      setNumber: counters[set.exerciseId], weightKg: set.weightKg, reps: set.reps, cleanReps: set.cleanReps ?? null,
      estimatedOneRm: estimateOneRm(set.weightKg, effectiveReps(set.reps, set.cleanReps)), restSeconds: set.restSeconds ?? null,
    })
  }
  return {
    id: session.id, name: session.name, sessionDate: session.sessionDate, durationMinutes: session.durationMinutes,
    notes: session.notes, totalVolumeKg: sessionVolume(session), templateId: session.templateId || null, exercises: blocks,
  }
}

function templateResponse(template) {
  const exercises = exerciseMap()
  return {
    ...template,
    days: template.days.map((day) => ({
      name: day.name,
      exercises: day.exercises.filter((e) => exercises.has(e.exerciseId)).map((e) => ({
        ...e, exerciseName: exercises.get(e.exerciseId).name, muscleGroup: exercises.get(e.exerciseId).muscleGroup,
      })),
    })),
  }
}
function templateFromRequest(body) {
  if (!body.name?.trim()) throw fail(400, 'Give the plan a name')
  if (!body.days?.length) throw fail(400, 'Add at least one day')
  return {
    name: body.name.trim(), splitType: body.splitType?.trim() || null,
    days: body.days.map((d) => ({
      name: d.name.trim(),
      exercises: (d.exercises || []).map((e) => ({ exerciseId: e.exerciseId, targetSets: e.targetSets, targetReps: e.targetReps })),
    })),
  }
}

const cardioResponse = (c) => ({
  ...c,
  paceMinPerKm: c.distanceKm > 0 && c.durationMinutes > 0 ? round2(c.durationMinutes / c.distanceKm) : null,
})

// Every method resolves on the next tick so callers see the same async behaviour as fetch.
const later = (fn) => new Promise((resolve, reject) => {
  setTimeout(() => {
    try {
      resolve(clone(fn() ?? null))
    } catch (e) {
      reject(e)
    }
  }, 0)
})

export const demoApi = {
  register: () => later(() => ({ token: 'demo', user: load().user })),
  login: () => later(() => ({ token: 'demo', user: load().user })),
  me: () => later(() => load().user),
  updateProfile: (body) => later(() => {
    Object.assign(load().user, Object.fromEntries(Object.entries(body).filter(([, v]) => v != null && v !== '')))
    save()
    return state.user
  }),

  listExercises: () => later(() => allExercises().sort((a, b) => a.name.localeCompare(b.name))),
  createExercise: (body) => later(() => {
    if (!body.name?.trim()) throw fail(400, 'Name the exercise')
    const exercise = {
      id: uid(), name: body.name.trim(), muscleGroup: body.muscleGroup, equipment: body.equipment,
      secondaryMuscles: (body.secondaryMuscles || []).filter((m) => m !== body.muscleGroup),
      category: body.category, custom: true,
    }
    load().customExercises.push(exercise)
    save()
    return exercise
  }),
  deleteExercise: (id) => later(() => {
    if (load().sessions.some((s) => s.sets.some((x) => x.exerciseId === id)))
      throw fail(409, 'This exercise has logged sets and cannot be deleted')
    state.customExercises = state.customExercises.filter((e) => e.id !== id)
    save()
  }),

  listTemplates: () => later(() => load().templates.map(templateResponse)),
  createTemplate: (body) => later(() => {
    const template = { id: uid(), createdAt: new Date().toISOString(), ...templateFromRequest(body) }
    load().templates.unshift(template)
    save()
    return templateResponse(template)
  }),
  updateTemplate: (id, body) => later(() => {
    const template = load().templates.find((t) => t.id === id)
    if (!template) throw fail(404, 'Template not found')
    Object.assign(template, templateFromRequest(body))
    save()
    return templateResponse(template)
  }),
  deleteTemplate: (id) => later(() => {
    load().templates = state.templates.filter((t) => t.id !== id)
    save()
  }),

  createWorkout: (body) => later(() => {
    if (!body.sets?.length) throw fail(400, 'Log at least one set')
    const date = body.sessionDate || today()
    if (date > today()) throw fail(400, 'sessionDate cannot be in the future')
    const session = {
      id: uid(), name: body.name?.trim() || null, sessionDate: date, templateId: body.templateId || null,
      durationMinutes: body.durationMinutes ?? null, notes: body.notes || null, createdAt: Date.now(),
      sets: body.sets.map((s) => {
        const reps = Number(s.reps)
        if (s.cleanReps != null && Number(s.cleanReps) > reps) throw fail(400, 'cleanReps cannot be more than reps')
        const cleanReps = s.cleanReps != null && Number(s.cleanReps) < reps ? Number(s.cleanReps) : null
        return { exerciseId: s.exerciseId, weightKg: Number(s.weightKg), reps, cleanReps, restSeconds: s.restSeconds ?? null }
      }),
    }
    load().sessions.push(session)
    save()
    return detail(session)
  }),
  listWorkouts: (page = 0, size = 20) => later(() => {
    const all = sortedSessions().reverse()
    const chains = [...histories().values()].flat()
    const items = all.slice(page * size, page * size + size).map((s) => {
      const rows = chains.filter((r) => r.sessionId === s.id)
      return {
        id: s.id, name: s.name, sessionDate: s.sessionDate, durationMinutes: s.durationMinutes,
        totalVolumeKg: sessionVolume(s), exerciseCount: new Set(s.sets.map((x) => x.exerciseId)).size,
        setCount: s.sets.length, upCount: rows.filter((r) => r.deltaDirection === 'UP').length,
        downCount: rows.filter((r) => r.deltaDirection === 'DOWN').length, prCount: rows.filter((r) => r.pr).length,
      }
    })
    return { items, page, size, total: all.length }
  }),
  getWorkout: (id) => later(() => {
    const session = load().sessions.find((s) => s.id === id)
    if (!session) throw fail(404, 'Workout not found')
    return detail(session)
  }),
  deleteWorkout: (id) => later(() => {
    load().sessions = state.sessions.filter((s) => s.id !== id)
    save()
  }),
  previous: (exerciseIds) => later(() => {
    const chains = histories()
    return exerciseIds.filter((id) => chains.has(id)).map((id) => {
      const last = chains.get(id).at(-1)
      const session = load().sessions.find((s) => s.id === last.sessionId)
      return {
        exerciseId: id, sessionDate: last.sessionDate, bestOneRm: last.bestOneRm,
        sets: session.sets.filter((s) => s.exerciseId === id).map((s, i) => ({
          setNumber: i + 1, weightKg: s.weightKg, reps: s.reps, cleanReps: s.cleanReps ?? null,
          estimatedOneRm: estimateOneRm(s.weightKg, effectiveReps(s.reps, s.cleanReps)), restSeconds: s.restSeconds ?? null,
        })),
      }
    })
  }),

  lifts: () => later(() => {
    const exercises = exerciseMap()
    return [...histories()].filter(([id]) => exercises.has(id)).map(([id, chain]) => {
      const latest = chain.at(-1)
      const e = exercises.get(id)
      const warning = egoLift(chain)
      return {
        exerciseId: id, exerciseName: e.name, muscleGroup: e.muscleGroup, sessionDate: latest.sessionDate,
        bestOneRm: latest.bestOneRm, bestWeightKg: latest.bestWeightKg, bestReps: latest.bestReps,
        deltaPct: latest.deltaPct, deltaDirection: latest.deltaDirection, pr: latest.pr,
        formPct: latest.formPct, formWarning: warning?.message ?? null, suggestedWeightKg: warning?.suggestedWeightKg ?? null,
        trend: chain.slice(-8).map((r) => r.bestOneRm),
      }
    }).sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || a.exerciseName.localeCompare(b.exerciseName))
  }),
  exerciseHistory: (id) => later(() => (histories().get(id) || []).map(({ metric, sessionId, exerciseId, totalSets, topWeightKg, totalReps, cleanReps, ...row }) => row)),
  volume: (date) => later(() => {
    const weekStart = weekStartOf(date || today())
    const previous = Object.fromEntries(buildWeek(addDays(weekStart, -7)).map((m) => [m.muscleGroup, m]))
    const muscles = buildWeek(weekStart).map((m) => {
      const [mev, mav, mrv] = LANDMARKS[m.muscleGroup]
      return { ...m, previousWeekSets: previous[m.muscleGroup].totalSets, targetSets: previous[m.muscleGroup].suggestedSets, mev, mav, mrv }
    })
    return {
      weekStart, weekEnd: addDays(weekStart, 6), complete: addDays(weekStart, 6) < today(),
      totalSets: muscles.reduce((s, m) => s + m.totalSets, 0),
      totalVolumeKg: round2(muscles.reduce((s, m) => s + m.totalVolumeKg, 0)), muscles,
    }
  }),
  fatigue: (days = 90) => later(() => {
    const all = dailyLoad()
    if (!all.length)
      return { status: 'BUILDING_BASELINE', message: 'Log a few workouts and your fatigue trend will show up here.', tsbPercent: null, points: [] }
    const latest = all.at(-1)
    const status = fatigueStatus(latest.atl, latest.ctl, all.length)
    const pct = tsbPercent(latest.atl, latest.ctl)
    return { status, message: FATIGUE_MESSAGES[status], tsbPercent: pct == null ? null : round2(pct), points: all.slice(-days) }
  }),
  heatmap: (days = 365) => later(() => {
    const from = addDays(today(), -(days - 1))
    const byDate = new Map()
    for (const s of load().sessions) {
      if (s.sessionDate < from) continue
      const entry = byDate.get(s.sessionDate) || { date: s.sessionDate, volumeKg: 0, sessions: 0 }
      entry.volumeKg = round2(entry.volumeKg + sessionVolume(s))
      entry.sessions += 1
      byDate.set(s.sessionDate, entry)
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  }),
  balance: () => later(() => {
    const exercises = exerciseMap()
    const from = addDays(today(), -27)
    const byMuscle = Object.fromEntries(MUSCLES.map((m) => [m, 0]))
    const byCategory = { PUSH: 0, PULL: 0, LEGS: 0, CORE: 0 }
    for (const session of load().sessions) {
      if (session.sessionDate < from) continue
      for (const set of session.sets) {
        const e = exercises.get(set.exerciseId)
        if (!e) continue
        byMuscle[e.muscleGroup] += 1
        for (const secondary of e.secondaryMuscles) byMuscle[secondary] += 0.5
        byCategory[e.category] += 1
      }
    }
    return {
      pushSets: byCategory.PUSH, pullSets: byCategory.PULL, legSets: byCategory.LEGS, coreSets: byCategory.CORE,
      pushPullRatio: byCategory.PULL ? round2(byCategory.PUSH / byCategory.PULL) : null,
      muscles: MUSCLES.map((m) => ({ muscleGroup: m, sets: byMuscle[m] })),
    }
  }),
  prs: () => later(() => {
    const exercises = exerciseMap()
    return [...histories()].filter(([id]) => exercises.has(id)).map(([id, chain]) => {
      const best = chain.reduce((b, r) => (r.bestOneRm > b.bestOneRm || (r.bestOneRm === b.bestOneRm && r.bestReps > b.bestReps) ? r : b))
      const e = exercises.get(id)
      return {
        exerciseId: id, exerciseName: e.name, muscleGroup: e.muscleGroup, sessionDate: best.sessionDate,
        bestOneRm: best.bestOneRm, bestWeightKg: best.bestWeightKg, bestReps: best.bestReps,
      }
    }).sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
  }),

  streaks: () => later(() => ({ workout: streak('WORKOUT'), steps: streak('STEPS') })),
  logCardio: (body) => later(() => {
    if (body.steps == null && body.distanceKm == null && body.durationMinutes == null)
      throw fail(400, 'Provide steps, distanceKm or durationMinutes')
    const entry = {
      id: uid(), sessionDate: body.sessionDate || today(), activityType: body.activityType,
      distanceKm: body.distanceKm ?? null, durationMinutes: body.durationMinutes ?? null,
      steps: body.steps ?? null, avgHeartRate: body.avgHeartRate ?? null,
    }
    if (entry.sessionDate > today()) throw fail(400, 'sessionDate cannot be in the future')
    load().cardio.push(entry)
    save()
    return cardioResponse(entry)
  }),
  listCardio: (days = 30) => later(() => {
    const from = addDays(today(), -(days - 1))
    return load().cardio.filter((c) => c.sessionDate >= from)
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).map(cardioResponse)
  }),
  deleteCardio: (id) => later(() => {
    load().cardio = state.cardio.filter((c) => c.id !== id)
    save()
  }),
  stepsWeek: (date) => later(() => {
    const weekStart = weekStartOf(date || today())
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      return { date: day, steps: load().cardio.filter((c) => c.sessionDate === day).reduce((s, c) => s + (c.steps || 0), 0) }
    })
    return { weekStart, goal: load().user.weeklyStepsGoal, totalSteps: days.reduce((s, d) => s + d.steps, 0), days }
  }),
  logBodyWeight: (body) => later(() => {
    const logDate = body.logDate || today()
    const logs = load().bodyWeight.filter((l) => l.logDate !== logDate)
    logs.push({ logDate, weightKg: Number(body.weightKg) })
    logs.sort((a, b) => a.logDate.localeCompare(b.logDate))
    state.bodyWeight = logs
    state.user.bodyWeightKg = logs.at(-1).weightKg
    save()
    return { logDate, weightKg: Number(body.weightKg) }
  }),
  listBodyWeight: (days = 180) => later(() => {
    const from = addDays(today(), -(days - 1))
    return load().bodyWeight.filter((l) => l.logDate >= from)
  }),
}
