import { useEffect, useRef } from 'react'
import type { ServerMessage } from '../types'
import { MessageItem } from './MessageItem'

const PHOTO_URL =
  'https://images.unsplash.com/photo-1687289005111-46e364abc7d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3Nzk3NjEwMjR8&ixlib=rb-4.1.0&q=80&w=1080'

interface MessageListProps {
  messages: ServerMessage[]
  ownCallsign: string
}

export function MessageList({ messages, ownCallsign }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [messages.length])

  return (
    <div className="chat-messages-column">
      <div
        className="chat-photo-ribbon"
        style={{ backgroundImage: `url(${PHOTO_URL})` }}
        aria-hidden="true"
      />
      {messages.map((msg, i) => (
        <MessageItem key={i} message={msg} ownCallsign={ownCallsign} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
