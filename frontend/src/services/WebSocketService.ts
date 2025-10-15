// WebSocket service for connecting to the Worxed Stream Manager backend
import { notifications } from '@mantine/notifications';

export interface StreamData {
  status: 'ONLINE' | 'OFFLINE';
  viewers: number;
  followers: number;
  uptime: string;
  title: string;
  game: string;
}

export interface ActivityItem {
  time: string;
  type: 'follower' | 'chat' | 'stream' | 'subscribe' | 'donation' | 'raid';
  user: string;
  message: string;
}

export interface AlertSettings {
  follow: { enabled: boolean; sound: boolean; duration: number };
  subscribe: { enabled: boolean; sound: boolean; duration: number };
  donation: { enabled: boolean; sound: boolean; duration: number };
  raid: { enabled: boolean; sound: boolean; duration: number };
}

export interface ChatMessage {
  username: string;
  message: string;
  color: string;
  timestamp: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WSMessage = any;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  
  // Event listeners
  private onStreamDataUpdate: ((data: StreamData) => void) | null = null;
  private onActivityUpdate: ((activity: ActivityItem[]) => void) | null = null;
  private onAlertSettingsUpdate: ((settings: AlertSettings) => void) | null = null;
  private onChatMessage: ((message: ChatMessage) => void) | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // Connect to the backend WebSocket server
      const wsUrl = `ws://localhost:3000?type=dashboard`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔌 Connected to Worxed Stream Manager');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);
        
        notifications.show({
          title: 'Connected',
          message: 'Connected to stream manager backend',
          color: 'green',
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from stream manager');
        this.isConnected = false;
        this.onConnectionChange?.(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        notifications.show({
          title: 'Connection Error',
          message: 'Failed to connect to stream manager',
          color: 'red',
        });
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
      notifications.show({
        title: 'Connection Failed',
        message: 'Could not reconnect to stream manager. Please refresh the page.',
        color: 'red',
        autoClose: false,
      });
    }
  }

  private handleMessage(message: WSMessage) {
    console.log('📨 Received:', message.type);

    switch (message.type) {
      case 'init':
        // Initial connection data
        if (message.data.streamData) {
          this.onStreamDataUpdate?.(message.data.streamData);
        }
        if (message.data.recentActivity) {
          this.onActivityUpdate?.(message.data.recentActivity);
        }
        if (message.data.alertSettings) {
          this.onAlertSettingsUpdate?.(message.data.alertSettings);
        }
        break;

      case 'stream_update':
        this.onStreamDataUpdate?.(message.data);
        break;

      case 'activity_update':
        this.onActivityUpdate?.(message.data);
        break;

      case 'alert_settings_update':
        this.onAlertSettingsUpdate?.(message.data);
        break;

      case 'chat_message':
        this.onChatMessage?.(message.data);
        break;

      case 'test_result':
        notifications.show({
          title: 'Test Complete',
          message: message.data.message || 'Test executed successfully',
          color: message.data.success ? 'green' : 'red',
        });
        break;

      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  // Send message to backend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private send(message: any) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket not connected');
      notifications.show({
        title: 'Connection Error',
        message: 'Not connected to stream manager',
        color: 'red',
      });
    }
  }

  // Public methods for components to use
  public onStreamData(callback: (data: StreamData) => void) {
    this.onStreamDataUpdate = callback;
  }

  public onActivity(callback: (activity: ActivityItem[]) => void) {
    this.onActivityUpdate = callback;
  }

  public onAlertSettings(callback: (settings: AlertSettings) => void) {
    this.onAlertSettingsUpdate = callback;
  }

  public onChat(callback: (message: ChatMessage) => void) {
    this.onChatMessage = callback;
  }

  public onConnection(callback: (connected: boolean) => void) {
    this.onConnectionChange = callback;
  }

  // Actions to send to backend
  public testChat(username?: string, message?: string, color?: string) {
    this.send({
      type: 'test_chat',
      payload: { username, message, color }
    });
  }

  public testAlert(type: 'follow' | 'subscribe' | 'donation' | 'raid', username?: string, amount?: number) {
    this.send({
      type: 'test_alert',
      payload: { type, username, amount }
    });
  }

  public toggleAlert(type: 'follow' | 'subscribe' | 'donation' | 'raid', enabled: boolean) {
    this.send({
      type: 'toggle_alert',
      payload: { type, enabled }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public streamAction(action: 'start' | 'stop' | 'update_title' | 'update_game', data?: any) {
    this.send({
      type: 'stream_action',
      payload: { action, ...data }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public updateOverlay(overlayData: any) {
    this.send({
      type: 'update_overlay',
      payload: overlayData
    });
  }

  // Connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Disconnect
  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create singleton instance
export const wsService = new WebSocketService();
export default wsService;