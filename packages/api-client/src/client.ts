import { createClient } from '@supabase/supabase-js'
import { MockApiClient } from './mock-client'
import { ApiResponse, Match, CreateMatchRequest, User, ApiClient, Location } from './types'

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

      const userData: User = {
        id: user.id,
        phone: user.phone || '',
        name: user.user_metadata?.name || null,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      }

      return { data: userData, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to get current user' }
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
    try {
      // Get current user to filter matches based on visibility rules
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError || !user) {
        return { data: null, error: 'Must be authenticated to view matches' }
      }

      // Get matches that are either:
      // 1. Public matches
      // 2. Matches created by the current user (always visible to creator)
      // 3. Matches where the current user is a participant
      
      const { data: publicMatches, error: publicError } = await this.supabase
        .from('matches')
        .select('*')
        .eq('status', 'upcoming')
        .eq('is_public', true)
        .order('date_time', { ascending: true })

      if (publicError) {
        return { data: null, error: publicError.message }
      }

      const { data: createdMatches, error: createdError } = await this.supabase
        .from('matches')
        .select('*')
        .eq('status', 'upcoming')
        .eq('creator_id', user.id)
        .order('date_time', { ascending: true })

      if (createdError) {
        return { data: null, error: createdError.message }
      }

      const { data: participantMatches, error: participantError } = await this.supabase
        .from('matches')
        .select(`
          *,
          participants!inner(user_id, status)
        `)
        .eq('status', 'upcoming')
        .eq('participants.user_id', user.id)
        .eq('participants.status', 'joined')
        .order('date_time', { ascending: true })

      if (participantError) {
        return { data: null, error: participantError.message }
      }

      // Combine and deduplicate matches
      const allMatches = [
        ...(publicMatches || []),
        ...(createdMatches || []),
        ...(participantMatches || [])
      ]

      // Remove duplicates based on match ID
      const uniqueMatches = allMatches.filter((match, index, self) => 
        index === self.findIndex(m => m.id === match.id)
      )

      // Sort by date_time
      uniqueMatches.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())

      return { data: uniqueMatches, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to load matches' }
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
      const { data, error } = await this.supabase
        .from('matches')
        .insert({
          ...matchData,
          creator_id: user.id,
          current_players: 1, // Creator automatically joins
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

      // Add participant
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

      // Increment player count
      const { error: updateError } = await this.supabase.rpc('increment_match_players', {
        match_id: matchId
      })

      if (updateError) {
        return { data: null, error: updateError.message }
      }

      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: 'Failed to join match' }
    }
  }

  async leaveMatch(matchId: string, userId: string): Promise<ApiResponse<null>> {
    try {
      // Remove participant
      const { error: participantError } = await this.supabase
        .from('participants')
        .delete()
        .eq('match_id', matchId)
        .eq('user_id', userId)

      if (participantError) {
        return { data: null, error: participantError.message }
      }

      // Decrement player count
      const { error: updateError } = await this.supabase.rpc('decrement_match_players', {
        match_id: matchId
      })

      if (updateError) {
        return { data: null, error: updateError.message }
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