// Pure helpers for the Race Replay view.
// Idea: a lap "ends" when the next lap starts. At that instant, look up the
// driver's latest known position, and compute the gap to whoever led that lap.

const ms = (iso) => (iso ? Date.parse(iso) : NaN)

// End time (ms) of each lap per driver. Lap N ends when lap N+1 starts; the
// last lap ends at date_start + lap_duration. Laps without usable times are skipped.
export function lapEnds(laps) {
  const byDriver = new Map()
  for (const l of laps) {
    if (!byDriver.has(l.driver_number)) byDriver.set(l.driver_number, [])
    byDriver.get(l.driver_number).push(l)
  }
  const out = new Map()
  for (const [num, ls] of byDriver) {
    ls.sort((a, b) => a.lap_number - b.lap_number)
    const ends = new Map()
    ls.forEach((l, i) => {
      const next = ls[i + 1]
      let end = next && next.lap_number === l.lap_number + 1 ? ms(next.date_start) : NaN
      if (Number.isNaN(end) && !next && l.date_start && l.lap_duration != null) {
        end = ms(l.date_start) + l.lap_duration * 1000
      }
      if (!Number.isNaN(end)) ends.set(l.lap_number, end)
    })
    out.set(num, ends)
  }
  return out
}

// Latest position of a driver at or before time t (ms). positions must be sorted by date.
function positionAt(list, t) {
  let lo = 0, hi = list.length - 1, ans = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (ms(list[mid].date) <= t) { ans = list[mid].position; lo = mid + 1 } else hi = mid - 1
  }
  return ans
}

export function buildReplay({ drivers, laps, positions }) {
  const ends = lapEnds(laps)
  const posBy = new Map()
  for (const p of positions) {
    if (!posBy.has(p.driver_number)) posBy.set(p.driver_number, [])
    posBy.get(p.driver_number).push(p)
  }
  for (const list of posBy.values()) list.sort((a, b) => ms(a.date) - ms(b.date))

  const totalLaps = Math.max(0, ...laps.map((l) => l.lap_number))
  const byLap = []
  for (let lap = 1; lap <= totalLaps; lap++) {
    const rows = []
    for (const d of drivers) {
      const end = ends.get(d.driver_number)?.get(lap)
      if (end == null) continue
      const position = positionAt(posBy.get(d.driver_number) ?? [], end)
      if (position == null) continue
      rows.push({ driver_number: d.driver_number, position, end })
    }
    rows.sort((a, b) => a.position - b.position)
    // Gap to the car that is P1 at the end of this lap (null if P1 has no time for the lap).
    const leaderEnd = rows[0]?.position === 1 ? rows[0].end : null
    byLap.push({
      lap,
      rows: rows.map((r) => ({
        driver_number: r.driver_number,
        position: r.position,
        gap: leaderEnd == null ? null : Math.max(0, (r.end - leaderEnd) / 1000),
      })),
    })
  }
  return { totalLaps, byLap }
}

export function formatGap(g, position) {
  if (position === 1) return 'Leader'
  if (g == null) return 'n/a'
  return `+${g.toFixed(1)}s`
}
