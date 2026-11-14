import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { kg, num, shortDate } from '../format'
import { Async, Button, Delta, Empty, Loading, Notice, Panel } from '../components/ui'

const PAGE = 15

function Detail({ id }) {
  const queryClient = useQueryClient()
  const workout = useQuery({ queryKey: ['workout', id], queryFn: () => api.getWorkout(id) })
  const remove = useMutation({ mutationFn: () => api.deleteWorkout(id), onSuccess: () => queryClient.invalidateQueries() })

  return (
    <div className="border-t border-line bg-chalk/50 px-4 py-3">
      <Async query={workout}>
        {(data) => (
          <>
            <ul className="space-y-3">
              {data.exercises.map((e) => (
                <li key={e.exerciseId} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">{e.exerciseName}{e.pr && <span className="ml-2 rounded bg-plate px-1.5 py-0.5 text-[11px] font-bold text-white">PR</span>}</span>
                    <span className="block text-sm text-mute">{e.sets.map((s) => `${num(s.weightKg)} × ${s.reps}`).join(', ')}</span>
                    {e.bestOneRm > 0 && <span className="block text-sm text-mute">Est. 1RM {kg(e.bestOneRm)}</span>}
                  </span>
                  <Delta direction={e.deltaDirection} pct={e.deltaPct} />
                </li>
              ))}
            </ul>
            {data.notes && <p className="mt-3 text-sm text-mute">{data.notes}</p>}
            {remove.isError && <div className="mt-3"><Notice tone="error">{remove.error.message}</Notice></div>}
            <Button variant="danger" size="sm" className="mt-4" disabled={remove.isPending}
              onClick={() => window.confirm('Delete this workout? Arrows and volume are recalculated without it.') && remove.mutate()}>
              Delete workout
            </Button>
          </>
        )}
      </Async>
    </div>
  )
}

export default function History() {
  const [open, setOpen] = useState(null)
  const pages = useInfiniteQuery({
    queryKey: ['workouts'],
    queryFn: ({ pageParam }) => api.listWorkouts(pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last) => ((last.page + 1) * last.size < last.total ? last.page + 1 : undefined),
  })
  const items = pages.data?.pages.flatMap((p) => p.items) || []
  const total = pages.data?.pages[0]?.total ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-4xl leading-none font-bold md:text-5xl">History</h1>
        <p className="mt-2 text-mute">{total ? `${total} workouts logged. Tap one to see every set.` : 'Every workout you finish lands here.'}</p>
      </div>
      <Panel>
        {pages.isPending && <Loading />}
        {pages.isError && <div className="p-4"><Notice tone="error">{pages.error.message}</Notice></div>}
        {pages.isSuccess && items.length === 0 && (
          <Empty title="Nothing logged yet" action={<Link to="/log"><Button>Log a workout</Button></Link>} />
        )}
        <ul>
          {items.map((w) => (
            <li key={w.id} className="border-b border-line last:border-0">
              <button type="button" aria-expanded={open === w.id} onClick={() => setOpen(open === w.id ? null : w.id)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-chalk/60">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{w.name || 'Workout'}</span>
                  <span className="block truncate text-sm text-mute">
                    {shortDate(w.sessionDate)}, {w.setCount} sets, {kg(w.totalVolumeKg)}{w.durationMinutes ? `, ${w.durationMinutes} min` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  {w.prCount > 0 && <span className="num rounded bg-plate px-1.5 py-0.5 text-sm font-bold text-white">{w.prCount} PR</span>}
                  {w.upCount > 0 && <span className="num rounded bg-up-soft px-1.5 py-0.5 text-sm font-bold text-up">▲ {w.upCount}</span>}
                  {w.downCount > 0 && <span className="num rounded bg-down-soft px-1.5 py-0.5 text-sm font-bold text-down">▼ {w.downCount}</span>}
                </span>
              </button>
              {open === w.id && <Detail id={w.id} />}
            </li>
          ))}
        </ul>
      </Panel>
      {pages.hasNextPage && (
        <Button variant="quiet" onClick={() => pages.fetchNextPage()} disabled={pages.isFetchingNextPage}>
          {pages.isFetchingNextPage ? 'Loading' : 'Show older workouts'}
        </Button>
      )}
    </div>
  )
}
