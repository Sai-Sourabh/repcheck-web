import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DEMO, api } from '../api'
import { parseIso, today } from '../api/math'
import { dayMonth, num, shortDate, titleCase } from '../format'
import { useAuth } from '../store'
import ThemePicker from '../components/ThemePicker'
import { Async, Button, CountUp, Empty, Field, Input, Notice, PageTitle, Panel, PanelHead, Select } from '../components/ui'

const ACTIVITIES = ['WALK', 'RUN', 'CYCLE', 'SWIM', 'OTHER']
const numberOrNull = (v) => (v === '' || v == null ? null : Number(v))

function Steps() {
  const queryClient = useQueryClient()
  const week = useQuery({ queryKey: ['steps-week'], queryFn: () => api.stepsWeek() })
  const [steps, setSteps] = useState('')
  const [date, setDate] = useState(today())
  const add = useMutation({
    mutationFn: () => api.logCardio({ activityType: 'WALK', steps: Number(steps), sessionDate: date }),
    onSuccess: () => { setSteps(''); queryClient.invalidateQueries() },
  })

  return (
    <Panel>
      <PanelHead title="Steps this week" />
      <Async query={week}>
        {(data) => {
          const pct = Math.min(100, (data.totalSteps / data.goal) * 100)
          const peak = Math.max(1, ...data.days.map((d) => d.steps))
          const left = data.goal - data.totalSteps
          return (
            <div className="px-4 pb-4">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="num text-5xl leading-none font-extrabold"><CountUp value={data.totalSteps} digits={0} /></span>
                <span className="text-mute">of {num(data.goal, 0)}</span>
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-chalk" role="progressbar" aria-label="Weekly steps" aria-valuemin={0} aria-valuemax={data.goal} aria-valuenow={Math.min(data.totalSteps, data.goal)}>
                <div className={`grow-x h-full rounded-full ${left <= 0 ? 'bg-up' : 'bg-plate'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-sm text-mute">{left <= 0 ? 'Goal hit. This week counts toward your streak.' : `${num(left, 0)} to go to keep your streak.`}</p>
              <div className="mt-4 grid h-28 grid-cols-7 items-end gap-2" aria-hidden="true">
                {data.days.map((d) => (
                  <div key={d.date} className="flex h-full flex-col justify-end">
                    <div className={`grow-y rounded-t ${d.date === today() ? 'bg-plate' : 'bg-solid'}`} style={{ height: `${(d.steps / peak) * 100}%`, minHeight: d.steps ? 3 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-2 text-center text-xs text-mute">
                {data.days.map((d) => (
                  <span key={d.date}>
                    {parseIso(d.date).toLocaleDateString('en-GB', { weekday: 'narrow' })}
                    <span className="num block text-[13px] font-semibold text-ink">{d.steps ? num(d.steps / 1000, 1) + 'k' : '-'}</span>
                  </span>
                ))}
              </div>
            </div>
          )
        }}
      </Async>
      <form className="flex flex-wrap items-end gap-3 border-t border-line p-4" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
        <Field label="Steps" className="w-32"><Input required type="number" inputMode="numeric" min="1" max="200000" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="8500" /></Field>
        <Field label="Day"><Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value || today())} /></Field>
        <Button type="submit" disabled={add.isPending}>Add steps</Button>
        {add.isError && <div className="w-full"><Notice tone="error">{add.error.message}</Notice></div>}
      </form>
    </Panel>
  )
}

function Cardio() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['cardio'], queryFn: () => api.listCardio(30) })
  const [form, setForm] = useState({ activityType: 'RUN', distanceKm: '', durationMinutes: '', avgHeartRate: '', sessionDate: today() })
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const add = useMutation({
    mutationFn: () => api.logCardio({
      activityType: form.activityType, sessionDate: form.sessionDate, distanceKm: numberOrNull(form.distanceKm),
      durationMinutes: numberOrNull(form.durationMinutes), avgHeartRate: numberOrNull(form.avgHeartRate),
    }),
    onSuccess: () => { setForm({ ...form, distanceKm: '', durationMinutes: '', avgHeartRate: '' }); queryClient.invalidateQueries() },
  })
  const remove = useMutation({ mutationFn: api.deleteCardio, onSuccess: () => queryClient.invalidateQueries() })
  const sessions = (list.data || []).filter((c) => c.distanceKm != null || c.durationMinutes != null)

  return (
    <Panel>
      <PanelHead title="Cardio" hint="Runs, rides and swims from the last 30 days." />
      <form className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-6" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
        <Field label="Type">
          <Select value={form.activityType} onChange={set('activityType')}>{ACTIVITIES.map((a) => <option key={a} value={a}>{titleCase(a)}</option>)}</Select>
        </Field>
        <Field label="Distance (km)"><Input type="number" inputMode="decimal" min="0" step="0.1" value={form.distanceKm} onChange={set('distanceKm')} /></Field>
        <Field label="Minutes"><Input required type="number" inputMode="numeric" min="1" value={form.durationMinutes} onChange={set('durationMinutes')} /></Field>
        <Field label="Avg heart rate"><Input type="number" inputMode="numeric" min="30" max="250" value={form.avgHeartRate} onChange={set('avgHeartRate')} /></Field>
        <Field label="Day"><Input type="date" max={today()} value={form.sessionDate} onChange={set('sessionDate')} /></Field>
        <div className="flex items-end"><Button type="submit" className="w-full" disabled={add.isPending}>Log cardio</Button></div>
        {add.isError && <div className="col-span-full"><Notice tone="error">{add.error.message}</Notice></div>}
      </form>
      <Async query={list}>
        {() => sessions.length === 0 ? <div className="border-t border-line"><Empty title="No cardio logged in the last 30 days" /></div> : (
          <ul className="border-t border-line">
            {sessions.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0">
                <span className="min-w-0">
                  <span className="block font-semibold">{titleCase(c.activityType)}{c.distanceKm ? `, ${num(c.distanceKm)} km` : ''}</span>
                  <span className="block truncate text-sm text-mute">
                    {shortDate(c.sessionDate)}{c.durationMinutes ? `, ${c.durationMinutes} min` : ''}
                    {c.paceMinPerKm ? `, ${num(c.paceMinPerKm, 2)} min/km` : ''}{c.avgHeartRate ? `, ${c.avgHeartRate} bpm` : ''}
                  </span>
                </span>
                <Button variant="danger" size="sm" onClick={() => remove.mutate(c.id)}>Delete</Button>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Panel>
  )
}

function BodyWeight() {
  const queryClient = useQueryClient()
  const logs = useQuery({ queryKey: ['body-weight'], queryFn: () => api.listBodyWeight(180) })
  const [weight, setWeight] = useState('')
  const add = useMutation({
    mutationFn: () => api.logBodyWeight({ weightKg: Number(weight) }),
    onSuccess: () => { setWeight(''); queryClient.invalidateQueries() },
  })
  return (
    <Panel>
      <PanelHead title="Body weight" hint="One entry per day. Logging again today replaces it." />
      <Async query={logs}>
        {(data) => data.length < 2 ? <Empty title="Log a couple of weigh-ins to see the trend" /> : (
          <>
            <p className="px-4 pb-2 text-mute">
              <span className="num text-4xl font-bold text-ink">{num(data.at(-1).weightKg)}</span> kg now,{' '}
              {num(Math.abs(data.at(-1).weightKg - data[0].weightKg))} kg {data.at(-1).weightKg >= data[0].weightKg ? 'up' : 'down'} since {dayMonth(data[0].logDate)}.
            </p>
            <div className="h-52 px-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="logDate" tickFormatter={dayMonth} tick={{ fontSize: 12, fill: 'var(--color-mute)' }} tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} minTickGap={40} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 12, fill: 'var(--color-mute)' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => num(v, 0)} />
                  <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-panel)', color: 'var(--color-ink)' }} labelFormatter={shortDate} formatter={(v) => [`${num(v)} kg`, 'Weight']} />
                  <Line type="monotone" dataKey="weightKg" stroke="var(--color-ink)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--color-ink)', strokeWidth: 0 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Async>
      <form className="flex flex-wrap items-end gap-3 border-t border-line p-4" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
        <Field label="Today's weight (kg)" className="w-44"><Input required type="number" inputMode="decimal" min="20" max="400" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
        <Button type="submit" disabled={add.isPending}>Save weight</Button>
        {add.isError && <div className="w-full"><Notice tone="error">{add.error.message}</Notice></div>}
      </form>
    </Panel>
  )
}

function Goals() {
  const queryClient = useQueryClient()
  const { user, signOut, setUser } = useAuth()
  const [form, setForm] = useState(null)
  const values = form || { weeklyWorkoutGoal: user?.weeklyWorkoutGoal ?? 3, weeklyStepsGoal: user?.weeklyStepsGoal ?? 70000 }
  const save = useMutation({
    mutationFn: () => api.updateProfile({ weeklyWorkoutGoal: Number(values.weeklyWorkoutGoal), weeklyStepsGoal: Number(values.weeklyStepsGoal) }),
    onSuccess: (updated) => { setUser(updated); setForm(null); queryClient.invalidateQueries() },
  })
  return (
    <Panel>
      <PanelHead title="Weekly goals" hint="A week counts toward a streak when you hit these." />
      <form className="flex flex-wrap items-end gap-3 px-4 pb-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <Field label="Workouts per week" className="w-40"><Input required type="number" min="1" max="14" value={values.weeklyWorkoutGoal} onChange={(e) => setForm({ ...values, weeklyWorkoutGoal: e.target.value })} /></Field>
        <Field label="Steps per week" className="w-40"><Input required type="number" min="1000" max="500000" step="1000" value={values.weeklyStepsGoal} onChange={(e) => setForm({ ...values, weeklyStepsGoal: e.target.value })} /></Field>
        <Button type="submit" disabled={save.isPending || !form}>Save goals</Button>
        {save.isSuccess && !form && <span className="text-sm font-semibold text-up">Saved</span>}
        {save.isError && <div className="w-full"><Notice tone="error">{save.error.message}</Notice></div>}
      </form>
      {!DEMO && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="truncate text-sm text-mute">Signed in as {user?.email}</span>
          <Button variant="quiet" size="sm" onClick={() => { signOut(); queryClient.clear() }}>Log out</Button>
        </div>
      )}
    </Panel>
  )
}

export default function Activity() {
  return (
    <div className="space-y-4">
      <div>
        <PageTitle>Activity</PageTitle>
        <p className="mt-2 text-mute">Steps, cardio and body weight, outside the weight room.</p>
      </div>
      <Panel>
        <PanelHead title="Look" hint="Pick a colour theme. Saved on this device." />
        <div className="px-4 pb-4"><ThemePicker /></div>
      </Panel>
      <Steps />
      <Cardio />
      <BodyWeight />
      <Goals />
    </div>
  )
}
