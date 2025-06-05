/*
 * PERMISSIONS SYSTEM DOCUMENTATION
 * 
 * This API client implements proper match visibility permissions:
 * 
 * PRIVATE MATCHES:
 * - Only visible to the creator and participants
 * - Creator can always see their private matches
 * - Participants can see private matches they've joined
 * - Others cannot see private matches (even with direct links, they need sharelinks)
 * 
 * PUBLIC MATCHES:
 * - Visible to everyone in the "Public Matches" section
 * - Once a user joins a public match, it moves to their "Upcoming Matches" section
 * - Past public matches are only visible to participants/creators in "Past Matches"
 * - Past public matches are NOT visible to non-participants
 * 
 * API METHODS:
 * - getMyMatches(): Returns private/participant matches (for "Upcoming" and "Past" sections)
 * - getPublicMatches(): Returns public matches user hasn't joined (for "Public Matches" section)
 * - getMatches(): Deprecated - use the above two methods instead
 * 
 * SUPABASE REQUIREMENTS:
 * - Migration 001_add_duration_field.sql must be applied for duration_minutes field
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { MockApiClient } from './mock-client'
import { ApiResponse, Match, CreateMatchRequest, User, ApiClient, Location, UpdateMatchRequest, Participant, UpdateUserRequest } from './types'

interface SupabaseConfig {
  url: string
  anonKey: string
}

class SupabaseApiClient implements ApiClient {
  private supabase

  constructor(config: SupabaseConfig) {
    this.supabase = createClient(config.url, config.anonKey)
  }

  async sendOtp(phone: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: true
        }
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to send verification code' }
    }
  }

  async verifyOtp(phone: string, token: string): Promise<ApiResponse<User>> {
    try {
      console.log('🔍 Starting OTP verification for phone:', phone)
      
      const { data, error } = await this.supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms'
      })

      if (error) {
        console.error('❌ Supabase auth error:', error)
        return { data: null, error: error.message }
      }

      if (!data.user) {
        console.error('❌ No user returned from auth')
        return { data: null, error: 'Authentication failed' }
      }

      console.log('✅ Auth successful, user ID:', data.user.id)
      console.log('📱 User phone:', data.user.phone)

      // Always try to ensure user exists in our users table
      console.log('🔧 Ensuring user exists in database...')
      
      const { error: upsertError } = await this.supabase
        .from('users')
        .upsert({
          id: data.user.id,
          phone: data.user.phone || phone,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (upsertError) {
        console.error('❌ User upsert failed:', upsertError)
        return { data: null, error: 'Database error saving user' }
      }

      console.log('✅ User ensured in database')

      const user: User = {
        id: data.user.id,
        phone: data.user.phone || phone,
        name: data.user.user_metadata?.name || null,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at || data.user.created_at
      }

      console.log('✅ Authentication complete for user:', user.id)
      return { data: user, error: null }
    } catch (error) {
      console.error('💥 Unexpected error during OTP verification:', error)
      return { data: null, error: 'Failed to verify code' }
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()

      if (error) {
        return { data: null, error: error.message }
      }

      if (!user) {
        return { data: null, error: 'Not authenticated' }
      }

      // Get user data from our users table to get the most up-to-date name
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userError) {
        // If user doesn't exist in our table, create them
        const { error: insertError } = await this.supabase
          .from('users')
          .insert({
            id: user.id,
            phone: user.phone || '',
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          return { data: null, error: 'Failed to create user record' }
        }

        // Return user with null name
        const newUser: User = {
          id: user.id,
          phone: user.phone || '',
          name: null,
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at
        }

        return { data: newUser, error: null }
      }

      const userResponse: User = {
        id: userData.id,
        phone: userData.phone,
        name: userData.name,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      }

      return { data: userResponse, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to get current user' }
    }
  }

  async updateUser(userData: UpdateUserRequest): Promise<ApiResponse<User>> {
    try {
      console.log('👤 Starting user update...')
      
      // Get current user
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ Authentication check failed:', authError)
        return { data: null, error: 'Must be authenticated to update profile' }
      }

      console.log('✅ Current user authenticated:', user.id)

      // Update the user in our users table
      const { data, error } = await this.supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('❌ User update failed:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ User updated successfully:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('💥 Unexpected error during user update:', error)
      return { data: null, error: 'Failed to update profile' }
    }
  }

  async signOut(): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.supabase.auth.signOut()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to sign out' }
    }
  }

  async getMatches(): Promise<ApiResponse<Match[]>> {
    // Legacy method - now returns empty array, use getMyMatches() and getPublicMatches() instead
    console.warn('getMatches() is deprecated. Use getMyMatches() and getPublicMatches() instead.')
    return { data: [], error: null }
  }

  async getMyMatches(): Promise<ApiResponse<Match[]>> {
    try {
      // Get current user to filter matches based on visibility rules
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        return { data: null, error: 'Must be authenticated to view matches' }
      }

      // Get matches where the user is either:
      // 1. The creator (private or public - always visible to creator)
      // 2. A participant (private or public - visible if they joined)
      
      // First get matches created by the user
      const { data: createdMatches, error: createdError } = await this.supabase
        .from('matches')
        .select('*')
        .eq('creator_id', user.id)
        .order('date_time', { ascending: true })

      if (createdError) {
        return { data: null, error: createdError.message }
      }

      // Then get matches where the user is a participant (excluding ones they created to avoid duplicates)
      const { data: participantMatches, error: participantError } = await this.supabase
        .from('matches')
        .select(`
          *,
          participants!inner(user_id, status)
        `)
        .eq('participants.user_id', user.id)
        .eq('participants.status', 'joined')
        .neq('creator_id', user.id) // Exclude matches they created (already included above)
        .order('date_time', { ascending: true })

      if (participantError) {
        return { data: null, error: participantError.message }
      }

      // Combine matches and remove the helper participants field
      const allMatches = [
        ...(createdMatches || []),
        ...(participantMatches || []).map(match => {
          const { participants, ...cleanMatch } = match
          return cleanMatch
        })
      ]

      // Sort by date_time
      allMatches.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())

      return { data: allMatches, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to load your matches' }
    }
  }

  async getPublicMatches(): Promise<ApiResponse<Match[]>> {
    try {
      // Get current user to exclude matches they're already involved in
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        return { data: null, error: 'Must be authenticated to view matches' }
      }

      // Get public matches that are upcoming and where the user is NOT the creator or participant
      const { data: publicMatches, error: publicError } = await this.supabase
        .from('matches')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'upcoming')
        .gte('date_time', new Date().toISOString()) // Only upcoming matches
        .neq('creator_id', user.id) // Exclude matches they created
        .order('date_time', { ascending: true })

      if (publicError) {
        return { data: null, error: publicError.message }
      }

      // Filter out matches where the user is already a participant
      if (!publicMatches) {
        return { data: [], error: null }
      }

      // Check which matches the user has joined
      const matchIds = publicMatches.map(match => match.id)
      if (matchIds.length === 0) {
        return { data: [], error: null }
      }

      const { data: participantMatches, error: participantError } = await this.supabase
        .from('participants')
        .select('match_id')
        .eq('user_id', user.id)
        .eq('status', 'joined')
        .in('match_id', matchIds)

      if (participantError) {
        return { data: null, error: participantError.message }
      }

      // Filter out matches where the user is a participant
      const joinedMatchIds = new Set((participantMatches || []).map(p => p.match_id))
      const filteredMatches = publicMatches.filter(match => !joinedMatchIds.has(match.id))

      return { data: filteredMatches, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to load public matches' }
    }
  }

  async getMatch(id: string): Promise<ApiResponse<Match>> {
    try {
      const { data, error } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to load match' }
    }
  }

  async createMatch(matchData: CreateMatchRequest): Promise<ApiResponse<Match>> {
    try {
      console.log('🏓 Starting match creation...')
      
      // Get current user to set as creator
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ Authentication check failed:', authError)
        return { data: null, error: 'Must be authenticated to create match' }
      }

      console.log('✅ Current user authenticated:', user.id)

      // Double-check user exists in our users table
      const { data: dbUser, error: userCheckError } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (userCheckError) {
        console.error('❌ User not found in users table:', userCheckError)
        return { data: null, error: 'User not found in database. Please sign in again.' }
      }

      console.log('✅ User exists in database, creating match...')

      // Create match with current_players = 1 (creator automatically joins)
      // IMPORTANT: duration_minutes must be provided to avoid "(NaNh NaNm)" display issue
      // The migration 001_add_duration_field.sql must be applied to the database for this to work
      const { data, error } = await this.supabase
        .from('matches')
        .insert({
          ...matchData,
          creator_id: user.id,
          current_players: 1, // Creator automatically joins
          duration_minutes: matchData.duration_minutes || 90, // Default to 90 minutes
          is_public: matchData.is_public ?? false // Default to private
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Match creation failed:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ Match created successfully:', data.id)

      // Add creator as participant in the participants table
      const { error: participantError } = await this.supabase
        .from('participants')
        .insert({
          match_id: data.id,
          user_id: user.id,
          status: 'joined'
        })

      if (participantError) {
        console.error('❌ Failed to add creator as participant:', participantError)
        // If participant insertion fails, we should clean up the match
        await this.supabase.from('matches').delete().eq('id', data.id)
        return { data: null, error: 'Failed to join created match. Please try again.' }
      }

      console.log('✅ Creator added as participant')
      return { data, error: null }
    } catch (error) {
      console.error('💥 Unexpected error during match creation:', error)
      return { data: null, error: 'Failed to create match' }
    }
  }

  async joinMatch(matchId: string, userId: string): Promise<ApiResponse<null>> {
    try {
      // Check if user is already a participant
      const { data: existingParticipant } = await this.supabase
        .from('participants')
        .select('id')
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .single()

      if (existingParticipant) {
        return { data: null, error: 'Already joined this match' }
      }

      // Check if match has space
      const { data: match, error: matchError } = await this.supabase
        .from('matches')
        .select('current_players, max_players')
        .eq('id', matchId)
        .single()

      if (matchError) {
        return { data: null, error: 'Match not found' }
      }

      if (match.current_players >= match.max_players) {
        return { data: null, error: 'Match is full' }
      }

      // Add participant (triggers will automatically sync the count)
      const { error: participantError } = await this.supabase
        .from('participants')
        .insert({
          match_id: matchId,
          user_id: userId,
          status: 'joined'
        })

      if (participantError) {
        return { data: null, error: participantError.message }
      }

      // Manually sync the count to ensure accuracy
      const { error: syncError } = await this.supabase.rpc('sync_match_player_count', {
        match_id: matchId
      })

      if (syncError) {
        console.warn('⚠️ Failed to sync player count:', syncError)
        // Don't fail the operation for sync errors
      }

      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to join match' }
    }
  }

  async leaveMatch(matchId: string, userId: string): Promise<ApiResponse<null>> {
    try {
      // Remove participant (triggers will automatically sync the count)
      const { error: participantError } = await this.supabase
        .from('participants')
        .delete()
        .eq('match_id', matchId)
        .eq('user_id', userId)

      if (participantError) {
        return { data: null, error: participantError.message }
      }

      // Manually sync the count to ensure accuracy
      const { error: syncError } = await this.supabase.rpc('sync_match_player_count', {
        match_id: matchId
      })

      if (syncError) {
        console.warn('⚠️ Failed to sync player count:', syncError)
        // Don't fail the operation for sync errors
      }

      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to leave match' }
    }
  }

  async hasUserJoinedMatch(matchId: string, userId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('participants')
        .select('id')
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .eq('status', 'joined')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        return { data: null, error: error.message }
      }

      return { data: !!data, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to check participation status' }
    }
  }

  async getMatchParticipants(matchId: string): Promise<ApiResponse<Array<{ id: string; phone: string; name: string | null }>>> {
    try {
      const { data, error } = await this.supabase
        .from('participants')
        .select(`
          users (
            id,
            phone,
            name
          )
        `)
        .eq('match_id', matchId)
        .eq('status', 'joined')

      if (error) {
        return { data: null, error: error.message }
      }

      // Transform the data to flatten the users object
      const participants = (data || []).map((participant: any) => participant.users).filter(Boolean)

      return { data: participants, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to get match participants' }
    }
  }

  async getUserById(userId: string): Promise<ApiResponse<{ id: string; phone: string; name: string | null }>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, phone, name')
        .eq('id', userId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to get user information' }
    }
  }

  async getLocations(): Promise<ApiResponse<Location[]>> {
    try {
      const { data, error } = await this.supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      return { data: null, error: 'Failed to load locations' }
    }
  }

  async updateMatch(matchId: string, matchData: UpdateMatchRequest): Promise<ApiResponse<Match>> {
    try {
      console.log('🏓 Starting match update...')
      
      // Get current user to verify they are the creator
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ Authentication check failed:', authError)
        return { data: null, error: 'Must be authenticated to update match' }
      }

      console.log('✅ Current user authenticated:', user.id)

      // Get the current match to verify ownership and current state
      const { data: currentMatch, error: getError } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (getError) {
        console.error('❌ Failed to get current match:', getError)
        return { data: null, error: 'Match not found' }
      }

      if (currentMatch.creator_id !== user.id) {
        console.error('❌ User is not the creator of this match')
        return { data: null, error: 'Only the match creator can edit this match' }
      }

      if (currentMatch.status !== 'upcoming') {
        console.error('❌ Cannot edit match that is not upcoming')
        return { data: null, error: 'Can only edit upcoming matches' }
      }

      // Validate max_players constraint if it's being updated
      if (matchData.max_players !== undefined && matchData.max_players < currentMatch.current_players) {
        console.error('❌ Max players cannot be less than current players')
        return { data: null, error: `Cannot reduce max players below current player count (${currentMatch.current_players})` }
      }

      console.log('✅ Validation passed, updating match...')

      // Update the match
      const { data, error } = await this.supabase
        .from('matches')
        .update({
          ...matchData,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single()

      if (error) {
        console.error('❌ Match update failed:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ Match updated successfully:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('💥 Unexpected error during match update:', error)
      return { data: null, error: 'Failed to update match' }
    }
  }

  async deleteMatch(matchId: string): Promise<ApiResponse<null>> {
    try {
      console.log('🗑️ Starting match deletion...')
      
      // Get current user to verify they are the creator
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ Authentication check failed:', authError)
        return { data: null, error: 'Must be authenticated to delete match' }
      }

      console.log('✅ Current user authenticated:', user.id)

      // Get the current match to verify ownership and current state
      const { data: currentMatch, error: getError } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (getError) {
        console.error('❌ Failed to get current match:', getError)
        return { data: null, error: 'Match not found' }
      }

      if (currentMatch.creator_id !== user.id) {
        console.error('❌ User is not the creator of this match')
        return { data: null, error: 'Only the match creator can delete this match' }
      }

      if (currentMatch.status !== 'upcoming') {
        console.error('❌ Cannot delete match that is not upcoming')
        return { data: null, error: 'Can only delete upcoming matches' }
      }

      console.log('✅ Validation passed, deleting match...')

      // Delete the match (participants will be deleted automatically due to CASCADE)
      const { error } = await this.supabase
        .from('matches')
        .delete()
        .eq('id', matchId)

      if (error) {
        console.error('❌ Match deletion failed:', error)
        return { data: null, error: error.message }
      }

      console.log('✅ Match deleted successfully')
      return { data: null, error: null }
    } catch (error) {
      console.error('💥 Unexpected error during match deletion:', error)
      return { data: null, error: 'Failed to delete match' }
    }
  }
}

// Export the appropriate client based on environment
function createApiClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Use real Supabase if environment variables are provided
  if (supabaseUrl && supabaseAnonKey) {
    console.log('🔗 Using Supabase backend')
    return new SupabaseApiClient({
      url: supabaseUrl,
      anonKey: supabaseAnonKey
    })
  }

  // Fall back to mock client for development
  console.log('🎭 Using mock backend (set SUPABASE env vars for real backend)')
  return new MockApiClient()
}

export const apiClient = createApiClient()

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string
          name?: string | null
          updated_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          date_time: string
          duration_minutes: number
          location: string
          max_players: number
          current_players: number
          status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          date_time: string
          duration_minutes?: number
          location: string
          max_players?: number
          current_players?: number
          status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          date_time?: string
          duration_minutes?: number
          location?: string
          max_players?: number
          current_players?: number
          status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
          is_public?: boolean
          updated_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          match_id: string
          user_id: string
          status: 'joined' | 'left' | 'maybe'
          joined_at: string
        }
        Insert: {
          id?: string
          match_id: string
          user_id: string
          status?: 'joined' | 'left' | 'maybe'
          joined_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          user_id?: string
          status?: 'joined' | 'left' | 'maybe'
        }
      }
    }
  }
} 