import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../../services/socket';
import { resolveTemplate } from '../../utils/templateResolver';
import type { SceneElement, CustomEventConfig } from '../../types';

interface QueueItem {
  id: string;
  text: string;
}

interface Props {
  element: SceneElement;
}

let itemCounter = 0;

export default function CustomEventRenderer({ element }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [current, setCurrent] = useState<QueueItem | null>(null);

  const config = element.config as CustomEventConfig;
  const eventName = config.eventName || '';
  const template = config.template || '{{message}}';
  const duration = config.duration || 5000;
  const animation = config.animation || 'fadeInUp';
  const maxQueueSize = config.maxQueueSize || 10;

  const processQueue = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) return prev;
      setCurrent(prev[0]);
      return prev.slice(1);
    });
  }, []);

  // Subscribe to the configured event
  useEffect(() => {
    if (!eventName) return;

    const unsub = socketService.on(eventName, (raw) => {
      const data = (raw != null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
      const text = resolveTemplate(template, data);
      const item: QueueItem = { id: `ce-${++itemCounter}`, text };
      setQueue(prev => {
        const next = [...prev, item];
        return next.length > maxQueueSize ? next.slice(-maxQueueSize) : next;
      });
    });

    return () => unsub();
  }, [eventName, template, maxQueueSize]);

  // Process queue when current is null
  useEffect(() => {
    if (current) return;
    processQueue();
  }, [current, queue, processQueue]);

  // Auto-dismiss
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), duration);
    return () => clearTimeout(timer);
  }, [current, duration]);

  if (!current) return null;

  const style = element.style;

  return (
    <div
      key={current.id}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start',
        fontFamily: style.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: style.fontSize || 24,
        color: style.color || '#ffffff',
        padding: style.padding || 16,
        textAlign: (style.textAlign as React.CSSProperties['textAlign']) || 'center',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflow: 'hidden',
        animation: `${animation} 0.5s ease-out`,
      }}
    >
      {current.text}
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
