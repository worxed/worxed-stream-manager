import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../../services/socket';
import { ANIMATION_KEYFRAMES_CSS, getPreset, DEFAULT_EXIT_PAIR } from '../../animations';
import type { Alert, SceneElement, AlertBoxConfig } from '../../types';

const ALERT_LABELS: Record<string, string> = {
  follow:    'NEW FOLLOWER!',
  subscribe: 'NEW SUBSCRIBER!',
  donation:  'DONATION!',
  raid:      'INCOMING RAID!',
};

// Inject @keyframes into the document once
let keyframesInjected = false;
function ensureKeyframes() {
  if (keyframesInjected) return;
  keyframesInjected = true;
  const style = document.createElement('style');
  style.textContent = ANIMATION_KEYFRAMES_CSS;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// AlertContent — mounts once per alert (key={alert.id}), runs phase machine
// ---------------------------------------------------------------------------

interface AlertContentProps {
  alert: Alert;
  element: SceneElement;
  config: AlertBoxConfig;
  onDone: () => void;
}

function AlertContent({ alert, element, config, onDone }: AlertContentProps) {
  const [phase, setPhase] = useState<'entering' | 'exiting'>('entering');

  const animInId       = config.animationIn  || config.animation || 'fadeInUp';
  const animOutId      = config.animationOut || DEFAULT_EXIT_PAIR[animInId] || 'fadeOutDown';
  const inDur          = config.animationInDuration  ?? getPreset(animInId)?.defaultDuration  ?? 450;
  const outDur         = config.animationOutDuration ?? getPreset(animOutId)?.defaultDuration ?? 450;
  const totalDur       = config.duration || 5000;
  const holdEnd        = Math.max(totalDur - outDur, inDur + 100);
  const textAnimInId   = config.textAnimationIn || 'none';
  const textAnimDelay  = config.textAnimationInDelay ?? 150;

  useEffect(() => {
    ensureKeyframes();

    const t1 = setTimeout(() => setPhase('exiting'), holdEnd);
    const t2 = setTimeout(() => onDone(), holdEnd + outDur);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [holdEnd, outDur, onDone]);

  const animStyle: React.CSSProperties = phase === 'entering'
    ? { animation: `${animInId} ${inDur}ms ${getPreset(animInId)?.easing ?? 'ease-out'} both` }
    : { animation: `${animOutId} ${outDur}ms ${getPreset(animOutId)?.easing ?? 'ease-in'} both` };

  const style = element.style;

  // Container background/border only visible while alert is playing
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: (style.textAlign as React.CSSProperties['textAlign']) || 'center',
    fontFamily: style.fontFamily || 'Inter, system-ui, sans-serif',
    color: style.color || '#ffffff',
    backgroundColor: style.backgroundColor,
    borderRadius: style.borderRadius,
    border: style.border,
    boxShadow: style.boxShadow,
    overflow: 'hidden',
    ...animStyle,
  };

  const textAnimStyle: React.CSSProperties = textAnimInId !== 'none' && phase === 'entering'
    ? { animation: `${textAnimInId} ${inDur}ms ${getPreset(textAnimInId)?.easing ?? 'ease-out'} ${textAnimDelay}ms both` }
    : {};

  return (
    <div style={containerStyle}>
      {/* Text content — secondary animation */}
      <div style={textAnimStyle}>
        {/* Alert type label */}
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
          {ALERT_LABELS[alert.type] || alert.type.toUpperCase()}
        </div>

        {/* Username */}
        <div
          style={{
            fontWeight: 700,
            fontSize: (style.fontSize || 24) + 4,
            marginBottom: 4,
          }}
        >
          {alert.username}
        </div>

        {/* Optional message */}
        {alert.message && (
          <div style={{ color: '#cccccc', marginTop: 8, fontSize: style.fontSize || 24 }}>
            {alert.message}
          </div>
        )}

        {/* Donation amount */}
        {alert.amount && (
          <div
            style={{
              fontWeight: 800,
              marginTop: 8,
              fontSize: (style.fontSize || 24) + 2,
              color: style.color || '#FF3B30',
            }}
          >
            ${alert.amount}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlertBoxRenderer — queue manager
// ---------------------------------------------------------------------------

interface Props {
  element: SceneElement;
}

export default function AlertBoxRenderer({ element }: Props) {
  const [queue, setQueue] = useState<Alert[]>([]);
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);

  const config = element.config as AlertBoxConfig;
  const alertTypes = config.alertTypes || ['follow', 'subscribe', 'donation', 'raid'];

  // Receive incoming alerts
  useEffect(() => {
    const unsub = socketService.onAlert((alert) => {
      if (!alertTypes.includes(alert.type)) return;
      setQueue(prev => [...prev, alert]);
    });
    return () => unsub();
  }, [alertTypes]);

  // Advance queue when slot is free
  const advance = useCallback(() => {
    setCurrentAlert(null);
    setQueue(prev => {
      if (prev.length === 0) return prev;
      // Defer so state clears first
      setTimeout(() => setCurrentAlert(prev[0]), 50);
      return prev.slice(1);
    });
  }, []);

  // Pick next alert when queue grows and slot is free
  useEffect(() => {
    if (currentAlert || queue.length === 0) return;
    setCurrentAlert(queue[0]);
    setQueue(prev => prev.slice(1));
  }, [currentAlert, queue]);

  if (!currentAlert) return null;

  return (
    <AlertContent
      key={currentAlert.id}
      alert={currentAlert}
      element={element}
      config={config}
      onDone={advance}
    />
  );
}
