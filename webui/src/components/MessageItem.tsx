import type { ServerMessage } from '../types'

interface MessageItemProps {
  message: ServerMessage
  ownCallsign: string
}

export function MessageItem({ message, ownCallsign }: MessageItemProps) {
  if (message.type === 'system') {
    const text =
      message.event === 'user_joined'
        ? `${message.callsign} joined the chat`
        : `${message.callsign} left the chat`
    return (
      <div className="msg-system-wrap">
        <div className="msg-system-pill">{text}</div>
      </div>
    )
  }

  const isOwn = message.callsign === ownCallsign
  const time = formatTime(message.timestamp)

  if (isOwn) {
    return (
      <div className="msg-own-wrap">
        <div className="msg-bubble msg-bubble--own">
          <span className="msg-text msg-text--own">{message.text}</span>
          <span className="msg-time msg-time--own">{time}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="msg-other-wrap">
      <div className="msg-bubble msg-bubble--other">
        <span className="msg-callsign">{message.callsign}</span>
        <span className="msg-text msg-text--other">{message.text}</span>
        <span className="msg-time msg-time--other">{time}</span>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
