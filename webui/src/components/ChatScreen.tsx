import { useWebSocket } from '../hooks/useWebSocket'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { StatusIndicator } from './StatusIndicator'

interface ChatScreenProps {
  callsign: string
}

export function ChatScreen({ callsign }: ChatScreenProps) {
  const { messages, status, sendMessage, reconnect } = useWebSocket(callsign)

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <div className="chat-header-brand">
          <div className="chat-header-icon" aria-hidden="true">A</div>
          <span className="chat-header-title">AnonChat</span>
        </div>

        <div className="chat-header-spacer" />

        <div className="chat-header-status">
          <StatusIndicator status={status} onReconnect={reconnect} />
        </div>
      </header>

      <div className="chat-ribbon" aria-hidden="true" />

      <div
        className="chat-messages-area"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
      >
        <MessageList messages={messages} ownCallsign={callsign} />
      </div>

      <MessageInput onSend={sendMessage} disabled={status !== 'connected'} />
    </div>
  )
}
