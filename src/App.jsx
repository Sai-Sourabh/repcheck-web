import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DEMO, api } from './api'
import { useAuth } from './store'
import Layout from './components/Layout'
import { useApplyTheme } from './components/ThemePicker'
import Auth from './pages/Auth'
import Today from './pages/Today'
import LogWorkout from './pages/LogWorkout'
import History from './pages/History'
import Plans from './pages/Plans'
import { Loading } from './components/ui'

// Chart-heavy pages load on demand to keep the first paint light.
const Progress = lazy(() => import('./pages/Progress'))
const Activity = lazy(() => import('./pages/Activity'))

export default function App() {
  const token = useAuth((s) => s.token)
  const setUser = useAuth((s) => s.setUser)
  const signedIn = DEMO || !!token
  useApplyTheme()

  // Keeps the stored profile fresh (and loads the demo profile).
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: signedIn })
  useEffect(() => {
    if (me.data) setUser(me.data)
  }, [me.data, setUser])

  if (!signedIn) {
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
      </Routes>
    )
  }
  return (
    <Layout>
      <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/log" element={<LogWorkout />} />
        <Route path="/history" element={<History />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Layout>
  )
}
