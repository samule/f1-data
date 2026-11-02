// Pure helpers: merge OpenF1 drivers/stints/pits (+ Jolpica results order)
// into one board row per driver.

export const COMPOUND_COLORS = {
  SOFT: '#e8002d',
  MEDIUM: '#ffd12e',
  HARD: '#f0f0f0',
  INTERMEDIATE: '#43b02a',
  WET: '#0067ff',
  UNKNOWN: '#888888',
}

export function normalizeCompound(c) {
  const k = String(c ?? '').toUpperCase()
  return COMPOUND_COLORS[k] ? k : 'UNKNOWN'
}

// Find the OpenF1 race session that happened on the same day as a Jolpica race.
export function matchSession(sessions, raceDate) {
  return sessions.find((s) => String(s.date_start ?? '').slice(0, 10) === raceDate) ?? null
}

// Only races whose date is before today count as "completed".
export function completedRaces(races, today = new Date().toISOString().slice(0, 10)) {
  return races.filter((r) => r.date < today)
}

export function buildBoard({ drivers, stints, pits, results = [] }) {
  const totalLaps = Math.max(0, ...stints.map((s) => s.lap_end ?? 0))
  const order = new Map(results.map((r, i) => [Number(r.number), i]))

  const rows = drivers.map((d) => {
    const dStints = stints
      .filter((s) => s.driver_number === d.driver_number)
      .sort((a, b) => a.stint_number - b.stint_number)
      .map((s) => ({
        number: s.stint_number,
        compound: normalizeCompound(s.compound),
        lapStart: s.lap_start,
        lapEnd: s.lap_end,
        laps: s.lap_end != null && s.lap_start != null ? s.lap_end - s.lap_start + 1 : null,
        tyreAgeAtStart: s.tyre_age_at_start ?? 0,
      }))
    const dPits = pits
      .filter((p) => p.driver_number === d.driver_number)
      .sort((a, b) => a.lap_number - b.lap_number)
      .map((p, i) => ({
        stop: i + 1,
        lap: p.lap_number,
        // OpenF1 has used "pit_duration" (lane time); newer data may add "lane_duration".
        duration: p.pit_duration ?? p.lane_duration ?? null,
        // Compound fitted = the stint that starts on the lap after the stop.
        compoundAfter: dStints.find((s) => s.lapStart === p.lap_number + 1)?.compound ?? null,
      }))
    return { driver: d, stints: dStints, pits: dPits }
  })

  rows.sort((a, b) => {
    const ia = order.get(Number(a.driver.driver_number)) ?? 999
    const ib = order.get(Number(b.driver.driver_number)) ?? 999
    return ia - ib || a.driver.driver_number - b.driver.driver_number
  })
  return { totalLaps, rows }
}
