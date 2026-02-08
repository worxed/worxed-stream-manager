import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../../services/socket';
import type { Alert, SceneElement, AlertBoxConfig } from '../../types';

const ALERT_LABELS: Record<string, string> = {
  follow: 'NEW FOLLOWER!',
  subscribe: 'NEW SUBSCRIBER!',
  donation: 'DONATION!',
  raid: 'INCOMING RAID!',
};

interface Props {
  element: SceneElement;
}

export default function AlertBoxRenderer({ element }: Props) {
  const [queue, setQueue] = useState<Alert[]>([]);
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);

  const config = element.config as AlertBoxConfig;
  const duration = config.duration || 5000;
  const alertTypes = config.alertTypes || ['follow', 'subscribe', 'donation', 'raid'];
  const animation = config.animation || 'fadeInUp';

  const processQueue = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) return prev;
      setCurrentAlert(prev[0]);
      return prev.slice(1);
    });
  }, []);

  useEffect(() => {
    const unsub = socketService.onAlert((alert) => {
      if (!alertTypes.includes(alert.type)) return;
      setQueue(prev => [...prev, alert]);
    });
    return () => unsub();
  }, [alertTypes]);

  // Process queue: show next alert when current is null
  useEffect(() => {
    if (currentAlert) return;
    processQueue();
  }, [currentAlert, queue, processQueue]);

  // Auto-dismiss current alert
  useEffect(() => {
    if (!currentAlert) return;
    const timer = setTimeout(() => setCurrentAlert(null), duration);
    return () => clearTimeout(timer);
  }, [currentAlert, duration]);

  if (!currentAlert) return null;

  const style = element.style;

  return (
    <div
      key={currentAlert.id}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: (style.textAlign as React.CSSProperties['textAlign']) || 'center',
        fontFamily: style.fontFamily || 'Inter, system-ui, sans-serif',
        color: style.color || '#ffffff',
        animation: `${animation} 0.5s ease-out`,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: (style.fontSize || 24) + 8,
          letterSpacing: 2,
          marginBottom: 8,
          textTransform: 'uppercase',
          textShadow: '0 0 20px currentColor',
          color: style.color || '#FF3B30',
        }}
      >
        {ALERT_LABELS[currentAlert.type] || currentAlert.type.toUpperCase()}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: (style.fontSize || 24) + 4,
          marginBottom: 4,
        }}
      >
        {currentAlert.username}
      </div>
      {currentAlert.message && (
        <div style={{ color: '#cccccc', marginTop: 8, fontSize: style.fontSize || 24 }}>
          {currentAlert.message}
        </div>
      )}
      {currentAlert.amount && (
        <div
          style={{
            fontWeight: 800,
            marginTop: 8,
            fontSize: (style.fontSize || 24) + 2,
            color: style.color || '#FF3B30',
          }}
        >
          ${currentAlert.amount}
        </div>
      )}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
