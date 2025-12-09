// Export the main API client
export { apiClient } from './client'

// Export types for consumers
export type { ApiResponse, User, Match, CreateMatchRequest, UpdateUserRequest, Participant, ApiClient, Location, Subscription, NotificationPreferences, RecurrenceType, UserStats, Club, District, ClubsByDistrict, ClubWithDistrict, CourtType, ClubAmenity, Racket, AxisValue, RacketShape, SkillLevel, PriceTier, CellCoordinates, CellCount } from './types'

// Import types for the convenience functions
import type { CreateMatchRequest, UpdateMatchRequest, UpdateUserRequest, NotificationPreferences, AxisValue } from './types'
import { apiClient } from './client'

// Convenience functions that use the apiClient
export const sendOtp = (phone: string) => apiClient.sendOtp(phone)
export const verifyOtp = (phone: string, token: string) => apiClient.verifyOtp(phone, token)
export const getCurrentUser = () => apiClient.getCurrentUser()
export const updateUser = (userData: UpdateUserRequest) => apiClient.updateUser(userData)
export const uploadAvatar = (file: File) => apiClient.uploadAvatar(file)
export const signOut = () => apiClient.signOut()
export const getMatches = () => apiClient.getMatches()
export const getMyMatches = () => apiClient.getMyMatches()
export const getPublicMatches = () => apiClient.getPublicMatches()
export const getMatch = (id: string) => apiClient.getMatch(id)
export const createMatch = (matchData: CreateMatchRequest) => apiClient.createMatch(matchData)
export const updateMatch = (matchId: string, matchData: UpdateMatchRequest) => apiClient.updateMatch(matchId, matchData)
export const deleteMatch = (matchId: string) => apiClient.deleteMatch(matchId)
export const joinMatch = (matchId: string, userId: string) => apiClient.joinMatch(matchId, userId)
export const leaveMatch = (matchId: string, userId: string) => apiClient.leaveMatch(matchId, userId)
export const removeParticipant = (matchId: string, participantUserId: string) => apiClient.removeParticipant(matchId, participantUserId)
export const hasUserJoinedMatch = (matchId: string, userId: string) => apiClient.hasUserJoinedMatch(matchId, userId)
export const getMatchParticipants = (matchId: string) => apiClient.getMatchParticipants(matchId)
export const getUserById = (userId: string) => apiClient.getUserById(userId)
export const getLocations = () => apiClient.getLocations()

// Club methods
export const getClubs = () => apiClient.getClubs()
export const getClubsByDistrict = () => apiClient.getClubsByDistrict()
export const getDistricts = () => apiClient.getDistricts()
export const getClub = (id: string) => apiClient.getClub(id)
export const searchClubs = (query: string) => apiClient.searchClubs(query)

// Subscription and notification methods
export const getSubscriptionStatus = () => apiClient.getSubscriptionStatus()
export const getNotificationPreferences = () => apiClient.getNotificationPreferences()
export const updateNotificationPreferences = (prefs: Partial<Pick<NotificationPreferences, 'day_before_enabled' | 'ninety_min_before_enabled'>>) => apiClient.updateNotificationPreferences(prefs)

// Recurring match methods
export const stopRecurring = (matchId: string) => apiClient.stopRecurring(matchId)

// User stats
export const getUserStats = () => apiClient.getUserStats()

// Realtime support - returns Supabase client for subscriptions (null for mock client)
export const getRealtimeClient = () => apiClient.getRealtimeClient()

// Racket Cube methods
export const getRackets = () => apiClient.getRackets()
export const getRacketsByCell = (powerBias: AxisValue, maneuverability: AxisValue, feel: AxisValue) => 
  apiClient.getRacketsByCell(powerBias, maneuverability, feel)
export const getRacketCellCounts = () => apiClient.getRacketCellCounts() 