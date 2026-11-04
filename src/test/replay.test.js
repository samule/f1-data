import { describe, it, expect } from 'vitest'
import { buildReplay, lapEnds, formatGap } from '../lib/replay.js'

const t = (s) => new Date(Date.UTC(2024, 2, 2, 15, 0, s)).toISOString()
const drivers = [{ driver_number: 1 }, { driver_number: 44 }]
// Lap 1: lap_number 1 has no date_start (as in real OpenF1 data); lap 2 starts at 90s (VER) / 92s (HAM).
const laps = [
  { driver_number: 1, lap_number: 1, date_start: null, lap_duration: 90 },
  { driver_number: 1, lap_number: 2, date_start: t(90), lap_duration: 88 },
  { driver_number: 44, lap_number: 1, date_start: null, lap_duration: 92 },
  { driver_number: 44, lap_number: 2, date_start: t(92), lap_duration: 87 },
]
// HAM is P1 at the end of lap 1; VER takes P1 during lap 2.
const positions = [
  { driver_number: 44, date: t(0), position: 1 },
  { driver_number: 1, date: t(0), position: 2 },
  { driver_number: 1, date: t(150), position: 1 },
  { driver_number: 44, date: t(150), position: 2 },
]

describe('lapEnds', () => {
  it('ends a lap when the next starts and the last at start+duration', () => {
    const e = lapEnds(laps).get(1)
    expect(e.get(1)).toBe(Date.parse(t(90)))
    expect(e.get(2)).toBe(Date.parse(t(90)) + 88000)
  })
  it('skips laps with no usable end', () => {
    expect(lapEnds([{ driver_number: 5, lap_number: 1, date_start: null, lap_duration: null }]).get(5).size).toBe(0)
  })
})

describe('buildReplay', () => {
  const r = buildReplay({ drivers, laps, positions })
  it('counts laps', () => expect(r.totalLaps).toBe(2))
  it('orders by position at each lap end and computes gap to leader', () => {
    const l1 = r.byLap[0].rows
    expect(l1.map((x) => x.driver_number)).toEqual([44, 1]) // HAM P1 at end of lap 1
    expect(l1[0].gap).toBe(0)
    expect(l1[1].gap).toBe(0) // VER lap-1 end (90s) is before HAM's (92s): clamped to 0, never negative
  })
  it('follows position changes between laps', () => {
    const l2 = r.byLap[1].rows
    expect(l2.map((x) => x.driver_number)).toEqual([1, 44])
    expect(l2[1].gap).toBeCloseTo(1, 5) // VER ends lap 2 at 178s, HAM at 179s
  })
  it('omits drivers with no position data', () => {
    expect(buildReplay({ drivers, laps, positions: [] }).byLap[0].rows).toEqual([])
  })
})

describe('formatGap', () => {
  it('formats', () => {
    expect(formatGap(0, 1)).toBe('Leader')
    expect(formatGap(3.456, 2)).toBe('+3.5s')
    expect(formatGap(null, 3)).toBe('n/a')
  })
})
