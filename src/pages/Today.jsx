import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { ago, num } from '../format'
import { useAuth, useDraft } from '../store'
import Heatmap from '../components/Heatmap'
import { Async, Button, CountUp, Delta, Empty, PageTitle, Panel, PanelHead, PrBadge, Spark } from '../components/ui'

const STATUS_TONE = {
  FRESH: 'text-up', BALANCED: 'text-ink', FATIGUED: 'text-same', OVERREACHING: 'text-down', BUILDING_BASELINE: 'text-mute',
}
const STATUS_LABEL = {
  FRESH: 'Fresh', BALANCED: 'Balanced', FATIGUED: 'Fatigued', OVERREACHING: 'Overreaching', BUILDING_BASELINE: 'Building baseline',
}

function StreakBlock({ title, streak, unit }) {
  const pct = Math.min(100, (streak.weekProgress / streak.weekGoal) * 100)
  return (
    <div className="p-4">
      <p className="text-sm font-medium text-mute">{title}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="num text-6xl leading-none font-extrabold text-display"><CountUp value={streak.currentStreak} digits={0} duration={700} /></span>
        <span className="text-mute">{streak.currentStreak === 1 ? 'week' : 'weeks'} in a row</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-chalk" role="progressbar" aria-valuemin={0}
        aria-valuemax={streak.weekGoal} aria-valuenow={Math.min(streak.weekProgress, streak.weekGoal)} aria-label={`${title} this week`}>
        <div className={`grow-x h-full rounded-full ${streak.goalMetThisWeek ? 'bg-up' : 'bg-plate'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-mute">
        <span className="font-semibold text-ink">{num(streak.weekProgress, 0)}</span> of {num(streak.weekGoal, 0)} {unit} this week.
        {' '}Best {streak.longestStreak}. {streak.freezeTokens} {streak.freezeTokens === 1 ? 'freeze' : 'freezes'} left.
      </p>
    </div>
  )
}

const BOARD_ROWS = 8

function LiftBoard({ lifts }) {
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? lifts : lifts.slice(0, BOARD_ROWS)
  const count = (d) => lifts.filter((l) => l.deltaDirection === d).length
  const up = count('UP')
  const down = count('DOWN')
  const same = count('SAME')
  const moved = up + down + same || 1
  return (
    <>
      <div className="px-4 pb-3">
        <div className="grow-x flex h-2 overflow-hidden rounded-full bg-chalk" aria-hidden="true">
          <span className="bg-up" style={{ width: `${(up / moved) * 100}%` }} />
          <span className="bg-same" style={{ width: `${(same / moved) * 100}%` }} />
          <span className="bg-down" style={{ width: `${(down / moved) * 100}%` }} />
        </div>
        <p className="mt-2 text-sm text-mute">
          <span className="font-semibold text-up">{up} up</span>, <span className="font-semibold text-same">{same} same</span>,{' '}
          <span className="font-semibold text-down">{down} down</span> compared with the session before.
        </p>
      </div>
      <ul className="border-t border-line">
        {shown.map((lift) => (
          <li key={lift.exerciseId} className="border-b border-line last:border-0">
            <button type="button" onClick={() => navigate(`/progress?tab=lifts&exercise=${lift.exerciseId}`)}
              className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-x-3 px-4 py-2.5 text-left transition-colors hover:bg-chalk/60 sm:grid-cols-[1fr_auto_7rem_5.5rem]">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{lift.exerciseName}{lift.pr && <PrBadge />}
                  {lift.formWarning && <span className="ml-2 rounded bg-same-soft px-1.5 py-0.5 text-[11px] font-bold text-same">Form slipping</span>}</span>
                <span className="block truncate text-sm text-mute">
                  {lift.bestWeightKg > 0 ? `${num(lift.bestWeightKg)} kg × ${lift.bestReps}` : `${lift.bestReps} reps`}
                  {lift.formPct != null && lift.formPct < 100 ? ` clean, form ${Math.round(lift.formPct)}%` : ''}, {ago(lift.sessionDate)}
                </span>
              </span>
              <span className="hidden sm:block"><Spark values={lift.trend} direction={lift.deltaDirection} /></span>
              <span className="text-right">
                <span className="num block text-2xl leading-6 font-extrabold">{lift.bestOneRm > 0 ? <CountUp value={lift.bestOneRm} /> : '-'}</span>
                <span className="block text-[11px] text-mute">est. 1RM kg</span>
              </span>
              <span className="flex justify-end"><Delta direction={lift.deltaDirection} pct={lift.deltaPct} /></span>
            </button>
          </li>
        ))}
      </ul>
      {lifts.length > BOARD_ROWS && (
        <div className="border-t border-line px-4 py-3">
          <Button variant="quiet" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show fewer lifts' : `Show all ${lifts.length} lifts`}
          </Button>
        </div>
      )}
    </>
  )
}

export default function Today() {
  const user = useAuth((s) => s.user)
  const draftActive = useDraft((s) => s.active)
  const lifts = useQuery({ queryKey: ['lifts'], queryFn: api.lifts })
  const streaks = useQuery({ queryKey: ['streaks'], queryFn: api.streaks })
  const heatmap = useQuery({ queryKey: ['heatmap'], queryFn: () => api.heatmap(371) })
  const fatigue = useQuery({ queryKey: ['fatigue', 90], queryFn: () => api.fatigue(90) })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>{user?.displayName ? `Hey ${user.displayName.split(' ')[0]}` : 'Today'}</PageTitle>
          <p className="mt-2 text-mute">Are your lifts going up? Here is the tape.</p>
        </div>
        <Link to="/log"><Button size="lg">{draftActive ? 'Resume workout' : 'Start workout'}</Button></Link>
      </div>

      <Panel>
        <PanelHead title="Your lifts" hint="Estimated one-rep max from your best set, against the last time you did the lift. Only reps with good form count." />
        <Async query={lifts} empty={<Empty title="No lifts yet" action={<Link to="/log"><Button>Log your first workout</Button></Link>}>Finish a workout and every exercise shows up here with its arrow.</Empty>}>
          {(data) => <LiftBoard lifts={data} />}
        </Async>
      </Panel>

      <Panel>
        <Async query={streaks}>
          {(data) => (
            <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <StreakBlock title="Workout streak" streak={data.workout} unit="workouts" />
              <StreakBlock title="Steps streak" streak={data.steps} unit="steps" />
            </div>
          )}
        </Async>
      </Panel>

      <Panel>
        <PanelHead title="Training year" hint="One brick per day. Darker means more weight moved." />
        <Async query={heatmap}>{(data) => <Heatmap days={data} />}</Async>
      </Panel>

      <Panel>
        <Async query={fatigue}>
          {(data) => (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-mute">Fatigue</p>
                <p className={`num text-3xl leading-8 font-bold ${STATUS_TONE[data.status]}`}>{STATUS_LABEL[data.status]}</p>
                <p className="mt-1 text-sm text-mute">{data.message}</p>
              </div>
              <Link to="/progress?tab=fatigue"><Button variant="quiet" size="sm">See the trend</Button></Link>
            </div>
          )}
        </Async>
      </Panel>
    </div>
  )
}
