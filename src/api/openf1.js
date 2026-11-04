// OpenF1 API: sessions, drivers, stints (tyres) and pit stops. No API key.
// Free tier: 3 req/s and 30 req/min. Every call goes through one shared queue
// (>= 400 ms apart), is cached per URL (historical data never changes) and retries 429s.
import { createQueue, createCache, fetchWithRetry } from '../lib/http.js'

const BASE = 'https://api.openf1.org/v1'

const enqueue = createQueue({ minGapMs: 400 })
const cached = createCache({
  storage: typeof sessionStorage !== 'undefined' ? sessionStorage : null,
})

// The UI can subscribe to show a friendly message while we wait out a 429.
let notify = () => {}
export const onOpenF1Retry = (fn) => { notify = fn || (() => {}) }

async function request(path) {
  const res = await enqueue(() =>
    fetchWithRetry(`${BASE}${path}`, { onRetry: (info) => notify(info) }))
  if (res.status === 404) return [] // OpenF1 answers 404 when a query matches nothing
  if (res.status === 429) throw new Error('OpenF1 is rate limiting requests. Please wait a minute and try again.')
  if (!res.ok) throw new Error(`OpenF1 ${res.status} for ${path}`)
  return res.json()
}

const getJson = (path) => cached(path, () => request(path))

export const fetchRaceSessions = (year) =>
  getJson(`/sessions?year=${year}&session_name=Race`)
export const fetchDrivers = (sessionKey) => getJson(`/drivers?session_key=${sessionKey}`)
export const fetchStints = (sessionKey) => getJson(`/stints?session_key=${sessionKey}`)
export const fetchPits = (sessionKey) => getJson(`/pit?session_key=${sessionKey}`)
// Replay data: laps (per-lap start time + duration) and position changes (timestamped).
export const fetchLaps = (sessionKey) => getJson(`/laps?session_key=${sessionKey}`)
export const fetchPositions = (sessionKey) => getJson(`/position?session_key=${sessionKey}`)
