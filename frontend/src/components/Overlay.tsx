import { useState, useEffect, useRef } from 'react';
import { socketService } from '../services/socket';
import { getEndpoints } from '../services/api';
import type { Alert, ChatMessage } from '../types';

interface CustomEventPopup {
  id: string;
  eventName: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const ALERT_LABELS: Record<string, string> = {
  follow: 'NEW FOLLOWER!',
  subscribe: 'NEW SUBSCRIBER!',
  donation: 'DONATION!',
  raid: 'INCOMING RAID!',
};

export default function Overlay() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [customPopups, setCustomPopups] = useState<CustomEventPopup[]>([]);
  const customUnsubRef = useRef<(() => void) | null>(null);

  // Read URL params
  const params = new URLSearchParams(window.location.search);
  const overlayType = params.get('type') || 'alerts';
  const primaryColor = params.get('primary') || '#FF3B30';
  const secondaryColor = params.get('secondary') || '#8B0000';
  const bgColor = params.get('bg') || 'transparent';
  const fontSize = parseInt(params.get('fontSize') || '18', 10);

  useEffect(() => {
    // Transparent background for OBS compositing
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.background = 'transparent';

    socketService.connect();

    // Alert subscription
    const unsubAlert = socketService.onAlert((alert) => {
      setAlerts(prev => [...prev, alert]);
    });

    // Chat subscription
    const unsubChat = socketService.onChatMessage((msg) => {
      setChatMessages(prev => [...prev.slice(-19), msg]);
    });

    // Settings change subscription
    const unsubSettings = socketService.onSettingsChanged((event) => {
      if (event.key === 'overlay.fontSize' && typeof event.value === 'number') {
        document.documentElement.style.fontSize = `${event.value}px`;
      }
    });

    // Subscribe to custom endpoint events
    async function setupCustomEvents() {
      const result = await getEndpoints();
      if (!result.data) return;

      const names = result.data
        .filter(ep => ep.enabled && ep.handler?.type === 'event' && ep.handler?.event)
        .map(ep => ep.handler.event as string);

      if (names.length === 0) return;

      customUnsubRef.current = socketService.onAnyCustomEvent(names, ({ eventName, data }) => {
        const popup: CustomEventPopup = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          eventName,
          data: (data && typeof data === 'object' ? data : { value: data }) as Record<string, unknown>,
          timestamp: Date.now(),
        };
        setCustomPopups(prev => [...prev, popup]);
      });
    }

    setupCustomEvents();

    return () => {
      unsubAlert();
      unsubChat();
      unsubSettings();
      customUnsubRef.current?.();
    };
  }, []);

  // Auto-dismiss alerts
  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = setTimeout(() => {
      setAlerts(prev => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [alerts]);

  // Auto-dismiss custom popups after 4s
  useEffect(() => {
    if (customPopups.length === 0) return;
    const timer = setTimeout(() => {
      setCustomPopups(prev => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [customPopups]);

  if (overlayType === 'chat') {
    return (
      <div style={styles.chatContainer}>
        {chatMessages.map((msg) => (
          <div key={msg.id} style={{ ...styles.chatMessage, animation: 'fadeIn 0.3s ease-out' }}>
            <span style={{ color: msg.color || primaryColor, fontWeight: 'bold', fontSize }}>
              {msg.username}
            </span>
            <span style={{ color: '#ffffff', marginLeft: 8, fontSize }}>
              {msg.message}
            </span>
          </div>
        ))}
        <style>{keyframes}</style>
      </div>
    );
  }

  // Default: alerts overlay
  const currentAlert = alerts[0] || null;
  const currentPopup = customPopups[0] || null;

  return (
    <div style={{ ...styles.overlay, background: bgColor }}>
      {currentAlert && (
        <div
          key={currentAlert.id}
          style={{
            ...styles.alertBox,
            borderColor: primaryColor,
            animation: 'fadeInUp 0.5s ease-out',
          }}
        >
          <div style={{ ...styles.alertLabel, color: primaryColor, fontSize: fontSize + 8 }}>
            {ALERT_LABELS[currentAlert.type] || currentAlert.type.toUpperCase()}
          </div>
          <div style={{ ...styles.alertUsername, color: secondaryColor, fontSize: fontSize + 4 }}>
            {currentAlert.username}
          </div>
          {currentAlert.message && (
            <div style={{ ...styles.alertMessage, fontSize }}>
              {currentAlert.message}
            </div>
          )}
          {currentAlert.amount && (
            <div style={{ ...styles.alertAmount, color: primaryColor, fontSize: fontSize + 2 }}>
              ${currentAlert.amount}
            </div>
          )}
        </div>
      )}

      {currentPopup && (
        <div
          key={currentPopup.id}
          style={{
            ...styles.customPopup,
            borderColor: primaryColor,
            animation: 'fadeInUp 0.4s ease-out',
          }}
        >
          <div style={{ ...styles.customPopupName, color: primaryColor, fontSize }}>
            {currentPopup.eventName}
          </div>
          <div style={{ ...styles.customPopupData, fontSize: fontSize - 2 }}>
            {Object.entries(currentPopup.data)
              .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
              .join(' | ')}
          </div>
        </div>
      )}

      <style>{keyframes}</style>
    </div>
  );
}

const keyframes = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  alertBox: {
    background: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    border: '2px solid',
    padding: '32px 48px',
    textAlign: 'center' as const,
    backdropFilter: 'blur(8px)',
    maxWidth: '80vw',
  },
  alertLabel: {
    fontWeight: 800,
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    textShadow: '0 0 20px currentColor',
  },
  alertUsername: {
    fontWeight: 700,
    marginBottom: 4,
  },
  alertMessage: {
    color: '#cccccc',
    marginTop: 8,
  },
  alertAmount: {
    fontWeight: 800,
    marginTop: 8,
  },
  customPopup: {
    position: 'fixed' as const,
    bottom: 40,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    border: '1px solid',
    padding: '16px 28px',
    textAlign: 'center' as const,
    backdropFilter: 'blur(6px)',
    maxWidth: '70vw',
  },
  customPopupName: {
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  customPopupData: {
    color: '#aaaaaa',
  },
  chatContainer: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    width: '100vw',
    maxHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-end',
    padding: 16,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  chatMessage: {
    padding: '4px 8px',
    marginBottom: 2,
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
  },
};
