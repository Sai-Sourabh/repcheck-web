import { beforeEach, describe, expect, it, vi } from 'vitest'

// Minimal localStorage for node.
const store = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
})

const { demoApi, resetDemo } = await import('./demo')
const { addDays, today } = await import('./math')

describe('demo api', () => {
  beforeEach(() => resetDemo())

  it('seeds a believable history with all three arrows', async () => {
    const lifts = await demoApi.lifts()
    expect(lifts.length).toBe(16)
    const directions = new Set(lifts.map((l) => l.deltaDirection))
    expect(directions).toContain('UP')
    expect(directions).toContain('DOWN')
    expect(directions).toContain('SAME')
    const workouts = await demoApi.listWorkouts(0, 5)
    expect(workouts.total).toBeGreaterThan(50)
    expect(workouts.items[0].sessionDate <= today()).toBe(true)
  })

  it('follows the same arrow chain as the backend integration test', async () => {
    const bench = 'ex-barbell-bench-press'
    await Promise.all((await demoApi.listWorkouts(0, 500)).items.map((w) => demoApi.deleteWorkout(w.id)))
    const first = await demoApi.createWorkout({ sessionDate: addDays(today(), -10), sets: [{ exerciseId: bench, weightKg: 80, reps: 5 }] })
    expect(first.exercises[0].deltaDirection).toBe('NEW')
    const second = await demoApi.createWorkout({ sessionDate: addDays(today(), -3), sets: [{ exerciseId: bench, weightKg: 85, reps: 5 }] })
    expect(second.exercises[0]).toMatchObject({ deltaDirection: 'UP', deltaPct: 6.26, pr: true })
    const old = await demoApi.createWorkout({ sessionDate: addDays(today(), -20), sets: [{ exerciseId: bench, weightKg: 100, reps: 5 }] })
    expect((await demoApi.getWorkout(second.id)).exercises[0]).toMatchObject({ deltaDirection: 'UP', pr: false })
    expect((await demoApi.getWorkout(first.id)).exercises[0].deltaDirection).toBe('DOWN')
    await demoApi.deleteWorkout(old.id)
    expect((await demoApi.getWorkout(second.id)).exercises[0].pr).toBe(true)
    expect((await demoApi.fatigue(30)).points.length).toBe(11)
  })

  it('reports volume, fatigue, streaks and steps', async () => {
    const volume = await demoApi.volume(addDays(today(), -7))
    expect(volume.muscles.length).toBe(10)
    expect(volume.complete).toBe(true)
    expect(volume.muscles.find((m) => m.muscleGroup === 'CHEST').totalSets).toBeGreaterThan(8)
    const fatigue = await demoApi.fatigue(90)
    expect(fatigue.points.at(-1).date).toBe(today())
    const streaks = await demoApi.streaks()
    expect(streaks.workout.longestStreak).toBeGreaterThan(3)
    const steps = await demoApi.stepsWeek()
    expect(steps.days.length).toBe(7)
    console.log(JSON.stringify({ fatigue: [fatigue.status, fatigue.tsbPercent], streaks,
      recs: volume.muscles.map((m) => `${m.muscleGroup} ${m.totalSets} ${m.recommendation}`) }))
  })
})

describe('form check', () => {
  beforeEach(() => resetDemo())
  const press = 'ex-overhead-press'

  it('credits only clean reps, and still counts every rep as volume', async () => {
    await Promise.all((await demoApi.listWorkouts(0, 500)).items.map((w) => demoApi.deleteWorkout(w.id)))
    const clean = await demoApi.createWorkout({ sessionDate: addDays(today(), -9), sets: [{ exerciseId: press, weightKg: 40, reps: 8 }] })
    expect(clean.exercises[0]).toMatchObject({ formPct: 100, bestOneRm: 50.67 })
    expect(clean.exercises[0].sets[0].cleanReps).toBeNull()

    const sloppy = await demoApi.createWorkout({ sessionDate: addDays(today(), -6), sets: [{ exerciseId: press, weightKg: 45, reps: 8, cleanReps: 5 }] })
    expect(sloppy.exercises[0]).toMatchObject({ bestOneRm: 52.5, formPct: 62.5 })
    expect(sloppy.exercises[0].sets[0]).toMatchObject({ reps: 8, cleanReps: 5 })
    expect(sloppy.totalVolumeKg).toBe(360)

    await demoApi.createWorkout({ sessionDate: addDays(today(), -2), sets: [{ exerciseId: press, weightKg: 45, reps: 8, cleanReps: 6 }] })
    const card = (await demoApi.lifts()).find((l) => l.exerciseId === press)
    expect(card).toMatchObject({ formPct: 75, bestReps: 6, suggestedWeightKg: 40 })
    expect(card.formWarning).toContain('Drop back to 40 kg')
    expect((await demoApi.exerciseHistory(press))[1].formPct).toBe(62.5)
    expect((await demoApi.previous([press]))[0].sets[0].cleanReps).toBe(6)
    await expect(demoApi.createWorkout({ sets: [{ exerciseId: press, weightKg: 45, reps: 8, cleanReps: 9 }] })).rejects.toThrow('cleanReps')
  })

  it('shows one ego lift in the sample data', async () => {
    const lifts = await demoApi.lifts()
    const flagged = lifts.filter((l) => l.formWarning)
    expect(flagged.map((l) => l.exerciseName)).toEqual(['Overhead Press'])
    expect(flagged[0].suggestedWeightKg).toBeLessThan(flagged[0].bestWeightKg)
    console.log(JSON.stringify(flagged[0]), lifts.map((l) => `${l.exerciseName} ${l.deltaDirection} ${l.formPct}`).join(' | '))
  })
})
