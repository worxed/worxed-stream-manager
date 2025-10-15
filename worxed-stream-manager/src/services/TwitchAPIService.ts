/**
 * Twitch API Service for Lynx
 * Handles Twitch API integration and authentication
 */

export interface TwitchUser {
  id: string
  login: string
  display_name: string
  profile_image_url: string
  view_count: number
  created_at: string
}

export interface TwitchStream {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  title: string
  viewer_count: number
  started_at: string
  language: string
  thumbnail_url: string
}

export class TwitchAPIService {
  private clientId: string = ''
  private accessToken: string = ''
  private baseURL = 'https://api.twitch.tv/helix'

  constructor() {
    // Initialize with environment variables or defaults
    this.loadCredentials()
  }

  private loadCredentials(): void {
    // In a real app, these would come from secure storage or environment
    // For now, we'll use placeholder values
    this.clientId = process.env.TWITCH_CLIENT_ID || ''
    this.accessToken = process.env.TWITCH_ACCESS_TOKEN || ''
  }

  async getUser(username?: string): Promise<TwitchUser | null> {
    try {
      const url = username 
        ? `${this.baseURL}/users?login=${username}`
        : `${this.baseURL}/users`

      const response = await this.makeRequest(url)
      return response.data?.[0] || null
    } catch (error) {
      console.error('Failed to get user:', error)
      return null
    }
  }

  async getStream(username: string): Promise<TwitchStream | null> {
    try {
      const url = `${this.baseURL}/streams?user_login=${username}`
      const response = await this.makeRequest(url)
      return response.data?.[0] || null
    } catch (error) {
      console.error('Failed to get stream:', error)
      return null
    }
  }

  async getFollowerCount(userId: string): Promise<number> {
    try {
      const url = `${this.baseURL}/channels/followers?broadcaster_id=${userId}`
      const response = await this.makeRequest(url)
      return response.total || 0
    } catch (error) {
      console.error('Failed to get follower count:', error)
      return 0
    }
  }

  private async makeRequest(url: string): Promise<any> {
    if (!this.clientId || !this.accessToken) {
      throw new Error('Twitch API credentials not configured')
    }

    const response = await fetch(url, {
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Twitch API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.accessToken)
  }

  setCredentials(clientId: string, accessToken: string): void {
    this.clientId = clientId
    this.accessToken = accessToken
  }
} 