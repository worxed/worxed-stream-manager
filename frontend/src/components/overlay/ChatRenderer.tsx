import { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socket';
import type { ChatMessage, SceneElement, ChatConfig } from '../../types';

interface Props {
  element: SceneElement;
}

export default function ChatRenderer({ element }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const config = element.config as ChatConfig;
  const maxMessages = config.maxMessages || 20;
  const showBadges = config.showBadges !== false;
  const fadeAfter = config.fadeAfter || 0; // 0 = no fade

  useEffect(() => {
    const unsub = socketService.onChatMessage((msg) => {
      setMessages(prev => [...prev.slice(-(maxMessages - 1)), msg]);
    });
    return () => unsub();
  }, [maxMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fade old messages
  useEffect(() => {
    if (!fadeAfter || fadeAfter <= 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setMessages(prev => prev.filter(msg => now - new Date(msg.timestamp).getTime() < fadeAfter * 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [fadeAfter]);

  const style = element.style;

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
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {showBadges && msg.badges && Object.keys(msg.badges).length > 0 && (
            <span style={{ marginRight: 4, opacity: 0.6, fontSize: '0.85em' }}>
              {Object.keys(msg.badges).map(b => b === 'broadcaster' ? '🎙️' : b === 'moderator' ? '⚔️' : b === 'vip' ? '💎' : b === 'subscriber' ? '⭐' : '').join('')}
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
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
