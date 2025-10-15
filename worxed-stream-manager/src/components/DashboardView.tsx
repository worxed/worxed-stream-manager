import { useEffect, useState } from '@lynx-js/react'
import { WebSocketService } from '../services/WebSocketService'
import { TwitchAPIService } from '../services/TwitchAPIService'
import type { TwitchUser, TwitchStream } from '../services/TwitchAPIService'

interface DashboardViewProps {
  websocket: WebSocketService
  twitchAPI: TwitchAPIService
}

export function DashboardView({ websocket, twitchAPI }: DashboardViewProps) {
  const [streamData, setStreamData] = useState<TwitchStream | null>(null)
  const [userData, setUserData] = useState<TwitchUser | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [viewerCount, setViewerCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)

  useEffect(() => {
    // Set up WebSocket listeners
    websocket.on('chat_message', (message) => {
      setChatMessages(prev => [...prev.slice(-49), message])
    })

    websocket.on('viewer_update', (data) => {
      setViewerCount(data.count)
    })

    websocket.on('follower_update', (data) => {
      setFollowerCount(data.count)
    })

    // Load initial data
    loadStreamData()

    return () => {
      websocket.off('chat_message', () => {})
      websocket.off('viewer_update', () => {})
      websocket.off('follower_update', () => {})
    }
  }, [])

  const loadStreamData = async () => {
    try {
      const user = await twitchAPI.getUser()
      if (user) {
        setUserData(user)
        const stream = await twitchAPI.getStream(user.login)
        setStreamData(stream)
        
        const followers = await twitchAPI.getFollowerCount(user.id)
        setFollowerCount(followers)
      }
    } catch (error) {
      console.error('Failed to load stream data:', error)
    }
  }

  const sendTestAlert = () => {
    websocket.send({
      type: 'test_alert',
      payload: {
        type: 'follow',
        username: 'TestUser',
        message: 'Thanks for the follow!'
      }
    })
  }

  return (
    <view className="dashboard-container">
      {/* Stream Status */}
      <view className="dashboard-section">
        <text className="section-title">STREAM STATUS</text>
        <view className="status-grid">
          <view className="status-item">
            <text className="status-label">STATUS</text>
            <text className={`status-value ${streamData ? 'live' : 'offline'}`}>
              {streamData ? 'LIVE' : 'OFFLINE'}
            </text>
          </view>
          <view className="status-item">
            <text className="status-label">VIEWERS</text>
            <text className="status-value">{streamData?.viewer_count || viewerCount}</text>
          </view>
          <view className="status-item">
            <text className="status-label">FOLLOWERS</text>
            <text className="status-value">{followerCount}</text>
          </view>
          <view className="status-item">
            <text className="status-label">GAME</text>
            <text className="status-value">{streamData?.game_name || 'N/A'}</text>
          </view>
        </view>
      </view>

      {/* Stream Info */}
      {streamData && (
        <view className="dashboard-section">
          <text className="section-title">STREAM INFO</text>
          <view className="stream-info">
            <text className="stream-title">{streamData.title}</text>
            <text className="stream-details">
              Started: {new Date(streamData.started_at).toLocaleTimeString()}
            </text>
          </view>
        </view>
      )}

      {/* Quick Actions */}
      <view className="dashboard-section">
        <text className="section-title">QUICK ACTIONS</text>
        <view className="actions-grid">
          <view className="action-button" bindtap={sendTestAlert}>
            <text className="action-text">TEST ALERT</text>
          </view>
          <view className="action-button" bindtap={loadStreamData}>
            <text className="action-text">REFRESH DATA</text>
          </view>
        </view>
      </view>

      {/* Recent Chat */}
      <view className="dashboard-section">
        <text className="section-title">RECENT CHAT</text>
        <view className="chat-container">
          {chatMessages.length === 0 ? (
            <text className="chat-empty">No recent messages</text>
          ) : (
            chatMessages.slice(-10).map((message, index) => (
              <view key={index} className="chat-message">
                <text className="chat-username">{message.username}:</text>
                <text className="chat-text">{message.message}</text>
              </view>
            ))
          )}
        </view>
      </view>
    </view>
  )
} 