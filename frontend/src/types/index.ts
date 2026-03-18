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

// Scene / Overlay Editor Types
export type ElementType = 'alert-box' | 'chat' | 'text' | 'image' | 'custom-event' | 'goal' | 'stat' | 'recent-events';

export interface SceneElementStyle {
  backgroundColor?: string;
  borderRadius?: number;
  border?: string;
  opacity?: number;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  padding?: number;
  boxShadow?: string;
  textAlign?: string;
}

export interface AlertBoxConfig {
  alertTypes: AlertType[];
  /** Total alert visible duration in ms (includes in + out animations) */
  duration: number;
  /** Entry animation preset id */
  animationIn: string;
  /** Exit animation preset id */
  animationOut: string;
  /** Entry animation duration in ms */
  animationInDuration: number;
  /** Exit animation duration in ms */
  animationOutDuration: number;
  /** Custom keyframes for animationIn when id is 'custom' */
  customKeyframesIn?: import('../animations').AnimationKeyframe[];
  /** Custom keyframes for animationOut when id is 'custom' */
  customKeyframesOut?: import('../animations').AnimationKeyframe[];
  /** Secondary animation applied to inner text content (label + username) */
  textAnimationIn: string;
  /** Delay in ms before text animation starts (after container anim begins) */
  textAnimationInDelay: number;
  /** @deprecated use animationIn instead */
  animation?: string;
}

export interface ChatConfig {
  maxMessages: number;
  showBadges: boolean;
  fadeAfter: number;
  /** Animation for incoming messages: msgSlideIn | msgFadeIn | msgPopIn | none */
  messageAnimation: string;
}

export interface DataBindingConfig {
  enabled: boolean;
  eventName: string;
  fieldPath: string;
  template?: string;
  fieldForSrc?: string;
  defaultValue?: string;
  timeout?: number;
}

export interface TextConfig {
  content: string;
  fontWeight: string;
  lineHeight: number;
  dataBinding?: DataBindingConfig;
}

export interface ImageConfig {
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
  dataBinding?: DataBindingConfig;
}

export interface CustomEventConfig {
  eventName: string;
  template: string;
  duration: number;
  animationIn: string;
  animationOut: string;
  animationInDuration: number;
  animationOutDuration: number;
  maxQueueSize: number;
  /** @deprecated use animationIn instead */
  animation?: string;
}

// Goal widget
export type GoalType = 'follower' | 'subscriber' | 'donation' | 'custom';

export interface GoalConfig {
  goalType: GoalType;
  goal: number;
  label: string;
  showNumbers: boolean;
  showPercentage: boolean;
  barColor: string;
  barStyle: 'linear' | 'radial';
  /** Manual current value — only used when goalType === 'custom' */
  currentOverride?: number;
}

// Stat widget
export type StatType = 'viewers' | 'followers' | 'uptime' | 'session-follows' | 'session-subs' | 'session-donations';

export interface StatConfig {
  statType: StatType;
  /** Empty string = auto-label from statType */
  label: string;
  prefix: string;
  suffix: string;
}

// Recent Events widget
export interface RecentEventsConfig {
  eventTypes: ('follow' | 'subscribe' | 'donation' | 'raid')[];
  maxCount: number;
  showIcons: boolean;
  /** Seconds before entries fade out. 0 = never */
  fadeAfter: number;
}

export interface SceneElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  style: SceneElementStyle;
  config: AlertBoxConfig | ChatConfig | TextConfig | ImageConfig | CustomEventConfig | GoalConfig | StatConfig | RecentEventsConfig | Record<string, unknown>;
}

export interface Scene {
  id?: number;
  name: string;
  width: number;
  height: number;
  elements: SceneElement[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
