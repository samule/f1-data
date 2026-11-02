import { describe, it, expect } from 'vitest'
import { buildBoard, completedRaces, matchSession, normalizeCompound } from '../lib/strategy.js'

const drivers = [
  { driver_number: 1, name_acronym: 'VER', full_name: 'Max VERSTAPPEN' },
  { driver_number: 44, name_acronym: 'HAM', full_name: 'Lewis HAMILTON' },
]
const stints = [
  { driver_number: 1, stint_number: 1, lap_start: 1, lap_end: 20, compound: 'MEDIUM', tyre_age_at_start: 0 },
  { driver_number: 1, stint_number: 2, lap_start: 21, lap_end: 50, compound: 'HARD', tyre_age_at_start: 0 },
  { driver_number: 44, stint_number: 1, lap_start: 1, lap_end: 50, compound: 'SOFT' },
]
const pits = [{ driver_number: 1, lap_number: 20, pit_duration: 22.4 }]
const results = [{ number: '44' }, { number: '1' }]

describe('buildBoard', () => {
  const b = buildBoard({ drivers, stints, pits, results })
  it('orders rows by race result', () => expect(b.rows.map((r) => r.driver.name_acronym)).toEqual(['HAM', 'VER']))
  it('computes total laps', () => expect(b.totalLaps).toBe(50))
  it('links each pit to the tyre fitted', () => {
    const ver = b.rows.find((r) => r.driver.driver_number === 1)
    expect(ver.pits).toEqual([{ stop: 1, lap: 20, duration: 22.4, compoundAfter: 'HARD' }])
    expect(ver.stints.map((s) => s.laps)).toEqual([20, 30])
  })
  it('handles a driver with no stops', () => expect(b.rows[0].pits).toEqual([]))
})

describe('helpers', () => {
  it('normalizes unknown compounds', () => expect(normalizeCompound('weird')).toBe('UNKNOWN'))
  it('keeps only past races', () =>
    expect(completedRaces([{ date: '2024-03-02' }, { date: '2999-01-01' }], '2024-06-01')).toHaveLength(1))
  it('matches a session by race date', () =>
    expect(matchSession([{ date_start: '2024-03-02T15:00:00+00:00', session_key: 9 }], '2024-03-02').session_key).toBe(9))
})
