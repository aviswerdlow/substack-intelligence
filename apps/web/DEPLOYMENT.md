# Deployment Information

## Latest Deployment
- **Date**: January 27, 2025
- **Trigger**: Manual redeploy for OAuth configuration update
- **Purpose**: Apply environment variable changes for Gmail OAuth integration

## Environment Variables Required
Make sure the following are set in Vercel Dashboard:
- `NEXT_PUBLIC_APP_URL` - Your Vercel app URL (https://your-app.vercel.app)
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `NEXTAUTH_SECRET` - Secret used to sign NextAuth sessions (min 32 chars)
- `NEXTAUTH_URL` - Base URL for NextAuth callbacks
- `NEXTAUTH_SUPABASE_EDGE_SECRET` - Shared secret used by the Supabase Edge proxy for NextAuth
- `NEXTAUTH_SUPABASE_EDGE_URL` *(optional)* - Override URL for the NextAuth Edge proxy (defaults to `<project>.functions.supabase.co/nextauth-proxy`)
- `NEXTAUTH_SUPABASE_EDGE_FUNCTION_NAME` *(optional)* - Override the deployed function name if it differs from `nextauth-proxy`

## Google OAuth Setup Checklist
- [ ] Gmail API enabled in Google Cloud Console
- [ ] OAuth 2.0 credentials created
- [ ] Authorized JavaScript origins include your Vercel URL
- [ ] Authorized redirect URIs include: `https://your-app.vercel.app/api/auth/gmail/callback`
- [ ] Environment variables set in Vercel Dashboard

## Build Status
- TypeScript compilation: ✅ Fixed
- Database migrations: ⚠️ Some tables pending creation
- OAuth configuration: 🔧 In progress
