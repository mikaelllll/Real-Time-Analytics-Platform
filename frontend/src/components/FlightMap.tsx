import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import type { Aircraft } from '../types'

export function FlightMap({ aircraft }: { aircraft: Aircraft[] }) {
  return (
    <MapContainer center={[20, 0]} zoom={2} minZoom={2} className="map" worldCopyJump preferCanvas>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {aircraft.map((a) => (
        <CircleMarker
          key={a.icao24}
          center={[a.latitude, a.longitude]}
          radius={2.5}
          pathOptions={{ color: a.on_ground ? '#f4a261' : '#56d8e4', fillOpacity: 0.85, weight: 1 }}
        >
          <Popup>
            <strong>{a.callsign || a.icao24.toUpperCase()}</strong>
            <br />
            {a.origin_country}
            <br />
            {a.altitude_m
              ? `${Math.round(a.altitude_m).toLocaleString()} m`
              : 'Altitude unavailable'}
            <br />
            {a.velocity_ms ? `${Math.round(a.velocity_ms * 3.6)} km/h` : 'Speed unavailable'}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
