// OpenF1 API: sessions, drivers, stints (tyres) and pit stops. No API key.
const BASE = 'https://api.openf1.org/v1'

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`)
  if (res.status === 404) return [] // OpenF1 answers 404 when a query matches nothing
  if (!res.ok) throw new Error(`OpenF1 ${res.status} for ${path}`)
  return res.json()
}

export const fetchRaceSessions = (year) =>
  getJson(`/sessions?year=${year}&session_name=Race`)
export const fetchDrivers = (sessionKey) => getJson(`/drivers?session_key=${sessionKey}`)
export const fetchStints = (sessionKey) => getJson(`/stints?session_key=${sessionKey}`)
export const fetchPits = (sessionKey) => getJson(`/pit?session_key=${sessionKey}`)
// Replay data: laps (per-lap start time + duration) and position changes (timestamped).
export const fetchLaps = (sessionKey) => getJson(`/laps?session_key=${sessionKey}`)
export const fetchPositions = (sessionKey) => getJson(`/position?session_key=${sessionKey}`)
