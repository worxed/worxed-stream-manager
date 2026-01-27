import { io, Socket } from 'socket.io-client';
import type {
  ChatMessage,
  Alert,
  AlertSettings,
  RecentEvents,
  ActivityItem
} from '../types';

type EventCallback<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  // Event callbacks
  private callbacks: {
    onConnect: EventCallback<void>[];
    onDisconnect: EventCallback<string>[];
    onChatMessage: EventCallback<ChatMessage>[];
    onAlert: EventCallback<Alert>[];
    onAlertSettings: EventCallback<AlertSettings>[];
    onRecentEvents: EventCallback<RecentEvents>[];
    onNewFollower: EventCallback<ActivityItem>[];
    onNewSubscriber: EventCallback<ActivityItem>[];
    onRaid: EventCallback<ActivityItem>[];
    onOverlayUpdate: EventCallback<unknown>[];
  } = {
    onConnect: [],
    onDisconnect: [],
    onChatMessage: [],
    onAlert: [],
    onAlertSettings: [],
    onRecentEvents: [],
    onNewFollower: [],
    onNewSubscriber: [],
    onRaid: [],
    onOverlayUpdate: [],
  };

  connect(): void {
    if (this.socket?.connected) {
      console.log('Already connected');
      return;
    }

    console.log('🔄 Connecting to backend...');

    this.socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to backend');
      this.isConnected = true;
      this.callbacks.onConnect.forEach(cb => cb());
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      this.isConnected = false;
      this.callbacks.onDisconnect.forEach(cb => cb(reason));
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    // Event handlers
    this.socket.on('recent-events', (data: RecentEvents) => {
      this.callbacks.onRecentEvents.forEach(cb => cb(data));
    });

    this.socket.on('chat-message', (data: ChatMessage) => {
      this.callbacks.onChatMessage.forEach(cb => cb(data));
    });

    this.socket.on('alert', (data: Alert) => {
      this.callbacks.onAlert.forEach(cb => cb(data));
    });

    this.socket.on('alert-settings', (data: AlertSettings) => {
      this.callbacks.onAlertSettings.forEach(cb => cb(data));
    });

    this.socket.on('new-follower', (data: ActivityItem) => {
      this.callbacks.onNewFollower.forEach(cb => cb(data));
    });

    this.socket.on('new-subscriber', (data: ActivityItem) => {
      this.callbacks.onNewSubscriber.forEach(cb => cb(data));
    });

    this.socket.on('raid', (data: ActivityItem) => {
      this.callbacks.onRaid.forEach(cb => cb(data));
    });

    this.socket.on('overlay-update', (data: unknown) => {
      this.callbacks.onOverlayUpdate.forEach(cb => cb(data));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  // Subscription methods
  onConnect(callback: EventCallback<void>): () => void {
    this.callbacks.onConnect.push(callback);
    return () => {
      this.callbacks.onConnect = this.callbacks.onConnect.filter(cb => cb !== callback);
    };
  }

  onDisconnect(callback: EventCallback<string>): () => void {
    this.callbacks.onDisconnect.push(callback);
    return () => {
      this.callbacks.onDisconnect = this.callbacks.onDisconnect.filter(cb => cb !== callback);
    };
  }

  onChatMessage(callback: EventCallback<ChatMessage>): () => void {
    this.callbacks.onChatMessage.push(callback);
    return () => {
      this.callbacks.onChatMessage = this.callbacks.onChatMessage.filter(cb => cb !== callback);
    };
  }

  onAlert(callback: EventCallback<Alert>): () => void {
    this.callbacks.onAlert.push(callback);
    return () => {
      this.callbacks.onAlert = this.callbacks.onAlert.filter(cb => cb !== callback);
    };
  }

  onAlertSettings(callback: EventCallback<AlertSettings>): () => void {
    this.callbacks.onAlertSettings.push(callback);
    return () => {
      this.callbacks.onAlertSettings = this.callbacks.onAlertSettings.filter(cb => cb !== callback);
    };
  }

  onRecentEvents(callback: EventCallback<RecentEvents>): () => void {
    this.callbacks.onRecentEvents.push(callback);
    return () => {
      this.callbacks.onRecentEvents = this.callbacks.onRecentEvents.filter(cb => cb !== callback);
    };
  }

  onNewFollower(callback: EventCallback<ActivityItem>): () => void {
    this.callbacks.onNewFollower.push(callback);
    return () => {
      this.callbacks.onNewFollower = this.callbacks.onNewFollower.filter(cb => cb !== callback);
    };
  }

  onNewSubscriber(callback: EventCallback<ActivityItem>): () => void {
    this.callbacks.onNewSubscriber.push(callback);
    return () => {
      this.callbacks.onNewSubscriber = this.callbacks.onNewSubscriber.filter(cb => cb !== callback);
    };
  }

  onRaid(callback: EventCallback<ActivityItem>): () => void {
    this.callbacks.onRaid.push(callback);
    return () => {
      this.callbacks.onRaid = this.callbacks.onRaid.filter(cb => cb !== callback);
    };
  }

  onOverlayUpdate(callback: EventCallback<unknown>): () => void {
    this.callbacks.onOverlayUpdate.push(callback);
    return () => {
      this.callbacks.onOverlayUpdate = this.callbacks.onOverlayUpdate.filter(cb => cb !== callback);
    };
  }

  // Emit methods
  testAlert(type: string, username?: string, message?: string, amount?: number): void {
    this.socket?.emit('test-alert', { type, username, message, amount });
  }

  updateOverlay(data: unknown): void {
    this.socket?.emit('overlay-update', data);
  }

  updateAlertSettings(settings: Partial<AlertSettings>): void {
    this.socket?.emit('update-alert-settings', settings);
  }

  // Status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
