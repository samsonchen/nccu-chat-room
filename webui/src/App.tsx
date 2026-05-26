import { useState } from 'react'
import { JoinScreen } from './components/JoinScreen'
import { ChatScreen } from './components/ChatScreen'

type Screen = 'join' | 'chat'

export default function App() {
  const [screen, setScreen] = useState<Screen>('join')
  const [callsign, setCallsign] = useState('')

  const handleJoin = (name: string) => {
    setCallsign(name)
    setScreen('chat')
  }

  return screen === 'join'
    ? <JoinScreen onJoin={handleJoin} />
    : <ChatScreen callsign={callsign} />
}
