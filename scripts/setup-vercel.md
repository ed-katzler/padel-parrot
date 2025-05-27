# Fix Vercel Deployment - Step by Step Guide

## The Issue
Your Vercel deployment is failing because:
1. Missing environment variables in Vercel
2. Monorepo configuration needs to be explicit
3. Build context needs to be properly set

## Solution Steps

### 1. Go to Vercel Dashboard
1. Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find your `padel-parrot` project
3. Click on it to open project settings

### 2. Configure Environment Variables
Go to **Settings** → **Environment Variables** and add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NODE_ENV=production
```

**Important**: 
- Copy these values from your `apps/web/.env.local` file
- Don't include quotes around the values in Vercel
- Apply to all environments (Production, Preview, Development)

### 3. Configure Build Settings
In **Settings** → **General**:
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4. Redeploy
After setting environment variables:
1. Go to **Deployments** tab
2. Click on the latest failed deployment
3. Click **Redeploy** button

## Alternative: Delete and Recreate Project

If the above doesn't work:

1. **Delete the current Vercel project**
2. **Import again from GitHub**
3. **Set Root Directory to `apps/web` during import**
4. **Add environment variables immediately after creation**

## Verification

After successful deployment:
1. Visit your Vercel URL
2. Test authentication flow
3. Try creating a match
4. Verify all features work

## Common Errors

- **"Module not found"**: Wrong root directory
- **"Build failed"**: Missing environment variables
- **"Cannot resolve"**: Package dependencies issue

Your updated `vercel.json` should now handle the monorepo structure better! 