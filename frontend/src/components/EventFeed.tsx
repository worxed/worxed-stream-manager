import { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { ScrollPanel } from 'primereact/scrollpanel';
import { socketService } from '../services/socket';
import { getEndpoints } from '../services/api';
import type { CustomEvent } from '../types';

const MAX_EVENTS = 50;

export default function EventFeed() {
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [eventNames, setEventNames] = useState<string[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const result = await getEndpoints();
      if (cancelled || !result.data) return;

      // Filter to event-type endpoints that are enabled and have an event name
      const names = result.data
        .filter(ep => ep.enabled && ep.handler?.type === 'event' && ep.handler?.event)
        .map(ep => ep.handler.event as string);

      if (names.length === 0) return;

      setEventNames(names);

      unsubRef.current = socketService.onAnyCustomEvent(names, ({ eventName, data }) => {
        const newEvent: CustomEvent = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          eventName,
          data: (data && typeof data === 'object' ? data : { value: data }) as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        };
        setEvents(prev => [newEvent, ...prev.slice(0, MAX_EVENTS - 1)]);
      });
    }

    setup();

    return () => {
      cancelled = true;
      unsubRef.current?.();
    };
  }, []);

  // Render nothing if no event-type endpoints exist or no events have arrived
  if (eventNames.length === 0 || events.length === 0) return null;

  const header = (
    <div className="flex items-center gap-3">
      <div className="p-1.5 rounded-lg bg-chart-3/10">
        <Zap size={18} className="text-chart-3" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Custom Events</h2>
    </div>
  );

  const icons = (
    <Tag value={String(events.length)} severity="secondary" rounded />
  );

  return (
    <Panel header={header} icons={icons} className="card-elevated">
      <ScrollPanel style={{ width: '100%', height: '240px' }}>
        <div className="flex flex-col gap-1.5">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 border border-transparent hover:border-border rounded-xl flex items-center justify-between gap-3 hover:bg-accent/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Tag value={evt.eventName} severity="secondary" className="text-xs shrink-0" rounded />
                <span className="text-sm text-muted-foreground truncate">
                  {Object.entries(evt.data)
                    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                    .join(', ')}
                </span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </ScrollPanel>
    </Panel>
  );
}
