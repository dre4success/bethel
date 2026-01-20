import { memo } from 'react'
import type { Participant } from '../../lib/websocket'
import './Presence.css'

interface ParticipantListProps {
  participants: Participant[]
}

export const ParticipantList = memo(function ParticipantList({
  participants,
}: ParticipantListProps) {
  if (participants.length === 0) {
    return null
  }

  // Show max 5 avatars, then count
  const visibleParticipants = participants.slice(0, 5)
  const remainingCount = participants.length - 5

  return (
    <div className="participants-list">
      {visibleParticipants.map((p) => (
        <div
          key={p.id}
          className="participant-avatar"
          style={{ backgroundColor: p.color }}
          title={p.name || 'Anonymous'}
        >
          {(p.name || 'A')[0].toUpperCase()}
        </div>
      ))}
      {remainingCount > 0 && <span className="participant-count">+{remainingCount}</span>}
    </div>
  )
})

interface ConnectionStatusProps {
  isConnected: boolean
}

export const ConnectionStatus = memo(function ConnectionStatus({
  isConnected,
}: ConnectionStatusProps) {
  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <span className="connection-dot" />
      {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  )
})
