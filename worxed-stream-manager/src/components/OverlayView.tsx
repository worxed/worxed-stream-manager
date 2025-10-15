import { useEffect, useState } from '@lynx-js/react'

interface OverlayViewProps {
  websocket: any
}

export function OverlayView({ websocket }: OverlayViewProps) {
  const [overlayElements, setOverlayElements] = useState<any[]>([])
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  useEffect(() => {
    // Set up WebSocket listeners for overlay updates
    websocket.on('overlay_update', (data: any) => {
      setOverlayElements(data.elements || [])
    })

    // Load initial overlay configuration
    loadOverlayConfig()

    return () => {
      websocket.off('overlay_update', () => {})
    }
  }, [])

  const loadOverlayConfig = () => {
    websocket.send({
      type: 'get_overlay_config',
      payload: {}
    })
  }

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode)
  }

  const addElement = (type: string) => {
    const newElement = {
      id: Date.now().toString(),
      type,
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      visible: true
    }

    websocket.send({
      type: 'add_overlay_element',
      payload: newElement
    })
  }

  return (
    <view className="overlay-container">
      {/* Overlay Controls */}
      <view className="overlay-section">
        <text className="section-title">OVERLAY CONTROLS</text>
        <view className="controls-grid">
          <view className="control-button" bindtap={togglePreview}>
            <text className="control-text">
              {isPreviewMode ? 'EXIT PREVIEW' : 'PREVIEW MODE'}
            </text>
          </view>
          <view className="control-button" bindtap={loadOverlayConfig}>
            <text className="control-text">RELOAD CONFIG</text>
          </view>
        </view>
      </view>

      {/* Add Elements */}
      <view className="overlay-section">
        <text className="section-title">ADD ELEMENTS</text>
        <view className="elements-grid">
          <view className="element-button" bindtap={() => addElement('chat')}>
            <text className="element-text">CHAT BOX</text>
          </view>
          <view className="element-button" bindtap={() => addElement('alerts')}>
            <text className="element-text">ALERTS</text>
          </view>
          <view className="element-button" bindtap={() => addElement('webcam')}>
            <text className="element-text">WEBCAM</text>
          </view>
          <view className="element-button" bindtap={() => addElement('recent_followers')}>
            <text className="element-text">FOLLOWERS</text>
          </view>
        </view>
      </view>

      {/* Current Elements */}
      <view className="overlay-section">
        <text className="section-title">CURRENT ELEMENTS</text>
        <view className="elements-list">
          {overlayElements.length === 0 ? (
            <text className="elements-empty">No overlay elements configured</text>
          ) : (
            overlayElements.map((element, index) => (
              <view key={element.id || index} className="element-item">
                <text className="element-name">{element.type.toUpperCase()}</text>
                <text className="element-position">
                  {element.x}, {element.y}
                </text>
                <view className={`element-status ${element.visible ? 'visible' : 'hidden'}`}>
                  <text className="status-text">
                    {element.visible ? 'VISIBLE' : 'HIDDEN'}
                  </text>
                </view>
              </view>
            ))
          )}
        </view>
      </view>

      {/* Preview Mode Indicator */}
      {isPreviewMode && (
        <view className="preview-indicator">
          <text className="preview-text">PREVIEW MODE ACTIVE</text>
        </view>
      )}
    </view>
  )
} 