import { demoApi } from './demo'
import { httpApi } from './http'

/** True when no API URL is configured: the app runs on sample data kept in this browser. */
export const DEMO = !import.meta.env.VITE_API_URL

export const api = DEMO ? demoApi : httpApi
