/**
 * WebSocket hook for real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'

export interface IssueNotification {
  type: 'issue.updated' | 'issue.completed'
  issue_id: string
  issue_identifier?: string
  issue_title?: string
  old_status?: string
  new_status: string
  message: string
}

export interface WebSocketMessage {
  type: string
  [key: string]: any
}

interface UseWebSocketOptions {
  onNotification?: (notification: IssueNotification) => void
  reconnectAttempts?: number
  reconnectDelay?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onNotification,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const pingIntervalRef = useRef<number | null>(null)

  const connect = useCallback(() => {
    const token = api.getAccessToken()
    if (!token) {
      console.log('No auth token, skipping WebSocket connection')
      return
    }

    const wsUrl = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`

    try {
      wsRef.current = new WebSocket(`${wsUrl}?token=${token}`)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectCountRef.current = 0

        // Start ping interval
        pingIntervalRef.current = window.setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send('ping')
          }
        }, 30000)
      }

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        cleanup()

        // Attempt reconnect if not closed intentionally
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current)
          reconnectCountRef.current++
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current})`)
          reconnectTimeoutRef.current = window.setTimeout(connect, delay)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      wsRef.current.onmessage = (event) => {
        try {
          // Handle pong
          if (event.data === 'pong') return

          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)

          // Handle notifications
          if (message.type === 'issue.updated' || message.type === 'issue.completed') {
            onNotification?.(message as IssueNotification)
          }
        } catch {
          // Ignore parse errors for non-JSON messages
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
    }
  }, [onNotification, reconnectAttempts, reconnectDelay])

  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const disconnect = useCallback(() => {
    cleanup()
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect')
      wsRef.current = null
    }
    setIsConnected(false)
  }, [cleanup])

  const send = useCallback((data: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    lastMessage,
    send,
    connect,
    disconnect,
  }
}
