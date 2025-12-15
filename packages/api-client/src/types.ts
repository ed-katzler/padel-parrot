export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface User {
  id: string
  phone: string
  name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// Recurrence types for recurring matches
export type RecurrenceType = 'none' | 'weekly' | 'biweekly'

export interface Match {
  id: string
  title?: string // Deprecated - kept for backwards compatibility
  description?: string
  date_time: string
  duration_minutes: number
  location: string
  max_players: number
  current_players: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  creator_id: string
  is_public: boolean
  // Recurring match fields
  recurrence_type: RecurrenceType
  recurrence_end_date: string | null
  series_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateMatchRequest {
  description?: string
  date_time: string
  duration_minutes?: number
  location: string
  club_id?: string  // Reference to clubs table for geolocation/weather
  max_players?: number
  is_public?: boolean
  // Recurring match options
  recurrence_type?: RecurrenceType
  recurrence_end_date?: string
}

export interface UpdateMatchRequest {
  description?: string
  date_time?: string
  duration_minutes?: number
  location?: string
  max_players?: number
  is_public?: boolean
  // Can update recurrence settings
  recurrence_type?: RecurrenceType
  recurrence_end_date?: string | null
}

export interface UpdateUserRequest {
  name?: string
  avatar_url?: string
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
  latitude?: number
  longitude?: number
  created_at: string
  updated_at: string
}

// Portuguese district/region
export interface District {
  id: string
  name: string
  display_order: number
}

// Court type for clubs
export type CourtType = 'indoor' | 'outdoor' | 'mixed'

// Amenities available at clubs
export type ClubAmenity = 
  | 'parking'
  | 'pro_shop'
  | 'cafe'
  | 'locker_rooms'
  | 'rental'
  | 'swimming_pool'
  | 'gym'
  | 'restaurant'
  | 'bar'
  | 'physio'
  | 'coaching'

// Comprehensive club/venue information
export interface Club {
  id: string
  name: string
  slug: string
  
  // Contact & Web
  website: string | null
  phone: string | null
  email: string | null
  
  // Address
  address: string | null
  city: string | null
  district_id: string | null
  postal_code: string | null
  country: string
  
  // Geolocation
  latitude: number | null
  longitude: number | null
  google_place_id: string | null
  
  // Facilities
  num_courts: number | null
  court_type: CourtType | null
  has_lighting: boolean
  amenities: ClubAmenity[]
  
  // Metadata
  description: string | null
  image_url: string | null
  source: string | null
  verified: boolean
  active: boolean
  
  created_at: string
  updated_at: string
  
  // Joined fields (from view)
  district_name?: string
}

// Club with district info for display
export interface ClubWithDistrict extends Club {
  district_name: string
}

// Grouped clubs by district for UI
export interface ClubsByDistrict {
  district: District
  clubs: Club[]
}

export interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  cloudCover: number
  condition: string
  icon: string
  condensationRisk: number
  riskLevel: 'low' | 'medium' | 'high'
}

// Subscription types for premium features
export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  day_before_enabled: boolean
  ninety_min_before_enabled: boolean
  created_at: string
  updated_at: string
}

// User statistics
export interface UserStats {
  totalMatches: number
  matchesThisMonth: number
  topLocations: Array<{ location: string; count: number }>
  frequentPartners: Array<{ id: string; name: string | null; avatar_url: string | null; matchCount: number }>
}

// ============================================
// Racket Cube Types
// ============================================

// Axis value (1-3 scale for each dimension)
export type AxisValue = 1 | 2 | 3

// Racket shape types
export type RacketShape = 'round' | 'teardrop' | 'diamond'

// Skill level classification
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

// Price tier classification
export type PriceTier = 'budget' | 'mid' | 'premium'

// Main Racket interface
export interface Racket {
  id: string
  brand: string
  model: string
  image_url: string | null
  
  // The 3 axes (1-3 scale)
  power_bias: AxisValue      // X: 1=Control, 2=Balanced, 3=Power
  maneuverability: AxisValue // Y: 1=Light, 2=Medium, 3=Heavy
  feel: AxisValue            // Z: 1=Soft, 2=Medium, 3=Firm
  
  // Raw technical data (optional)
  weight_grams: number | null
  shape: RacketShape | null
  balance_mm: number | null
  
  // Marketing/UX fields
  headline: string | null
  description: string | null
  skill_level: SkillLevel | null
  price_tier: PriceTier | null
  buy_url: string | null
  
  // Metadata
  active: boolean
  created_at: string
  updated_at: string
}

// Cell coordinates for the Racket Cube (3D position)
export interface CellCoordinates {
  power: AxisValue       // X-axis
  weight: AxisValue      // Y-axis (renamed from maneuverability for clarity)
  feel: AxisValue        // Z-axis
}

// Count of rackets per cell (for displaying in the cube)
export interface CellCount {
  power_bias: AxisValue
  maneuverability: AxisValue
  feel: AxisValue
  count: number
}

export interface ApiClient {
  sendOtp(phone: string): Promise<ApiResponse<null>>
  verifyOtp(phone: string, token: string): Promise<ApiResponse<User>>
  getCurrentUser(): Promise<ApiResponse<User>>
  updateUser(userData: UpdateUserRequest): Promise<ApiResponse<User>>
  uploadAvatar(file: File): Promise<ApiResponse<string>>
  signOut(): Promise<ApiResponse<null>>
  getMatches(): Promise<ApiResponse<Match[]>>
  getMyMatches(): Promise<ApiResponse<Match[]>>
  getPublicMatches(): Promise<ApiResponse<Match[]>>
  getMatch(id: string): Promise<ApiResponse<Match>>
  createMatch(matchData: CreateMatchRequest): Promise<ApiResponse<Match>>
  updateMatch(matchId: string, matchData: UpdateMatchRequest): Promise<ApiResponse<Match>>
  deleteMatch(matchId: string): Promise<ApiResponse<null>>
  joinMatch(matchId: string, userId: string): Promise<ApiResponse<null>>
  leaveMatch(matchId: string, userId: string): Promise<ApiResponse<null>>
  removeParticipant(matchId: string, participantUserId: string): Promise<ApiResponse<null>>
  hasUserJoinedMatch(matchId: string, userId: string): Promise<ApiResponse<boolean>>
  getMatchParticipants(matchId: string): Promise<ApiResponse<Array<{ id: string; phone: string; name: string | null; avatar_url: string | null }>>>
  getUserById(userId: string): Promise<ApiResponse<{ id: string; phone: string; name: string | null; avatar_url: string | null }>>
  // Legacy location method (deprecated, use getClubs instead)
  getLocations(): Promise<ApiResponse<Location[]>>
  // Club methods
  getClubs(): Promise<ApiResponse<Club[]>>
  getClubsByDistrict(): Promise<ApiResponse<ClubsByDistrict[]>>
  getDistricts(): Promise<ApiResponse<District[]>>
  getClub(id: string): Promise<ApiResponse<Club>>
  searchClubs(query: string): Promise<ApiResponse<Club[]>>
  // Subscription methods
  getSubscriptionStatus(): Promise<ApiResponse<Subscription | null>>
  getNotificationPreferences(): Promise<ApiResponse<NotificationPreferences | null>>
  updateNotificationPreferences(prefs: Partial<Pick<NotificationPreferences, 'day_before_enabled' | 'ninety_min_before_enabled'>>): Promise<ApiResponse<NotificationPreferences>>
  // Recurring match methods
  stopRecurring(matchId: string): Promise<ApiResponse<null>>
  // User stats
  getUserStats(): Promise<ApiResponse<UserStats>>
  // Realtime support - returns Supabase client for subscriptions (null for mock client)
  getRealtimeClient(): unknown | null
  // Racket Cube methods
  getRackets(): Promise<ApiResponse<Racket[]>>
  getRacketsByCell(powerBias: AxisValue, maneuverability: AxisValue, feel: AxisValue): Promise<ApiResponse<Racket[]>>
  getRacketCellCounts(): Promise<ApiResponse<CellCount[]>>
} 