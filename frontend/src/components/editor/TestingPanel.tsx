import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ChevronDown, ChevronUp, Bell, MessageSquare, Zap } from 'lucide-react';

const API_BASE = 'http://localhost:4001';

const ALERT_TYPES = ['follow', 'subscribe', 'donation', 'raid'] as const;

const ALERT_LABELS: Record<string, string> = {
  follow: 'Follow',
  subscribe: 'Sub',
  donation: 'Donation',
  raid: 'Raid',
};

async function postJSON(path: string, body: Record<string, unknown>) {
  await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export default function TestingPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventData, setEventData] = useState('');

  const fireAlert = (type: string) => {
    postJSON('/api/test-alert', {
      type,
      username: `TestUser${Math.floor(Math.random() * 1000)}`,
    });
  };

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    postJSON('/api/test-chat', { message: chatMsg.trim() });
    setChatMsg('');
  };

  const fireEvent = () => {
    if (!eventName.trim()) return;
    let data: unknown = {};
    if (eventData.trim()) {
      try {
        data = JSON.parse(eventData);
      } catch {
        data = { raw: eventData };
      }
    }
    postJSON('/api/test-event', { eventName: eventName.trim(), data });
  };

  return (
    <div className="border-t border-border bg-card">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Testing</span>
        {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          {/* Alert row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Bell size={14} className="text-muted-foreground shrink-0" />
            {ALERT_TYPES.map(type => (
              <Button
                key={type}
                onClick={() => fireAlert(type)}
                outlined
                size="small"
                className="text-xs !py-1 !px-2"
              >
                {ALERT_LABELS[type]}
              </Button>
            ))}
          </div>

          {/* Chat row */}
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-muted-foreground shrink-0" />
            <InputText
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              placeholder="Chat message"
              className="text-xs flex-1"
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            />
            <Button onClick={sendChat} outlined size="small" className="text-xs !py-1 !px-2">
              Send
            </Button>
          </div>

          {/* Custom event row */}
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-muted-foreground shrink-0" />
            <InputText
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Event name"
              className="text-xs w-32"
            />
            <InputText
              value={eventData}
              onChange={(e) => setEventData(e.target.value)}
              placeholder='{"key": "value"}'
              className="text-xs flex-1"
              onKeyDown={(e) => e.key === 'Enter' && fireEvent()}
            />
            <Button onClick={fireEvent} outlined size="small" className="text-xs !py-1 !px-2">
              Fire
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
