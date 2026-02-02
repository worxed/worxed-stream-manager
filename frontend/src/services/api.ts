import type { StreamData, AlertSettings, SettingEntry, CustomEndpoint } from '../types';

const API_BASE = '/api';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('API Error:', error);
    return { data: null, error: (error as Error).message };
  }
}

// Status
export async function getServerStatus() {
  return fetchApi<{
    status: string;
    twitchConnected: boolean;
    channel: string;
    connectedClients: number;
  }>('/status');
}

// Stream
export async function getStreamInfo() {
  const result = await fetchApi<{
    isLive: boolean;
    stream: {
      game_name: string;
      title: string;
      viewer_count: number;
      started_at: string;
    } | null;
    followers: number;
  }>('/stream');

  if (result.data) {
    const streamData: StreamData = {
      isLive: result.data.isLive,
      title: result.data.stream?.title || '',
      game: result.data.stream?.game_name || '',
      viewers: result.data.stream?.viewer_count || 0,
      followers: result.data.followers,
      uptime: result.data.stream?.started_at
        ? formatUptime(new Date(result.data.stream.started_at))
        : '00:00:00',
      startedAt: result.data.stream?.started_at || null,
    };
    return { data: streamData, error: null };
  }

  return { data: null, error: result.error };
}

// Analytics
export async function getAnalytics() {
  return fetchApi<{
    stream: {
      isLive: boolean;
      game: string;
      title: string;
      viewers: number;
      startedAt: string | null;
    };
    followers: {
      total: number;
      recent: Array<{ user_name: string; followed_at: string }>;
    };
    session: {
      chatMessages: number;
      followers: number;
      subscribers: number;
      donations: number;
    };
  }>('/analytics');
}

// Alerts
export async function getAlertSettings() {
  return fetchApi<AlertSettings>('/alerts');
}

export async function updateAlertSettings(settings: Partial<AlertSettings>) {
  return fetchApi<{ success: boolean; settings: AlertSettings }>('/alerts', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export async function triggerTestAlert(
  type: string,
  username?: string,
  message?: string,
  amount?: number
) {
  return fetchApi<{ success: boolean }>('/test-alert', {
    method: 'POST',
    body: JSON.stringify({ type, username, message, amount }),
  });
}

// Settings
export async function getSettings(category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return fetchApi<SettingEntry[]>(`/settings${query}`);
}

// Endpoints
export async function getEndpoints() {
  return fetchApi<CustomEndpoint[]>('/endpoints');
}

// Helpers
function formatUptime(startedAt: Date): string {
  const now = new Date();
  const diff = now.getTime() - startedAt.getTime();

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
