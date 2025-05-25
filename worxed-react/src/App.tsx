import { useState, useEffect, useCallback } from 'react'
import './App.css'

// WebSocket service
class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private url: string = 'ws://localhost:3001') {
    this.connect();
  }

  private connect() {
    try {
      console.log('🔌 Connecting to WebSocket server...');
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected', true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received:', data.type);
          this.emit(data.type, data.data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.emit('connected', false);
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached', true);
    }
  }

  public send(type: string, payload?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = { type, payload };
      this.ws.send(JSON.stringify(message));
      console.log('📤 Sent:', type);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message:', type);
    }
  }

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Convenience methods
  public testChat(username?: string, message?: string) {
    this.send('test_chat', { username, message });
  }

  public testAlert(type: string = 'follow', username?: string, message?: string) {
    this.send('test_alert', { type, username, message });
  }

  public updateOverlay(settings: any) {
    this.send('update_overlay', settings);
  }

  public toggleAlert(alertType: string, enabled: boolean) {
    this.send('toggle_alert', { alertType, enabled });
  }

  public streamAction(action: string, data?: any) {
    this.send('stream_action', { action, ...data });
  }
}

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'customizer' | 'alerts' | 'config'>('dashboard')
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
    console.info('🚀 Worxed Stream Manager - React Edition')
    
    // Initialize WebSocket service
    const ws = new WebSocketService('ws://localhost:3001')
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
    
    // Cleanup on unmount
    return () => {
      ws.disconnect()
    }
  }, [])

  const handleViewChange = useCallback((view: 'dashboard' | 'customizer' | 'alerts' | 'config') => {
    setCurrentView(view)
  }, [])

  const handleTestChat = useCallback(() => {
    wsService?.testChat('ReactUser', 'Test from React interface! ⚛️')
  }, [wsService])

  const handleTestAlert = useCallback((type: string = 'follow') => {
    wsService?.testAlert(type, 'ReactUser', 'Thanks for your support!')
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
    <div>
    <div className="dashboard-layout">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Twitch Overlay Manager</h1>
          <p className="dashboard-subtitle">Create and manage streaming overlays for OBS Studio</p>
        </div>

        {/* Connection Status */}
        <div className="status-section">
          <div className="status-card">
            <div className="status-indicator">
              <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
              <span className="status-text">
                {isConnected ? 'Server Connected' : 'Server Disconnected'}
              </span>
            </div>
            <div className="stream-info">
              <span className="info-item">Status: {streamStatus}</span>
              <span className="info-item">Viewers: {viewerCount}</span>
              <span className="info-item">Followers: {followerCount}</span>
            </div>
          </div>
        </div>

        {/* Overlay URLs */}
        <div className="overlays-section">
          <h2 className="section-title">Available Overlays</h2>
          <div className="overlay-grid">
            <div className="overlay-item">
              <div className="overlay-header">
                <h3 className="overlay-name">Chat Overlay</h3>
                <span className="overlay-type">Real-time Chat</span>
              </div>
              <div className="overlay-url-container">
                <input 
                  type="text" 
                  value="http://localhost:3001/overlay?type=chat" 
                  readOnly 
                  className="overlay-url-input"
                />
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('http://localhost:3001/overlay?type=chat')}>Copy</button>
              </div>
              <div className="overlay-actions">
                <button className="btn btn-secondary" onClick={() => handleViewChange('customizer')}>
                  Customize
                </button>
                <button className="btn btn-primary" onClick={handleTestChat}>
                  Test Chat
                </button>
              </div>
            </div>

            <div className="overlay-item">
              <div className="overlay-header">
                <h3 className="overlay-name">Alerts Overlay</h3>
                <span className="overlay-type">Follow/Sub/Donation Alerts</span>
              </div>
              <div className="overlay-url-container">
                <input 
                  type="text" 
                  value="http://localhost:3001/overlay?type=alerts" 
                  readOnly 
                  className="overlay-url-input"
                />
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('http://localhost:3001/overlay?type=alerts')}>Copy</button>
              </div>
              <div className="overlay-actions">
                <button className="btn btn-secondary" onClick={() => handleViewChange('alerts')}>
                  Configure
                </button>
                <button className="btn btn-primary" onClick={() => handleTestAlert()}>
                  Test Alert
                </button>
              </div>
            </div>

            <div className="overlay-item">
              <div className="overlay-header">
                <h3 className="overlay-name">Stream Stats</h3>
                <span className="overlay-type">Follower/Viewer Count</span>
              </div>
              <div className="overlay-url-container">
                <input 
                  type="text" 
                  value="http://localhost:3001/overlay?type=stats" 
                  readOnly 
                  className="overlay-url-input"
                />
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('http://localhost:3001/overlay?type=stats')}>Copy</button>
              </div>
              <div className="overlay-actions">
                <button className="btn btn-secondary" onClick={() => handleViewChange('customizer')}>
                  Customize
                </button>
                <button className="btn btn-primary">
                  Refresh
                </button>
              </div>
            </div>

            <div className="overlay-item">
              <div className="overlay-header">
                <h3 className="overlay-name">Game Info</h3>
                <span className="overlay-type">Current Game Display</span>
              </div>
              <div className="overlay-url-container">
                <input 
                  type="text" 
                  value="http://localhost:3001/overlay?type=game" 
                  readOnly 
                  className="overlay-url-input"
                />
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText('http://localhost:3001/overlay?type=game')}>Copy</button>
              </div>
              <div className="overlay-actions">
                <button className="btn btn-secondary" onClick={() => handleViewChange('customizer')}>
                  Customize
                </button>
                <button className="btn btn-primary">
                  Update Game
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <span className="activity-time">{activity.time}</span>
                <span className="activity-user">{activity.user}</span>
                <span className="activity-message">{activity.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => handleViewChange('config')}>
              <span className="action-icon">⚙️</span>
              <span className="action-text">Configure Twitch</span>
            </button>
            <button className="action-btn" onClick={() => handleViewChange('customizer')}>
              <span className="action-icon">🎨</span>
              <span className="action-text">Customize Overlays</span>
            </button>
            <button className="action-btn" onClick={() => handleViewChange('alerts')}>
              <span className="action-icon">🚨</span>
              <span className="action-text">Manage Alerts</span>
            </button>
            <button className="action-btn" onClick={handleTestChat}>
              <span className="action-icon">💬</span>
              <span className="action-text">Test Chat</span>
            </button>
          </div>
        </div>
      </div>
    
    </div>
    </div>
  )

  const renderCustomizer = () => (
    <div className="customizer-layout">
      {/* Left Sidebar - Controls */}
      <div className="customizer-sidebar left">
        <div className="sidebar-section">
          <h3 className="sidebar-title">OVERLAY TYPE</h3>
          <div className="overlay-type-grid">
            {['CHAT', 'ALERTS', 'STATS', 'GAME'].map((type) => (
              <button 
                key={type}
                className={`type-button ${overlayType === type ? 'active' : ''}`}
                onClick={() => setOverlayType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">POSITION & SIZE</h3>
          
          <div className="control-group">
            <label className="control-label">X Position</label>
            <div className="slider-container">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={xPosition} 
                onChange={(e) => setXPosition(Number(e.target.value))}
                className="slider"
              />
              <span className="slider-value">{xPosition}%</span>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Y Position</label>
            <div className="slider-container">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={yPosition} 
                onChange={(e) => setYPosition(Number(e.target.value))}
                className="slider"
              />
              <span className="slider-value">{yPosition}%</span>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Width</label>
            <div className="slider-container">
              <input 
                type="range" 
                min="200" 
                max="800" 
                value={width} 
                onChange={(e) => setWidth(Number(e.target.value))}
                className="slider"
              />
              <span className="slider-value">{width}px</span>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Height</label>
            <div className="slider-container">
              <input 
                type="range" 
                min="100" 
                max="600" 
                value={height} 
                onChange={(e) => setHeight(Number(e.target.value))}
                className="slider"
              />
              <span className="slider-value">{height}px</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">TERMINAL COLORS</h3>
          
          <div className="color-group">
            <span className="color-label">Primary Green</span>
            <div className="color-swatch primary-green"></div>
          </div>

          <div className="color-group">
            <span className="color-label">Secondary Purple</span>
            <div className="color-swatch secondary-purple"></div>
          </div>

          <div className="color-group">
            <span className="color-label">Background</span>
            <div className="color-swatch background"></div>
          </div>

          <div className="control-group">
            <label className="control-label">Border Opacity</label>
            <div className="slider-container">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={borderOpacity} 
                onChange={(e) => setBorderOpacity(Number(e.target.value))}
                className="slider"
              />
              <span className="slider-value">{borderOpacity}%</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">TYPOGRAPHY</h3>
          
          <div className="control-group">
            <label className="control-label">Font Size</label>
            <div className="slider-container">
              <input 
                type="range" 
                min="10" 
                max="24" 
                value={fontSize} 
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="slider"
              />
              <span className="slider-value">{fontSize}px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center - Live Preview */}
      <div className="customizer-preview">
        <div className="preview-header">
          <h3 className="preview-title">LIVE PREVIEW</h3>
          <div className="preview-controls">
            <button className="preview-button" onClick={handleTestChat}>Test Chat</button>
            <button className="preview-button" onClick={() => handleTestAlert()}>Test Alert</button>
            <button className="preview-button" onClick={handleOverlayUpdate}>Update Overlay</button>
          </div>
        </div>
        
        <div className="preview-area">
          <div 
            className="overlay-preview"
            style={{
              left: `${xPosition}%`,
              top: `${yPosition}%`,
              width: `${width}px`,
              height: `${height}px`,
              fontSize: `${fontSize}px`,
              borderColor: `rgba(140, 255, 190, ${borderOpacity / 100})`
            }}
          >
            {overlayType === 'CHAT' && (
              <div className="chat-preview">
                <div className="chat-message">
                  <span className="chat-username">Viewer123:</span>
                  <span className="chat-text">This is a test message!</span>
                </div>
                <div className="chat-message">
                  <span className="chat-username">StreamFan:</span>
                  <span className="chat-text">Looking great! 🎮</span>
                </div>
              </div>
            )}
            
            {overlayType === 'ALERTS' && (
              <div className="alert-preview">
                <div className="alert-title">🎉 NEW FOLLOWER!</div>
                <div className="alert-username">TestUser123</div>
                <div className="alert-message">Thanks for the follow!</div>
              </div>
            )}
            
            {overlayType === 'STATS' && (
              <div className="stats-preview">
                <div className="stats-label">Followers: 1,234</div>
                <div className="stats-label">Viewers: 56</div>
                <div className="stats-label">Uptime: 2:34:56</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Presets */}
      <div className="customizer-sidebar right">
        <div className="sidebar-section">
          <h3 className="sidebar-title">QUICK PRESETS</h3>
          
          {[
            'Default Terminal',
            'Cyberpunk Neon',
            'Matrix Code',
            'Retro Amber',
            'Minimal Clean'
          ].map((preset) => (
            <div 
              key={preset}
              className={`preset-item ${selectedPreset === preset ? 'active' : ''}`}
              onClick={() => handlePresetChange(preset)}
            >
              <div className="preset-name">{preset}</div>
              <div className="preset-description">
                {preset === 'Default Terminal' && 'Classic green/purple terminal theme'}
                {preset === 'Cyberpunk Neon' && 'High contrast neon colors'}
                {preset === 'Matrix Code' && 'Green matrix-style theme'}
                {preset === 'Retro Amber' && 'Classic amber terminal'}
                {preset === 'Minimal Clean' && 'Clean, minimal design'}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">STREAM DECK</h3>
          <p className="stream-deck-subtitle">Active overlays on Stream Deck buttons</p>
          
          <div className="stream-deck-grid">
            {['Chat', 'Alerts', 'Stats', 'Game'].map((item) => (
              <div key={item} className="stream-deck-button">
                {item}
              </div>
            ))}
          </div>
          
          <div className="stream-deck-actions">
            <button className="stream-deck-action">
              GENERATE STREAM DECK CONFIG
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAlerts = () => (
    <div className="alerts-layout">
      <div className="alerts-main">
        <div className="dashboard-section">
          <h2 className="section-title">ALERT CONFIGURATION</h2>
          
          <div className="alert-types-grid">
            {[
              { type: 'Follow', icon: '👤', enabled: true },
              { type: 'Subscribe', icon: '⭐', enabled: true },
              { type: 'Donation', icon: '💰', enabled: true },
              { type: 'Raid', icon: '⚡', enabled: false }
            ].map((alert) => (
              <div key={alert.type} className="alert-type-card">
                <div className="alert-icon">{alert.icon}</div>
                <div className="alert-type-name">{alert.type}</div>
                <div className={`alert-toggle ${alert.enabled ? 'enabled' : 'disabled'}`}>
                  {alert.enabled ? 'ON' : 'OFF'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="section-title">TEST ALERTS</h2>
          
          <div className="test-buttons-grid">
            <button className="test-button" onClick={() => handleTestAlert('follow')}>
              TEST FOLLOW
            </button>
            <button className="test-button" onClick={() => handleTestAlert('subscribe')}>
              TEST SUBSCRIBE
            </button>
            <button className="test-button" onClick={() => handleTestAlert('donation')}>
              TEST DONATION
            </button>
            <button className="test-button" onClick={() => handleTestAlert('raid')}>
              TEST RAID
            </button>
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="section-title">RECENT ALERTS</h2>
          
          <div className="recent-alerts-list">
            <div className="alert-history-item">
              <span className="alert-time">12:34:56</span>
              <span className="alert-type">FOLLOW</span>
              <span className="alert-user">TestUser123</span>
            </div>
            <div className="alert-history-item">
              <span className="alert-time">12:33:45</span>
              <span className="alert-type">SUBSCRIBE</span>
              <span className="alert-user">StreamFan456</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderConfig = () => (
    <div className="config-layout">
      <div className="config-main">
        <div className="dashboard-section">
          <h2 className="section-title">TWITCH INTEGRATION</h2>
          
          <div className="config-grid">
            <div className="config-group">
              <label className="config-label">Twitch Client ID</label>
              <input 
                type="text" 
                className="config-input" 
                placeholder="your_twitch_client_id_here"
              />
            </div>
            
            <div className="config-group">
              <label className="config-label">Twitch Client Secret</label>
              <input 
                type="password" 
                className="config-input" 
                placeholder="your_twitch_client_secret_here"
              />
            </div>
            
            <div className="config-group">
              <label className="config-label">Channel Name</label>
              <input 
                type="text" 
                className="config-input" 
                placeholder="your_twitch_username"
              />
            </div>
            
            <div className="config-actions">
              <button className="config-button primary">CONNECT TO TWITCH</button>
              <button className="config-button secondary">TEST CONNECTION</button>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="section-title">OVERLAY SETTINGS</h2>
          
          <div className="config-grid">
            <div className="config-group">
              <label className="config-label">Default Font Size</label>
              <input 
                type="number" 
                className="config-input" 
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                min="10" 
                max="32"
              />
            </div>
            
            <div className="config-group">
              <label className="config-label">Chat Message Limit</label>
              <input 
                type="number" 
                className="config-input" 
                defaultValue="50"
                min="10" 
                max="200"
              />
            </div>
            
            <div className="config-group">
              <label className="config-label">Alert Duration (ms)</label>
              <input 
                type="number" 
                className="config-input" 
                defaultValue="5000"
                min="1000" 
                max="15000"
              />
            </div>
            
            <div className="config-toggle-group">
              <label className="config-toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
                Enable Sound Alerts
              </label>
              
              <label className="config-toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
                Auto-hide Chat After Timeout
              </label>
              
              <label className="config-toggle">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
                Show Timestamps
              </label>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="section-title">THEME CUSTOMIZATION</h2>
          
          <div className="theme-config-grid">
            <div className="color-picker-group">
              <label className="config-label">Primary Color (Green)</label>
              <div className="color-picker-container">
                <input type="color" value="#8cffbe" className="color-picker" />
                <span className="color-value">#8cffbe</span>
              </div>
            </div>
            
            <div className="color-picker-group">
              <label className="config-label">Secondary Color (Purple)</label>
              <div className="color-picker-container">
                <input type="color" value="#b893ff" className="color-picker" />
                <span className="color-value">#b893ff</span>
              </div>
            </div>
            
            <div className="color-picker-group">
              <label className="config-label">Background Color</label>
              <div className="color-picker-container">
                <input type="color" value="#121318" className="color-picker" />
                <span className="color-value">#121318</span>
              </div>
            </div>
            
            <div className="preset-themes">
              <h4 className="preset-title">Quick Themes</h4>
              <div className="preset-buttons">
                <button className="preset-btn active">Worxed Terminal</button>
                <button className="preset-btn">Cyberpunk Neon</button>
                <button className="preset-btn">Matrix Green</button>
                <button className="preset-btn">Retro Amber</button>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="section-title">EXPORT & BACKUP</h2>
          
          <div className="export-grid">
            <div className="export-group">
              <h4 className="export-title">Configuration Backup</h4>
              <p className="export-description">Save your current settings and theme configuration</p>
              <button className="export-button">📥 EXPORT CONFIG</button>
            </div>
            
            <div className="export-group">
              <h4 className="export-title">Import Settings</h4>
              <p className="export-description">Load previously saved configuration</p>
              <button className="export-button">📤 IMPORT CONFIG</button>
            </div>
            
            <div className="export-group">
              <h4 className="export-title">Reset to Defaults</h4>
              <p className="export-description">Restore all settings to default values</p>
              <button className="export-button danger">🔄 RESET ALL</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard()
      case 'customizer':
        return renderCustomizer()
      case 'alerts':
        return renderAlerts()
      case 'config':
        return renderConfig()
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">Worxed Stream Manager</h1>
            <span className="app-subtitle">Overlay Management</span>
          </div>
          
          <div className="header-center">
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
              <span className="status-text">{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
          </div>
          
          <div className="header-right">
            <span className="version-text">v2.0</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="navigation">
        <button 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleViewChange('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`nav-item ${currentView === 'customizer' ? 'active' : ''}`}
          onClick={() => handleViewChange('customizer')}
        >
          Customizer
        </button>
        <button 
          className={`nav-item ${currentView === 'alerts' ? 'active' : ''}`}
          onClick={() => handleViewChange('alerts')}
        >
          Alerts
        </button>
        <button 
          className={`nav-item ${currentView === 'config' ? 'active' : ''}`}
          onClick={() => handleViewChange('config')}
        >
          Settings
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {renderCurrentView()}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-text">Worxed Stream Manager v2.0</div>
      </footer>
    </div>
  )
}

export default App
