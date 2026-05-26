import { useState, type ChangeEvent, type FormEvent } from 'react'

const CALLSIGN_RE = /^[a-zA-Z0-9_]{1,20}$/

interface JoinScreenProps {
  onJoin: (callsign: string) => void
}

export function JoinScreen({ onJoin }: JoinScreenProps) {
  const [callsign, setCallsign] = useState('')
  const [error, setError] = useState('')

  const validate = (value: string): boolean => {
    if (!value.trim()) {
      setError('Callsign is required.')
      return false
    }
    if (!CALLSIGN_RE.test(value)) {
      setError('Invalid callsign. Use only letters, numbers, and underscores.')
      return false
    }
    setError('')
    return true
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setCallsign(v)
    if (error) validate(v)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (validate(callsign)) onJoin(callsign)
  }

  return (
    <div className="join-screen">
      <nav className="join-nav" aria-label="Site navigation">
        <span className="join-nav-title">AnonChat</span>
      </nav>

      <div className="join-hero" role="img" aria-hidden="true" />

      <div className="join-accent" aria-hidden="true" />

      <main className="join-center">
        <form className="join-form" onSubmit={handleSubmit} noValidate>
          <h1 className="join-form-title">AnonChat</h1>
          <p className="join-form-subtitle">
            No sign-up. Just pick a callsign and start talking.
          </p>

          <div className="join-form-photo" aria-hidden="true" />

          <div className="join-field-group">
            <label className="join-field-label" htmlFor="callsign-input">
              Callsign
            </label>
            <input
              id="callsign-input"
              className={`join-field-input${error ? ' join-field-input--error' : ''}`}
              type="text"
              placeholder="Enter your callsign…"
              value={callsign}
              onChange={handleChange}
              maxLength={20}
              autoComplete="off"
              autoFocus
              aria-describedby={error ? 'callsign-error' : 'callsign-hint'}
              aria-invalid={!!error}
            />
            {error ? (
              <span id="callsign-error" className="join-field-error" role="alert">
                {error}
              </span>
            ) : (
              <span id="callsign-hint" className="join-field-hint">
                1–20 characters, letters, numbers, underscore
              </span>
            )}
          </div>

          <button type="submit" className="join-btn">
            Join Chat
          </button>
        </form>
      </main>

      <div className="join-bottom-photo" aria-hidden="true" />
    </div>
  )
}
