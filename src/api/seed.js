// Built-in exercise library and the sample training history used in demo mode.
import { addDays, daysBetween, parseIso, today, weekStartOf } from './math'

const E = (name, muscleGroup, secondary, equipment, category) => ({
  id: 'ex-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name, muscleGroup, secondaryMuscles: secondary ? secondary.split(',') : [], equipment, category, custom: false,
})

export const EXERCISES = [
  E('Barbell Bench Press', 'CHEST', 'TRICEPS,SHOULDERS', 'BARBELL', 'PUSH'),
  E('Incline Barbell Bench Press', 'CHEST', 'SHOULDERS,TRICEPS', 'BARBELL', 'PUSH'),
  E('Dumbbell Bench Press', 'CHEST', 'TRICEPS,SHOULDERS', 'DUMBBELL', 'PUSH'),
  E('Incline Dumbbell Press', 'CHEST', 'SHOULDERS,TRICEPS', 'DUMBBELL', 'PUSH'),
  E('Machine Chest Press', 'CHEST', 'TRICEPS', 'MACHINE', 'PUSH'),
  E('Cable Fly', 'CHEST', '', 'CABLE', 'PUSH'),
  E('Pec Deck', 'CHEST', '', 'MACHINE', 'PUSH'),
  E('Push Up', 'CHEST', 'TRICEPS,SHOULDERS', 'BODYWEIGHT', 'PUSH'),
  E('Chest Dip', 'CHEST', 'TRICEPS', 'BODYWEIGHT', 'PUSH'),
  E('Deadlift', 'BACK', 'HAMSTRINGS,GLUTES', 'BARBELL', 'PULL'),
  E('Barbell Row', 'BACK', 'BICEPS', 'BARBELL', 'PULL'),
  E('Pull Up', 'BACK', 'BICEPS', 'BODYWEIGHT', 'PULL'),
  E('Chin Up', 'BACK', 'BICEPS', 'BODYWEIGHT', 'PULL'),
  E('Lat Pulldown', 'BACK', 'BICEPS', 'CABLE', 'PULL'),
  E('Seated Cable Row', 'BACK', 'BICEPS', 'CABLE', 'PULL'),
  E('Single Arm Dumbbell Row', 'BACK', 'BICEPS', 'DUMBBELL', 'PULL'),
  E('T-Bar Row', 'BACK', 'BICEPS', 'BARBELL', 'PULL'),
  E('Chest Supported Row', 'BACK', 'BICEPS', 'MACHINE', 'PULL'),
  E('Straight Arm Pulldown', 'BACK', '', 'CABLE', 'PULL'),
  E('Overhead Press', 'SHOULDERS', 'TRICEPS', 'BARBELL', 'PUSH'),
  E('Seated Dumbbell Press', 'SHOULDERS', 'TRICEPS', 'DUMBBELL', 'PUSH'),
  E('Machine Shoulder Press', 'SHOULDERS', 'TRICEPS', 'MACHINE', 'PUSH'),
  E('Dumbbell Lateral Raise', 'SHOULDERS', '', 'DUMBBELL', 'PUSH'),
  E('Cable Lateral Raise', 'SHOULDERS', '', 'CABLE', 'PUSH'),
  E('Face Pull', 'SHOULDERS', 'BACK', 'CABLE', 'PULL'),
  E('Reverse Pec Deck', 'SHOULDERS', 'BACK', 'MACHINE', 'PULL'),
  E('Barbell Curl', 'BICEPS', '', 'BARBELL', 'PULL'),
  E('EZ Bar Curl', 'BICEPS', '', 'BARBELL', 'PULL'),
  E('Dumbbell Curl', 'BICEPS', '', 'DUMBBELL', 'PULL'),
  E('Hammer Curl', 'BICEPS', '', 'DUMBBELL', 'PULL'),
  E('Incline Dumbbell Curl', 'BICEPS', '', 'DUMBBELL', 'PULL'),
  E('Preacher Curl', 'BICEPS', '', 'MACHINE', 'PULL'),
  E('Cable Curl', 'BICEPS', '', 'CABLE', 'PULL'),
  E('Close Grip Bench Press', 'TRICEPS', 'CHEST', 'BARBELL', 'PUSH'),
  E('Triceps Pushdown', 'TRICEPS', '', 'CABLE', 'PUSH'),
  E('Overhead Cable Extension', 'TRICEPS', '', 'CABLE', 'PUSH'),
  E('Skull Crusher', 'TRICEPS', '', 'BARBELL', 'PUSH'),
  E('Dumbbell Overhead Extension', 'TRICEPS', '', 'DUMBBELL', 'PUSH'),
  E('Triceps Dip', 'TRICEPS', 'CHEST', 'BODYWEIGHT', 'PUSH'),
  E('Back Squat', 'QUADS', 'GLUTES,HAMSTRINGS', 'BARBELL', 'LEGS'),
  E('Front Squat', 'QUADS', 'GLUTES', 'BARBELL', 'LEGS'),
  E('Leg Press', 'QUADS', 'GLUTES', 'MACHINE', 'LEGS'),
  E('Hack Squat', 'QUADS', 'GLUTES', 'MACHINE', 'LEGS'),
  E('Leg Extension', 'QUADS', '', 'MACHINE', 'LEGS'),
  E('Bulgarian Split Squat', 'QUADS', 'GLUTES', 'DUMBBELL', 'LEGS'),
  E('Walking Lunge', 'QUADS', 'GLUTES', 'DUMBBELL', 'LEGS'),
  E('Goblet Squat', 'QUADS', 'GLUTES', 'DUMBBELL', 'LEGS'),
  E('Romanian Deadlift', 'HAMSTRINGS', 'GLUTES,BACK', 'BARBELL', 'LEGS'),
  E('Lying Leg Curl', 'HAMSTRINGS', '', 'MACHINE', 'LEGS'),
  E('Seated Leg Curl', 'HAMSTRINGS', '', 'MACHINE', 'LEGS'),
  E('Good Morning', 'HAMSTRINGS', 'GLUTES,BACK', 'BARBELL', 'LEGS'),
  E('Hip Thrust', 'GLUTES', 'HAMSTRINGS', 'BARBELL', 'LEGS'),
  E('Cable Kickback', 'GLUTES', '', 'CABLE', 'LEGS'),
  E('Glute Bridge', 'GLUTES', 'HAMSTRINGS', 'BODYWEIGHT', 'LEGS'),
  E('Standing Calf Raise', 'CALVES', '', 'MACHINE', 'LEGS'),
  E('Seated Calf Raise', 'CALVES', '', 'MACHINE', 'LEGS'),
  E('Cable Crunch', 'ABS', '', 'CABLE', 'CORE'),
  E('Hanging Leg Raise', 'ABS', '', 'BODYWEIGHT', 'CORE'),
  E('Ab Wheel Rollout', 'ABS', '', 'BODYWEIGHT', 'CORE'),
  E('Plank', 'ABS', '', 'BODYWEIGHT', 'CORE'),
]

const id = (name) => EXERCISES.find((e) => e.name === name).id

// name, start kg, weekly gain, sets, reps, step kg, ending: how the last session goes.
// 'ego' adds weight for the last two sessions while form falls apart.
const PLAN = {
  Push: [
    ['Barbell Bench Press', 70, 0.012, 4, 6, 2.5, 'up'],
    ['Incline Dumbbell Press', 24, 0.01, 3, 9, 2, 'flat'],
    ['Overhead Press', 42.5, 0.008, 3, 6, 2.5, 'ego'],
    ['Dumbbell Lateral Raise', 9, 0.012, 4, 14, 1, 'dip'],
    ['Triceps Pushdown', 25, 0.012, 3, 12, 2.5, 'up'],
  ],
  Pull: [
    ['Deadlift', 110, 0.012, 3, 5, 2.5, 'up'],
    ['Barbell Row', 60, 0.01, 4, 8, 2.5, 'up'],
    ['Lat Pulldown', 55, 0.01, 3, 10, 2.5, 'flat'],
    ['Face Pull', 20, 0.01, 3, 15, 2.5, 'up'],
    ['Barbell Curl', 27.5, 0.008, 3, 10, 2.5, 'dip'],
  ],
  Legs: [
    ['Back Squat', 90, 0.012, 4, 5, 2.5, 'up'],
    ['Romanian Deadlift', 80, 0.01, 3, 8, 2.5, 'up'],
    ['Leg Press', 140, 0.012, 3, 10, 5, 'flat'],
    ['Lying Leg Curl', 35, 0.01, 3, 12, 2.5, 'up'],
    ['Standing Calf Raise', 60, 0.01, 4, 12, 5, 'up'],
    ['Cable Crunch', 30, 0.01, 3, 15, 2.5, 'flat'],
  ],
}
const WEEK = [[0, 'Push'], [1, 'Pull'], [3, 'Legs'], [5, 'Push'], [6, 'Pull']]
const WEEKS = 14
const MISSED_WEEK = 8 // one thin week mid-block, so the streak shows a freeze being used

function rng(seed) {
  let s = seed
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
}

export function buildDemoState() {
  const now = today()
  const start = addDays(weekStartOf(now), -7 * (WEEKS - 1))
  const random = rng(42)
  const sessions = []
  const lastSeen = {}

  const schedule = []
  for (let week = 0; week < WEEKS; week++) {
    for (const [dayOffset, day] of WEEK) {
      const date = addDays(start, week * 7 + dayOffset)
      if (date > now || (week === MISSED_WEEK && dayOffset > 0)) continue
      schedule.push({ week, day, date })
    }
  }

  schedule.forEach(({ week, day, date }, index) => {
    const sessionsLeft = schedule.slice(index + 1).filter((s) => s.day === day).length
    const isLast = sessionsLeft === 0
    const sets = []
    for (const [name, base, gain, setCount, reps, step, ending] of PLAN[day]) {
      // A soft patch in weeks 9-10 gives the history a few red arrows.
      const slump = week === 9 || week === 10 ? 0.97 : 1
      let weight = Math.round((base * (1 + gain * week) * slump) / step) * step
      let repAdjust = random() < 0.25 ? -1 : random() < 0.2 ? 1 : 0
      if (isLast && lastSeen[name]) {
        if (ending === 'flat') { weight = lastSeen[name].weight; repAdjust = lastSeen[name].repAdjust }
        if (ending === 'dip') { weight = lastSeen[name].weight; repAdjust = lastSeen[name].repAdjust - 2 }
        if (ending === 'up') { weight = lastSeen[name].weight + step; repAdjust = Math.max(0, lastSeen[name].repAdjust) }
      }
      // Reps lost to bad form on every set of this exercise.
      let formLoss = 0
      if (ending === 'ego' && sessionsLeft <= 1 && lastSeen[name]) {
        weight = lastSeen[name].weight + (sessionsLeft === 1 ? step : 0)
        repAdjust = 0
        formLoss = sessionsLeft === 1 ? 3 : 2
      }
      lastSeen[name] = { weight, repAdjust }
      // Now and then the final set of an exercise gets grindy.
      const grindyLastSet = setCount > 1 && random() < 0.12
      for (let s = 0; s < setCount; s++) {
        const done = Math.max(1, reps + repAdjust - (s === setCount - 1 ? 1 : 0))
        const lost = formLoss || (grindyLastSet && s === setCount - 1 ? 2 : 0)
        sets.push({
          exerciseId: id(name), weightKg: weight, restSeconds: 120, reps: done,
          cleanReps: lost ? Math.max(0, done - lost) : null,
        })
      }
    }
    sessions.push({
      id: 'demo-session-' + (index + 1), name: day, sessionDate: date, templateId: 'demo-template-ppl',
      durationMinutes: 55 + Math.round(random() * 20), notes: null, createdAt: index + 1, sets,
    })
  })

  const cardio = []
  let c = 0
  for (let d = addDays(start, 14); d <= now; d = addDays(d, 1)) {
    const weekIndex = Math.floor(daysBetween(addDays(start, 14), d) / 7)
    const lazyWeek = weekIndex === 3
    cardio.push({
      id: 'demo-cardio-' + ++c, sessionDate: d, activityType: 'WALK', distanceKm: null, durationMinutes: null,
      steps: Math.round((lazyWeek ? 6500 : 9800) + random() * 3500), avgHeartRate: null,
    })
    const weekday = parseIso(d).getDay()
    if (weekday === 3 || weekday === 0) {
      cardio.push({
        id: 'demo-cardio-' + ++c, sessionDate: d, activityType: 'RUN', distanceKm: 5, steps: null,
        durationMinutes: 29 + Math.round(random() * 4), avgHeartRate: 150 + Math.round(random() * 10),
      })
    }
  }

  const bodyWeight = []
  for (let week = 0; week < WEEKS; week++) {
    for (const offset of [0, 3]) {
      const date = addDays(start, week * 7 + offset)
      if (date <= now) bodyWeight.push({ logDate: date, weightKg: Math.round((76 + week * 0.12 + (random() - 0.5) * 0.6) * 10) / 10 })
    }
  }

  const day = (name) => ({
    name,
    exercises: PLAN[name].map(([exercise, , , targetSets, targetReps]) => ({ exerciseId: id(exercise), targetSets, targetReps })),
  })
  return {
    user: { id: 'demo-user', email: 'demo@repcheck.app', displayName: 'Demo lifter', bodyWeightKg: bodyWeight.at(-1).weightKg,
      weeklyStepsGoal: 70000, weeklyWorkoutGoal: 4 },
    customExercises: [],
    templates: [{ id: 'demo-template-ppl', name: 'Push Pull Legs', splitType: 'PPL', createdAt: start, days: [day('Push'), day('Pull'), day('Legs')] }],
    sessions, cardio, bodyWeight,
  }
}
