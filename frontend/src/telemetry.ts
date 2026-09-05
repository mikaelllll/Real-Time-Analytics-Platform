import type { Aircraft } from './types'
export type Units = 'metric' | 'aviation'
export interface Filters {
  query: string
  country: string
  state: string
  altitude: string
  speed: string
}
export const defaultFilters: Filters = {
  query: '',
  country: '',
  state: '',
  altitude: '',
  speed: '',
}
export function matchesAircraft(a: Aircraft, f: Filters) {
  const query = f.query.trim().toLowerCase()
  return (
    (!query || `${a.callsign ?? ''} ${a.icao24}`.toLowerCase().includes(query)) &&
    (!f.country || a.origin_country === f.country) &&
    (!f.state || a.on_ground === (f.state === 'ground')) &&
    (!f.altitude ||
      (a.altitude_m !== null &&
        (f.altitude === 'high' ? a.altitude_m >= 9000 : a.altitude_m < 9000))) &&
    (!f.speed ||
      (a.velocity_ms !== null &&
        (f.speed === 'fast' ? a.velocity_ms * 3.6 >= 500 : a.velocity_ms * 3.6 < 500)))
  )
}
export function altitude(value: number | null, units: Units) {
  return value === null
    ? 'Unavailable'
    : `${Math.round(value * (units === 'aviation' ? 3.28084 : 1)).toLocaleString()} ${units === 'aviation' ? 'ft' : 'm'}`
}
export function speed(value: number | null, units: Units) {
  return value === null
    ? 'Unavailable'
    : `${Math.round(value * (units === 'aviation' ? 1.94384 : 3.6)).toLocaleString()} ${units === 'aviation' ? 'kt' : 'km/h'}`
}
