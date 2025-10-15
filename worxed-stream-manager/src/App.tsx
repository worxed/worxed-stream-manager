import { useCallback, useEffect, useState } from '@lynx-js/react'
import './App.css'
import { WebSocketService } from './services/WebSocketService.js'

export function App(props: {
  onMounted?: () => void
}) {
  const [currentView, setCurrentView] = useState<'dashboard' | 'customizer' | 'alerts'>('dashboard')
  const [isConnected, setIsConnected] = useState(false)
  const [streamStatus, setStreamStatus] = useState('OFFLINE')
  const [viewerCount, setViewerCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState([
    { time: '12:34:56', type: 'follower', user: 'TestUser123', message: 'New follower' },
    { time: '12:33:45', type: 'chat', user: 'Viewer456', message: 'Chat message' },
    { time: '12:32:10', type: 'stream', user: 'System', message: 'Stream started' }
  ])
  
  // Overlay customizer state
  const [overlayType, setOverlayType] = useState('CHAT')
  const [xPosition, setXPosition] = useState(50)
  const [yPosition, setYPosition] = useState(50)
  const [width, setWidth] = useState(400)
  const [height, setHeight] = useState(300)
  const [fontSize, setFontSize] = useState(16)
  const [borderOpacity, setBorderOpacity] = useState(55)
  const [selectedPreset, setSelectedPreset] = useState('Default Terminal')

  // WebSocket service
  const [wsService, setWsService] = useState<WebSocketService | null>(null)

  useEffect(() => {
    console.info('🚀 Worxed Stream Manager - Lynx Edition')
    
    // Initialize WebSocket service
    const ws = new WebSocketService('ws://localhost:3000')
    setWsService(ws)
    
    // Set up event listeners
    ws.on('connected', (connected: boolean) => {
      setIsConnected(connected)
    })
    
    ws.on('init', (data: any) => {
      if (data.streamData) {
        setStreamStatus(data.streamData.status)
        setViewerCount(data.streamData.viewers)
        setFollowerCount(data.streamData.followers)
      }
      if (data.recentActivity) {
        setRecentActivity(data.recentActivity)
      }
    })
    
    ws.on('stream_data_updated', (data: any) => {
      setStreamStatus(data.status)
      setViewerCount(data.viewers)
      setFollowerCount(data.followers)
    })
    
    ws.on('chat_message', (data: any) => {
      setRecentActivity(prev => [
        { time: new Date().toLocaleTimeString(), type: 'chat', user: data.username, message: data.message },
        ...prev.slice(0, 9)
      ])
    })
    
    ws.on('alert', (data: any) => {
      setRecentActivity(prev => [
        { time: new Date().toLocaleTimeString(), type: 'alert', user: data.username, message: `${data.type.toUpperCase()}: ${data.message}` },
        ...prev.slice(0, 9)
      ])
    })
    
    props.onMounted?.()
    
    // Cleanup on unmount
    return () => {
      ws.disconnect()
    }
  }, [])

  const handleViewChange = useCallback((view: 'dashboard' | 'customizer' | 'alerts') => {
    setCurrentView(view)
  }, [])

  const handleTestChat = useCallback(() => {
    wsService?.testChat('TestUser123', 'This is a test chat message! 🎮')
  }, [wsService])

  const handleTestAlert = useCallback((type: string = 'follow') => {
    wsService?.testAlert(type, 'TestUser123', 'Thanks for your support!')
  }, [wsService])

  const handleOverlayUpdate = useCallback(() => {
    const settings = {
      type: overlayType,
      position: { x: xPosition, y: yPosition },
      size: { width, height },
      style: { fontSize, borderOpacity }
    }
    wsService?.updateOverlay(settings)
  }, [wsService, overlayType, xPosition, yPosition, width, height, fontSize, borderOpacity])

  const handlePresetChange = useCallback((preset: string) => {
    setSelectedPreset(preset)
    // Apply preset settings
    switch (preset) {
      case 'Cyberpunk Neon':
        setFontSize(18)
        setBorderOpacity(80)
        break
      case 'Matrix Code':
        setFontSize(14)
        setBorderOpacity(90)
        break
      case 'Retro Amber':
        setFontSize(16)
        setBorderOpacity(60)
        break
      case 'Minimal Clean':
        setFontSize(15)
        setBorderOpacity(30)
        break
      default: // Default Terminal
        setFontSize(16)
        setBorderOpacity(55)
    }
  }, [])

  const renderDashboard = () => (
    <view className="dashboard-layout">
      {/* Main Dashboard Content */}
      <view className="dashboard-main">
        <view className="dashboard-section">
          <text className="section-title">STREAM STATUS</text>
          <view className="status-grid">
            <view className="status-card">
              <text className="status-label">STATUS</text>
              <text className={`status-value ${streamStatus === 'LIVE' ? 'live' : 'offline'}`}>
                {streamStatus}
              </text>
            </view>
            <view className="status-card">
              <text className="status-label">VIEWERS</text>
              <text className="status-value">{viewerCount}</text>
            </view>
            <view className="status-card">
              <text className="status-label">FOLLOWERS</text>
              <text className="status-value">{followerCount}</text>
            </view>
            <view className="status-card">
              <text className="status-label">UPTIME</text>
              <text className="status-value">00:00:00</text>
            </view>
          </view>
        </view>

        <view className="dashboard-section">
          <text className="section-title">QUICK ACTIONS</text>
          <view className="actions-grid">
            <view className="action-button" bindtap={() => handleViewChange('customizer')}>
              <text className="action-text">OVERLAY CUSTOMIZER</text>
            </view>
            <view className="action-button" bindtap={() => handleViewChange('alerts')}>
              <text className="action-text">ALERTS MANAGER</text>
            </view>
            <view className="action-button" bindtap={handleTestChat}>
              <text className="action-text">TEST CHAT</text>
            </view>
            <view className="action-button" bindtap={() => handleTestAlert('follow')}>
              <text className="action-text">TEST ALERT</text>
            </view>
          </view>
        </view>

        <view className="dashboard-section">
          <text className="section-title">RECENT ACTIVITY</text>
          <view className="activity-list">
            {recentActivity.map((activity, index) => (
              <view key={index} className="activity-item">
                <text className="activity-time">{activity.time}</text>
                <text className="activity-text">{activity.message}</text>
              </view>
            ))}
          </view>
        </view>
      </view>
    </view>
  )

  const renderCustomizer = () => (
    <view className="customizer-layout">
      {/* Left Sidebar - Controls */}
      <view className="customizer-sidebar left">
        <view className="sidebar-section">
          <text className="sidebar-title">OVERLAY TYPE</text>
          <view className="overlay-type-grid">
            {['CHAT', 'ALERTS', 'STATS', 'GAME'].map((type) => (
              <view 
                key={type}
                className={`type-button ${overlayType === type ? 'active' : ''}`}
                bindtap={() => setOverlayType(type)}
              >
                <text className="type-text">{type}</text>
              </view>
            ))}
          </view>
        </view>

        <view className="sidebar-section">
          <text className="sidebar-title">POSITION & SIZE</text>
          
          <view className="control-group">
            <text className="control-label">X Position</text>
            <view className="slider-container">
              <text className="slider-value">{xPosition}%</text>
            </view>
          </view>

          <view className="control-group">
            <text className="control-label">Y Position</text>
            <view className="slider-container">
              <text className="slider-value">{yPosition}%</text>
            </view>
          </view>

          <view className="control-group">
            <text className="control-label">Width</text>
            <view className="slider-container">
              <text className="slider-value">{width}px</text>
            </view>
          </view>

          <view className="control-group">
            <text className="control-label">Height</text>
            <view className="slider-container">
              <text className="slider-value">{height}px</text>
            </view>
          </view>
        </view>

        <view className="sidebar-section">
          <text className="sidebar-title">TERMINAL COLORS</text>
          
          <view className="color-group">
            <text className="color-label">Primary Green</text>
            <view className="color-swatch primary-green"></view>
          </view>

          <view className="color-group">
            <text className="color-label">Secondary Purple</text>
            <view className="color-swatch secondary-purple"></view>
          </view>

          <view className="color-group">
            <text className="color-label">Background</text>
            <view className="color-swatch background"></view>
          </view>

          <view className="control-group">
            <text className="control-label">Border Opacity</text>
            <view className="slider-container">
              <text className="slider-value">{borderOpacity}%</text>
            </view>
          </view>
        </view>

        <view className="sidebar-section">
          <text className="sidebar-title">TYPOGRAPHY</text>
          
          <view className="control-group">
            <text className="control-label">Font Size</text>
            <view className="slider-container">
              <text className="slider-value">{fontSize}px</text>
            </view>
          </view>
        </view>
      </view>

      {/* Center - Live Preview */}
      <view className="customizer-preview">
        <view className="preview-header">
          <text className="preview-title">LIVE PREVIEW</text>
          <view className="preview-controls">
            <view className="preview-button">
              <text className="preview-button-text">Test Chat</text>
            </view>
            <view className="preview-button">
              <text className="preview-button-text">Test Alert</text>
            </view>
            <view className="preview-button">
              <text className="preview-button-text">Fullscreen</text>
            </view>
          </view>
        </view>
        
        <view className="preview-area">
          <view 
            className="overlay-preview"
            style={{
              left: `${xPosition}%`,
              top: `${yPosition}%`,
              width: `${width}px`,
              height: `${height}px`,
              fontSize: `${fontSize}px`
            }}
          >
            {overlayType === 'CHAT' && (
              <view className="chat-preview">
                <view className="chat-message">
                  <text className="chat-username">Viewer123:</text>
                  <text className="chat-text">This is a test message!</text>
                </view>
                <view className="chat-message">
                  <text className="chat-username">StreamFan:</text>
                  <text className="chat-text">Looking great! 🎮</text>
                </view>
              </view>
            )}
            
            {overlayType === 'ALERTS' && (
              <view className="alert-preview">
                <text className="alert-title">🎉 NEW FOLLOWER!</text>
                <text className="alert-username">TestUser123</text>
                <text className="alert-message">Thanks for the follow!</text>
              </view>
            )}
            
            {overlayType === 'STATS' && (
              <view className="stats-preview">
                <text className="stats-label">Followers: 1,234</text>
                <text className="stats-label">Viewers: 56</text>
                <text className="stats-label">Uptime: 2:34:56</text>
              </view>
            )}
          </view>
        </view>
      </view>

      {/* Right Sidebar - Presets */}
      <view className="customizer-sidebar right">
        <view className="sidebar-section">
          <text className="sidebar-title">QUICK PRESETS</text>
          
          {[
            'Default Terminal',
            'Cyberpunk Neon',
            'Matrix Code',
            'Retro Amber',
            'Minimal Clean'
          ].map((preset) => (
            <view 
              key={preset}
              className={`preset-item ${selectedPreset === preset ? 'active' : ''}`}
              bindtap={() => handlePresetChange(preset)}
            >
              <text className="preset-name">{preset}</text>
              <text className="preset-description">
                {preset === 'Default Terminal' && 'Classic green/purple terminal theme'}
                {preset === 'Cyberpunk Neon' && 'High contrast neon colors'}
                {preset === 'Matrix Code' && 'Green matrix-style theme'}
                {preset === 'Retro Amber' && 'Classic amber terminal'}
                {preset === 'Minimal Clean' && 'Clean, minimal design'}
              </text>
            </view>
          ))}
        </view>

        <view className="sidebar-section">
          <text className="sidebar-title">STREAM DECK</text>
          <text className="stream-deck-subtitle">Active overlays on Stream Deck buttons</text>
          
          <view className="stream-deck-grid">
            {['Chat', 'Alerts', 'Stats', 'Game'].map((item, index) => (
              <view key={item} className="stream-deck-button">
                <text className="stream-deck-text">{item}</text>
              </view>
            ))}
          </view>
          
          <view className="stream-deck-actions">
            <view className="stream-deck-action">
              <text className="action-text">GENERATE STREAM DECK CONFIG</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  )

  const renderAlerts = () => (
    <view className="alerts-layout">
      <view className="alerts-main">
        <view className="dashboard-section">
          <text className="section-title">ALERT CONFIGURATION</text>
          
          <view className="alert-types-grid">
            {[
              { type: 'Follow', icon: '👤', enabled: true },
              { type: 'Subscribe', icon: '⭐', enabled: true },
              { type: 'Donation', icon: '💰', enabled: true },
              { type: 'Raid', icon: '⚡', enabled: false }
            ].map((alert) => (
              <view key={alert.type} className="alert-type-card">
                <text className="alert-icon">{alert.icon}</text>
                <text className="alert-type-name">{alert.type}</text>
                <view className={`alert-toggle ${alert.enabled ? 'enabled' : 'disabled'}`}>
                  <text className="toggle-text">{alert.enabled ? 'ON' : 'OFF'}</text>
                </view>
              </view>
            ))}
          </view>
        </view>

        <view className="dashboard-section">
          <text className="section-title">TEST ALERTS</text>
          
          <view className="test-buttons-grid">
            <view className="test-button" bindtap={() => handleTestAlert('follow')}>
              <text className="test-button-text">TEST FOLLOW</text>
            </view>
            <view className="test-button" bindtap={() => handleTestAlert('subscribe')}>
              <text className="test-button-text">TEST SUBSCRIBE</text>
            </view>
            <view className="test-button" bindtap={() => handleTestAlert('donation')}>
              <text className="test-button-text">TEST DONATION</text>
            </view>
            <view className="test-button" bindtap={() => handleTestAlert('raid')}>
              <text className="test-button-text">TEST RAID</text>
            </view>
          </view>
        </view>

        <view className="dashboard-section">
          <text className="section-title">RECENT ALERTS</text>
          
          <view className="recent-alerts-list">
            <view className="alert-history-item">
              <text className="alert-time">12:34:56</text>
              <text className="alert-type">FOLLOW</text>
              <text className="alert-user">TestUser123</text>
            </view>
            <view className="alert-history-item">
              <text className="alert-time">12:33:45</text>
              <text className="alert-type">SUBSCRIBE</text>
              <text className="alert-user">StreamFan456</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  )

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard()
      case 'customizer':
        return renderCustomizer()
      case 'alerts':
        return renderAlerts()
      default:
        return renderDashboard()
    }
  }

  return (
    <view className="app-container">
      {/* Header */}
      <view className="header">
        <view className="header-content">
          <view className="header-left">
            <text className="app-title">WORXED</text>
            <text className="app-subtitle">OVERLAY CUSTOMIZER</text>
          </view>
          
          <view className="header-center">
            <view className="connection-status">
              <view className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
              <text className="status-text">{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</text>
            </view>
          </view>
          
          <view className="header-right">
            <text className="version-text">v2.0 LYNX EDITION</text>
          </view>
        </view>
      </view>

      {/* Navigation */}
      <view className="navigation">
        <view 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          bindtap={() => handleViewChange('dashboard')}
        >
          <text className="nav-text">DASHBOARD</text>
        </view>
        <view 
          className={`nav-item ${currentView === 'customizer' ? 'active' : ''}`}
          bindtap={() => handleViewChange('customizer')}
        >
          <text className="nav-text">OVERLAY CUSTOMIZER</text>
        </view>
        <view 
          className={`nav-item ${currentView === 'alerts' ? 'active' : ''}`}
          bindtap={() => handleViewChange('alerts')}
        >
          <text className="nav-text">ALERTS MANAGER</text>
        </view>
      </view>

      {/* Main Content */}
      <view className="main-content">
        {renderCurrentView()}
      </view>

      {/* Footer */}
      <view className="footer">
        <text className="footer-text">WORXED.COM • STREAM MANAGER v2.0 • LYNX EDITION • CROSS-PLATFORM</text>
      </view>
    </view>
  )
}
