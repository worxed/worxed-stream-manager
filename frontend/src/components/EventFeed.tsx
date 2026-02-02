import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Text,
  Stack,
  Group,
  Badge,
  ScrollArea,
  Box,
} from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';
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

  return (
    <Card
      padding="lg"
      radius="md"
      styles={{
        root: {
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
        },
      }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconBolt size={18} style={{ color: 'var(--warning)' }} />
          <Text
            size="lg"
            style={{
              fontFamily: '"VT323", monospace',
              color: 'var(--primary-green)',
              letterSpacing: '1px',
            }}
          >
            CUSTOM EVENTS
          </Text>
        </Group>
        <Badge variant="light" color="yellow" size="sm">
          {events.length}
        </Badge>
      </Group>

      <ScrollArea h={200}>
        <Stack gap="xs">
          {events.map((evt) => (
            <Box
              key={evt.id}
              p="xs"
              style={{
                background: 'var(--primary-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
              }}
            >
              <Group gap="sm" justify="space-between">
                <Group gap="xs">
                  <Badge size="xs" color="yellow" variant="light">
                    {evt.eventName}
                  </Badge>
                  <Text size="sm" style={{ color: 'var(--text-secondary)' }}>
                    {Object.entries(evt.data)
                      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                      .join(', ')}
                  </Text>
                </Group>
                <Text size="xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </Text>
              </Group>
            </Box>
          ))}
        </Stack>
      </ScrollArea>
    </Card>
  );
}
