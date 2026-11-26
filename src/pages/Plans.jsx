import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { plural } from '../format'
import ExercisePicker, { useExercises } from '../components/ExercisePicker'
import { Async, Button, Empty, Field, Icon, Input, Notice, PageTitle, Panel, PanelHead, Select } from '../components/ui'

const SPLITS = ['PPL', 'Upper / Lower', 'Full body', 'Bro split', 'Custom']
const PRESETS = {
  PPL: ['Push', 'Pull', 'Legs'],
  'Upper / Lower': ['Upper', 'Lower'],
  'Full body': ['Full body A', 'Full body B'],
  'Bro split': ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
  Custom: ['Day 1'],
}
const blank = () => ({ id: null, name: '', splitType: 'PPL', days: PRESETS.PPL.map((name) => ({ name, exercises: [] })) })
const move = (list, from, to) => {
  if (to < 0 || to >= list.length) return list
  const copy = [...list]
  copy.splice(to, 0, copy.splice(from, 1)[0])
  return copy
}

function Stepper({ label, value, min, max, onChange }) {
  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="press grid h-9 w-9 place-items-center rounded-md border border-line text-mute hover:border-mute"><Icon name="minus" /></button>
      <span className="num w-7 text-center text-lg font-bold">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="press grid h-9 w-9 place-items-center rounded-md border border-line text-mute hover:border-mute"><Icon name="plus" /></button>
    </span>
  )
}

function Editor({ initial, onClose }) {
  const queryClient = useQueryClient()
  const exercises = useExercises()
  const names = useMemo(() => new Map((exercises.data || []).map((e) => [e.id, e.name])), [exercises.data])
  const [plan, setPlan] = useState(initial)
  const [pickingFor, setPickingFor] = useState(null)

  const setDay = (index, patch) => setPlan({ ...plan, days: plan.days.map((d, i) => (i === index ? { ...d, ...patch } : d)) })
  const setExercise = (dayIndex, exIndex, patch) =>
    setDay(dayIndex, { exercises: plan.days[dayIndex].exercises.map((e, i) => (i === exIndex ? { ...e, ...patch } : e)) })
  const changeSplit = (splitType) => {
    const untouched = plan.days.every((d) => d.exercises.length === 0)
    setPlan({ ...plan, splitType, days: untouched ? PRESETS[splitType].map((name) => ({ name, exercises: [] })) : plan.days })
  }

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: plan.name, splitType: plan.splitType,
        days: plan.days.map((d) => ({ name: d.name || 'Day', exercises: d.exercises.map(({ exerciseId, targetSets, targetReps }) => ({ exerciseId, targetSets, targetReps })) })),
      }
      return plan.id ? api.updateTemplate(plan.id, body) : api.createTemplate(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      onClose()
    },
  })

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <PageTitle>{plan.id ? 'Edit plan' : 'New plan'}</PageTitle>
      <Panel className="grid gap-3 p-4 sm:grid-cols-2">
        <Field label="Plan name"><Input required value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} placeholder="Push Pull Legs" /></Field>
        <Field label="Split">
          <Select value={SPLITS.includes(plan.splitType) ? plan.splitType : 'Custom'} onChange={(e) => changeSplit(e.target.value)}>
            {SPLITS.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
      </Panel>

      {plan.days.map((day, dayIndex) => (
        <Panel key={dayIndex}>
          <div className="flex items-center gap-2 px-4 pt-4">
            <Input aria-label={`Day ${dayIndex + 1} name`} value={day.name} onChange={(e) => setDay(dayIndex, { name: e.target.value })} className="num !text-xl font-semibold" />
            <Button variant="danger" size="sm" disabled={plan.days.length === 1} onClick={() => setPlan({ ...plan, days: plan.days.filter((_, i) => i !== dayIndex) })}>Remove day</Button>
          </div>
          <ul className="mt-3 border-t border-line">
            {day.exercises.map((exercise, exIndex) => (
              <li key={exercise.exerciseId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-2.5">
                <span className="min-w-0 flex-1 basis-40 truncate font-semibold">{names.get(exercise.exerciseId) || exercise.exerciseName || 'Exercise'}</span>
                <span className="flex items-center gap-2 text-sm text-mute">
                  <Stepper label="sets" value={exercise.targetSets} min={1} max={10} onChange={(v) => setExercise(dayIndex, exIndex, { targetSets: v })} />
                  sets of
                  <Stepper label="reps" value={exercise.targetReps} min={1} max={30} onChange={(v) => setExercise(dayIndex, exIndex, { targetReps: v })} />
                </span>
                <span className="flex gap-1">
                  <button type="button" aria-label="Move up" disabled={exIndex === 0} onClick={() => setDay(dayIndex, { exercises: move(day.exercises, exIndex, exIndex - 1) })} className="press grid h-9 w-9 place-items-center rounded-md border border-line text-mute disabled:opacity-30"><Icon name="up" /></button>
                  <button type="button" aria-label="Move down" disabled={exIndex === day.exercises.length - 1} onClick={() => setDay(dayIndex, { exercises: move(day.exercises, exIndex, exIndex + 1) })} className="press grid h-9 w-9 place-items-center rounded-md border border-line text-mute disabled:opacity-30"><Icon name="down" /></button>
                  <button type="button" aria-label="Remove exercise" onClick={() => setDay(dayIndex, { exercises: day.exercises.filter((_, i) => i !== exIndex) })} className="press grid h-9 w-9 place-items-center rounded-md border border-line text-down hover:border-down"><Icon name="close" /></button>
                </span>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3"><Button variant="quiet" size="sm" onClick={() => setPickingFor(dayIndex)}>Add exercise</Button></div>
        </Panel>
      ))}

      <Button variant="quiet" onClick={() => setPlan({ ...plan, days: [...plan.days, { name: `Day ${plan.days.length + 1}`, exercises: [] }] })}>Add day</Button>

      {save.isError && <Notice tone="error">{save.error.message}</Notice>}
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={save.isPending}>{save.isPending ? 'Saving' : 'Save plan'}</Button>
        <Button variant="quiet" size="lg" onClick={onClose}>Cancel</Button>
      </div>

      {pickingFor !== null && (
        <ExercisePicker exclude={plan.days[pickingFor].exercises.map((e) => e.exerciseId)} onClose={() => setPickingFor(null)}
          onPick={(exercise) => {
            setDay(pickingFor, { exercises: [...plan.days[pickingFor].exercises, { exerciseId: exercise.id, targetSets: 3, targetReps: 10 }] })
            setPickingFor(null)
          }} />
      )}
    </form>
  )
}

export default function Plans() {
  const queryClient = useQueryClient()
  const templates = useQuery({ queryKey: ['templates'], queryFn: api.listTemplates })
  const [editing, setEditing] = useState(null)
  const remove = useMutation({ mutationFn: api.deleteTemplate, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }) })

  if (editing) return <Editor initial={editing} onClose={() => setEditing(null)} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>Plans</PageTitle>
          <p className="mt-2 text-mute">Your splits. Each day becomes a one-tap start on the Log screen.</p>
        </div>
        <Button size="lg" onClick={() => setEditing(blank())}>New plan</Button>
      </div>
      <Async query={templates} empty={<Panel><Empty title="No plans yet" action={<Button onClick={() => setEditing(blank())}>Create your first plan</Button>}>Set up PPL, upper / lower, or any split you run.</Empty></Panel>}>
        {(data) => data.map((template) => (
          <Panel key={template.id}>
            <PanelHead title={template.name} hint={`${template.splitType || 'Custom'}, ${plural(template.days.length, 'day')}`}
              action={
                <span className="flex gap-2">
                  <Button variant="quiet" size="sm" onClick={() => setEditing(JSON.parse(JSON.stringify(template)))}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => window.confirm(`Delete "${template.name}"? Logged workouts are kept.`) && remove.mutate(template.id)}>Delete</Button>
                </span>
              } />
            <ul className="border-t border-line">
              {template.days.map((day, index) => (
                <li key={index} className="border-b border-line px-4 py-3 last:border-0">
                  <p className="font-semibold">{day.name}</p>
                  <p className="mt-0.5 text-sm text-mute">
                    {day.exercises.length ? day.exercises.map((e) => `${e.exerciseName} ${e.targetSets}×${e.targetReps}`).join(', ') : 'No exercises yet.'}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </Async>
    </div>
  )
}
