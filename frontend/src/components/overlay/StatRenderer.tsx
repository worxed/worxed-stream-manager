import { useState, useEffect } from 'react';
import { socketService } from '../../services/socket';
import { getAnalytics } from '../../services/api';
import type { SceneElement, StatConfig, StatType } from '../../types';

interface Props { element: SceneElement; }

const AUTO_LABELS: Record<StatType, string> = {
  'viewers':           'VIEWERS',
  'followers':         'FOLLOWERS',
  'uptime':            'UPTIME',
  'session-follows':   'NEW FOLLOWS',
  'session-subs':      'NEW SUBS',
  'session-donations': 'DONATIONS',
};

export default function StatRenderer({ element }: Props) {
  const config    = element.config as StatConfig;
  const [value, setValue] = useState('—');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const style     = element.style;
  const fontSize  = style.fontSize || 48;

  // Seed from analytics
  useEffect(() => {
    getAnalytics().then(res => {
      if (!res.data) return;
      const { stream, followers, session } = res.data;
      if (stream.startedAt) setStartedAt(stream.startedAt);
      switch (config.statType) {
        case 'viewers':           setValue(stream.viewers.toLocaleString());    break;
        case 'followers':         setValue(followers.total.toLocaleString());   break;
        case 'session-follows':   setValue(session.followers.toString());       break;
        case 'session-subs':      setValue(session.subscribers.toString());     break;
        case 'session-donations': setValue(session.donations.toString());       break;
        // uptime handled by interval
      }
    });
  }, [config.statType]);

  // Poll viewers every 30s (no socket event for viewer count changes)
  useEffect(() => {
    if (config.statType !== 'viewers') return;
    const id = setInterval(() => {
      getAnalytics().then(res => {
        if (res.data) setValue(res.data.stream.viewers.toLocaleString());
      });
    }, 30000);
    return () => clearInterval(id);
  }, [config.statType]);

  // Uptime ticker
  useEffect(() => {
    if (config.statType !== 'uptime') return;
    const tick = () => {
      if (!startedAt) { setValue('—'); return; }
      const diff = Date.now() - new Date(startedAt).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setValue(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [config.statType, startedAt]);

  // Live socket increments for session stats
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    if (config.statType === 'session-follows') {
      unsubs.push(socketService.onNewFollower(() =>
        setValue(v => (parseInt(v.replace(/\D/g, '') || '0') + 1).toLocaleString())
      ));
    }
    if (config.statType === 'session-subs') {
      unsubs.push(socketService.onNewSubscriber(() =>
        setValue(v => (parseInt(v.replace(/\D/g, '') || '0') + 1).toLocaleString())
      ));
    }
    if (config.statType === 'session-donations') {
      unsubs.push(socketService.onAlert(alert => {
        if (alert.type === 'donation') {
          setValue(v => (parseInt(v.replace(/\D/g, '') || '0') + 1).toString());
        }
      }));
    }
    return () => unsubs.forEach(u => u());
  }, [config.statType]);

  const label      = config.label || AUTO_LABELS[config.statType] || config.statType.toUpperCase();
  const displayVal = `${config.prefix ?? ''}${value}${config.suffix ?? ''}`;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: style.fontFamily || 'inherit',
      color: style.color || '#ffffff',
      textAlign: 'center',
      padding: style.padding || 8,
      boxSizing: 'border-box',
    }}>
      <div style={{
        fontSize,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: '-1px',
      }}>
        {displayVal}
      </div>
      <div style={{
        fontSize: Math.max(10, fontSize * 0.3),
        fontWeight: 600,
        letterSpacing: '3px',
        opacity: 0.65,
        marginTop: 6,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );
}
