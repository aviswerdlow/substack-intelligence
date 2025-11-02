# Issue #2: Clean Up Test Artifacts and Build Files

**Priority:** 🟡 High
**Type:** Maintenance
**Estimated Time:** 1 hour
**Sprint:** Foundation Sprint

## Description
Test results and artifacts are currently tracked in git, causing repository bloat and potential merge conflicts. These files should be gitignored.

## Current State
- Test results in `apps/web/test-results/` are tracked
- Video and trace files polluting repository
- Missing proper .gitignore entries

## Acceptance Criteria
- [ ] All test artifacts removed from git tracking
- [ ] .gitignore updated to prevent future tracking
- [ ] Repository cleaned of binary artifacts
- [ ] Git history cleaned (optional, if size is an issue)

## Dependencies
**Blocks:** Issue #3 (Audit Project Structure)
**Blocked by:** Issue #1 (Package Manager)
**Related to:** Issue #15 (Testing Strategy)

## Technical Implementation
1. **Remove test artifacts from tracking**
   ```bash
   git rm -r --cached apps/web/test-results/
   git rm -r --cached "*.webm"
   git rm -r --cached "*.zip"
   ```

2. **Update .gitignore**
   ```gitignore
   # Test artifacts
   test-results/
   .playwright-artifacts*/
   *.webm
   *.zip
   coverage/
   .nyc_output/
   ```

3. **Commit changes**
   ```bash
   git add .gitignore
   git commit -m "chore: remove test artifacts and update gitignore"
   ```

## Human Actions Required
- [ ] Review list of files to be removed
- [ ] Confirm no important files are being deleted
- [ ] Decide if git history cleanup is needed (large repo size)

## Labels
`maintenance`, `cleanup`, `quick-win`

## Related Files
- `/.gitignore`
- `/apps/web/test-results/`
- All .webm and .zip files in repository