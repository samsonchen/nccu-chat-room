import type { ConnectionStatus } from '../types'

const LABELS: Record<ConnectionStatus, string> = {
  connecting:   'Connecting…',
  connected:    'Connected',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
}

interface StatusIndicatorProps {
  status: ConnectionStatus
  onReconnect?: () => void
}

export function StatusIndicator({ status, onReconnect }: StatusIndicatorProps) {
  return (
    <>
      <div className={`status-dot status-dot--${status}`} aria-hidden="true" />
      <span className="status-text">{LABELS[status]}</span>
      {status === 'disconnected' && onReconnect && (
        <button
          type="button"
          className="status-reconnect-btn"
          onClick={onReconnect}
        >
          Reconnect
        </button>
      )}
    </>
  )
}
