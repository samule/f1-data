import { useEffect, useMemo, useState } from 'react'
import { fetchSeasonRaces, fetchRaceResults } from './api/jolpica.js'
import { fetchRaceSessions, fetchDrivers, fetchStints, fetchPits, fetchLaps, fetchPositions, onOpenF1Retry } from './api/openf1.js'
import { buildReplay } from './lib/replay.js'
import Replay from './Replay.jsx'
import { buildBoard, completedRaces, matchSession, COMPOUND_COLORS } from './lib/strategy.js'

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: THIS_YEAR - 2022 }, (_, i) => THIS_YEAR - i) // OpenF1 starts in 2023

function StrategyBar({ stints, totalLaps }) {
  return (
    <div className="bar" role="img" aria-label="Tyre strategy">
      {stints.map((s) => (
        <div
          key={s.number}
          className="stint"
          style={{ width: `${((s.laps ?? 0) / totalLaps) * 100}%`, background: COMPOUND_COLORS[s.compound] }}
          title={`${s.compound}: laps ${s.lapStart}-${s.lapEnd}`}
        >
          {s.laps}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [year, setYear] = useState(YEARS[0])
  const [races, setRaces] = useState([])
  const [round, setRound] = useState('')
  const [board, setBoard] = useState(null)
  const [status, setStatus] = useState('')
  const [view, setView] = useState('replay')
  const [replay, setReplay] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [sessionKey, setSessionKey] = useState(null)

  useEffect(() => {
    onOpenF1Retry(({ attempt, maxRetries, delayMs }) =>
      setStatus(`OpenF1 is busy, retrying in ${Math.ceil(delayMs / 1000)}s (${attempt}/${maxRetries})…`))
    return () => onOpenF1Retry(null)
  }, [])

  useEffect(() => {
    setRaces([]); setRound(''); setBoard(null); setReplay(null); setSessionKey(null); setStatus('Loading calendar…')
    fetchSeasonRaces(year)
      .then((r) => { setRaces(completedRaces(r)); setStatus('') })
      .catch((e) => setStatus(e.message))
  }, [year])

  useEffect(() => {
    if (!round) return
    const race = races.find((r) => r.round === round)
    setBoard(null); setReplay(null); setSessionKey(null); setStatus('Loading race data…')
    ;(async () => {
      const sessions = await fetchRaceSessions(year)
      const session = matchSession(sessions, race.date)
      if (!session) throw new Error('No OpenF1 data for this race.')
      const [drv, stints, pits, results] = await Promise.all([
        fetchDrivers(session.session_key),
        fetchStints(session.session_key),
        fetchPits(session.session_key),
        fetchRaceResults(year, round).catch(() => []),
      ])
      setDrivers(drv)
      setSessionKey(session.session_key)
      setBoard(buildBoard({ drivers: drv, stints, pits, results }))
      setStatus('')
    })().catch((e) => setStatus(e.message))
  }, [round, year, races])

  // Replay data is heavier (every position change), so fetch it only when that view is open.
  useEffect(() => {
    if (view !== 'replay' || !sessionKey || replay) return
    let cancelled = false
    setStatus('Loading laps and positions…')
    Promise.all([fetchLaps(sessionKey), fetchPositions(sessionKey)])
      .then(([laps, positions]) => {
        if (cancelled) return
        setReplay(buildReplay({ drivers, laps, positions })); setStatus('')
      })
      .catch((e) => !cancelled && setStatus(e.message))
    return () => { cancelled = true }
  }, [view, sessionKey, replay, drivers])

  const legend = useMemo(() => Object.entries(COMPOUND_COLORS).filter(([k]) => k !== 'UNKNOWN'), [])

  return (
    <main>
      <h1>F1 Race Replay &amp; Pit Board</h1>
      <div className="tabs">
        <button className={view === 'replay' ? 'on' : ''} onClick={() => setView('replay')}>Race replay</button>
        <button className={view === 'pits' ? 'on' : ''} onClick={() => setView('pits')}>Pit &amp; strategy</button>
      </div>
      <div className="controls">
        <label>Season
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>
        <label>Race
          <select value={round} onChange={(e) => setRound(e.target.value)}>
            <option value="">Pick a completed race…</option>
            {races.map((r) => <option key={r.round} value={r.round}>R{r.round} · {r.raceName}</option>)}
          </select>
        </label>
      </div>
      {status && <p className="status">{status}</p>}
      {view === 'replay' && replay && <Replay key={sessionKey} replay={replay} drivers={drivers} />}
      {view === 'pits' && board && (
        <>
          <p className="legend">
            {legend.map(([k, c]) => <span key={k}><i style={{ background: c }} />{k}</span>)}
          </p>
          <table>
            <thead><tr><th>Driver</th><th>Strategy (laps per stint)</th><th>Pit stops (lap · lane time · tyre fitted)</th></tr></thead>
            <tbody>
              {board.rows.map(({ driver, stints, pits }) => (
                <tr key={driver.driver_number}>
                  <td><b style={{ color: `#${driver.team_colour ?? '888'}` }}>{driver.name_acronym}</b> {driver.full_name}</td>
                  <td><StrategyBar stints={stints} totalLaps={board.totalLaps} /></td>
                  <td>
                    {pits.length === 0 ? '—' : pits.map((p) => (
                      <div key={p.stop}>
                        #{p.stop} · L{p.lap} · {p.duration != null ? `${Number(p.duration).toFixed(1)}s` : 'n/a'} · {p.compoundAfter ?? 'n/a'}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <footer>
        Unofficial fan project. Not affiliated with, endorsed or sponsored by Formula 1, the FIA or any team.
        F1 and related marks belong to their owners. Data from OpenF1 and Jolpica; non-commercial use.
      </footer>
    </main>
  )
}
