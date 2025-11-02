# Issue #1: Resolve Package Manager Conflicts and Standardize

**Priority:** 🔴 Critical (Blocker)
**Type:** Infrastructure
**Estimated Time:** 2-3 hours
**Sprint:** Foundation Sprint

## Description
The project currently has conflicting package manager configurations causing deployment failures on Vercel. Multiple lock files exist (npm, yarn, pnpm) and registry configurations are inconsistent.

## Current State
- Multiple lock files present in repository
- `.npmrc` files with custom registry configurations
- Vercel deployment failing due to package resolution issues
- Test artifacts polluting the repository

## Acceptance Criteria
- [ ] Single package manager selected and documented
- [ ] All other lock files removed
- [ ] Package manager configuration cleaned
- [ ] Successfully install dependencies locally
- [ ] Vercel deployment succeeds
- [ ] Team documentation updated with chosen package manager

## Dependencies
**Blocks:** All other development tasks
**Blocked by:** None

## Technical Implementation
1. **Audit current state**
   ```bash
   find . -name "package-lock.json" -o -name "yarn.lock" -o -name "pnpm-lock.yaml"
   find . -name ".npmrc" -o -name ".yarnrc" -o -name ".pnpmrc"
   ```

2. **Choose package manager** (Recommendation: pnpm for monorepo)
   - Remove all lock files except chosen one
   - Remove all rc files with custom registries
   - Update package.json scripts

3. **Clean and reinstall**
   ```bash
   rm -rf node_modules
   rm -rf apps/*/node_modules
   pnpm install  # or chosen package manager
   ```

4. **Update Vercel configuration**
   - Set build command in vercel.json
   - Configure package manager in project settings

## Human Actions Required
- [ ] **DECISION NEEDED:** Choose package manager (npm/yarn/pnpm)
- [ ] **ACCESS NEEDED:** Vercel project settings access
- [ ] Review and approve package manager choice
- [ ] Test deployment on Vercel after fix

## Labels
`infrastructure`, `critical`, `blocker`, `deployment`

## Related Files
- `/vercel.json`
- `/package.json`
- All `.npmrc` files
- All lock files