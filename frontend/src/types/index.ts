// Stream Data Types
export interface StreamData {
  isLive: boolean;
  title: string;
  game: string;
  viewers: number;
  followers: number;
  uptime: string;
  startedAt: string | null;
}

// Activity Types
export type ActivityType = 'follower' | 'subscriber' | 'donation' | 'raid' | 'chat';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  username: string;
  message?: string;
  amount?: number;
  timestamp: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  color: string;
  badges: Record<string, string>;
  timestamp: string;
  userType: string;
}

// Alert Types
export type AlertType = 'follow' | 'subscribe' | 'donation' | 'raid';

export interface Alert {
  id: string;
  type: AlertType;
  username: string;
  message?: string;
  amount?: number;
  timestamp: string;
}

export interface AlertSetting {
  enabled: boolean;
  sound: boolean;
  duration: number;
}

export interface AlertSettings {
  follow: AlertSetting;
  subscribe: AlertSetting;
  donation: AlertSetting;
  raid: AlertSetting;
}

// Overlay Types
export type OverlayType = 'chat' | 'alerts' | 'stats' | 'game';

export interface OverlaySettings {
  type: OverlayType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  fontSize: number;
  borderOpacity: number;
}

export interface OverlayPreset {
  id: string;
  name: string;
  description: string;
  settings: Partial<OverlaySettings>;
}

// Recent Events from backend
export interface RecentEvents {
  followers: ActivityItem[];
  subscribers: ActivityItem[];
  donations: ActivityItem[];
  chatMessages: ChatMessage[];
  raids: ActivityItem[];
}

// Settings Types
export interface SettingEntry {
  key: string;
  value: unknown;
  category: string;
  updated_at: string;
}

export interface SettingsChangedEvent {
  key: string;
  value: unknown;
  category?: string;
  deleted?: boolean;
}

// Custom Endpoint Types
export interface CustomEndpoint {
  id: number;
  name: string;
  path: string;
  method: string;
  handler: { type: string; event?: string; body?: unknown; url?: string; data?: unknown };
  enabled: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CustomEvent {
  id: string;
  eventName: string;
  data: Record<string, unknown>;
  endpointName?: string;
  timestamp: string;
}
