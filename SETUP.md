# PadelParrot Setup Guide

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
# Copy the example environment file
cp env.example .env.local

# Edit .env.local with your actual values
# You'll need to set up Supabase and Twilio accounts
```

### 3. Build the Project
```bash
npm run build
```

### 4. Start Development
```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

## Environment Setup

### Required Environment Variables

#### Supabase (Database & Auth)
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and anon key from Settings > API
3. Set these in your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

#### Twilio (SMS for OTP and Reminders)
1. Go to [twilio.com](https://twilio.com) and create an account
2. Get your Account SID and Auth Token from the Console
3. Create a Verify Service for OTP
4. Set these in your `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_VERIFY_SERVICE_SID=your-verify-service-sid
   ```

## Available Scripts

- `npm run build` - Build all packages
- `npm run dev` - Start development servers
- `npm run lint` - Run linting
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run clean` - Clean build artifacts

## Project Structure

```
padel-parrot/
├── apps/
│   ├── web/                 # Next.js web application (coming next)
│   └── mobile/              # Expo React Native app (coming later)
├── packages/
│   ├── config/              # Environment configuration ✅
│   ├── shared/              # Shared types and utilities ✅
│   ├── api-client/          # Supabase API client (coming next)
│   └── ui/                  # Shared UI components (coming next)
├── supabase/                # Database schema (coming next)
└── docs/                    # Documentation
```

## Current Status

✅ **Completed:**
- Monorepo setup with Turborepo
- Environment configuration with validation
- Shared types and utilities package
- Build system working
- Next.js web application with authentication UI
- API client package with mock data
- Match creation and listing functionality
- Responsive mobile-first design
- Development server running

🚧 **Next Steps:**
- Supabase database schema and setup
- Real authentication with SMS OTP
- Match details and sharing pages
- Real-time match updates
- Mobile app (Expo)
- SMS reminders with Twilio

## Development Environments

- **Local**: `http://localhost:3000` (development)
- **Staging**: `https://staging.padelparrot.com` (testing)
- **Production**: `https://padelparrot.com` (live)

## Troubleshooting

### Build Issues
If you encounter build errors:
```bash
# Clean and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Issues
- Make sure all required environment variables are set
- Check that URLs don't have trailing slashes
- Verify Supabase and Twilio credentials are correct

## Need Help?

Check the main [README.md](./readme.md) for project overview and goals. 