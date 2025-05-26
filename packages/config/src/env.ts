import { z } from 'zod';

// Environment schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Twilio Configuration
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('PadelParrot'),
  
  // Database
  DATABASE_URL: z.string().optional(),
  
  // Analytics (optional)
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_SMS_REMINDERS: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: z.string().transform(val => val === 'true').default('false'),
});

export type Env = z.infer<typeof envSchema>;

// Environment-specific configurations
export const environments = {
  local: {
    NODE_ENV: 'development' as const,
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_ENABLE_SMS_REMINDERS: 'false',
    NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: 'false',
  },
  staging: {
    NODE_ENV: 'staging' as const,
    NEXT_PUBLIC_APP_URL: 'https://staging.padelparrot.com',
    NEXT_PUBLIC_ENABLE_SMS_REMINDERS: 'true',
    NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: 'true',
  },
  production: {
    NODE_ENV: 'production' as const,
    NEXT_PUBLIC_APP_URL: 'https://padelparrot.com',
    NEXT_PUBLIC_ENABLE_SMS_REMINDERS: 'true',
    NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: 'true',
  },
} as const;

// Validate and parse environment variables
function createEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  
  return parsed.data;
}

// Export validated environment
export const env = createEnv();

// Helper functions
export const isDevelopment = env.NODE_ENV === 'development';
export const isStaging = env.NODE_ENV === 'staging';
export const isProduction = env.NODE_ENV === 'production';

// Feature flags
export const features = {
  smsReminders: env.NEXT_PUBLIC_ENABLE_SMS_REMINDERS,
  pushNotifications: env.NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS,
} as const; 