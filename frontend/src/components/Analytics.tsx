import { useEffect, useState } from 'react'
import type { Snapshot } from '../types'
import { speed, type Units } from '../telemetry'
interface Run {
  collected_at: string
  aircraft_count: number
  provider_latency_ms: number
}
function Trend({
  rows,
  field,
  title,
  unit,
}: {
  rows: Run[]
  field: 'aircraft_count' | 'provider_latency_ms'
  title: string
  unit: string
}) {
  const max = Math.max(1, ...rows.map((r) => r[field]))
  const first = rows.length ? Date.parse(rows[0].collected_at) : 0
  const duration = rows.length
    ? Math.max(1, Date.parse(rows[rows.length - 1].collected_at) - first)
    : 1
  const points = rows
    .map(
      (r) =>
        `${50 + ((Date.parse(r.collected_at) - first) / duration) * 600},${170 - (r[field] / max) * 140}`,
    )
    .join(' ')
  return (
    <article className="panel chart">
      <h2>{title}</h2>
      <p>Recorded collections · {unit}</p>
      {rows.length < 2 ? (
        <div className="empty">At least two recorded collections are needed to show a trend.</div>
      ) : (
        <>
          <svg
            viewBox="0 0 680 210"
            role="img"
            aria-label={`${title}: ${rows.length} collections, latest ${Math.round(rows[rows.length - 1][field])} ${unit}`}
          >
            {[0, 0.5, 1].map((n) => (
              <g key={n}>
                <line x1="50" x2="650" y1={170 - n * 140} y2={170 - n * 140} className="gridline" />
                <text x="44" y={174 - n * 140} textAnchor="end">
                  {Math.round(max * n).toLocaleString()}
                </text>
              </g>
            ))}
            <polyline points={points} fill="none" stroke="#53d8df" strokeWidth="2.5" />
            {rows.map((r, i) => (
              <circle
                key={i}
                cx={50 + ((Date.parse(r.collected_at) - first) / duration) * 600}
                cy={170 - (r[field] / max) * 140}
                r="3"
                fill="#53d8df"
              >
                <title>
                  {new Date(r.collected_at).toLocaleString()}:{' '}
                  {Math.round(r[field]).toLocaleString()} {unit}
                </title>
              </circle>
            ))}
            <text x="50" y="200">
              {new Date(first).toLocaleTimeString()}
            </text>
            <text x="650" y="200" textAnchor="end">
              {new Date(first + duration).toLocaleTimeString()}
            </text>
          </svg>
          <details>
            <summary>View accessible data table</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Collection time</th>
                    <th>
                      {title} ({unit})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r.collected_at).toLocaleString()}</td>
                      <td>{Math.round(r[field]).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </article>
  )
}
export function Analytics({ data, units }: { data: Snapshot | null; units: Units }) {
  const [rows, setRows] = useState<Run[]>([])
  const [state, setState] = useState('Loading recorded history…')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function refresh() {
      try {
        const response = await fetch('/api/v1/history?limit=120', { signal: controller.signal })
        if (!response.ok) throw new Error('History unavailable')
        const result = (await response.json()) as Run[]
        setRows(result)
        setState(result.length ? '' : 'No collections have been recorded yet.')
      } catch {
        if (!controller.signal.aborted)
          setState('History could not be loaded. Previously loaded values are retained.')
      }
    }
    void refresh()
    const interval = window.setInterval(refresh, 30000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [retry])
  return (
    <section className="analytics">
      <div className="section-heading">
        <div>
          <h1>Airspace analytics</h1>
          <p>
            Global statistics · Map filters do not affect this view. Latest 120 recorded
            collections.
          </p>
        </div>
        <button onClick={() => setRetry(retry + 1)}>Refresh history</button>
      </div>
      {state && <p role="status">{state}</p>}
      <div className="stats analytics-stats" aria-label="Latest global telemetry">
        <div>
          <strong>{data?.last_updated ? speed(data.average_speed_kmh / 3.6, units) : '—'}</strong>
          <span>Average airborne speed</span>
        </div>
        <div>
          <strong>{data?.last_updated ? data.ingestion_rate.toLocaleString() : '—'}</strong>
          <span>Ingestion · events / second</span>
        </div>
        <div>
          <strong>{data?.last_updated ? data.countries.toLocaleString() : '—'}</strong>
          <span>Registration countries</span>
        </div>
      </div>
      <div className="chart-grid">
        <Trend rows={rows} field="aircraft_count" title="Aircraft tracked" unit="aircraft" />
        <Trend rows={rows} field="provider_latency_ms" title="Provider response time" unit="ms" />
      </div>
      <article className="panel distribution">
        <h2>Aircraft by registration country</h2>
        <p>Latest global snapshot · Registration country is not the departure airport.</p>
        {data?.top_countries.length ? (
          data.top_countries.map((item) => (
            <div className="country" key={item.country}>
              <strong>{item.country}</strong>
              <div>
                <i style={{ width: `${(item.count / data.top_countries[0].count) * 100}%` }} />
              </div>
              <span>{item.count.toLocaleString()}</span>
            </div>
          ))
        ) : (
          <p className="empty">Waiting for telemetry…</p>
        )}
      </article>
    </section>
  )
}
