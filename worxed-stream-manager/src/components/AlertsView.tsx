import { useEffect, useState } from '@lynx-js/react'

interface AlertsViewProps {
  websocket: any
  twitchAPI: any
}

interface Alert {
  id: string
  type: 'follow' | 'subscribe' | 'donation' | 'raid'
  username: string
  message?: string
  amount?: number
  timestamp: Date
}

export function AlertsView({ websocket, twitchAPI }: AlertsViewProps) {
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [alertSettings, setAlertSettings] = useState({
    followEnabled: true,
    subscribeEnabled: true,
    donationEnabled: true,
    raidEnabled: true,
    soundEnabled: true,
    minDonationAmount: 1
  })

  useEffect(() => {
    // Set up WebSocket listeners for alerts
    websocket.on('new_alert', (alertData: any) => {
      const alert: Alert = {
        id: Date.now().toString(),
        type: alertData.type,
        username: alertData.username,
        message: alertData.message,
        amount: alertData.amount,
        timestamp: new Date()
      }
      setRecentAlerts(prev => [alert, ...prev.slice(0, 49)])
    })

    websocket.on('alert_settings', (settings: any) => {
      setAlertSettings(settings)
    })

    // Load initial data
    loadAlertSettings()
    loadRecentAlerts()

    return () => {
      websocket.off('new_alert', () => {})
      websocket.off('alert_settings', () => {})
    }
  }, [])

  const loadAlertSettings = () => {
    websocket.send({
      type: 'get_alert_settings',
      payload: {}
    })
  }

  const loadRecentAlerts = () => {
    websocket.send({
      type: 'get_recent_alerts',
      payload: {}
    })
  }

  const updateAlertSetting = (key: string, value: any) => {
    const newSettings = { ...alertSettings, [key]: value }
    setAlertSettings(newSettings)
    
    websocket.send({
      type: 'update_alert_settings',
      payload: newSettings
    })
  }

  const sendTestAlert = (type: string) => {
    websocket.send({
      type: 'test_alert',
      payload: {
        type,
        username: 'TestUser',
        message: type === 'donation' ? 'Thanks for the support!' : 'Thanks for the follow!',
        amount: type === 'donation' ? 5 : undefined
      }
    })
  }

  const clearAlerts = () => {
    setRecentAlerts([])
    websocket.send({
      type: 'clear_alerts',
      payload: {}
    })
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'follow': return '👤'
      case 'subscribe': return '⭐'
      case 'donation': return '💰'
      case 'raid': return '⚡'
      default: return '🔔'
    }
  }

  return (
    <view className="alerts-container">
      {/* Alert Settings */}
      <view className="alerts-section">
        <text className="section-title">ALERT SETTINGS</text>
        <view className="settings-grid">
          <view className="setting-item">
            <text className="setting-label">FOLLOWS</text>
            <view 
              className={`toggle ${alertSettings.followEnabled ? 'enabled' : 'disabled'}`}
              bindtap={() => updateAlertSetting('followEnabled', !alertSettings.followEnabled)}
            >
              <text className="toggle-text">
                {alertSettings.followEnabled ? 'ON' : 'OFF'}
              </text>
            </view>
          </view>
          
          <view className="setting-item">
            <text className="setting-label">SUBSCRIBES</text>
            <view 
              className={`toggle ${alertSettings.subscribeEnabled ? 'enabled' : 'disabled'}`}
              bindtap={() => updateAlertSetting('subscribeEnabled', !alertSettings.subscribeEnabled)}
            >
              <text className="toggle-text">
                {alertSettings.subscribeEnabled ? 'ON' : 'OFF'}
              </text>
            </view>
          </view>

          <view className="setting-item">
            <text className="setting-label">DONATIONS</text>
            <view 
              className={`toggle ${alertSettings.donationEnabled ? 'enabled' : 'disabled'}`}
              bindtap={() => updateAlertSetting('donationEnabled', !alertSettings.donationEnabled)}
            >
              <text className="toggle-text">
                {alertSettings.donationEnabled ? 'ON' : 'OFF'}
              </text>
            </view>
          </view>

          <view className="setting-item">
            <text className="setting-label">SOUND</text>
            <view 
              className={`toggle ${alertSettings.soundEnabled ? 'enabled' : 'disabled'}`}
              bindtap={() => updateAlertSetting('soundEnabled', !alertSettings.soundEnabled)}
            >
              <text className="toggle-text">
                {alertSettings.soundEnabled ? 'ON' : 'OFF'}
              </text>
            </view>
          </view>
        </view>
      </view>

      {/* Test Alerts */}
      <view className="alerts-section">
        <text className="section-title">TEST ALERTS</text>
        <view className="test-grid">
          <view className="test-button" bindtap={() => sendTestAlert('follow')}>
            <text className="test-text">TEST FOLLOW</text>
          </view>
          <view className="test-button" bindtap={() => sendTestAlert('subscribe')}>
            <text className="test-text">TEST SUB</text>
          </view>
          <view className="test-button" bindtap={() => sendTestAlert('donation')}>
            <text className="test-text">TEST DONATION</text>
          </view>
          <view className="test-button" bindtap={() => sendTestAlert('raid')}>
            <text className="test-text">TEST RAID</text>
          </view>
        </view>
      </view>

      {/* Recent Alerts */}
      <view className="alerts-section">
        <view className="section-header">
          <text className="section-title">RECENT ALERTS</text>
          <view className="clear-button" bindtap={clearAlerts}>
            <text className="clear-text">CLEAR</text>
          </view>
        </view>
        
        <view className="alerts-list">
          {recentAlerts.length === 0 ? (
            <text className="alerts-empty">No recent alerts</text>
          ) : (
            recentAlerts.slice(0, 20).map((alert) => (
              <view key={alert.id} className="alert-item">
                <text className="alert-icon">{getAlertIcon(alert.type)}</text>
                <view className="alert-content">
                  <text className="alert-username">{alert.username}</text>
                  <text className="alert-type">{alert.type.toUpperCase()}</text>
                  {alert.amount && (
                    <text className="alert-amount">${alert.amount}</text>
                  )}
                </view>
                <text className="alert-time">
                  {alert.timestamp.toLocaleTimeString()}
                </text>
              </view>
            ))
          )}
        </view>
      </view>
    </view>
  )
} 