// Client for the Spring Boot API. Same method names as demo.js.
import { useAuth } from '../store'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(method, path, body) {
  const token = useAuth.getState().token
  let response
  try {
    response = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Check your connection and try again.'), { status: 0 })
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && token) useAuth.getState().signOut()
    const fields = data?.fieldErrors ? Object.values(data.fieldErrors).join('. ') : ''
    throw Object.assign(new Error(fields || data?.message || `Request failed (${response.status})`), { status: response.status })
  }
  return data
}

const get = (path) => request('GET', path)
const query = (params) => {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '')
  return entries.length ? '?' + new URLSearchParams(entries).toString() : ''
}

export const httpApi = {
  register: (body) => request('POST', '/api/auth/register', body),
  login: (body) => request('POST', '/api/auth/login', body),
  me: () => get('/api/users/me'),
  updateProfile: (body) => request('PATCH', '/api/users/me', body),

  listExercises: () => get('/api/exercises'),
  createExercise: (body) => request('POST', '/api/exercises', body),
  deleteExercise: (id) => request('DELETE', `/api/exercises/${id}`),

  listTemplates: () => get('/api/templates'),
  createTemplate: (body) => request('POST', '/api/templates', body),
  updateTemplate: (id, body) => request('PUT', `/api/templates/${id}`, body),
  deleteTemplate: (id) => request('DELETE', `/api/templates/${id}`),

  createWorkout: (body) => request('POST', '/api/workouts', body),
  listWorkouts: (page = 0, size = 20) => get('/api/workouts' + query({ page, size })),
  getWorkout: (id) => get(`/api/workouts/${id}`),
  deleteWorkout: (id) => request('DELETE', `/api/workouts/${id}`),
  previous: (exerciseIds) => (exerciseIds.length ? get('/api/workouts/previous' + query({ exerciseIds: exerciseIds.join(',') })) : Promise.resolve([])),

  lifts: () => get('/api/analytics/lifts'),
  exerciseHistory: (id) => get(`/api/analytics/exercises/${id}/history`),
  volume: (date) => get('/api/analytics/volume' + query({ date })),
  fatigue: (days = 90) => get('/api/analytics/fatigue' + query({ days })),
  heatmap: (days = 365) => get('/api/analytics/heatmap' + query({ days })),
  balance: () => get('/api/analytics/balance'),
  prs: () => get('/api/analytics/prs'),

  streaks: () => get('/api/streaks'),
  logCardio: (body) => request('POST', '/api/cardio', body),
  listCardio: (days = 30) => get('/api/cardio' + query({ days })),
  deleteCardio: (id) => request('DELETE', `/api/cardio/${id}`),
  stepsWeek: (date) => get('/api/cardio/steps' + query({ date })),
  logBodyWeight: (body) => request('POST', '/api/body-weight', body),
  listBodyWeight: (days = 180) => get('/api/body-weight' + query({ days })),
}
