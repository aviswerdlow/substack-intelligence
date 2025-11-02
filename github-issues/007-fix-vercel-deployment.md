# Issue #7: Fix Vercel Deployment Configuration

**Priority:** 🔴 Critical
**Type:** Infrastructure
**Estimated Time:** 2-3 hours
**Sprint:** Foundation Sprint

## Description
Resolve Vercel deployment failures caused by package manager conflicts and registry configuration issues.

## Current State
- Deployment failing due to npm registry issues
- Package manager conflicts preventing builds
- Build commands potentially misconfigured

## Acceptance Criteria
- [ ] Vercel deployment succeeds on main branch
- [ ] Preview deployments work for PRs
- [ ] Build settings documented
- [ ] Environment variables configured
- [ ] Deployment monitoring set up

## Dependencies
**Blocks:** All deployment-dependent tasks
**Blocked by:** Issue #1 (Package Manager)
**Related to:** Issue #8 (Environment Config)

## Technical Implementation
1. **Update vercel.json**
   ```json
   {
     "buildCommand": "pnpm build",
     "installCommand": "pnpm install",
     "framework": "nextjs",
     "outputDirectory": ".next"
   }
   ```

2. **Configure environment variables**
   ```bash
   # Required variables
   NEXT_PUBLIC_API_URL
   DATABASE_URL
   NEXTAUTH_URL
   NEXTAUTH_SECRET
   ```

3. **Test deployment**
   ```bash
   vercel --prod
   ```

4. **Set up deployment notifications**
   - Slack/Discord webhooks
   - Email notifications
   - Status page updates

## Human Actions Required
- [ ] **ACCESS:** Vercel project settings
- [ ] **PROVIDE:** Environment variable values
- [ ] **CONFIGURE:** Domain settings if custom domain
- [ ] Test deployment after fixes
- [ ] Set up deployment notifications

## Labels
`infrastructure`, `deployment`, `critical`, `blocker`

## Related Files
- `/vercel.json`
- `/.env.example`
- `/package.json`