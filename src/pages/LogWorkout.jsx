import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { delta, effectiveReps, estimateOneRm, today } from '../api/math'
import { ago, clock, kg, plural, setText, titleCase } from '../format'
import { useDraft, usePrefs } from '../store'
import ExercisePicker, { useExercises } from '../components/ExercisePicker'
import { Async, Button, Delta, Empty, Icon, Input, Notice, Panel, PanelHead } from '../components/ui'

const REST_CHOICES = [60, 90, 120, 180, 240]
const filled = (set) => Number(set.reps) > 0 && set.weightKg !== '' && Number(set.weightKg) >= 0
const cleanOf = (set) => effectiveReps(set.reps, set.cleanReps)
const formBroke = (set) => filled(set) && cleanOf(set) < Number(set.reps)

function useNow(active) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

// ------------------------------------------------------------ start screen

function StartScreen() {
  const start = useDraft((s) => s.start)
  const templates = useQuery({ queryKey: ['templates'], queryFn: api.listTemplates })
  const [busy, setBusy] = useState(null)

  // Pre-fills each set with last time's weight and the plan's rep target.
  const startFromDay = async (template, day, key) => {
    setBusy(key)
    try {
      const previous = await api.previous(day.exercises.map((e) => e.exerciseId))
      const last = new Map(previous.map((p) => [p.exerciseId, p.sets]))
      start({
        name: day.name,
        templateId: template.id,
        exercises: day.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          sets: Array.from({ length: e.targetSets }, (_, i) => {
            const before = last.get(e.exerciseId)
            const match = before?.[Math.min(i, before.length - 1)]
            return { weightKg: match ? String(match.weightKg) : '', reps: String(e.targetReps), cleanReps: '', done: false }
          }),
        })),
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-4xl leading-none font-bold md:text-5xl">Log a workout</h1>
        <p className="mt-2 text-mute">Pick a day from one of your plans, or build the session as you go.</p>
      </div>
      <Panel>
        <PanelHead title="From a plan" />
        <Async query={templates} empty={<Empty title="No plans yet" action={<Link to="/plans"><Button variant="quiet">Create a plan</Button></Link>}>A plan saves your split so each day starts pre-filled.</Empty>}>
          {(data) => (
            <ul className="border-t border-line">
              {data.flatMap((template) => template.days.map((day, index) => {
                const key = `${template.id}-${index}`
                return (
                  <li key={key} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                    <span className="min-w-0">
                      <span className="block font-semibold">{day.name}</span>
                      <span className="block truncate text-sm text-mute">{template.name}: {day.exercises.map((e) => e.exerciseName).join(', ') || 'no exercises yet'}</span>
                    </span>
                    <Button size="sm" disabled={busy !== null || day.exercises.length === 0} onClick={() => startFromDay(template, day, key)}>
                      {busy === key ? 'Starting' : 'Start'}
                    </Button>
                  </li>
                )
              }))}
            </ul>
          )}
        </Async>
      </Panel>
      <Button variant="ink" size="lg" className="w-full sm:w-auto" onClick={() => start({})}>Start an empty workout</Button>
    </div>
  )
}

// ---------------------------------------------------------- active session

function ExerciseBlock({ entry, exercise, previous }) {
  const { updateSet, addSet, removeSet, removeExercise, startRest } = useDraft.getState()
  const restSeconds = usePrefs((s) => s.restSeconds)

  // The live arrow only credits clean reps, same as the saved result will.
  const best = Math.max(0, ...entry.sets.filter((s) => s.done && filled(s)).map((s) => estimateOneRm(Number(s.weightKg), cleanOf(s))))
  const live = previous && best > 0 ? delta(previous.bestOneRm, best) : null

  const toggle = (index, set) => {
    if (!set.done && !filled(set)) return
    updateSet(entry.exerciseId, index, { done: !set.done })
    if (!set.done) startRest(restSeconds)
  }

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 className="text-[22px] leading-6 font-semibold">{exercise?.name || 'Exercise'}</h2>
          <p className="mt-1 text-sm text-mute">
            {previous
              ? `Last time (${ago(previous.sessionDate)}): ${previous.sets.map(setText).join(', ')}`
              : `First time logging this. ${titleCase(exercise?.muscleGroup)}.`}
          </p>
        </div>
        {live && <Delta direction={live.direction} pct={live.pct} />}
      </div>

      <div className="mt-3 grid grid-cols-[1.25rem_1fr_1fr_1fr_2.75rem_1.75rem] items-center gap-x-2 gap-y-2 px-4 pb-2">
        <span />
        <span className="text-xs font-medium text-mute">Kg</span>
        <span className="text-xs font-medium text-mute">Reps</span>
        <span className="text-xs font-medium text-mute">Clean reps</span>
        <span className="text-xs font-medium text-mute">Done</span>
        <span />
        {entry.sets.map((set, index) => {
          const tone = !set.done ? '' : formBroke(set) ? 'border-same bg-same-soft' : 'border-up bg-up-soft'
          return (
            <div key={index} className="contents">
              <span className="num text-lg font-bold text-mute">{index + 1}</span>
              <Input type="number" inputMode="decimal" min="0" step="0.5" value={set.weightKg} aria-label={`Set ${index + 1} weight in kg`}
                className={`!px-2 ${tone}`}
                onChange={(e) => updateSet(entry.exerciseId, index, { weightKg: e.target.value })} />
              <Input type="number" inputMode="numeric" min="1" step="1" value={set.reps} aria-label={`Set ${index + 1} reps`}
                className={`!px-2 ${tone}`}
                onChange={(e) => updateSet(entry.exerciseId, index, { reps: e.target.value })} />
              <Input type="number" inputMode="numeric" min="0" max={set.reps || undefined} step="1" value={set.cleanReps ?? ''}
                placeholder={set.reps || 'all'} aria-label={`Set ${index + 1} reps with good form`}
                className={`!px-2 ${tone}`}
                onChange={(e) => updateSet(entry.exerciseId, index, { cleanReps: e.target.value })} />
              <button type="button" onClick={() => toggle(index, set)} aria-pressed={set.done}
                aria-label={`Mark set ${index + 1} ${set.done ? 'not done' : 'done'}`}
                className={`press grid h-10 w-11 place-items-center rounded-md border ${set.done ? 'border-up bg-up text-white' : 'border-line text-mute'} ${!set.done && !filled(set) ? 'opacity-40' : ''}`}>
                <Icon name="check" />
              </button>
              <button type="button" onClick={() => removeSet(entry.exerciseId, index)} aria-label={`Remove set ${index + 1}`}
                className="press grid h-10 w-7 place-items-center rounded-md text-mute hover:text-down">
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
      <p className="px-4 pb-3 text-sm text-mute">
        {entry.sets.some(formBroke)
          ? 'Only clean reps count toward your arrow and PRs. All reps still count as volume.'
          : 'Form broke before the last rep? Put the last good rep under Clean reps.'}
      </p>
      <div className="flex gap-2 border-t border-line px-4 py-3">
        <Button variant="quiet" size="sm" onClick={() => addSet(entry.exerciseId)}>Add set</Button>
        <Button variant="danger" size="sm" onClick={() => removeExercise(entry.exerciseId)}>Remove exercise</Button>
      </div>
    </Panel>
  )
}

function RestBar() {
  const restEndsAt = useDraft((s) => s.restEndsAt)
  const { startRest, stopRest } = useDraft.getState()
  const { restSeconds, setRestSeconds } = usePrefs()
  const now = useNow(!!restEndsAt)
  // Date.now() keeps the first frame exact; `now` only drives the once-a-second redraw.
  const left = restEndsAt ? (restEndsAt - Math.max(now, Date.now())) / 1000 : 0

  useEffect(() => {
    if (restEndsAt && left <= 0) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      stopRest()
    }
  }, [restEndsAt, left, stopRest])

  if (!restEndsAt || left <= 0) return null
  return (
    <div className="rest-bar fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 bg-ink text-white md:bottom-0 md:left-56" role="timer" aria-label="Rest timer">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 md:px-8">
        <span className="flex items-baseline gap-2">
          <span className="text-sm text-white/70">Rest</span>
          <span className="num text-3xl leading-none font-bold">{clock(Math.ceil(left))}</span>
        </span>
        <span className="flex items-center gap-2">
          <select aria-label="Default rest length" value={restSeconds} onChange={(e) => { setRestSeconds(Number(e.target.value)); startRest(Number(e.target.value)) }}
            className="h-9 rounded-md border border-white/30 bg-transparent px-2 text-sm font-semibold text-white">
            {REST_CHOICES.map((s) => <option key={s} value={s} className="text-ink">{clock(s)}</option>)}
          </select>
          <button type="button" className="press h-9 rounded-md border border-white/30 px-3 text-sm font-semibold" onClick={() => useDraft.setState({ restEndsAt: restEndsAt + 30000 })}>+30s</button>
          <button type="button" className="press h-9 rounded-md bg-white px-3 text-sm font-semibold text-ink" onClick={stopRest}>Skip rest</button>
        </span>
      </div>
    </div>
  )
}

function ActiveWorkout({ onFinished }) {
  const draft = useDraft()
  const queryClient = useQueryClient()
  const exercises = useExercises()
  const now = useNow(true)
  const [picking, setPicking] = useState(false)
  const [date, setDate] = useState(today())
  const [error, setError] = useState(null)

  const ids = draft.exercises.map((e) => e.exerciseId)
  const previous = useQuery({ queryKey: ['previous', ids.join(',')], queryFn: () => api.previous(ids), enabled: ids.length > 0 })
  const byId = useMemo(() => new Map((exercises.data || []).map((e) => [e.id, e])), [exercises.data])
  const previousById = useMemo(() => new Map((previous.data || []).map((p) => [p.exerciseId, p])), [previous.data])

  const doneSets = draft.exercises.flatMap((e) => e.sets.filter((s) => s.done && filled(s)).map((s) => ({ ...s, exerciseId: e.exerciseId })))
  const sloppyReps = doneSets.reduce((sum, s) => sum + Number(s.reps) - cleanOf(s), 0)
  const volume = doneSets.reduce((sum, s) => sum + Number(s.weightKg) * Number(s.reps), 0)

  const finish = useMutation({
    mutationFn: () => api.createWorkout({
      name: draft.name || null,
      templateId: draft.templateId,
      sessionDate: date,
      durationMinutes: date === today() ? Math.max(1, Math.round((Date.now() - draft.startedAt) / 60000)) : null,
      sets: doneSets.map((s) => ({
        exerciseId: s.exerciseId, weightKg: Number(s.weightKg), reps: Number(s.reps), restSeconds: null,
        cleanReps: formBroke(s) ? cleanOf(s) : null,
      })),
    }),
    onSuccess: (workout) => {
      draft.discard()
      queryClient.invalidateQueries()
      onFinished(workout)
    },
    onError: (e) => setError(e.message),
  })

  const submit = () => {
    setError(null)
    if (doneSets.length === 0) {
      setError('Tick at least one completed set before finishing.')
      return
    }
    finish.mutate()
  }
  const discard = () => {
    if (window.confirm('Discard this workout? Nothing will be saved.')) draft.discard()
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Input value={draft.name} onChange={(e) => draft.setName(e.target.value)} placeholder="Name this workout" aria-label="Workout name"
            className="num !h-12 !border-transparent !bg-transparent !px-0 !text-3xl font-bold hover:!border-line focus:!border-plate focus:!bg-white focus:!px-3" />
          <p className="mt-1 text-mute">
            <span className="num text-lg font-bold text-ink">{clock((now - draft.startedAt) / 1000)}</span> elapsed,{' '}
            <span className="font-semibold text-ink">{plural(doneSets.length, 'set')}</span>, <span className="font-semibold text-ink">{kg(volume)}</span> lifted
            {sloppyReps > 0 && <>, <span className="font-semibold text-same">{sloppyReps} reps off form</span></>}
          </p>
        </div>
      </div>

      {draft.exercises.length === 0 && (
        <Panel><Empty title="Add your first exercise">Each set you tick starts the rest timer and updates the arrow.</Empty></Panel>
      )}
      {draft.exercises.map((entry) => (
        <ExerciseBlock key={entry.exerciseId} entry={entry} exercise={byId.get(entry.exerciseId)} previous={previousById.get(entry.exerciseId)} />
      ))}

      <Button variant="quiet" size="lg" className="w-full" onClick={() => setPicking(true)}>Add exercise</Button>

      <Panel className="space-y-3 p-4">
        <label className="flex flex-wrap items-center gap-3 text-sm font-medium text-mute">
          Workout date
          <Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value || today())} className="!w-auto" />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={submit} disabled={finish.isPending}>{finish.isPending ? 'Saving' : 'Finish workout'}</Button>
          <Button variant="danger" size="lg" onClick={discard}>Discard</Button>
        </div>
      </Panel>

      {picking && (
        <ExercisePicker exclude={ids} onClose={() => setPicking(false)}
          onPick={(exercise) => { draft.addExercise(exercise.id); setPicking(false) }} />
      )}
      <RestBar />
    </div>
  )
}

// ----------------------------------------------------------------- summary

/** Rows land 70ms apart at first, then closer, so a long list doesn't drag. */
const revealDelay = (i) => Math.round(70 * i - 3 * i * i > 0 ? Math.min(70 * i - 3 * i * i, 420) : 0)

function Summary({ workout, onDone }) {
  const prs = workout.exercises.filter((e) => e.pr).length
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-4xl leading-none font-bold md:text-5xl">Workout saved</h1>
        <p className="mt-2 text-mute">
          {kg(workout.totalVolumeKg)} lifted across {plural(workout.exercises.length, 'exercise')}
          {prs > 0 ? `, with ${plural(prs, 'personal record')}.` : '.'}
        </p>
      </div>
      <Panel>
        <ul>
          {workout.exercises.map((e, i) => (
            <li key={e.exerciseId} className="reveal-row flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0"
              style={{ animationDelay: `${revealDelay(i)}ms` }}>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{e.exerciseName}{e.pr && <span className="ml-2 rounded bg-plate px-1.5 py-0.5 text-[11px] font-bold text-white">PR</span>}</span>
                <span className="block text-sm text-mute">{e.sets.map(setText).join(', ')}</span>
                {e.formPct != null && e.formPct < 100 && (
                  <span className="block text-sm font-medium text-same">Form held for {Math.round(e.formPct)}% of reps. Arrow counts clean reps only.</span>
                )}
              </span>
              <span className="reveal-chip" style={{ animationDelay: `${revealDelay(i) + 140}ms` }}>
                <Delta direction={e.deltaDirection} pct={e.deltaPct} size="lg" />
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="flex flex-wrap gap-2">
        <Link to="/"><Button size="lg">Back to today</Button></Link>
        <Button variant="quiet" size="lg" onClick={onDone}>Log another</Button>
      </div>
    </div>
  )
}

export default function LogWorkout() {
  const active = useDraft((s) => s.active)
  const [saved, setSaved] = useState(null)
  if (active) return <ActiveWorkout onFinished={setSaved} />
  if (saved) return <Summary workout={saved} onDone={() => setSaved(null)} />
  return <StartScreen />
}
