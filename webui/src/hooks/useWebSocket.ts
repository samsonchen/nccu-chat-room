import { useState, useEffect, useRef, useCallback } from 'react'
import type { ServerMessage, ConnectionStatus } from '../types'
import { WS_ENDPOINT } from '../config'

const RECONNECT_DELAYS = [2000, 4000, 8000, 16000, 30000]

export function useWebSocket(callsign: string) {
  const [messages, setMessages] = useState<ServerMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  const wsRef = useRef<WebSocket | null>(null)
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(false)
  // Stable ref so the onclose callback can always call the latest connect
  const connectRef = useRef<() => void>(() => undefined)

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'sendMessage', text }))
    }
  }, [])

  const reconnect = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    attemptsRef.current = 0
    wsRef.current?.close()
    connectRef.current()
  }, [])

  useEffect(() => {
    mountedRef.current = true

    function connect() {
      if (!mountedRef.current) return

      const attempt = attemptsRef.current
      setStatus(attempt > 0 ? 'reconnecting' : 'connecting')

      const ws = new WebSocket(
        `${WS_ENDPOINT}?callsign=${encodeURIComponent(callsign)}`,
      )
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close()
          return
        }
        attemptsRef.current = 0
        setStatus('connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as ServerMessage
          if (mountedRef.current) {
            setMessages((prev) => [...prev, data])
          }
        } catch {
          // ignore malformed frames
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        const a = attemptsRef.current
        if (a >= RECONNECT_DELAYS.length) {
          setStatus('disconnected')
          return
        }
        setStatus('reconnecting')
        attemptsRef.current = a + 1
        timerRef.current = setTimeout(connectRef.current, RECONNECT_DELAYS[a])
      }

      // onerror always precedes onclose, so we handle reconnect there
    }

    connectRef.current = connect
    connect()

    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [callsign])

  return { messages, status, sendMessage, reconnect }
}
