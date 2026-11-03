// Jolpica (Ergast-compatible) API: calendar and results. No API key.
// Do NOT send custom headers from the browser (e.g. X-Client): they force a
// CORS preflight, and Jolpica's allow-headers list (accept, authorization,
// content-type, user-agent, x-csrftoken, x-requested-with) rejects them, so
// the request is blocked. Browsers also cannot set User-Agent. A plain GET
// is a "simple" request and works. Identify the client only in server-side
// tooling (e.g. Bruno).
const BASE = 'https://api.jolpi.ca/ergast/f1'

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Jolpica ${res.status} for ${path}`)
  return res.json()
}

export async function fetchSeasonRaces(year) {
  const data = await getJson(`/${year}.json?limit=100`)
  return data.MRData.RaceTable.Races
}

export async function fetchRaceResults(year, round) {
  const data = await getJson(`/${year}/${round}/results.json?limit=100`)
  return data.MRData.RaceTable.Races[0]?.Results ?? []
}
