# Quick Deployment Checklist ✅

## Ready to Deploy! 🚀

Your PadelParrot app is ready for staging deployment. Here's your 5-minute checklist:

### ✅ Pre-Deployment (Ready)
- [x] Build passes locally
- [x] Supabase backend configured
- [x] Environment variables documented
- [x] Vercel config created
- [x] Match creation with auto-participant works
- [x] Authentication flow works
- [x] Styling loads correctly

### 🎯 Deploy in 5 Minutes

#### 1. Commit Current State (1 min)
```bash
git add .
git commit -m "Ready for staging deployment"
git push
```

#### 2. Deploy to Vercel (2 mins)
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Select your `padel-parrot` repository
5. **Important**: Set root directory to `apps/web`
6. Click "Deploy"

#### 3. Configure Environment Variables (1 min)
Add in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 4. Update Supabase (1 min)
Add your Vercel URL to Supabase → Authentication → URL Configuration

### 🎉 You'll Get:
- **Free staging URL**: `your-app.vercel.app`
- **Automatic HTTPS**: Secure by default
- **Global CDN**: Fast worldwide
- **Auto-deploys**: Every push to main
- **Preview URLs**: For every PR

### 🔗 Your Environment Variables
Copy these from your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_value_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_value_here
```

### 📱 Post-Deployment Test
1. Visit your new staging URL
2. Test phone authentication
3. Create a test match
4. Verify WhatsApp sharing
5. Test on mobile device

### ⚡ Next Steps After Deployment
- [ ] Custom domain (optional)
- [ ] Set up monitoring
- [ ] Plan production strategy
- [ ] Share staging URL with team

**Total time: 5 minutes** 🚀 