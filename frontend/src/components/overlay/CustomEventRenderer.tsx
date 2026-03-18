import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../../services/socket';
import { resolveTemplate } from '../../utils/templateResolver';
import { ANIMATION_KEYFRAMES_CSS, getPreset, DEFAULT_EXIT_PAIR } from '../../animations';
import type { SceneElement, CustomEventConfig } from '../../types';

interface QueueItem {
  id: string;
  text: string;
}

interface Props {
  element: SceneElement;
}

let itemCounter = 0;

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
// EventContent — mounts once per item (key={item.id}), runs phase machine
// ---------------------------------------------------------------------------

interface ContentProps {
  item: QueueItem;
  element: SceneElement;
  config: CustomEventConfig;
  onDone: () => void;
}

function EventContent({ item, element, config, onDone }: ContentProps) {
  const [phase, setPhase] = useState<'entering' | 'exiting'>('entering');

  const animInId  = config.animationIn  || config.animation || 'fadeInUp';
  const animOutId = config.animationOut || DEFAULT_EXIT_PAIR[animInId] || 'fadeOutDown';
  const inDur     = config.animationInDuration  ?? getPreset(animInId)?.defaultDuration  ?? 450;
  const outDur    = config.animationOutDuration ?? getPreset(animOutId)?.defaultDuration ?? 450;
  const totalDur  = config.duration || 5000;
  const holdEnd   = Math.max(totalDur - outDur, inDur + 100);

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

  return (
    <div
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
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        border: style.border,
        boxShadow: style.boxShadow,
        ...animStyle,
      }}
    >
      {item.text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CustomEventRenderer — queue manager
// ---------------------------------------------------------------------------

export default function CustomEventRenderer({ element }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [current, setCurrent] = useState<QueueItem | null>(null);

  const config = element.config as CustomEventConfig;
  const eventName    = config.eventName || '';
  const template     = config.template || '{{message}}';
  const maxQueueSize = config.maxQueueSize || 10;

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

  // Advance queue when slot is free
  const advance = useCallback(() => {
    setCurrent(null);
    setQueue(prev => {
      if (prev.length === 0) return prev;
      setTimeout(() => setCurrent(prev[0]), 50);
      return prev.slice(1);
    });
  }, []);

  // Pick next item when queue grows and slot is free
  useEffect(() => {
    if (current || queue.length === 0) return;
    setCurrent(queue[0]);
    setQueue(prev => prev.slice(1));
  }, [current, queue]);

  if (!current) return null;

  return (
    <EventContent
      key={current.id}
      item={current}
      element={element}
      config={config}
      onDone={advance}
    />
  );
}
