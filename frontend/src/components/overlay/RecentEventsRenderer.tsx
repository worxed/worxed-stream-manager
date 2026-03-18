import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../../services/socket';
import type { SceneElement, RecentEventsConfig } from '../../types';

interface Props { element: SceneElement; }

interface EventEntry {
  id: string;
  type: 'follow' | 'subscribe' | 'donation' | 'raid';
  username: string;
  amount?: number;
  viewers?: number;
  addedAt: number;
}

const EVENT_ICONS: Record<EventEntry['type'], string> = {
  follow:    '♥',
  subscribe: '★',
  donation:  '💎',
  raid:      '⚔',
};

const EVENT_COLORS: Record<EventEntry['type'], string> = {
  follow:    '#f472b6',
  subscribe: '#facc15',
  donation:  '#34d399',
  raid:      '#a78bfa',
};

const EVENT_LABELS: Record<EventEntry['type'], (e: EventEntry) => string> = {
  follow:    (e) => `${e.username} followed`,
  subscribe: (e) => `${e.username} subscribed`,
  donation:  (e) => `${e.username} donated${e.amount ? ` $${e.amount}` : ''}`,
  raid:      (e) => `${e.username} raided${e.viewers ? ` (${e.viewers})` : ''}`,
};

export default function RecentEventsRenderer({ element }: Props) {
  const config  = element.config as RecentEventsConfig;
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [now, setNow] = useState(Date.now());

  const types = config.eventTypes || ['follow', 'subscribe', 'donation', 'raid'];
  const maxCount = config.maxCount || 8;

  const addEvent = useCallback((entry: EventEntry) => {
    setEvents(prev => {
      if (!types.includes(entry.type)) return prev;
      return [entry, ...prev].slice(0, maxCount);
    });
  }, [types, maxCount]);

  // Seed from recent-events socket buffer
  useEffect(() => {
    const unsub = socketService.onRecentEvents(recent => {
      const entries: EventEntry[] = [];
      const ts = (t: string) => new Date(t).getTime();

      if (types.includes('follow')) {
        recent.followers.forEach(f => entries.push({
          id: f.id, type: 'follow', username: f.username, addedAt: ts(f.timestamp),
        }));
      }
      if (types.includes('subscribe')) {
        recent.subscribers.forEach(s => entries.push({
          id: s.id, type: 'subscribe', username: s.username, addedAt: ts(s.timestamp),
        }));
      }
      if (types.includes('donation')) {
        recent.donations.forEach(d => entries.push({
          id: d.id, type: 'donation', username: d.username, amount: d.amount, addedAt: ts(d.timestamp),
        }));
      }
      if (types.includes('raid')) {
        recent.raids.forEach(r => entries.push({
          id: r.id, type: 'raid', username: r.username, viewers: r.amount, addedAt: ts(r.timestamp),
        }));
      }

      entries.sort((a, b) => b.addedAt - a.addedAt);
      setEvents(entries.slice(0, maxCount));
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live socket events
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    if (types.includes('follow')) {
      unsubs.push(socketService.onNewFollower(f => addEvent({
        id: f.id, type: 'follow', username: f.username, addedAt: Date.now(),
      })));
    }
    if (types.includes('subscribe')) {
      unsubs.push(socketService.onNewSubscriber(s => addEvent({
        id: s.id, type: 'subscribe', username: s.username, addedAt: Date.now(),
      })));
    }
    if (types.includes('raid')) {
      unsubs.push(socketService.onRaid(r => addEvent({
        id: r.id, type: 'raid', username: r.username, viewers: r.amount, addedAt: Date.now(),
      })));
    }
    if (types.includes('donation')) {
      unsubs.push(socketService.onAlert(alert => {
        if (alert.type === 'donation') {
          addEvent({
            id: alert.id, type: 'donation', username: alert.username,
            amount: alert.amount, addedAt: Date.now(),
          });
        }
      }));
    }
    return () => unsubs.forEach(u => u());
  }, [types, addEvent]);

  // Tick for fade-out
  useEffect(() => {
    if (!config.fadeAfter) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [config.fadeAfter]);

  const style    = element.style;
  const fontSize = style.fontSize || 15;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      gap: 3,
      padding: style.padding || 8,
      fontFamily: style.fontFamily || 'inherit',
      color: style.color || '#ffffff',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {[...events].reverse().map(entry => {
        const ageSecs = config.fadeAfter
          ? (now - entry.addedAt) / 1000
          : 0;
        const opacity = config.fadeAfter && ageSecs > config.fadeAfter
          ? Math.max(0, 1 - (ageSecs - config.fadeAfter) / 5)
          : 1;
        const color = EVENT_COLORS[entry.type];
        return (
          <div
            key={entry.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize, lineHeight: 1.3,
              opacity,
              transition: 'opacity 1s ease',
            }}
          >
            {config.showIcons !== false && (
              <span style={{ color, fontSize: fontSize * 0.85, flexShrink: 0 }}>
                {EVENT_ICONS[entry.type]}
              </span>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color, fontWeight: 700 }}>{entry.username}</span>
              <span style={{ opacity: 0.75 }}>
                {' '}{entry.type === 'follow' ? 'followed'
                  : entry.type === 'subscribe' ? 'subscribed'
                  : entry.type === 'raid' ? `raided${entry.viewers ? ` (${entry.viewers})` : ''}`
                  : `donated${entry.amount ? ` $${entry.amount}` : ''}`}
              </span>
            </span>
          </div>
        );
      })}
      {events.length === 0 && (
        <div style={{ opacity: 0.3, fontSize: fontSize * 0.85, textAlign: 'center' }}>
          Recent events will appear here
        </div>
      )}
    </div>
  );
}

// Silence unused import warning
void (EVENT_LABELS);
