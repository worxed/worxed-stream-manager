import { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socket';
import { ANIMATION_KEYFRAMES_CSS } from '../../animations';
import type { ChatMessage, SceneElement, ChatConfig } from '../../types';

let keyframesInjected = false;
function ensureKeyframes() {
  if (keyframesInjected) return;
  keyframesInjected = true;
  const style = document.createElement('style');
  style.textContent = ANIMATION_KEYFRAMES_CSS;
  document.head.appendChild(style);
}

interface Props {
  element: SceneElement;
}

export default function ChatRenderer({ element }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const config = element.config as ChatConfig;
  const maxMessages     = config.maxMessages     || 20;
  const showBadges      = config.showBadges      !== false;
  const fadeAfter       = config.fadeAfter        || 0;
  const messageAnimation = config.messageAnimation || 'msgSlideIn';

  useEffect(() => {
    ensureKeyframes();
  }, []);

  useEffect(() => {
    const unsub = socketService.onChatMessage((msg) => {
      setMessages(prev => [...prev.slice(-(maxMessages - 1)), { ...msg, _ts: Date.now() } as ChatMessage & { _ts: number }]);
    });
    return () => unsub();
  }, [maxMessages]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Remove faded messages
  useEffect(() => {
    if (!fadeAfter || fadeAfter <= 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setMessages(prev =>
        prev.filter(msg => now - new Date(msg.timestamp).getTime() < fadeAfter * 1000)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [fadeAfter]);

  const style = element.style;
  const animCSS = messageAnimation !== 'none'
    ? `${messageAnimation} 0.3s ease-out both`
    : undefined;

  return (
    <div
      ref={scrollRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        fontFamily: style.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: style.fontSize || 16,
        padding: style.padding || 8,
      }}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            padding: '3px 6px',
            marginBottom: 2,
            animation: animCSS,
          }}
        >
          {showBadges && msg.badges && Object.keys(msg.badges).length > 0 && (
            <span style={{ marginRight: 4, opacity: 0.6, fontSize: '0.85em' }}>
              {Object.keys(msg.badges)
                .map(b =>
                  b === 'broadcaster' ? '🎙️'
                  : b === 'moderator' ? '⚔️'
                  : b === 'vip'       ? '💎'
                  : b === 'subscriber'? '⭐'
                  : ''
                )
                .join('')}
            </span>
          )}
          <span style={{ color: msg.color || '#8cffbe', fontWeight: 'bold' }}>
            {msg.username}
          </span>
          <span style={{ color: style.color || '#ffffff', marginLeft: 6 }}>
            {msg.message}
          </span>
        </div>
      ))}
    </div>
  );
}
