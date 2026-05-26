import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'

interface MessageInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form className="chat-input-bar" onSubmit={handleSubmit}>
      <input
        className="chat-input-field"
        type="text"
        placeholder="Type a message…"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={1000}
        disabled={disabled}
        aria-label="Message"
        autoComplete="off"
      />
      <button
        type="submit"
        className="chat-send-btn"
        disabled={!text.trim() || disabled}
        aria-label="Send message"
      >
        <SendIcon />
        <span className="chat-send-btn-text">Send</span>
      </button>
    </form>
  )
}

function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}
