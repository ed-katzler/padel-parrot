import { ApiResponse, Match, CreateMatchRequest, User, ApiClient, Location, UpdateMatchRequest, UpdateUserRequest, Subscription, NotificationPreferences, UserStats } from './types'

export class MockApiClient implements ApiClient {
  private mockMatches: Match[] = [
    {
      id: 'mock-match-1',
      title: 'Evening Padel Session',
      description: 'Casual game at the local club',
      date_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 90,
      location: 'Padel Club Barcelona',
      max_players: 4,
      current_players: 2,
      status: 'upcoming',
      creator_id: 'mock-user-1',
      is_public: true,
      recurrence_type: 'none',
      recurrence_end_date: null,
      series_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'mock-match-2',
      title: 'Weekend Tournament Prep',
      description: 'Practice session before the big tournament',
      date_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 120,
      location: 'Elite Padel Center',
      max_players: 4,
      current_players: 3,
      status: 'upcoming',
      creator_id: 'mock-user-2',
      is_public: false,
      recurrence_type: 'weekly',
      recurrence_end_date: null,
      series_id: 'mock-series-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  private mockUser: User = {
    id: 'mock-user-id',
    phone: '+1234567890',
    name: 'Test User',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  private isAuthenticated = false
  private joinedMatches: Set<string> = new Set() // Track which matches the user has joined
  private mockSubscription: Subscription | null = null // Track trial subscription

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
      
      // Create a 14-day trial for new users (if no subscription exists)
      if (!this.mockSubscription) {
        console.log('🎁 Creating 14-day trial for new mock user...')
        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + 14)
        
        this.mockSubscription = {
          id: 'mock-subscription-id',
          user_id: this.mockUser.id,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: trialEnd.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        console.log('✅ Mock trial subscription created, expires:', trialEnd.toISOString())
      }
      
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

  async updateUser(userData: UpdateUserRequest): Promise<ApiResponse<User>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to update profile' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update the mock user
    this.mockUser = {
      ...this.mockUser,
      ...userData,
      updated_at: new Date().toISOString()
    }
    
    return { data: this.mockUser, error: null }
  }

  async uploadAvatar(file: File): Promise<ApiResponse<string>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to upload avatar' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Create a mock URL for the avatar
    const mockAvatarUrl = `https://example.com/avatars/${this.mockUser.id}/${Date.now()}.jpg`
    
    // Update the mock user's avatar
    this.mockUser.avatar_url = mockAvatarUrl
    this.mockUser.updated_at = new Date().toISOString()
    
    return { data: mockAvatarUrl, error: null }
  }

  async signOut(): Promise<ApiResponse<null>> {
    this.isAuthenticated = false
    return { data: null, error: null }
  }

  async getMatches(): Promise<ApiResponse<Match[]>> {
    // Legacy method - now returns empty array, use getMyMatches() and getPublicMatches() instead
    console.warn('getMatches() is deprecated. Use getMyMatches() and getPublicMatches() instead.')
    return { data: [], error: null }
  }

  async getMyMatches(): Promise<ApiResponse<Match[]>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to view matches' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Filter matches based on privacy rules:
    // 1. Matches created by current user (private or public)
    // 2. Matches the current user has joined (private or public)
    const myMatches = this.mockMatches.filter(match => {
      // Show matches created by current user
      if (match.creator_id === this.mockUser.id) return true
      
      // Show matches the current user has joined
      if (this.joinedMatches.has(match.id)) return true
      
      return false
    })
    
    return { data: myMatches, error: null }
  }

  async getPublicMatches(): Promise<ApiResponse<Match[]>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to view matches' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Filter public matches where:
    // 1. Match is public
    // 2. Match is upcoming (not past)
    // 3. User is NOT the creator
    // 4. User is NOT already a participant
    const now = new Date()
    const publicMatches = this.mockMatches.filter(match => {
      // Must be public
      if (!match.is_public) return false
      
      // Must be upcoming
      if (new Date(match.date_time) <= now) return false
      
      // Must not be created by current user
      if (match.creator_id === this.mockUser.id) return false
      
      // Must not be joined by current user
      if (this.joinedMatches.has(match.id)) return false
      
      return true
    })
    
    return { data: publicMatches, error: null }
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
    
    const isRecurring = matchData.recurrence_type && matchData.recurrence_type !== 'none'
    const seriesId = isRecurring ? `mock-series-${Date.now()}` : null
    
    const newMatch: Match = {
      id: `mock-match-${Date.now()}`,
      ...matchData,
      max_players: matchData.max_players || 4,
      duration_minutes: matchData.duration_minutes || 90,
      current_players: 1,
      status: 'upcoming',
      creator_id: this.mockUser.id,
      is_public: matchData.is_public ?? false,
      recurrence_type: matchData.recurrence_type || 'none',
      recurrence_end_date: matchData.recurrence_end_date || null,
      series_id: seriesId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.mockMatches.unshift(newMatch)
    return { data: newMatch, error: null }
  }

  async updateMatch(matchId: string, matchData: UpdateMatchRequest): Promise<ApiResponse<Match>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to update match' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const matchIndex = this.mockMatches.findIndex(m => m.id === matchId)
    if (matchIndex === -1) {
      return { data: null, error: 'Match not found' }
    }
    
    const currentMatch = this.mockMatches[matchIndex]
    
    // Check if user is the creator
    if (currentMatch.creator_id !== this.mockUser.id) {
      return { data: null, error: 'Only the match creator can edit this match' }
    }
    
    // Check if match is upcoming
    if (currentMatch.status !== 'upcoming') {
      return { data: null, error: 'Can only edit upcoming matches' }
    }
    
    // Validate max_players constraint
    if (matchData.max_players !== undefined && matchData.max_players < currentMatch.current_players) {
      return { data: null, error: `Cannot reduce max players below current player count (${currentMatch.current_players})` }
    }
    
    // Update the match
    const updatedMatch: Match = {
      ...currentMatch,
      ...matchData,
      updated_at: new Date().toISOString()
    }
    
    this.mockMatches[matchIndex] = updatedMatch
    return { data: updatedMatch, error: null }
  }

  async deleteMatch(matchId: string): Promise<ApiResponse<null>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to delete match' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const matchIndex = this.mockMatches.findIndex(m => m.id === matchId)
    if (matchIndex === -1) {
      return { data: null, error: 'Match not found' }
    }
    
    const currentMatch = this.mockMatches[matchIndex]
    
    // Check if user is the creator
    if (currentMatch.creator_id !== this.mockUser.id) {
      return { data: null, error: 'Only the match creator can delete this match' }
    }
    
    // Check if match is upcoming
    if (currentMatch.status !== 'upcoming') {
      return { data: null, error: 'Can only delete upcoming matches' }
    }
    
    // Remove the match
    this.mockMatches.splice(matchIndex, 1)
    
    // Remove from joined matches if present
    this.joinedMatches.delete(matchId)
    
    return { data: null, error: null }
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
        name: 'The Campus Quinta do Lago',
        address: 'Avenida Ayrton Senna da Silva 20, 8135-162 Quinta do Lago',
        description: 'World-class sports facility with 7 padel courts (4 covered, 3 outdoor)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'location-2',
        name: 'Ocean Padel Club Luz',
        address: 'Rua Dr Francisco Gentil Martins Lote 57, Praia da Luz, 8600-164 Lagos',
        description: '5 courts with Mondo WPT Championship surfaces',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'location-3',
        name: 'Vilamoura Tennis & Padel Academy',
        address: 'Vilamoura, 8125 Quarteira',
        description: '9 padel courts (7 covered, 2 uncovered)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'location-4',
        name: 'Lagoa Station',
        address: 'Rua de Alagoas Brancas, 8400-424 Lagoa',
        description: '8 courts including 4 covered panoramic premium courts',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'location-5',
        name: 'Padel Blu',
        address: 'Rua de Brejos 2, 8200-047 Albufeira',
        description: '6 padel courts (covered and lit) with restaurant and bar',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    
    return { data: mockLocations, error: null }
  }

  async hasUserJoinedMatch(matchId: string): Promise<ApiResponse<boolean>> {
    return { data: this.joinedMatches.has(matchId), error: null }
  }

  async getMatchParticipants(matchId: string): Promise<ApiResponse<Array<{ id: string; phone: string; name: string | null; avatar_url: string | null }>>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const match = this.mockMatches.find(m => m.id === matchId)
    if (!match) {
      return { data: null, error: 'Match not found' }
    }

    // Generate mock participants based on current_players count
    const participants = []
    for (let i = 0; i < match.current_players; i++) {
      participants.push({
        id: `mock-participant-${i}`,
        phone: `+123456789${i}`,
        name: i === 0 ? 'You' : `Player ${i + 1}`,
        avatar_url: null
      })
    }

    return { data: participants, error: null }
  }

  async getUserById(userId: string): Promise<ApiResponse<{ id: string; phone: string; name: string | null; avatar_url: string | null }>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200))
    
    if (userId === this.mockUser.id) {
      return { data: this.mockUser, error: null }
    }
    
    // Return mock creator info
    return { 
      data: { 
        id: userId, 
        phone: '+1234567890', 
        name: 'Match Creator',
        avatar_url: null
      }, 
      error: null 
    }
  }

  async removeParticipant(matchId: string, participantUserId: string): Promise<ApiResponse<null>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated to remove participants' }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const match = this.mockMatches.find(m => m.id === matchId)
    if (!match) {
      return { data: null, error: 'Match not found' }
    }
    
    // Check if user is the creator
    if (match.creator_id !== this.mockUser.id) {
      return { data: null, error: 'Only the match creator can remove participants' }
    }
    
    // Cannot remove yourself
    if (participantUserId === this.mockUser.id) {
      return { data: null, error: 'Cannot remove yourself from your own match' }
    }
    
    if (match.current_players > 1) {
      match.current_players -= 1
      match.updated_at = new Date().toISOString()
    }
    
    return { data: null, error: null }
  }

  async getSubscriptionStatus(): Promise<ApiResponse<Subscription | null>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated' }
    }
    
    // Return the mock subscription (includes trial)
    return { data: this.mockSubscription, error: null }
  }

  async getNotificationPreferences(): Promise<ApiResponse<NotificationPreferences | null>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated' }
    }
    
    // Return null preferences for mock
    return { data: null, error: null }
  }

  async updateNotificationPreferences(prefs: Partial<Pick<NotificationPreferences, 'day_before_enabled' | 'ninety_min_before_enabled'>>): Promise<ApiResponse<NotificationPreferences>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated' }
    }
    
    // Mock response
    const mockPrefs: NotificationPreferences = {
      id: 'mock-prefs-id',
      user_id: this.mockUser.id,
      day_before_enabled: prefs.day_before_enabled ?? true,
      ninety_min_before_enabled: prefs.ninety_min_before_enabled ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    return { data: mockPrefs, error: null }
  }

  async stopRecurring(matchId: string): Promise<ApiResponse<null>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated' }
    }
    
    const match = this.mockMatches.find(m => m.id === matchId)
    if (!match) {
      return { data: null, error: 'Match not found' }
    }
    
    if (match.creator_id !== this.mockUser.id) {
      return { data: null, error: 'Only the match creator can stop recurrence' }
    }
    
    // Stop recurrence for all matches in the series
    this.mockMatches.forEach(m => {
      if (m.series_id === match.series_id) {
        m.recurrence_type = 'none'
      }
    })
    
    return { data: null, error: null }
  }

  async getUserStats(): Promise<ApiResponse<UserStats>> {
    if (!this.isAuthenticated) {
      return { data: null, error: 'Must be authenticated' }
    }
    
    // Return mock stats
    return {
      data: {
        totalMatches: 12,
        matchesThisMonth: 3,
        topLocations: [
          { location: 'Padel Club Barcelona', count: 5 },
          { location: 'Elite Padel Center', count: 4 },
          { location: 'The Campus', count: 3 }
        ],
        frequentPartners: [
          { id: 'partner-1', name: 'Carlos Rodriguez', avatar_url: null, matchCount: 8 },
          { id: 'partner-2', name: 'Maria Santos', avatar_url: null, matchCount: 6 },
          { id: 'partner-3', name: 'John Smith', avatar_url: null, matchCount: 4 }
        ]
      },
      error: null
    }
  }

  // Return null for mock client - realtime not supported
  getRealtimeClient() {
    return null
  }
} 