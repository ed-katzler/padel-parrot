export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface User {
  id: string
  phone: string
  name: string | null
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  title: string
  description?: string
  date_time: string
  location: string
  max_players: number
  current_players: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  creator_id: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface CreateMatchRequest {
  title: string
  description?: string
  date_time: string
  location: string
  max_players?: number
  is_public?: boolean
}

export interface UpdateMatchRequest {
  title?: string
  description?: string
  date_time?: string
  location?: string
  max_players?: number
  is_public?: boolean
}

export interface UpdateUserRequest {
  name?: string
}

export interface Participant {
  id: string
  match_id: string
  user_id: string
  status: 'joined' | 'left' | 'maybe'
  joined_at: string
}

export interface Location {
  id: string
  name: string
  address?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface ApiClient {
  sendOtp(phone: string): Promise<ApiResponse<null>>
  verifyOtp(phone: string, token: string): Promise<ApiResponse<User>>
  getCurrentUser(): Promise<ApiResponse<User>>
  updateUser(userData: UpdateUserRequest): Promise<ApiResponse<User>>
  signOut(): Promise<ApiResponse<null>>
  getMatches(): Promise<ApiResponse<Match[]>>
  getMatch(id: string): Promise<ApiResponse<Match>>
  createMatch(matchData: CreateMatchRequest): Promise<ApiResponse<Match>>
  updateMatch(matchId: string, matchData: UpdateMatchRequest): Promise<ApiResponse<Match>>
  deleteMatch(matchId: string): Promise<ApiResponse<null>>
  joinMatch(matchId: string, userId: string): Promise<ApiResponse<null>>
  leaveMatch(matchId: string, userId: string): Promise<ApiResponse<null>>
  hasUserJoinedMatch(matchId: string, userId: string): Promise<ApiResponse<boolean>>
  getMatchParticipants(matchId: string): Promise<ApiResponse<Array<{ id: string; phone: string; name: string | null }>>>
  getUserById(userId: string): Promise<ApiResponse<{ id: string; phone: string; name: string | null }>>
  getLocations(): Promise<ApiResponse<Location[]>>
} 