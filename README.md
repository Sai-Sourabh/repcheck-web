# RepCheck Web

Web app for RepCheck, a lift tracker that shows whether you are progressively overloading.

React 19, Vite, TanStack Query, Zustand, Tailwind CSS 4, Recharts. The API lives in a separate repo, `repcheck-api`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the math and the demo data layer
npm run build
```

## Two modes

| Mode | When | Data |
| --- | --- | --- |
| Demo | `VITE_API_URL` is empty (the default) | 14 weeks of sample training, stored in this browser's localStorage. No login. |
| Live | `VITE_API_URL` points at the RepCheck API | Real accounts and data from Spring Boot + PostgreSQL. |

To go live locally, start the API, then:

```bash
echo "VITE_API_URL=http://localhost:8080" > .env.local
npm run dev
```

On Vercel, add `VITE_API_URL` under Project Settings, Environment Variables, and redeploy. Also add the Vercel URL to `CORS_ALLOWED_ORIGINS` on the API.

`src/api/demo.js` implements every endpoint in the browser with the same response shapes as the backend, and `src/api/math.js` mirrors the backend's `domain` package (Epley 1RM, ATL / CTL / TSB, progression rules), so both modes behave the same.

## Screens

| Screen | What it does |
| --- | --- |
| Today | Lift board with green / red / amber arrows, weekly streaks, year heatmap, fatigue status |
| Log | Start from a plan day or empty, last-time hints, live arrow, rest timer. The draft survives a refresh |
| History | Every session with its sets, arrows and PRs. Deleting one recalculates everything |
| Progress | Weekly sets per muscle with next week's plan, strength curves, PRs, 1RM calculator, fatigue trend, muscle balance |
| Plans | Build and edit splits (PPL, upper / lower, custom) |
| Activity | Weekly steps goal, cardio log, body weight, goals |

## Deploy to Vercel

Import the repo at vercel.com/new. Vite is detected automatically, and `vercel.json` handles client-side routing. No settings are needed for demo mode.

## Layout

```
src/api/         index.js picks demo or http; math.js, seed.js, demo.js, http.js
src/components/  Layout, ui primitives, Heatmap, ExercisePicker
src/pages/       Today, LogWorkout, History, Progress, Plans, Activity, Auth
src/store.js     auth, in-progress workout draft, preferences (Zustand, persisted)
```
