import { ApiResponse, Match, CreateMatchRequest, User, ApiClient, Location } from './types'

export class MockApiClient implements ApiClient {
  private mockMatches: Match[] = [
    {
      id: 'mock-match-1',
      title: 'Evening Padel Session',
      description: 'Casual game at the local club',
      date_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Padel Club Barcelona',
      max_players: 4,
      current_players: 2,
      status: 'upcoming',
      creator_id: 'mock-user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'mock-match-2',
      title: 'Weekend Tournament Prep',
      description: 'Practice session before the big tournament',
      date_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Elite Padel Center',
      max_players: 4,
      current_players: 3,
      status: 'upcoming',
      creator_id: 'mock-user-2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  private mockUser: User = {
    id: 'mock-user-id',
    phone: '+1234567890',
    name: 'Test User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  private isAuthenticated = false
  private joinedMatches: Set<string> = new Set() // Track which matches the user has joined

  async sendOtp(phone: string): Promise<ApiResponse<null>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log(`📱 Mock SMS sent to ${phone}: Verification code is 123456`)
    return { data: null, error: null }
  }

  async verifyOtp(phone: string, token: string): Promise<ApiResponse<User>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (token === '123456') {
      this.isAuthenticated = true
      this.mockUser.phone = phone
      return { data: this.mockUser, error: null }
    }
    
    return { data: null, error: 'Invalid verification code' }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Not authenticated' }
    }
    
    return { data: this.mockUser, error: null }
  }

  async signOut(): Promise<ApiResponse<null>> {
    this.isAuthenticated = false
    return { data: null, error: null }
  }

  async getMatches(): Promise<ApiResponse<Match[]>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return { data: this.mockMatches, error: null }
  }

  async getMatch(id: string): Promise<ApiResponse<Match>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const match = this.mockMatches.find(m => m.id === id)
    if (!match) {
      return { data: null, error: 'Match not found' }
    }
    
    return { data: match, error: null }
  }

  async createMatch(matchData: CreateMatchRequest): Promise<ApiResponse<Match>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to create match' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const newMatch: Match = {
      id: `mock-match-${Date.now()}`,
      ...matchData,
      max_players: matchData.max_players || 4,
      current_players: 1,
      status: 'upcoming',
      creator_id: this.mockUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.mockMatches.unshift(newMatch)
    return { data: newMatch, error: null }
  }

  async joinMatch(matchId: string, userId: string): Promise<ApiResponse<null>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to join match' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const match = this.mockMatches.find(m => m.id === matchId)
    if (!match) {
      return { data: null, error: 'Match not found' }
    }
    
    if (match.current_players >= match.max_players) {
      return { data: null, error: 'Match is full' }
    }
    
    match.current_players += 1
    match.updated_at = new Date().toISOString()
    
    this.joinedMatches.add(matchId)
    
    return { data: null, error: null }
  }

  async leaveMatch(matchId: string, userId: string): Promise<ApiResponse<null>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to leave match' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const match = this.mockMatches.find(m => m.id === matchId)
    if (!match) {
      return { data: null, error: 'Match not found' }
    }
    
    if (match.current_players > 1) {
      match.current_players -= 1
      match.updated_at = new Date().toISOString()
    }
    
    this.joinedMatches.delete(matchId)
    
    return { data: null, error: null }
  }

  async getLocations(): Promise<ApiResponse<Location[]>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const mockLocations: Location[] = [
      {
        id: 'location-1',
        name: 'Padel Club Barcelona',
        address: '123 Sports Avenue, Barcelona',
        description: 'Premium indoor courts',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'location-2',
        name: 'Elite Padel Center',
        address: '456 Champion Street, Madrid',
        description: 'Professional training facility',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'location-3',
        name: 'City Sports Complex',
        address: '789 Urban Plaza, Valencia',
        description: 'Multi-sport facility with outdoor courts',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    
    return { data: mockLocations, error: null }
  }

  async hasUserJoinedMatch(matchId: string): Promise<ApiResponse<boolean>> {
    return { data: this.joinedMatches.has(matchId), error: null }
  }
} 