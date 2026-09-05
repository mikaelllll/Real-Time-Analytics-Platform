import { memo, useEffect, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { Aircraft } from '../types'

interface Props {
  aircraft: Aircraft[]
  selected: Aircraft | undefined
  onSelect: (id: string) => void
  follow: boolean
  onStopFollow: () => void
  centerRequest: number
}
function AircraftLayer({
  aircraft,
  selected,
  onSelect,
  follow,
  onStopFollow,
  centerRequest,
}: Props) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()), dragstart: onStopFollow })
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  const lat = selected?.latitude
  const lng = selected?.longitude
  useEffect(() => {
    if (follow && lat !== undefined && lng !== undefined) map.panTo([lat, lng], { animate: false })
  }, [follow, lat, lng, map])
  useEffect(() => {
    if (centerRequest && lat !== undefined && lng !== undefined)
      map.setView([lat, lng], Math.max(map.getZoom(), 6), { animate: false })
    // Center is an explicit action; subsequent coordinates only pan while following.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerRequest, map])
  return (
    <>
      {aircraft.map((a) => {
        const active = a.icao24 === selected?.icao24
        const color = active ? '#ffffff' : a.on_ground ? '#ffbd78' : '#53d8df'
        const events = { click: () => onSelect(a.icao24) }
        const tooltip = <Tooltip>{a.callsign || a.icao24.toUpperCase()}</Tooltip>
        if (zoom >= 5 && a.heading !== null) {
          const p = map.project([a.latitude, a.longitude], zoom)
          const angle = (a.heading * Math.PI) / 180
          const outline = [
            [0, -10],
            [2, -3],
            [9, 3],
            [9, 5],
            [2, 2],
            [2, 7],
            [4, 9],
            [0, 8],
            [-4, 9],
            [-2, 7],
            [-2, 2],
            [-9, 5],
            [-9, 3],
            [-2, -3],
          ]
          const positions = outline.map(([x, y]) =>
            map.unproject(
              [
                p.x + x * Math.cos(angle) - y * Math.sin(angle),
                p.y + x * Math.sin(angle) + y * Math.cos(angle),
              ],
              zoom,
            ),
          )
          return (
            <Polygon
              key={a.icao24}
              positions={positions}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: active ? 2 : 1 }}
              eventHandlers={events}
            >
              {tooltip}
            </Polygon>
          )
        }
        return (
          <CircleMarker
            key={a.icao24}
            center={[a.latitude, a.longitude]}
            radius={active ? 7 : 3}
            pathOptions={{ color, fillOpacity: 0.85, weight: active ? 3 : 1 }}
            eventHandlers={events}
          >
            {tooltip}
          </CircleMarker>
        )
      })}
    </>
  )
}
export const FlightMap = memo(function FlightMap(props: Props) {
  return (
    <MapContainer center={[20, 0]} zoom={2} minZoom={2} className="map" worldCopyJump preferCanvas>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AircraftLayer {...props} />
    </MapContainer>
  )
})
