import { z } from 'zod';

// Phone number validation schema
export const phoneSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format');

// User schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Match schemas
export const matchStatusSchema = z.enum(['upcoming', 'in_progress', 'completed', 'cancelled']);

export const createMatchSchema = z.object({
  description: z.string().max(500, 'Description too long').optional(),
  date_time: z.string()
    .min(1, 'Date and time is required')
    .refine((dateStr) => {
      // Handle datetime-local format (YYYY-MM-DDTHH:mm) and convert to Date
      const date = new Date(dateStr)
      return !isNaN(date.getTime())
    }, 'Invalid date format')
    .refine((dateStr) => {
      // Ensure the date is at least 30 minutes in the future
      const selectedDate = new Date(dateStr)
      const now = new Date()
      const minTime = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes from now
      return selectedDate >= minTime
    }, 'Match must be scheduled at least 30 minutes in the future'),
  duration_minutes: z.number().refine((val) => [30, 60, 90, 120].includes(val), 'Duration must be 30, 60, 90, or 120 minutes').default(90),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  max_players: z.number().min(2).max(20).default(4),
  is_public: z.boolean().default(false),
});

export const updateMatchSchema = z.object({
  description: z.string().max(500, 'Description too long').optional(),
  date_time: z.string()
    .refine((dateStr) => {
      // Handle datetime-local format (YYYY-MM-DDTHH:mm) and convert to Date
      const date = new Date(dateStr)
      return !isNaN(date.getTime())
    }, 'Invalid date format')
    .refine((dateStr) => {
      // Ensure the date is at least 30 minutes in the future
      const selectedDate = new Date(dateStr)
      const now = new Date()
      const minTime = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes from now
      return selectedDate >= minTime
    }, 'Match must be scheduled at least 30 minutes in the future')
    .optional(),
  duration_minutes: z.number().refine((val) => [30, 60, 90, 120].includes(val), 'Duration must be 30, 60, 90, or 120 minutes').optional(),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long').optional(),
  max_players: z.number().min(2).max(20).optional(),
  is_public: z.boolean().optional(),
});

export const matchSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid(),
  title: z.string().optional(), // Deprecated - kept for backwards compatibility
  description: z.string().optional(),
  date_time: z.string(),
  duration_minutes: z.number(),
  location: z.string(),
  max_players: z.number(),
  current_players: z.number(),
  status: matchStatusSchema,
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Participant schemas
export const participantStatusSchema = z.enum(['joined', 'left', 'maybe']);

export const participantSchema = z.object({
  id: z.string().uuid(),
  match_id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: participantStatusSchema,
  joined_at: z.string(),
});

// API schemas
export const apiResponseSchema = z.object({
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long').optional(),
});

// Export types from schemas
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type MatchInput = z.infer<typeof matchSchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>; 