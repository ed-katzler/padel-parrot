// User types
export interface User {
  id: string;
  phone: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

// Match types
export interface Match {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  date_time: string;
  location: string;
  max_players: number;
  current_players: number;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

export type MatchStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

// Participant types
export interface Participant {
  id: string;
  match_id: string;
  user_id: string;
  status: ParticipantStatus;
  joined_at: string;
}

export type ParticipantStatus = 'joined' | 'left' | 'maybe';

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Environment types
export type Environment = 'development' | 'staging' | 'production'; 