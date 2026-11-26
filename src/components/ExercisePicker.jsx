import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { MUSCLES } from '../api/math'
import { titleCase } from '../format'
import { Async, Button, Field, Input, Notice, Select, Sheet } from './ui'

const EQUIPMENT = ['BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'OTHER']
const CATEGORY = { CHEST: 'PUSH', SHOULDERS: 'PUSH', TRICEPS: 'PUSH', BACK: 'PULL', BICEPS: 'PULL', QUADS: 'LEGS', HAMSTRINGS: 'LEGS', GLUTES: 'LEGS', CALVES: 'LEGS', ABS: 'CORE' }

export const useExercises = () => useQuery({ queryKey: ['exercises'], queryFn: api.listExercises, staleTime: 300_000 })

export default function ExercisePicker({ onPick, onClose, exclude = [] }) {
  const exercises = useExercises()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', muscleGroup: 'CHEST', equipment: 'BARBELL' })

  const create = useMutation({
    mutationFn: () => api.createExercise({ ...draft, category: CATEGORY[draft.muscleGroup], secondaryMuscles: [] }),
    onSuccess: (exercise) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      onPick(exercise)
    },
  })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (exercises.data || []).filter((e) =>
      !exclude.includes(e.id) && (!muscle || e.muscleGroup === muscle) && (!q || e.name.toLowerCase().includes(q)))
  }, [exercises.data, search, muscle, exclude])

  return (
    <Sheet title={creating ? 'New exercise' : 'Add exercise'} onClose={onClose}>
      {creating ? (
        <form className="space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
          <Field label="Name"><Input required autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Landmine press" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Main muscle">
              <Select value={draft.muscleGroup} onChange={(e) => setDraft({ ...draft, muscleGroup: e.target.value })}>
                {MUSCLES.map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
              </Select>
            </Field>
            <Field label="Equipment">
              <Select value={draft.equipment} onChange={(e) => setDraft({ ...draft, equipment: e.target.value })}>
                {EQUIPMENT.map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
              </Select>
            </Field>
          </div>
          {create.isError && <Notice tone="error">{create.error.message}</Notice>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={create.isPending}>Create and add</Button>
            <Button variant="quiet" onClick={() => setCreating(false)}>Back to list</Button>
          </div>
        </form>
      ) : (
        <>
          <div className="sticky top-0 space-y-2 border-b border-line bg-panel p-4">
            <Input type="search" placeholder="Search exercises" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search exercises" />
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4">
              {['', ...MUSCLES].map((m) => (
                <button key={m || 'all'} type="button" onClick={() => setMuscle(m)} aria-pressed={muscle === m}
                  className={`press h-9 shrink-0 rounded-full border px-3 text-sm font-semibold ${muscle === m ? 'border-ink bg-ink text-white' : 'border-line text-mute'}`}>
                  {m ? titleCase(m) : 'All'}
                </button>
              ))}
            </div>
          </div>
          <Async query={exercises}>
            {() => (
              <ul>
                {visible.map((exercise) => (
                  <li key={exercise.id} className="border-b border-line last:border-0">
                    <button type="button" onClick={() => onPick(exercise)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-chalk/60">
                      <span className="font-semibold">{exercise.name}</span>
                      <span className="shrink-0 text-sm text-mute">{titleCase(exercise.muscleGroup)}{exercise.custom ? ', yours' : ''}</span>
                    </button>
                  </li>
                ))}
                <li className="p-4">
                  {visible.length === 0 && <p className="mb-3 text-sm text-mute">No exercise matches that.</p>}
                  <Button variant="quiet" onClick={() => { setDraft({ ...draft, name: search }); setCreating(true) }}>Create your own exercise</Button>
                </li>
              </ul>
            )}
          </Async>
        </>
      )}
    </Sheet>
  )
}
