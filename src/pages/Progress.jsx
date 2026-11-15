import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Area, CartesianGrid, ComposedChart, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../api'
import { addDays, estimateOneRm, today, weekStartOf } from '../api/math'
import { dayMonth, kg, num, sets as fmtSets, shortDate, titleCase } from '../format'
import { Async, Button, Delta, Empty, Field, Input, Notice, Panel, PanelHead, Segmented, Select } from '../components/ui'

const TABS = [
  { value: 'volume', label: 'Weekly volume' },
  { value: 'lifts', label: 'Lifts' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'balance', label: 'Balance' },
]
const axis = { fontSize: 12, fill: 'var(--color-mute)' }
const tooltipStyle = { borderRadius: 6, border: '1px solid var(--color-line)', fontSize: 13, boxShadow: 'none' }

// ------------------------------------------------------------------ volume

const PLAN = {
  INCREASE: { label: 'Add sets', tone: 'bg-up-soft text-up', path: 'M6 1.5 11 9H1z' },
  MAINTAIN: { label: 'Hold', tone: 'bg-same-soft text-same', path: 'M1.5 4.75h9v2.5h-9z' },
  DELOAD: { label: 'Deload', tone: 'bg-down-soft text-down', path: 'M6 10.5 1 3h10z' },
}

function PlanChip({ action }) {
  const plan = PLAN[action]
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded px-1.5 text-sm font-bold ${plan.tone}`}>
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true"><path d={plan.path} fill="currentColor" /></svg>
      {plan.label}
    </span>
  )
}

function VolumeBar({ muscle }) {
  const max = Math.max(muscle.mrv * 1.15, muscle.totalSets * 1.05)
  const pct = (v) => `${Math.min(100, (v / max) * 100)}%`
  return (
    <div className="relative h-3 overflow-hidden rounded-full bg-chalk" aria-hidden="true">
      <span className="absolute inset-y-0 bg-up-soft" style={{ left: pct(muscle.mev), width: `calc(${pct(muscle.mav)} - ${pct(muscle.mev)})` }} />
      <span className="absolute inset-y-0 bg-same-soft" style={{ left: pct(muscle.mav), width: `calc(${pct(muscle.mrv)} - ${pct(muscle.mav)})` }} />
      <span className="absolute inset-y-0 right-0 bg-down-soft" style={{ left: pct(muscle.mrv) }} />
      <span className="absolute inset-y-[3px] left-0 rounded-full bg-ink" style={{ width: pct(muscle.totalSets) }} />
    </div>
  )
}

function Volume() {
  const thisWeek = weekStartOf(today())
  const [week, setWeek] = useState(thisWeek)
  const volume = useQuery({ queryKey: ['volume', week], queryFn: () => api.volume(week) })

  return (
    <Panel>
      <PanelHead
        title={week === thisWeek ? 'This week' : `Week of ${dayMonth(week)}`}
        hint="Hard sets per muscle. Green band is the productive range, amber is near your limit, red is more than you can recover from."
      />
      <div className="flex items-center gap-2 px-4 pb-3">
        <Button variant="quiet" size="sm" onClick={() => setWeek(addDays(week, -7))}>Earlier week</Button>
        <Button variant="quiet" size="sm" disabled={week >= thisWeek} onClick={() => setWeek(addDays(week, 7))}>Later week</Button>
      </div>
      <Async query={volume}>
        {(data) => (
          <>
            <p className="border-t border-line px-4 py-3 text-sm text-mute">
              <span className="font-semibold text-ink">{fmtSets(data.totalSets)} sets</span> and{' '}
              <span className="font-semibold text-ink">{kg(data.totalVolumeKg)}</span> so far.{' '}
              {data.complete ? 'The plan below is for the week after.' : 'Week still in progress, so the plan can change as you log.'}
            </p>
            <ul>
              {data.muscles.map((m) => (
                <li key={m.muscleGroup} className="border-t border-line px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{titleCase(m.muscleGroup)}</span>
                    <span className="flex items-center gap-2">
                      <span className="num text-xl leading-none font-bold">{fmtSets(m.totalSets)}</span>
                      <span className="text-sm text-mute">sets</span>
                      <PlanChip action={m.recommendation} />
                    </span>
                  </div>
                  <div className="mt-2"><VolumeBar muscle={m} /></div>
                  <p className="mt-2 text-sm text-mute">
                    {m.reason} Next week: <span className="font-semibold text-ink">{m.suggestedSets} sets</span>.
                    {' '}Last week you did {fmtSets(m.previousWeekSets)}.
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Async>
    </Panel>
  )
}

// ------------------------------------------------------------------- lifts

function OneRmCalculator() {
  const [weight, setWeight] = useState('80')
  const [reps, setReps] = useState('6')
  const oneRm = estimateOneRm(Number(weight), Number(reps))
  return (
    <Panel>
      <PanelHead title="1RM calculator" hint="Epley formula: weight × (1 + reps ÷ 30)." />
      <div className="grid grid-cols-2 gap-3 px-4 sm:max-w-sm">
        <Field label="Weight (kg)"><Input type="number" inputMode="decimal" min="0" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
        <Field label="Reps"><Input type="number" inputMode="numeric" min="1" value={reps} onChange={(e) => setReps(e.target.value)} /></Field>
      </div>
      <p className="px-4 pt-3 text-mute">Estimated max <span className="num ml-1 text-4xl font-bold text-ink">{oneRm ? num(oneRm) : '-'}</span> kg</p>
      {oneRm > 0 && (
        <div className="overflow-x-auto px-4 pt-2 pb-4">
          <table className="w-full min-w-[20rem] text-sm">
            <tbody>
              <tr className="text-mute">{[95, 90, 85, 80, 75, 70].map((p) => <td key={p} className="py-1">{p}%</td>)}</tr>
              <tr className="num text-lg font-bold">{[95, 90, 85, 80, 75, 70].map((p) => <td key={p}>{num((oneRm * p) / 100, 0)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

/** Share of reps done with good form, per session. Hidden while every rep has been clean. */
function FormTrend({ points }) {
  if (!points.some((p) => p.formPct != null && p.formPct < 100)) {
    return <p className="px-4 pt-2 text-sm text-mute">Form: every logged rep on this lift was clean.</p>
  }
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="px-4 text-sm text-mute">
        <span className="font-semibold text-ink">Form score.</span> Share of reps done clean. Under 80% means the weight is ahead of your form.
      </p>
      <div className="h-32 px-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="sessionDate" tickFormatter={dayMonth} tick={axis} tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} minTickGap={32} />
            <YAxis domain={[0, 100]} ticks={[0, 50, 80, 100]} tick={axis} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} formatter={(value) => [`${num(value, 0)}% of reps clean`, 'Form']} />
            <ReferenceLine y={80} stroke="var(--color-same)" strokeDasharray="4 3" />
            <Line type="monotone" dataKey="formPct" stroke="var(--color-same)" strokeWidth={2}
              dot={{ r: 2.5, fill: 'var(--color-same)', strokeWidth: 0 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Lifts() {
  const [params, setParams] = useSearchParams()
  const lifts = useQuery({ queryKey: ['lifts'], queryFn: api.lifts })
  const prs = useQuery({ queryKey: ['prs'], queryFn: api.prs })
  const selected = params.get('exercise') || lifts.data?.[0]?.exerciseId
  const history = useQuery({ queryKey: ['history', selected], queryFn: () => api.exerciseHistory(selected), enabled: !!selected })
  const pick = (id) => setParams({ tab: 'lifts', exercise: id }, { replace: true })
  const lift = lifts.data?.find((l) => l.exerciseId === selected)

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHead title="Strength curve" hint="Estimated one-rep max from the best set of each session, counting clean reps only." />
        <Async query={lifts} empty={<Empty title="No lifts yet">Log a workout to start a curve.</Empty>}>
          {(data) => (
            <>
              <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
                <Select aria-label="Exercise" value={selected} onChange={(e) => pick(e.target.value)} className="!w-auto max-w-full">
                  {data.map((l) => <option key={l.exerciseId} value={l.exerciseId}>{l.exerciseName}</option>)}
                </Select>
                {lift && <Delta direction={lift.deltaDirection} pct={lift.deltaPct} />}
              </div>
              {lift?.formWarning && <div className="px-4 pb-3"><Notice tone="warn">{lift.formWarning}</Notice></div>}
              <Async query={history}>
                {(points) => (
                  <>
                    <div className="h-64 px-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                          <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 4" vertical={false} />
                          <XAxis dataKey="sessionDate" tickFormatter={dayMonth} tick={axis} tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} minTickGap={32} />
                          <YAxis domain={['auto', 'auto']} tick={axis} tickLine={false} axisLine={false} width={48} />
                          <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate}
                            formatter={(value, _name, item) => [`${num(value)} kg (${num(item.payload.bestWeightKg)} × ${item.payload.bestReps})`, 'Est. 1RM']} />
                          <Line type="monotone" dataKey="bestOneRm" stroke="var(--color-plate)" strokeWidth={2.5}
                            dot={{ r: 3, fill: 'var(--color-plate)', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <FormTrend points={points} />
                    <ul className="mt-2 border-t border-line">
                      {[...points].reverse().slice(0, 6).map((p) => (
                        <li key={p.sessionDate + p.bestOneRm} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 last:border-0">
                          <span className="text-sm text-mute">{shortDate(p.sessionDate)}</span>
                          <span className="flex items-center gap-3">
                            <span className="text-sm">
                              {num(p.bestWeightKg)} × {p.bestReps}
                              {p.formPct != null && p.formPct < 100 && <span className="ml-1 font-medium text-same">form {Math.round(p.formPct)}%</span>}
                            </span>
                            <span className="num w-14 text-right text-lg font-bold">{num(p.bestOneRm)}</span>
                            <span className="flex w-20 justify-end"><Delta direction={p.deltaDirection} pct={p.deltaPct} /></span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Async>
            </>
          )}
        </Async>
      </Panel>

      <Panel>
        <PanelHead title="Personal records" hint="Your best session for every lift." />
        <Async query={prs} empty={<Empty title="No records yet" />}>
          {(data) => (
            <ul className="border-t border-line">
              {data.map((pr) => (
                <li key={pr.exerciseId} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{pr.exerciseName}</span>
                    <span className="block text-sm text-mute">{num(pr.bestWeightKg)} kg × {pr.bestReps} on {shortDate(pr.sessionDate)}</span>
                  </span>
                  <span className="text-right">
                    <span className="num block text-2xl leading-6 font-bold">{num(pr.bestOneRm)}</span>
                    <span className="block text-[11px] text-mute">est. 1RM kg</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Async>
      </Panel>
      <OneRmCalculator />
    </div>
  )
}

// ----------------------------------------------------------------- fatigue

const STATUS_LABEL = {
  FRESH: 'Fresh', BALANCED: 'Balanced', FATIGUED: 'Fatigued', OVERREACHING: 'Overreaching', BUILDING_BASELINE: 'Building baseline',
}

function Fatigue() {
  const fatigue = useQuery({ queryKey: ['fatigue', 90], queryFn: () => api.fatigue(90) })
  return (
    <Panel>
      <PanelHead title="Fatigue" hint="Recent load (last week or so) against your normal load (last month). When recent runs far above normal, back off." />
      <Async query={fatigue}>
        {(data) => data.points.length === 0 ? <Empty title="No training load yet">{data.message}</Empty> : (
          <>
            <p className="px-4 pb-3">
              <span className="num text-3xl font-bold">{STATUS_LABEL[data.status]}</span>
              <span className="ml-3 text-sm text-mute">{data.message}</span>
            </p>
            <div className="h-72 px-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.points} margin={{ top: 8, right: 16, bottom: 0, left: -4 }}>
                  <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={dayMonth} tick={axis} tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} minTickGap={40} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => num(v, 0)} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} formatter={(value, name) => [`${num(value, 0)} kg`, name]} />
                  <ReferenceLine y={0} stroke="var(--color-mute)" />
                  <Area type="monotone" dataKey="tsb" name="Freshness (normal minus recent)" stroke="none" fill="var(--color-plate-soft)" isAnimationActive={false} />
                  <Line type="monotone" dataKey="ctl" name="Normal load (28 days)" stroke="var(--color-ink)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="atl" name="Recent load (7 days)" stroke="var(--color-plate)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 px-4 pt-2 pb-4 text-sm text-mute">
              <li className="flex items-center gap-2"><span className="h-0.5 w-5 bg-ink" />Normal load, 28 days</li>
              <li className="flex items-center gap-2"><span className="h-0.5 w-5 bg-plate" />Recent load, 7 days</li>
              <li className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-plate-soft" />Freshness: above zero is rested</li>
            </ul>
          </>
        )}
      </Async>
    </Panel>
  )
}

// ----------------------------------------------------------------- balance

function Balance() {
  const balance = useQuery({ queryKey: ['balance'], queryFn: api.balance })
  return (
    <Panel>
      <PanelHead title="Muscle balance" hint="Sets per muscle over the last 4 weeks." />
      <Async query={balance}>
        {(data) => {
          const chart = data.muscles.map((m) => ({ muscle: titleCase(m.muscleGroup), sets: m.sets }))
          const ratio = data.pushPullRatio
          const verdict = ratio == null ? 'Log some pulling work to see your push to pull ratio.'
            : ratio > 1.3 ? 'Push heavy. Add rows or pulldowns to even it out.'
            : ratio < 0.77 ? 'Pull heavy. Add some pressing to even it out.'
            : 'Push and pull are well matched.'
          return (
            <>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chart} outerRadius="72%">
                    <PolarGrid stroke="var(--color-line)" />
                    <PolarAngleAxis dataKey="muscle" tick={{ fontSize: 12, fill: 'var(--color-ink)' }} />
                    <Radar dataKey="sets" stroke="var(--color-plate)" strokeWidth={2} fill="var(--color-plate)" fillOpacity={0.18} isAnimationActive={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${fmtSets(value)} sets`, 'Last 4 weeks']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
                {[['Push', data.pushSets], ['Pull', data.pullSets], ['Legs', data.legSets], ['Core', data.coreSets]].map(([label, value]) => (
                  <div key={label} className="border-line px-4 py-3 odd:border-r sm:border-r sm:last:border-r-0">
                    <p className="text-sm text-mute">{label}</p>
                    <p className="num text-3xl font-bold">{fmtSets(value)}</p>
                  </div>
                ))}
              </div>
              <p className="border-t border-line px-4 py-3 text-sm text-mute">
                {ratio != null && <span className="font-semibold text-ink">Push to pull {num(ratio, 2)} : 1. </span>}{verdict}
              </p>
            </>
          )
        }}
      </Async>
    </Panel>
  )
}

export default function Progress() {
  const [params, setParams] = useSearchParams()
  const tab = useMemo(() => (TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'volume'), [params])
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-4xl leading-none font-bold md:text-5xl">Progress</h1>
        <p className="mt-2 text-mute">What to do next week, and whether it is working.</p>
      </div>
      <Segmented label="Progress views" value={tab} options={TABS} onChange={(value) => setParams({ tab: value }, { replace: true })} />
      {tab === 'volume' && <Volume />}
      {tab === 'lifts' && <Lifts />}
      {tab === 'fatigue' && <Fatigue />}
      {tab === 'balance' && <Balance />}
    </div>
  )
}
