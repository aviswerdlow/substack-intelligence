#!/bin/bash

# Simple script to create GitHub issues without labels
echo "🚀 Creating GitHub Issues for Substack Clone Pivot..."
echo ""

# Navigate to the github-issues directory
cd github-issues

# Counter
created=0

# Create Issue #1
echo "Creating Issue #1: Package Manager Standardization..."
gh issue create \
  --title "Resolve Package Manager Conflicts and Standardize" \
  --body "$(cat 001-package-manager-standardization.md | tail -n +2)" && ((created++))

# Create Issue #2
echo "Creating Issue #2: Clean Test Artifacts..."
gh issue create \
  --title "Clean Up Test Artifacts and Build Files" \
  --body "$(cat 002-clean-test-artifacts.md | tail -n +2)" && ((created++))

# Create Issue #3
echo "Creating Issue #3: Audit Project Structure..."
gh issue create \
  --title "Audit Current Project Structure and Dependencies" \
  --body "$(cat 003-audit-project-structure.md | tail -n +2)" && ((created++))

# Create Issue #4
echo "Creating Issue #4: Document Current Features..."
gh issue create \
  --title "Document Current Features and Functionality" \
  --body "$(cat 004-document-current-features.md | tail -n +2)" && ((created++))

# Create Issue #5
echo "Creating Issue #5: Research Payload CMS..."
gh issue create \
  --title "Research and Evaluate Payload CMS as Alternative" \
  --body "$(cat 005-research-payload-cms.md | tail -n +2)" && ((created++))

# Create Issue #6
echo "Creating Issue #6: Create Migration Plan..."
gh issue create \
  --title "Create Migration Plan from Current Architecture" \
  --body "$(cat 006-create-migration-plan.md | tail -n +2)" && ((created++))

# Create Issue #7
echo "Creating Issue #7: Fix Vercel Deployment..."
gh issue create \
  --title "Fix Vercel Deployment Configuration" \
  --body "$(cat 007-fix-vercel-deployment.md | tail -n +2)" && ((created++))

# Create Issue #8
echo "Creating Issue #8: Environment Configuration..."
gh issue create \
  --title "Set Up Proper Environment Configuration" \
  --body "$(cat 008-environment-configuration.md | tail -n +2)" && ((created++))

# Create Issue #9
echo "Creating Issue #9: Implement Authentication..."
gh issue create \
  --title "Implement Authentication System" \
  --body "$(cat 009-implement-authentication.md | tail -n +2)" && ((created++))

# Create Issue #10
echo "Creating Issue #10: Subscription Management..."
gh issue create \
  --title "Implement Subscription Management" \
  --body "$(cat 010-implement-subscription-management.md | tail -n +2)" && ((created++))

# Create Issue #11
echo "Creating Issue #11: Content Management System..."
gh issue create \
  --title "Implement Content Management System" \
  --body "$(cat 011-implement-content-management.md | tail -n +2)" && ((created++))

# Create Issue #12
echo "Creating Issue #12: Email Notifications..."
gh issue create \
  --title "Implement Email Notification System" \
  --body "$(cat 012-implement-email-notifications.md | tail -n +2)" && ((created++))

# Create Issue #13
echo "Creating Issue #13: Analytics Tracking..."
gh issue create \
  --title "Set Up Analytics and Tracking" \
  --body "$(cat 013-setup-analytics-tracking.md | tail -n +2)" && ((created++))

# Create Issue #14
echo "Creating Issue #14: Payment Processing..."
gh issue create \
  --title "Implement Payment Processing" \
  --body "$(cat 014-implement-payment-processing.md | tail -n +2)" && ((created++))

# Create Issue #15
echo "Creating Issue #15: Testing Strategy..."
gh issue create \
  --title "Create Comprehensive Testing Strategy" \
  --body "$(cat 015-create-testing-strategy.md | tail -n +2)" && ((created++))

# Create Issue #16
echo "Creating Issue #16: CI/CD Pipeline..."
gh issue create \
  --title "Set Up CI/CD Pipeline" \
  --body "$(cat 016-setup-cicd-pipeline.md | tail -n +2)" && ((created++))

# Create Issue #17
echo "Creating Issue #17: Documentation..."
gh issue create \
  --title "Create Documentation for New Architecture" \
  --body "$(cat 017-create-documentation.md | tail -n +2)" && ((created++))

# Create Issue #18
echo "Creating Issue #18: Security Audit..."
gh issue create \
  --title "Perform Security Audit" \
  --body "$(cat 018-perform-security-audit.md | tail -n +2)" && ((created++))

# Create Issue #19
echo "Creating Issue #19: Performance Optimization..."
gh issue create \
  --title "Optimize Performance and Bundle Sizes" \
  --body "$(cat 019-optimize-performance.md | tail -n +2)" && ((created++))

# Create Issue #20
echo "Creating Issue #20: Monitoring & Error Tracking..."
gh issue create \
  --title "Set Up Monitoring and Error Tracking" \
  --body "$(cat 020-setup-monitoring-error-tracking.md | tail -n +2)" && ((created++))

echo ""
echo "📊 Summary: Created $created issues"
echo "🔗 View your issues at: https://github.com/aviswerdlow/substack-intelligence/issues"