// Socket.IO service for connecting to the Worxed Stream Manager backend
import { notifications } from '@mantine/notifications';
import io, { type Socket } from 'socket.io-client';

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
  badges?: Record<string, string>;
  userType?: string;
}

class SocketIOService {
  private socket: Socket | null = null;
  private isConnected = false;
  private isConnecting = false;
  
  // Event listeners
  private onStreamDataUpdate: ((data: StreamData) => void) | null = null;
  private onActivityUpdate: ((activity: ActivityItem[]) => void) | null = null;
  private onNewActivity: ((activity: ActivityItem) => void) | null = null;
  private onAlertSettingsUpdate: ((settings: AlertSettings) => void) | null = null;
  private onChatMessage: ((message: ChatMessage) => void) | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor() {
    // Don't auto-connect in constructor to avoid React strict mode issues
    console.log('🏗️ SocketIOService constructor called');
  }

  public connect() {
    if (this.socket && this.socket.connected) {
      console.log('🔗 Already connected to Socket.IO');
      return;
    }
    
    if (this.isConnecting) {
      console.log('🔄 Connection already in progress');
      return;
    }
    
    this.isConnecting = true;
    try {
      console.log('🔄 Attempting to connect to Socket.IO server via Vite proxy (/ -> http://localhost:3000)');
      
      // Check if io is properly imported
      console.log('📦 io function available:', typeof io);
      
      if (typeof io !== 'function') {
        console.error('❌ io is not a function! Type:', typeof io, 'Value:', io);
        notifications.show({
          title: 'Import Error',
          message: 'Socket.IO client not properly imported',
          color: 'red',
        });
        return;
      }
      
      // Connect to the backend Socket.IO server via Vite proxy
      this.socket = io('/', {  // Use same origin - Vite will proxy to backend
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });
      
      console.log('📡 Socket.IO client created:', this.socket);
      console.log('🔗 Socket properties:', { 
        connected: this.socket?.connected, 
        id: this.socket?.id,
        disconnected: this.socket?.disconnected 
      });
      
      // Force connection attempt
      if (this.socket) {
        this.socket.connect();
        console.log('🚀 Connection attempt initiated');
      } else {
        console.error('❌ Socket is null/undefined after creation!');
        return;
      }
      
      // Debug: Log connection status every 2 seconds
      const debugInterval = setInterval(() => {
        if (this.socket) {
          console.log(`🔍 Socket.IO Status - Connected: ${this.socket.connected}, ID: ${this.socket.id}, State: ${this.socket.disconnected ? 'disconnected' : 'active'}`);
        } else {
          console.log('🔍 Socket.IO Status - Socket is null/undefined');
        }
        if (this.isConnected) {
          clearInterval(debugInterval);
        }
      }, 2000);

      this.socket.on('connect', () => {
        console.log('🔌 SUCCESS: Connected to Worxed Stream Manager');
        this.isConnected = true;
        this.isConnecting = false;
        this.onConnectionChange?.(true);
        
        notifications.show({
          title: 'Connected',
          message: 'Connected to stream manager backend',
          color: 'green',
        });
      });

      this.socket.on('connecting', () => {
        console.log('🔄 Socket.IO: Connecting...');
      });

      this.socket.on('reconnect', () => {
        console.log('🔄 Socket.IO: Reconnected');
      });

      this.socket.on('reconnecting', (attemptNumber) => {
        console.log(`🔄 Socket.IO: Reconnecting attempt ${attemptNumber}`);
      });

      // Listen for recent events (sent on connection)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on('recent-events', (events: any) => {
        console.log('📨 Received recent events:', events);
        
        const activities: ActivityItem[] = [];
        
        // Process followers
        if (events.followers) {
          events.followers.forEach((follow: any) => {
            activities.push({
              time: new Date(follow.timestamp).toLocaleTimeString(),
              type: 'follower',
              user: follow.username,
              message: 'New follower'
            });
          });
        }
        
        // Process subscribers
        if (events.subscribers) {
          events.subscribers.forEach((sub: any) => {
            activities.push({
              time: new Date(sub.timestamp).toLocaleTimeString(),
              type: 'subscribe',
              user: sub.username,
              message: sub.message || 'Subscribed!'
            });
          });
        }
        
        // Process donations
        if (events.donations) {
          events.donations.forEach((donation: any) => {
            activities.push({
              time: new Date(donation.timestamp).toLocaleTimeString(),
              type: 'donation',
              user: donation.username,
              message: `${donation.amount} - ${donation.message || 'Thank you!'}`
            });
          });
        }
        
        // Sort by timestamp (most recent first)
        activities.sort((a, b) => {
          const timeA = new Date('1970/01/01 ' + a.time).getTime();
          const timeB = new Date('1970/01/01 ' + b.time).getTime();
          return timeB - timeA;
        });
        
        this.onActivityUpdate?.(activities.slice(0, 10));
        
        // Mock stream data
        this.onStreamDataUpdate?.({
          status: 'OFFLINE',
          viewers: 0,
          followers: events.followers?.length || 0,
          uptime: '00:00:00',
          title: 'Worxed Stream Manager - Ready',
          game: 'Software Development'
        });
      });

      // Listen for new followers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on('new-follower', (data: any) => {
        console.log('👥 New follower:', data.username);
        
        const newActivity: ActivityItem = {
          time: new Date(data.timestamp).toLocaleTimeString(),
          type: 'follower',
          user: data.username,
          message: 'New follower!'
        };
        
        this.onNewActivity?.(newActivity);
        
        notifications.show({
          title: 'New Follower!',
          message: `${data.username} just followed!`,
          color: 'purple',
        });
      });

      // Listen for new subscribers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on('new-subscriber', (data: any) => {
        console.log('⭐ New subscriber:', data.username);
        
        const newActivity: ActivityItem = {
          time: new Date().toLocaleTimeString(),
          type: 'subscribe',
          user: data.username,
          message: `Subscribed! ${data.message || ''}`
        };
        
        this.onNewActivity?.(newActivity);
        
        notifications.show({
          title: 'New Subscriber!',
          message: `${data.username} just subscribed!`,
          color: 'green',
        });
      });

      // Listen for donations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on('donation', (data: any) => {
        console.log('💰 Donation received:', data);
        
        const newActivity: ActivityItem = {
          time: new Date().toLocaleTimeString(),
          type: 'donation',
          user: data.username,
          message: `${data.amount} - ${data.message || 'Thank you!'}`
        };
        
        this.onNewActivity?.(newActivity);
        
        notifications.show({
          title: 'Donation Received!',
          message: `${data.username} donated ${data.amount}!`,
          color: 'yellow',
        });
      });

      // Listen for chat messages
      this.socket.on('chat-message', (data: ChatMessage) => {
        console.log('💬 Chat message:', data);
        this.onChatMessage?.(data);
      });

      // Listen for test alerts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on('test-alert', (data: any) => {
        console.log('🧪 Test alert:', data);
        notifications.show({
          title: 'Test Alert',
          message: `${data.type} alert triggered!`,
          color: 'blue',
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from stream manager. Reason:', reason);
        this.isConnected = false;
        this.onConnectionChange?.(false);
        
        notifications.show({
          title: 'Disconnected',
          message: `Lost connection to stream manager: ${reason}`,
          color: 'red',
        });
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
        this.isConnected = false;
        this.isConnecting = false;
        this.onConnectionChange?.(false);
        
        notifications.show({
          title: 'Connection Error',
          message: `Failed to connect: ${error.message}`,
          color: 'red',
        });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on('error', (error: any) => {
        console.error('❌ Socket.IO error:', error);
        notifications.show({
          title: 'Socket Error',
          message: 'Socket.IO error occurred',
          color: 'red',
        });
      });
    } catch (error) {
      console.error('❌ Failed to create Socket.IO connection:', error);
    }
  }

  // Public methods for components to use
  public onStreamData(callback: (data: StreamData) => void) {
    this.onStreamDataUpdate = callback;
  }

  public onActivity(callback: (activity: ActivityItem[]) => void) {
    this.onActivityUpdate = callback;
  }

  public onNewActivityItem(callback: (activity: ActivityItem) => void) {
    this.onNewActivity = callback;
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
  public testAlert(type: 'follow' | 'subscribe' | 'donation' | 'raid', username?: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('test-alert', {
        type,
        username: username || `TestUser${Math.floor(Math.random() * 1000)}`
      });
    } else {
      console.error('❌ Socket.IO not connected');
      notifications.show({
        title: 'Connection Error',
        message: 'Not connected to stream manager',
        color: 'red',
      });
    }
  }

  // Local test method for immediate UI testing (doesn't require backend connection)
  public testLocalActivity(type: 'follower' | 'subscribe' | 'donation' | 'raid', username?: string) {
    const testUsername = username || `TestUser${Math.floor(Math.random() * 1000)}`;
    let message = '';
    
    switch (type) {
      case 'follower':
        message = 'New follower!';
        break;
      case 'subscribe':
        message = 'Subscribed!';
        break;
      case 'donation':
        message = `$${(Math.random() * 100 + 5).toFixed(2)} - Thank you!`;
        break;
      case 'raid':
        message = `Raided with ${Math.floor(Math.random() * 50 + 10)} viewers!`;
        break;
    }
    
    const newActivity: ActivityItem = {
      time: new Date().toLocaleTimeString(),
      type,
      user: testUsername,
      message
    };
    
    console.log('🧪 Local test activity:', newActivity);
    this.onNewActivity?.(newActivity);
    
    notifications.show({
      title: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}!`,
      message: `${testUsername}: ${message}`,
      color: type === 'follower' ? 'purple' : type === 'subscribe' ? 'green' : type === 'donation' ? 'yellow' : 'blue',
    });
  }

  public testChat(username?: string, message?: string, color?: string) {
    if (this.socket && this.isConnected) {
      const testMessage: ChatMessage = {
        username: username || 'TestUser',
        message: message || 'This is a test chat message! 🎮',
        color: color || '#8cffbe',
        timestamp: new Date().toISOString(),
        userType: 'viewer'
      };
      
      this.socket.emit('chat-message', testMessage);
      this.onChatMessage?.(testMessage);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public overlayCustomization(data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit('overlay-customization', data);
    }
  }

  // Connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Get socket instance (for debugging)
  public getSocket(): Socket | null {
    return this.socket;
  }

  // Check if socket is available (not necessarily connected)
  public isSocketAvailable(): boolean {
    return this.socket !== null;
  }

  // Clear event listeners without disconnecting
  public clearListeners() {
    this.onStreamDataUpdate = null;
    this.onActivityUpdate = null;
    this.onNewActivity = null;
    this.onAlertSettingsUpdate = null;
    this.onChatMessage = null;
    this.onConnectionChange = null;
  }

  // Disconnect
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isConnecting = false;
    }
  }
}

// Create singleton instance
export const socketService = new SocketIOService();
export default socketService;