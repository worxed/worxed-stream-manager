import { io, Socket } from 'socket.io-client';
import type {
  ChatMessage,
  Alert,
  AlertSettings,
  RecentEvents,
  ActivityItem,
  SettingsChangedEvent,
  Scene
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
    onSettingsChanged: EventCallback<SettingsChangedEvent>[];
    onSceneUpdated: EventCallback<Scene>[];
    onSceneActivated: EventCallback<Scene>[];
    onSceneDeleted: EventCallback<{ id: number }>[];
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
    onSettingsChanged: [],
    onSceneUpdated: [],
    onSceneActivated: [],
    onSceneDeleted: [],
  };

  // Dynamic event callbacks for custom endpoint events
  private dynamicCallbacks: Map<string, EventCallback<unknown>[]> = new Map();

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

    this.socket.on('settings-changed', (data: SettingsChangedEvent) => {
      this.callbacks.onSettingsChanged.forEach(cb => cb(data));
    });

    this.socket.on('scene-updated', (data: Scene) => {
      this.callbacks.onSceneUpdated.forEach(cb => cb(data));
    });

    this.socket.on('scene-activated', (data: Scene) => {
      this.callbacks.onSceneActivated.forEach(cb => cb(data));
    });

    this.socket.on('scene-deleted', (data: { id: number }) => {
      this.callbacks.onSceneDeleted.forEach(cb => cb(data));
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

  onSettingsChanged(callback: EventCallback<SettingsChangedEvent>): () => void {
    this.callbacks.onSettingsChanged.push(callback);
    return () => {
      this.callbacks.onSettingsChanged = this.callbacks.onSettingsChanged.filter(cb => cb !== callback);
    };
  }

  onSceneUpdated(callback: EventCallback<Scene>): () => void {
    this.callbacks.onSceneUpdated.push(callback);
    return () => {
      this.callbacks.onSceneUpdated = this.callbacks.onSceneUpdated.filter(cb => cb !== callback);
    };
  }

  onSceneActivated(callback: EventCallback<Scene>): () => void {
    this.callbacks.onSceneActivated.push(callback);
    return () => {
      this.callbacks.onSceneActivated = this.callbacks.onSceneActivated.filter(cb => cb !== callback);
    };
  }

  onSceneDeleted(callback: EventCallback<{ id: number }>): () => void {
    this.callbacks.onSceneDeleted.push(callback);
    return () => {
      this.callbacks.onSceneDeleted = this.callbacks.onSceneDeleted.filter(cb => cb !== callback);
    };
  }

  // Generic event subscription for dynamic event names (custom endpoints)
  on(eventName: string, callback: EventCallback<unknown>): () => void {
    if (!this.dynamicCallbacks.has(eventName)) {
      this.dynamicCallbacks.set(eventName, []);
      // Register the socket listener once per event name
      this.socket?.on(eventName, (data: unknown) => {
        this.dynamicCallbacks.get(eventName)?.forEach(cb => cb(data));
      });
    }
    this.dynamicCallbacks.get(eventName)!.push(callback);

    return () => {
      const cbs = this.dynamicCallbacks.get(eventName);
      if (cbs) {
        const idx = cbs.indexOf(callback);
        if (idx !== -1) cbs.splice(idx, 1);
        if (cbs.length === 0) {
          this.socket?.off(eventName);
          this.dynamicCallbacks.delete(eventName);
        }
      }
    };
  }

  // Subscribe to multiple custom event names with a single callback
  onAnyCustomEvent(eventNames: string[], callback: EventCallback<{ eventName: string; data: unknown }>): () => void {
    const unsubs = eventNames.map(name =>
      this.on(name, (data) => callback({ eventName: name, data }))
    );
    return () => unsubs.forEach(unsub => unsub());
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
