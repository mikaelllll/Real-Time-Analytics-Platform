import { useCallback, useMemo, useState } from 'react'
import { Activity, Crosshair, Globe2, Plane, Search, SlidersHorizontal, X } from 'lucide-react'
import { FlightMap } from './components/FlightMap'
import { Analytics } from './components/Analytics'
import { useTelemetry } from './hooks/useTelemetry'
import { altitude, defaultFilters, matchesAircraft, speed } from './telemetry'
import type { Filters, Units } from './telemetry'

function App() {
  const { data, connected, age, stale } = useTelemetry()
  const [view, setView] = useState('Live Map')
  const [units, setUnits] = useState<Units>('metric')
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [follow, setFollow] = useState(false)
  const [centerRequest, setCenterRequest] = useState(0)
  const [page, setPage] = useState(0)
  const aircraft = useMemo(() => data?.aircraft ?? [], [data])
  const countries = useMemo(
    () => [...new Set(aircraft.map((a) => a.origin_country))].sort(),
    [aircraft],
  )
  const filtered = useMemo(
    () => aircraft.filter((a) => matchesAircraft(a, filters)),
    [aircraft, filters],
  )
  const selected = filtered.find((a) => a.icao24 === selectedId)
  const ready = age !== null
  const pages = Math.max(1, Math.ceil(filtered.length / 20))
  const currentPage = Math.min(page, pages - 1)
  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
    setFollow(false)
  }
  const select = useCallback((id: string) => {
    setSelectedId(id)
    setFollow(false)
    setCenterRequest((n) => n + 1)
  }, [])
  const stopFollowing = useCallback(() => setFollow(false), [])
  const clear = () => {
    setFilters(defaultFilters)
    setPage(0)
  }
  const activeFilters = Object.entries(filters).filter(([, v]) => v)
  return (
    <main>
      <header className="app-header">
        <a className="brand" href="#main-content">
          <Plane size={24} />
          <span>
            SKYSTREAM<small>AIRSPACE EXPLORER</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {['Live Map', 'Analytics', 'About'].map((tab) => (
            <button
              key={tab}
              aria-current={view === tab ? 'page' : undefined}
              onClick={() => setView(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        <label className="unit-control">
          Units
          <select value={units} onChange={(e) => setUnits(e.target.value as Units)}>
            <option value="metric">Metric</option>
            <option value="aviation">Aviation</option>
          </select>
        </label>
      </header>
      <div className={`status-strip ${stale ? 'warning' : ''}`}>
        <span>
          <i className={connected ? 'dot connected' : 'dot'} />
          {connected ? 'Connection active' : 'Reconnecting'}
        </span>
        <span>
          {!ready
            ? 'Waiting for first collection'
            : stale
              ? 'Showing last known positions'
              : 'Telemetry current'}
        </span>
        <span title={data?.last_updated ? new Date(data.last_updated).toLocaleString() : undefined}>
          {age === null
            ? 'No data yet'
            : `Updated ${age < 60 ? `${age}s` : `${Math.floor(age / 60)}m ${age % 60}s`} ago`}
        </span>
      </div>
      {(stale || data?.status === 'degraded') && (
        <div className="notice" role="status">
          {data?.message} Positions are retained until fresh telemetry arrives.
        </div>
      )}
      <div id="main-content">
        {view === 'Live Map' && (
          <>
            <section className="overview">
              <div>
                <p className="eyebrow">GLOBAL AIRSPACE</p>
                <h1>Explore the skies.</h1>
              </div>
              <div className="stats">
                <div>
                  <strong>{ready ? data?.aircraft_tracked.toLocaleString() : '—'}</strong>
                  <span>Global aircraft</span>
                </div>
                <div>
                  <strong>{ready ? data?.airborne.toLocaleString() : '—'}</strong>
                  <span>Global airborne</span>
                </div>
                <div>
                  <strong>{ready ? filtered.length.toLocaleString() : '—'}</strong>
                  <span>Matching positions</span>
                </div>
              </div>
            </section>
            <section className="workspace" aria-label="Aircraft explorer">
              <aside className="explorer panel">
                <div className="explorer-title">
                  <h2>Find aircraft</h2>
                  <Search size={18} />
                </div>
                <label className="search">
                  Callsign or aircraft ID
                  <input
                    type="search"
                    placeholder="Search e.g. callsign or ICAO24"
                    value={filters.query}
                    onChange={(e) => setFilter('query', e.target.value)}
                  />
                </label>
                <details className="filters">
                  <summary>
                    <SlidersHorizontal size={16} /> Filters{' '}
                    {activeFilters.length > 0 && `(${activeFilters.length})`}
                  </summary>
                  <div className="filter-fields">
                    <label>
                      Registration country
                      <select
                        value={filters.country}
                        onChange={(e) => setFilter('country', e.target.value)}
                      >
                        <option value="">All countries</option>
                        {countries.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Flight status
                      <select
                        value={filters.state}
                        onChange={(e) => setFilter('state', e.target.value)}
                      >
                        <option value="">All aircraft</option>
                        <option value="air">Airborne</option>
                        <option value="ground">On ground</option>
                      </select>
                    </label>
                    <label>
                      Altitude
                      <select
                        value={filters.altitude}
                        onChange={(e) => setFilter('altitude', e.target.value)}
                      >
                        <option value="">Any altitude</option>
                        <option value="low">Below {altitude(9000, units)}</option>
                        <option value="high">{altitude(9000, units)} or higher</option>
                      </select>
                    </label>
                    <label>
                      Speed
                      <select
                        value={filters.speed}
                        onChange={(e) => setFilter('speed', e.target.value)}
                      >
                        <option value="">Any speed</option>
                        <option value="slow">Below {speed(500 / 3.6, units)}</option>
                        <option value="fast">{speed(500 / 3.6, units)} or faster</option>
                      </select>
                    </label>
                    <small>
                      Ranges exclude unavailable measurements. Country means registration, not
                      departure.
                    </small>
                  </div>
                </details>
                {activeFilters.length > 0 && (
                  <div className="chips">
                    {activeFilters.map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setFilter(key as keyof Filters, '')}
                        aria-label={`Remove ${key} filter`}
                      >
                        {key}: {value}
                        <X size={12} />
                      </button>
                    ))}
                    <button onClick={clear}>Clear filters</button>
                  </div>
                )}
                <p className="result-count">
                  {filtered.length.toLocaleString()} matching positions · select to inspect
                </p>
                <div className="aircraft-list">
                  {filtered.slice(currentPage * 20, currentPage * 20 + 20).map((a) => (
                    <button
                      className={`aircraft-row ${selectedId === a.icao24 ? 'selected' : ''}`}
                      key={a.icao24}
                      onClick={() => select(a.icao24)}
                      aria-pressed={selectedId === a.icao24}
                    >
                      <Plane size={17} />
                      <span>
                        <strong>{a.callsign || a.icao24.toUpperCase()}</strong>
                        <small>{a.origin_country}</small>
                      </span>
                      <span className="row-altitude">
                        {a.on_ground ? 'On ground' : altitude(a.altitude_m, units)}
                      </span>
                    </button>
                  ))}
                  {!filtered.length && (
                    <div className="empty">
                      <Globe2 size={30} />
                      <h3>{ready ? 'No matching aircraft' : 'Waiting for telemetry'}</h3>
                      <p>
                        {ready
                          ? 'Try another search or clear your filters.'
                          : 'Real positions will appear after the first collection.'}
                      </p>
                      {activeFilters.length > 0 && <button onClick={clear}>Clear filters</button>}
                    </div>
                  )}
                </div>
                {pages > 1 && (
                  <div className="pagination">
                    <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                      Previous
                    </button>
                    <span>
                      {currentPage + 1} / {pages}
                    </span>
                    <button
                      disabled={currentPage === pages - 1}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </aside>
              <article className="map-panel panel">
                <div className="map-heading">
                  <span>
                    <i className={`dot ${!stale && ready ? 'connected' : ''}`} />
                    {!ready
                      ? 'Awaiting positions'
                      : stale
                        ? 'Last known positions'
                        : 'Aircraft positions'}
                  </span>
                  <small>Zoom in for aircraft headings</small>
                </div>
                <FlightMap
                  aircraft={filtered}
                  selected={selected}
                  onSelect={select}
                  follow={follow && !stale}
                  onStopFollow={stopFollowing}
                  centerRequest={centerRequest}
                />
                <div className="map-legend">
                  <span>
                    <i className="legend-air" />
                    Airborne
                  </span>
                  <span>
                    <i className="legend-ground" />
                    On ground
                  </span>
                  <span>
                    <i className="legend-selected" />
                    Selected
                  </span>
                </div>
              </article>
              {selected && (
                <aside className="detail-panel panel" aria-label="Selected aircraft">
                  <div className="detail-header">
                    <span className="eyebrow">AIRCRAFT DETAILS</span>
                    <button
                      onClick={() => {
                        setSelectedId(null)
                        setFollow(false)
                      }}
                      aria-label="Close aircraft details"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <Plane className="detail-plane" size={38} />
                  <h2>{selected.callsign || selected.icao24.toUpperCase()}</h2>
                  <p>
                    {selected.on_ground ? 'On ground' : 'Airborne'}
                    {stale ? ' · Last known state' : ''}
                  </p>
                  <dl>
                    <dt>ICAO24 identifier</dt>
                    <dd>{selected.icao24.toUpperCase()}</dd>
                    <dt>Registration country</dt>
                    <dd>{selected.origin_country}</dd>
                    <dt>Altitude</dt>
                    <dd>{altitude(selected.altitude_m, units)}</dd>
                    <dt>Ground speed</dt>
                    <dd>{speed(selected.velocity_ms, units)}</dd>
                    <dt>Heading</dt>
                    <dd>
                      {selected.heading === null
                        ? 'Unavailable'
                        : `${Math.round(selected.heading)}°`}
                    </dd>
                  </dl>
                  <button className="primary" onClick={() => setCenterRequest((n) => n + 1)}>
                    <Crosshair size={16} />
                    Center on aircraft
                  </button>
                  <button
                    aria-pressed={follow && !stale}
                    disabled={stale}
                    onClick={() => setFollow(!follow)}
                  >
                    {follow && !stale ? 'Stop following' : 'Follow aircraft'}
                  </button>
                  <small>
                    Dragging the map stops following. Routes and destination airports are not
                    provided by this feed.
                  </small>
                </aside>
              )}
            </section>
          </>
        )}
        {view === 'Analytics' && <Analytics data={data} units={units} />}
        {view === 'About' && (
          <section className="about">
            <p className="eyebrow">BEHIND THE MAP</p>
            <h1>
              Real telemetry.
              <br />A complete streaming platform.
            </h1>
            <p>
              SkyStream collects public OpenSky aircraft observations and delivers live analytics.
              Coverage depends on receiver availability; it does not represent every aircraft
              worldwide.
            </p>
            <div className="about-grid">
              {[
                [
                  'Async ingestion',
                  'Python and FastAPI collect real telemetry without blocking other work.',
                ],
                [
                  'Event streaming',
                  'Kafka-compatible Redpanda separates collection from processing.',
                ],
                [
                  'Purpose-built storage',
                  'Redis serves current state; PostgreSQL retains collection-level history.',
                ],
                [
                  'Live delivery',
                  'WebSockets deliver new snapshots. The interface distinguishes connectivity from freshness.',
                ],
              ].map(([title, body]) => (
                <article className="panel" key={title}>
                  <Activity size={24} />
                  <h2>{title}</h2>
                  <p>{body}</p>
                </article>
              ))}
            </div>
            <p>
              No synthetic aircraft are added when the provider is unavailable. Individual flight
              routes are not stored. Freshness is marked stale after 90 seconds, on disconnection,
              or when the provider reports degraded service.
            </p>
            <a
              href="https://github.com/mikaelllll/Real-Time-Analytics-Platform"
              target="_blank"
              rel="noreferrer"
            >
              Explore the source and architecture ↗
            </a>{' '}
            ·{' '}
            <a href="/docs" target="_blank" rel="noreferrer">
              API documentation ↗
            </a>
          </section>
        )}
      </div>
      <footer>
        Real telemetry from OpenSky Network · Map © OpenStreetMap contributors{' '}
        <a href="/docs" target="_blank" rel="noreferrer">
          API documentation ↗
        </a>
      </footer>
    </main>
  )
}
export default App
