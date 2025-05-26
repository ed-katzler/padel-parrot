// App constants
export const APP_NAME = 'PadelParrot';
export const APP_DESCRIPTION = 'Simplify padel match organization';

// Match constants
export const MAX_PLAYERS_DEFAULT = 4;
export const MIN_PLAYERS_DEFAULT = 2;
export const MATCH_DURATION_HOURS = 1.5;

// Time constants
export const REMINDER_HOURS_BEFORE = 2;
export const MATCH_CREATION_ADVANCE_HOURS = 1;

// URL patterns
export const MATCH_URL_PATTERN = '/match/[id]';
export const SHARE_URL_PATTERN = '/join/[id]';

// Phone number validation
export const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

// Feature flags keys
export const FEATURE_FLAGS = {
  SMS_REMINDERS: 'NEXT_PUBLIC_ENABLE_SMS_REMINDERS',
  PUSH_NOTIFICATIONS: 'NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS',
} as const;

// Environment names
export const ENVIRONMENTS = {
  LOCAL: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const; 