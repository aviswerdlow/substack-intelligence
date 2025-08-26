# 🚀 Deployment Instructions for Substack Intelligence Platform

## Quick Deploy to Vercel

Follow these steps to deploy your Substack Intelligence Platform:

### 1. Prerequisites
Make sure you have:
- ✅ A GitHub account with this repository
- ✅ A Vercel account (sign up free at vercel.com)
- ✅ Your environment variables ready (from .env.local)

### 2. Deploy with Vercel (Easiest Method)

#### Option A: One-Click Deploy via GitHub

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Go to Vercel Dashboard**:
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Build Settings**:
   - Framework Preset: `Next.js`
   - Root Directory: `apps/web`
   - Build Command: `cd ../.. && pnpm run build --filter=web`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

4. **Add Environment Variables** (IMPORTANT!):
   
   Click "Environment Variables" and add ALL of these from your .env.local:

   ```
   # Core Services (REQUIRED)
   NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
   NODE_ENV=production
   
   # Supabase (REQUIRED)
   NEXT_PUBLIC_SUPABASE_URL=your-value-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-value-here
   SUPABASE_SERVICE_KEY=your-value-here
   SUPABASE_SERVICE_ROLE_KEY=your-value-here
   NEXT_PUBLIC_SUPABASE_PROJECT_ID=your-value-here
   
   # Clerk Auth (REQUIRED)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-value-here
   CLERK_SECRET_KEY=your-value-here
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
   
   # AI Service (REQUIRED)
   ANTHROPIC_API_KEY=your-value-here
   
   # Gmail Integration (REQUIRED)
   GOOGLE_CLIENT_ID=your-value-here
   GOOGLE_CLIENT_SECRET=your-value-here
   GOOGLE_REFRESH_TOKEN=your-value-here
   
   # Optional Services
   UPSTASH_REDIS_REST_URL=your-value-here
   UPSTASH_REDIS_REST_TOKEN=your-value-here
   ```

5. **Click "Deploy"**!

#### Option B: Deploy via CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy from root directory**:
   ```bash
   cd /Users/aviswerdlow/Downloads/substack-clone
   vercel --prod
   ```

4. **Follow prompts**:
   - Set up and deploy: `Y`
   - Which scope: Select your account
   - Link to existing project: `N` (for first time)
   - Project name: `substack-intelligence` (or your choice)
   - Directory: `./apps/web`
   - Override settings: `N`

5. **Set environment variables**:
   ```bash
   # Set each variable
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   # ... etc for all variables
   ```

### 3. Post-Deployment Configuration

After deployment completes:

1. **Update Clerk Settings**:
   - Go to Clerk Dashboard
   - Add your production URL: `https://your-app.vercel.app`
   - Update redirect URLs

2. **Update Google OAuth**:
   - Go to Google Cloud Console
   - Add authorized redirect URI: `https://your-app.vercel.app/api/auth/gmail/callback`

3. **Update NEXT_PUBLIC_APP_URL**:
   - In Vercel Dashboard → Settings → Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL
   - Redeploy to apply changes

### 4. Testing Your Deployment

Visit your app at: `https://your-app-name.vercel.app`

Test these features:
1. Sign up/Sign in with Clerk
2. Connect Gmail account
3. Run the intelligence pipeline
4. Generate a PDF report

### 5. Custom Domain (Optional)

To add a custom domain:
1. Go to Vercel Dashboard → Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

### 6. Monitoring

Monitor your deployment:
- **Vercel Dashboard**: Check deployment logs, function usage
- **Supabase Dashboard**: Monitor database usage
- **Clerk Dashboard**: View authentication metrics
- **Anthropic Console**: Track AI API usage

## Troubleshooting

### Build Fails
- Check all environment variables are set
- Ensure Node.js 18+ is used
- Check build logs in Vercel

### Authentication Issues
- Verify Clerk keys are correct
- Check redirect URLs match production domain

### Database Issues
- Verify Supabase credentials
- Check if database tables exist (app creates them automatically)

### Gmail Not Working
- Ensure OAuth redirect URIs include your production URL
- Verify refresh token is valid

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables
3. Ensure all external services are configured correctly

## 🎉 Success!

Your Substack Intelligence Platform is now live!

Key URLs:
- App: `https://your-app.vercel.app`
- Dashboard: `https://your-app.vercel.app/dashboard`
- Reports: `https://your-app.vercel.app/reports`