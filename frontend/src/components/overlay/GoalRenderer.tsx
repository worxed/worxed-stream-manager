import { useState, useEffect } from 'react';
import { socketService } from '../../services/socket';
import { getAnalytics } from '../../services/api';
import type { SceneElement, GoalConfig } from '../../types';

interface Props { element: SceneElement; }

const GOAL_LABELS: Record<string, string> = {
  follower: 'Follower Goal',
  subscriber: 'Subscriber Goal',
  donation: 'Donation Goal',
  custom: 'Goal',
};

export default function GoalRenderer({ element }: Props) {
  const config = element.config as GoalConfig;
  const [current, setCurrent] = useState(0);

  // Seed initial value
  useEffect(() => {
    if (config.goalType === 'custom') {
      setCurrent(config.currentOverride ?? 0);
      return;
    }
    getAnalytics().then(res => {
      if (!res.data) return;
      const { followers, session } = res.data;
      if (config.goalType === 'follower')    setCurrent(followers.total);
      if (config.goalType === 'subscriber') setCurrent(session.subscribers);
      // donation: seed from recent-events buffer via socket
    });
    if (config.goalType === 'donation') {
      const unsub = socketService.onRecentEvents(recent => {
        const sum = recent.donations.reduce((acc, d) => acc + (d.amount ?? 0), 0);
        setCurrent(sum);
        unsub();
      });
    }
  }, [config.goalType, config.currentOverride]);

  // Live socket updates
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    if (config.goalType === 'follower') {
      unsubs.push(socketService.onNewFollower(() => setCurrent(c => c + 1)));
    }
    if (config.goalType === 'subscriber') {
      unsubs.push(socketService.onNewSubscriber(() => setCurrent(c => c + 1)));
    }
    if (config.goalType === 'donation') {
      unsubs.push(socketService.onAlert(alert => {
        if (alert.type === 'donation' && alert.amount) {
          setCurrent(c => c + alert.amount!);
        }
      }));
    }
    return () => unsubs.forEach(u => u());
  }, [config.goalType]);

  const goal     = config.goal || 100;
  const pct      = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const style    = element.style;
  const barColor = config.barColor || '#3b82f6';
  const label    = config.label || GOAL_LABELS[config.goalType] || 'Goal';
  const fontSize = style.fontSize || 18;
  const isDonation = config.goalType === 'donation';
  const numberStr  = isDonation
    ? `$${Math.round(current).toLocaleString()} / $${goal.toLocaleString()}`
    : `${Math.round(current).toLocaleString()} / ${goal.toLocaleString()}`;

  if (config.barStyle === 'radial') {
    const size  = Math.min(element.width, element.height) * 0.55;
    const R     = 45;
    const CIRC  = 2 * Math.PI * R;
    const dashOffset = CIRC * (1 - pct / 100);
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: style.fontFamily || 'inherit',
        color: style.color || '#ffffff',
        gap: 6,
      }}>
        <div style={{ fontSize, fontWeight: 700 }}>{label}</div>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={R} fill="none"
              stroke={barColor} strokeWidth="8"
              strokeDasharray={CIRC} strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: fontSize * 1.3, fontWeight: 800, color: barColor,
          }}>
            {pct}%
          </div>
        </div>
        {config.showNumbers !== false && (
          <div style={{ fontSize: fontSize * 0.75, opacity: 0.75 }}>{numberStr}</div>
        )}
      </div>
    );
  }

  // Linear (default)
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: style.padding || 12,
      fontFamily: style.fontFamily || 'inherit',
      color: style.color || '#ffffff',
      boxSizing: 'border-box',
    }}>
      <div style={{ fontWeight: 700, fontSize, marginBottom: 4 }}>{label}</div>

      {config.showNumbers !== false && (
        <div style={{
          fontSize: fontSize * 0.75, opacity: 0.75, marginBottom: 8,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{numberStr}</span>
          {config.showPercentage !== false && <span>{pct}%</span>}
        </div>
      )}

      {/* Track */}
      <div style={{
        width: '100%', height: 10,
        background: 'rgba(255,255,255,0.15)',
        borderRadius: 5, overflow: 'hidden',
      }}>
        {/* Fill */}
        <div style={{
          width: `${pct}%`, height: '100%',
          background: barColor, borderRadius: 5,
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}
