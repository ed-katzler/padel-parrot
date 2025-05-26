# PadelParrot Deployment Guide 🚀

## Option 1: Vercel (Recommended - Simplest)

### Prerequisites
- GitHub account
- Domain name (optional, Vercel provides free subdomains)
- Supabase project running

### Step 1: Prepare for Deployment
```bash
# Ensure everything builds correctly
cd apps/web
npm run build

# Commit all changes
git add .
git commit -m "Prepare for deployment"
git push
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "New Project"
4. Import your `padel-parrot` repository
5. Select the `apps/web` folder as the root directory
6. Vercel will auto-detect Next.js settings

### Step 3: Configure Environment Variables
In Vercel dashboard, add these environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 4: Custom Domain (Optional)
1. In Vercel dashboard → Settings → Domains
2. Add your custom domain (e.g. `staging.padelparrot.com`)
3. Follow DNS configuration instructions
4. Vercel handles HTTPS automatically

### Step 5: Update Supabase Settings
In your Supabase dashboard:
1. Go to Authentication → URL Configuration
2. Add your Vercel URL to allowed redirect URLs:
   - `https://your-app.vercel.app`
   - `https://staging.padelparrot.com` (if using custom domain)

## Option 2: Netlify (Alternative)

### Quick Setup
1. Go to [netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Build settings:
   - Build command: `cd apps/web && npm run build`
   - Publish directory: `apps/web/.next`
4. Add environment variables
5. Deploy

## Option 3: Railway (Good for Full-Stack)

### Setup
1. Go to [railway.app](https://railway.app)
2. Deploy from GitHub
3. Automatically detects Next.js
4. Add environment variables
5. Custom domain available on paid plans

## Option 4: DigitalOcean App Platform

### Setup
1. Create DigitalOcean account
2. Go to App Platform
3. Connect GitHub repository
4. Configure build settings
5. Add environment variables

## 🔧 Pre-Deployment Checklist

### Code Preparation
- [ ] All builds pass locally: `npm run build`
- [ ] Environment variables documented
- [ ] Database migrations applied
- [ ] Error handling in place
- [ ] Performance optimized

### Supabase Configuration
- [ ] RLS policies are correct
- [ ] Database schema is finalized
- [ ] API rate limits configured
- [ ] Backup strategy in place

### Domain & Security
- [ ] Domain purchased/configured
- [ ] SSL/HTTPS enabled (automatic with Vercel)
- [ ] Environment variables secured
- [ ] Monitoring set up

## 🌟 Vercel-Specific Benefits

### Automatic Features
- **Preview Deployments**: Every PR gets its own URL
- **Analytics**: Built-in performance monitoring
- **Edge Functions**: For advanced features
- **Image Optimization**: Automatic WebP conversion
- **Global CDN**: Fast worldwide delivery

### Configuration File (Optional)
Create `vercel.json` in your root:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "apps/web/$1"
    }
  ]
}
```

## 📱 Post-Deployment Testing

### Essential Tests
1. **Authentication Flow**
   - SMS OTP works
   - User creation successful
   - Login/logout functions

2. **Match Management**
   - Create matches
   - Join/leave matches
   - WhatsApp sharing works

3. **Mobile Responsiveness**
   - Test on various devices
   - Date/time picker works
   - Location autocomplete functions

4. **Performance**
   - Page load speeds
   - Image optimization
   - API response times

## 🔄 Continuous Deployment

### Git Workflow
```bash
# Development
git checkout main
git pull
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
# Create PR → Auto-preview deployment

# Production
git checkout main
git merge feature/new-feature
git push # Auto-deploys to production
```

## 💰 Cost Estimation

### Vercel Pricing
- **Hobby (Free)**: Perfect for staging
  - 100GB bandwidth
  - 1000 serverless function invocations
  - Custom domains included

- **Pro ($20/month)**: For production
  - Unlimited bandwidth
  - Advanced analytics
  - Password protection

### Total Monthly Cost (Staging)
- Vercel: $0 (free tier)
- Supabase: $0-25 (depending on usage)
- Domain: $10-15/year (optional)
- **Total: $0-2/month for staging**

## 🚨 Common Issues & Solutions

### Build Failures
```bash
# Clear caches and rebuild
rm -rf .next node_modules/.cache
npm install
npm run build
```

### Environment Variables
- Double-check variable names match exactly
- No quotes needed in Vercel dashboard
- Restart deployment after changes

### Supabase Connection
- Verify URLs in Supabase dashboard
- Check RLS policies allow public access where needed
- Test API endpoints directly

## 🎯 Recommended Next Steps

1. **Start with Vercel free tier**
2. **Use your-app.vercel.app subdomain initially**
3. **Test thoroughly before custom domain**
4. **Set up monitoring and analytics**
5. **Plan production deployment strategy** 