import { useEffect, useState } from 'react'
import type { Snapshot } from '../types'

export function useTelemetry() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [connected, setConnected] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let active = true
    let socket: WebSocket
    let retry: number
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    const connect = () => {
      socket = new WebSocket(
        `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/v1/ws`,
      )
      socket.onopen = () => active && setConnected(true)
      socket.onmessage = (event) => {
        if (!active) return
        try {
          setData(JSON.parse(event.data) as Snapshot)
        } catch {
          socket.close()
        }
      }
      socket.onclose = () => {
        if (active) {
          setConnected(false)
          retry = window.setTimeout(connect, 3000)
        }
      }
      socket.onerror = () => socket.close()
    }
    connect()
    return () => {
      active = false
      clearInterval(clock)
      clearTimeout(retry)
      socket.close()
    }
  }, [])
  const age = data?.last_updated
    ? Math.max(0, Math.floor((now - Date.parse(data.last_updated)) / 1000))
    : null
  return {
    data,
    connected,
    age,
    stale: age !== null && (!connected || data?.status !== 'healthy' || age > 90),
  }
}
