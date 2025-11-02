#!/bin/bash

# Script to create GitHub issues from markdown templates
# Run with: bash create-github-issues.sh

echo "🚀 Creating GitHub Issues for Substack Clone Pivot..."
echo ""

# Array of issues with their files and labels
declare -a issues=(
  "001-package-manager-standardization.md:infrastructure,critical,blocker,deployment"
  "002-clean-test-artifacts.md:maintenance,cleanup,quick-win"
  "003-audit-project-structure.md:analysis,documentation,architecture"
  "004-document-current-features.md:documentation,analysis,product"
  "005-research-payload-cms.md:research,architecture,decision"
  "006-create-migration-plan.md:planning,architecture,critical-path"
  "007-fix-vercel-deployment.md:infrastructure,deployment,critical,blocker"
  "008-environment-configuration.md:infrastructure,security,configuration"
  "009-implement-authentication.md:feature,authentication,security,critical"
  "010-implement-subscription-management.md:feature,payments,critical,monetization"
  "011-implement-content-management.md:feature,cms,critical,core"
  "012-implement-email-notifications.md:feature,email,engagement"
  "013-setup-analytics-tracking.md:feature,analytics,metrics"
  "014-implement-payment-processing.md:feature,payments,critical,security"
  "015-create-testing-strategy.md:testing,quality,automation"
  "016-setup-cicd-pipeline.md:infrastructure,ci/cd,automation,devops"
  "017-create-documentation.md:documentation,onboarding,maintenance"
  "018-perform-security-audit.md:security,critical,audit,compliance"
  "019-optimize-performance.md:performance,optimization,core-web-vitals"
  "020-setup-monitoring-error-tracking.md:monitoring,operations,infrastructure,observability"
)

# Counter for created issues
created=0
failed=0

# Create each issue
for issue_data in "${issues[@]}"; do
  IFS=':' read -r filename labels <<< "$issue_data"

  if [ -f "github-issues/$filename" ]; then
    # Extract title from the first line
    title=$(grep "^# Issue" "github-issues/$filename" | sed 's/# Issue #[0-9]*: //')

    # Extract body (everything after the title)
    body=$(tail -n +2 "github-issues/$filename")

    echo "Creating issue: $title"
    echo "  Labels: $labels"

    # Create the issue using GitHub CLI
    if gh issue create \
      --title "$title" \
      --body "$body" \
      --label "$labels" 2>/dev/null; then
      echo "  ✅ Created successfully"
      ((created++))
    else
      echo "  ❌ Failed to create"
      ((failed++))
    fi
    echo ""
  else
    echo "⚠️  File not found: github-issues/$filename"
    ((failed++))
  fi
done

echo "📊 Summary:"
echo "  ✅ Issues created: $created"
echo "  ❌ Issues failed: $failed"
echo ""
echo "🔗 View your issues at: https://github.com/aviswerdlow/substack-intelligence/issues"