import { useEffect, useState } from 'react'
import {
  Activity,
  Database,
  Gauge,
  Globe2,
  Plane,
  Radio,
  Server,
  Timer,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { FlightMap } from './components/FlightMap'
import { MetricCard } from './components/MetricCard'
import type { Snapshot } from './types'

const empty: Snapshot = {
  status: 'starting',
  provider: 'OpenSky Network',
  aircraft_tracked: 0,
  aircraft_with_position: 0,
  airborne: 0,
  on_ground: 0,
  countries: 0,
  average_altitude_m: 0,
  average_speed_kmh: 0,
  ingestion_rate: 0,
  last_updated: null,
  provider_latency_ms: null,
  message: 'Connecting to the analytics pipeline…',
  top_countries: [],
  aircraft: [],
}

function App() {
  const [data, setData] = useState<Snapshot>(empty)
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    let active = true
    let socket: WebSocket | undefined
    let timer: number
    const connect = () => {
      if (!active) return
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${protocol}//${location.host}/api/v1/ws`)
      socket.onopen = () => {
        if (active) setConnected(true)
      }
      socket.onmessage = (e) => {
        if (active) setData(JSON.parse(e.data) as Snapshot)
      }
      socket.onclose = () => {
        if (active) {
          setConnected(false)
          timer = window.setTimeout(connect, 3000)
        }
      }
      socket.onerror = () => socket?.close()
    }
    connect()
    return () => {
      active = false
      window.clearTimeout(timer)
      socket?.close()
    }
  }, [])
  const updated = data.last_updated ? new Date(data.last_updated).toLocaleTimeString() : 'Waiting'
  return (
    <main>
      <header>
        <div className="brand">
          <span>
            <Plane size={22} />
          </span>
          <div>
            <strong>SKYSTREAM</strong>
            <small>REAL-TIME ANALYTICS</small>
          </div>
        </div>
        <div className={`connection ${connected ? 'online' : 'offline'}`}>
          {connected ? <Wifi size={15} /> : <WifiOff size={15} />}{' '}
          {connected ? 'Live connection' : 'Reconnecting'}
        </div>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">
            <Radio size={14} /> LIVE GLOBAL TELEMETRY
          </p>
          <h1>
            Aircraft intelligence,
            <br />
            <em>as it happens.</em>
          </h1>
          <p className="intro">
            A production-style streaming platform ingesting real OpenSky aircraft telemetry through
            Kafka, processing it asynchronously, and delivering live operational insight.
          </p>
          <div className="pipeline">
            <span>OpenSky</span>
            <i>→</i>
            <span>Kafka</span>
            <i>→</i>
            <span>Consumers</span>
            <i>→</i>
            <span>Redis + PostgreSQL</span>
            <i>→</i>
            <span>WebSocket</span>
          </div>
        </div>
        <div className="hero-status">
          <div className="radar">
            <div className="sweep" />
            <Plane size={28} />
          </div>
          <strong>{data.aircraft_tracked.toLocaleString()}</strong>
          <span>received · {data.aircraft_with_position.toLocaleString()} positions rendered</span>
        </div>
      </section>
      <section className={`notice ${data.status}`}>
        <Activity size={17} />
        <div>
          <strong>
            {data.status === 'healthy'
              ? 'Pipeline operational'
              : data.status === 'degraded'
                ? 'Provider degraded'
                : 'Pipeline starting'}
          </strong>
          <span>
            {data.message} · Last update: {updated}
          </span>
        </div>
      </section>
      <section className="metrics">
        <MetricCard
          icon={Plane}
          label="Aircraft tracked"
          value={data.aircraft_tracked.toLocaleString()}
          detail={`${data.aircraft_with_position.toLocaleString()} rendered · ${data.airborne.toLocaleString()} airborne`}
        />
        <MetricCard
          icon={Globe2}
          label="Origin countries"
          value={data.countries.toLocaleString()}
          detail={`${data.on_ground.toLocaleString()} aircraft on ground`}
        />
        <MetricCard
          icon={Gauge}
          label="Average speed"
          value={`${Math.round(data.average_speed_kmh).toLocaleString()} km/h`}
          detail="Airborne aircraft"
        />
        <MetricCard
          icon={Timer}
          label="Provider latency"
          value={
            data.provider_latency_ms === null ? '—' : `${Math.round(data.provider_latency_ms)} ms`
          }
          detail={`${data.ingestion_rate} events / second`}
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel map-panel">
          <div className="panel-title">
            <div>
              <p>GLOBAL AIRSPACE</p>
              <h2>Live aircraft positions</h2>
            </div>
            <span>
              <Radio size={13} /> {data.aircraft.length.toLocaleString()} live positions
            </span>
          </div>
          <FlightMap aircraft={data.aircraft} />
        </article>
        <article className="panel countries">
          <div className="panel-title">
            <div>
              <p>DISTRIBUTION</p>
              <h2>Top origin countries</h2>
            </div>
          </div>
          {data.top_countries.length ? (
            data.top_countries.map((item, index) => (
              <div className="country" key={item.country}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.country}</strong>
                <div>
                  <i
                    style={{
                      width: `${Math.max(8, (item.count / data.top_countries[0].count) * 100)}%`,
                    }}
                  />
                </div>
                <b>{item.count.toLocaleString()}</b>
              </div>
            ))
          ) : (
            <p className="empty">Waiting for telemetry…</p>
          )}
        </article>
      </section>
      <section className="architecture">
        <div>
          <p className="eyebrow">ENGINEERING OVERVIEW</p>
          <h2>Designed as a real streaming system</h2>
          <p>
            The public dashboard is only the visible surface. Behind it, independently deployable
            services handle collection, durable transport, fast state, historical persistence, and
            real-time delivery.
          </p>
        </div>
        <div className="architecture-cards">
          <div>
            <Server />
            <strong>Async ingestion</strong>
            <span>Non-blocking HTTP collection and event publication</span>
          </div>
          <div>
            <Database />
            <strong>Purpose-built storage</strong>
            <span>Redis for live state, PostgreSQL for durable history</span>
          </div>
          <div>
            <Activity />
            <strong>Observable by design</strong>
            <span>Health checks, structured logs, latency and throughput</span>
          </div>
        </div>
      </section>
      <footer>
        <div className="brand">
          <span>
            <Plane size={18} />
          </span>
          <strong>SKYSTREAM</strong>
        </div>
        <p>Real data from OpenSky Network · Map © OpenStreetMap contributors</p>
        <a href="/docs" target="_blank">
          API documentation ↗
        </a>
      </footer>
    </main>
  )
}
export default App
