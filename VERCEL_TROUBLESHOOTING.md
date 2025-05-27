# Vercel Deployment Troubleshooting Guide

## 🚨 Issue: Deployment Still Failing

Your deployment is failing even with environment variables set. This indicates a deeper configuration issue with how Vercel is handling the monorepo structure.

## 🔧 Solution: Manual Vercel Configuration

### Option 1: Reconfigure Existing Project

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your `padel-parrot` project

2. **Update Project Settings**
   - Go to **Settings** → **General**
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
   - **Development Command**: `npm run dev`

3. **Verify Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Ensure you have:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
     NODE_ENV=production
     ```

4. **Force Redeploy**
   - Go to **Deployments**
   - Click latest deployment → **Redeploy**

### Option 2: Fresh Start (Recommended)

1. **Delete Current Vercel Project**
   - In Vercel dashboard → Settings → General
   - Scroll down → Delete Project

2. **Import Fresh from GitHub**
   - Click "New Project" in Vercel
   - Import your GitHub repository
   - **IMPORTANT**: During setup, set:
     - **Framework**: Next.js
     - **Root Directory**: `apps/web`
   - Click Deploy

3. **Add Environment Variables Immediately**
   - Don't wait for first deployment to finish
   - Go to Settings → Environment Variables
   - Add all required variables

## 🧪 Test Local Build Context

Test if the build works in the same context Vercel would use:

```bash
# From project root (simulate Vercel)
npm install
cd apps/web
npm run build
```

If this fails locally, it will definitely fail on Vercel.

## 🔍 Common Monorepo Issues

### Issue: "Module not found" errors
**Solution**: Make sure all workspace dependencies are properly linked
```bash
npm install
npm run build
```

### Issue: "Cannot resolve" package errors
**Solution**: Ensure all packages in workspace are built
```bash
npm run build
```

### Issue: Build succeeds but deployment fails
**Solution**: Environment variables or Vercel configuration mismatch

## 📋 Verification Checklist

After successful deployment:
- [ ] App loads without errors
- [ ] Authentication works (phone number)
- [ ] Can create matches
- [ ] Supabase connection works
- [ ] WhatsApp sharing functions

## 🆘 Last Resort: Alternative Platforms

If Vercel continues to fail:

### Netlify
1. Connect GitHub repository
2. Build command: `cd apps/web && npm run build && npm run export`
3. Publish directory: `apps/web/out`

### Railway
1. Connect GitHub repository
2. Set root directory: `apps/web`
3. Railway auto-detects Next.js

The simplified `vercel.json` should work better with Vercel's auto-detection! 