import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuth = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      signIn: ({ token, user }) => set({ token, user }),
      setUser: (user) => set({ user }),
      signOut: () => set({ token: null, user: null }),
    }),
    { name: 'repcheck-auth' },
  ),
)

const emptyDraft = { active: false, startedAt: null, name: '', templateId: null, exercises: [] }

/**
 * The workout being logged right now. Persisted, so closing the tab or losing
 * signal in the gym does not lose the session.
 * exercises: [{ exerciseId, sets: [{ weightKg, reps, done }] }]
 */
export const useDraft = create(
  persist(
    (set) => ({
      ...emptyDraft,
      restEndsAt: null,
      start: ({ name = '', templateId = null, exercises = [] }) =>
        set({ active: true, startedAt: Date.now(), name, templateId, exercises, restEndsAt: null }),
      discard: () => set({ ...emptyDraft, restEndsAt: null }),
      setName: (name) => set({ name }),
      addExercise: (exerciseId, sets) =>
        set((s) => s.exercises.some((e) => e.exerciseId === exerciseId) ? s
          : { exercises: [...s.exercises, { exerciseId, sets: sets || [{ weightKg: '', reps: '', done: false }] }] }),
      removeExercise: (exerciseId) => set((s) => ({ exercises: s.exercises.filter((e) => e.exerciseId !== exerciseId) })),
      addSet: (exerciseId) =>
        set((s) => ({
          exercises: s.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e
            const last = e.sets.at(-1)
            return { ...e, sets: [...e.sets, { weightKg: last?.weightKg ?? '', reps: last?.reps ?? '', done: false }] }
          }),
        })),
      removeSet: (exerciseId, index) =>
        set((s) => ({
          exercises: s.exercises.map((e) => e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((_, i) => i !== index) } : e),
        })),
      updateSet: (exerciseId, index, patch) =>
        set((s) => ({
          exercises: s.exercises.map((e) => e.exerciseId === exerciseId
            ? { ...e, sets: e.sets.map((x, i) => (i === index ? { ...x, ...patch } : x)) } : e),
        })),
      startRest: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000 }),
      stopRest: () => set({ restEndsAt: null }),
    }),
    { name: 'repcheck-draft' },
  ),
)

export const usePrefs = create(
  persist((set) => ({ restSeconds: 120, setRestSeconds: (restSeconds) => set({ restSeconds }) }), { name: 'repcheck-prefs' }),
)
