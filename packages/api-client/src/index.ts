// Export the main API client
export { apiClient } from './client'

// Export types for consumers
export type { ApiResponse, User, Match, CreateMatchRequest, UpdateUserRequest, Participant, ApiClient, Location } from './types'

// Import types for the convenience functions
import type { CreateMatchRequest, UpdateMatchRequest, UpdateUserRequest } from './types'
import { apiClient } from './client'

// Convenience functions that use the apiClient
export const sendOtp = (phone: string) => apiClient.sendOtp(phone)
export const verifyOtp = (phone: string, token: string) => apiClient.verifyOtp(phone, token)
export const getCurrentUser = () => apiClient.getCurrentUser()
export const updateUser = (userData: UpdateUserRequest) => apiClient.updateUser(userData)
export const signOut = () => apiClient.signOut()
export const getMatches = () => apiClient.getMatches()
export const getMatch = (id: string) => apiClient.getMatch(id)
export const createMatch = (matchData: CreateMatchRequest) => apiClient.createMatch(matchData)
export const updateMatch = (matchId: string, matchData: UpdateMatchRequest) => apiClient.updateMatch(matchId, matchData)
export const deleteMatch = (matchId: string) => apiClient.deleteMatch(matchId)
export const joinMatch = (matchId: string, userId: string) => apiClient.joinMatch(matchId, userId)
export const leaveMatch = (matchId: string, userId: string) => apiClient.leaveMatch(matchId, userId)
export const hasUserJoinedMatch = (matchId: string, userId: string) => apiClient.hasUserJoinedMatch(matchId, userId)
export const getMatchParticipants = (matchId: string) => apiClient.getMatchParticipants(matchId)
export const getUserById = (userId: string) => apiClient.getUserById(userId)
export const getLocations = () => apiClient.getLocations() 