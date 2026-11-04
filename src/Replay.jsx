import { useMemo, useState } from 'react'
import { formatGap } from './lib/replay.js'

const W = 900, H = 360, PAD = 28

function PositionChart({ replay, drivers, lap, onPick }) {
  const n = drivers.length || 20
  const x = (l) => PAD + ((l - 1) / Math.max(1, replay.totalLaps - 1)) * (W - 2 * PAD)
  const y = (p) => PAD + ((p - 1) / Math.max(1, n - 1)) * (H - 2 * PAD)
  const lines = drivers.map((d) => {
    const pts = replay.byLap
      .map((l) => {
        const r = l.rows.find((r) => r.driver_number === d.driver_number)
        return r ? [x(l.lap), y(r.position)] : null
      })
      .filter(Boolean)
    return { d, pts }
  })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Position by lap"
      onClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect()
        const px = ((e.clientX - box.left) / box.width) * W
        onPick(Math.min(replay.totalLaps, Math.max(1, Math.round(1 + ((px - PAD) / (W - 2 * PAD)) * (replay.totalLaps - 1)))))
      }}>
      <line x1={x(lap)} x2={x(lap)} y1={PAD / 2} y2={H - PAD / 2} stroke="#888" strokeDasharray="4 3" />
      {lines.map(({ d, pts }) => (
        <polyline key={d.driver_number} fill="none" strokeWidth="2" points={pts.map((p) => p.join(',')).join(' ')}
          stroke={`#${d.team_colour ?? '888'}`}><title>{d.full_name}</title></polyline>
      ))}
    </svg>
  )
}

export default function Replay({ replay, drivers }) {
  const [lap, setLap] = useState(1)
  const current = Math.min(lap, replay.totalLaps)
  const byNum = useMemo(() => new Map(drivers.map((d) => [d.driver_number, d])), [drivers])
  const rows = replay.byLap[current - 1]?.rows ?? []

  if (replay.totalLaps === 0) return <p className="status">No lap data for this race.</p>
  return (
    <>
      <label className="lapctl">Lap {current} / {replay.totalLaps}
        <input type="range" min="1" max={replay.totalLaps} value={current} onChange={(e) => setLap(Number(e.target.value))} />
      </label>
      <PositionChart replay={replay} drivers={drivers} lap={current} onPick={setLap} />
      <table>
        <thead><tr><th>Pos</th><th>Driver</th><th>Gap to leader</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const d = byNum.get(r.driver_number)
            return (
              <tr key={r.driver_number}>
                <td>{r.position}</td>
                <td><b style={{ color: `#${d?.team_colour ?? '888'}` }}>{d?.name_acronym ?? r.driver_number}</b> {d?.full_name}</td>
                <td>{formatGap(r.gap, r.position)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
