# Supabase Setup Instructions

## Problem
Your current Supabase credentials in `.env.local` are invalid placeholders. You need real Supabase credentials to connect to the database.

## Solution: Create a Free Supabase Cloud Project

### Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project" 
3. Sign up with GitHub, Google, or email
4. Create a new project (free tier is sufficient)
5. Choose a project name (e.g., "substack-intelligence")
6. Set a strong database password (save this!)
7. Select a region close to you
8. Wait for project to provision (~2 minutes)

### Step 2: Get Your Credentials
Once your project is ready:
1. Go to Settings (gear icon) → API
2. You'll see:
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **anon/public key**: A long JWT token (300+ characters) starting with `eyJ...`
   - **service_role key**: Another long JWT token (300+ characters) starting with `eyJ...`

### Step 3: Update Your .env.local Files
Replace the placeholder values in BOTH files:
- `/Users/aviswerdlow/Downloads/substack-clone/.env.local`
- `/Users/aviswerdlow/Downloads/substack-clone/apps/web/.env.local`

```env
# Replace these with your real values from Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (your long anon key)
SUPABASE_SERVICE_KEY=eyJ... (your long service role key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (same as service key)
NEXT_PUBLIC_SUPABASE_PROJECT_ID=[your-project-id]
```

### Step 4: Run Database Migrations
1. In Supabase Dashboard, go to SQL Editor
2. Click "New Query"
3. Copy and paste the contents of these files in order:
   - `/Users/aviswerdlow/Downloads/substack-clone/supabase/migrations/001_initial_schema.sql`
   - `/Users/aviswerdlow/Downloads/substack-clone/supabase/migrations/002_reports_schema.sql`
   - `/Users/aviswerdlow/Downloads/substack-clone/supabase/migrations/003_add_enrichment_columns.sql`
   - `/Users/aviswerdlow/Downloads/substack-clone/supabase/migrations/004_semantic_search_function.sql`
4. Run each migration

### Step 5: Restart Your Development Server
```bash
cd /Users/aviswerdlow/Downloads/substack-clone
pnpm dev
```

### Step 6: Verify Connection
Visit http://localhost:3000/api/health to confirm database connection is working.

## Alternative: Local Development with Docker
If you prefer local development:
1. Install Docker Desktop from https://www.docker.com/products/docker-desktop/
2. Start Docker Desktop
3. Run `npx supabase start` in the project directory
4. Use the local credentials it provides

## Current Invalid Credentials (To Replace)
- URL: `https://duguxnitihhaggjlbmad.supabase.co` ❌
- Anon Key: `sb_publishable_hrrUxsArHJcMpNrOi1NY7g_9PLm9a1G` ❌ (too short)
- Service Key: `sb_secret_URV-wqNz8nvTbeGLUQMBrA_m5YGTS2m` ❌ (too short)

Valid Supabase keys should be JWT tokens ~300+ characters long!