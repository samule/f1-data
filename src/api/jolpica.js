// Jolpica (Ergast-compatible) API: calendar and results. No API key.
// Jolpica asks clients to identify themselves; browsers forbid setting
// User-Agent, so we send a custom header instead (harmless if ignored).
const BASE = 'https://api.jolpi.ca/ergast/f1'
const HEADERS = { 'X-Client': 'f1-data-pit-board (unofficial fan project)' }

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS })
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
