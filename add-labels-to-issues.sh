#!/bin/bash

# Script to add labels to existing GitHub issues
echo "🏷️  Adding labels to GitHub issues..."

# First, create the labels if they don't exist
echo "Creating labels..."
gh label create "infrastructure" --description "Infrastructure and deployment" --color "FFA500" 2>/dev/null
gh label create "critical" --description "Critical priority" --color "FF0000" 2>/dev/null
gh label create "blocker" --description "Blocking other work" --color "B60205" 2>/dev/null
gh label create "feature" --description "New feature" --color "0E8A16" 2>/dev/null
gh label create "security" --description "Security related" --color "D93F0B" 2>/dev/null
gh label create "performance" --description "Performance improvements" --color "FBCA04" 2>/dev/null
gh label create "testing" --description "Testing and quality" --color "006B75" 2>/dev/null
gh label create "documentation" --description "Documentation" --color "0052CC" 2>/dev/null
gh label create "maintenance" --description "Code maintenance" --color "E99695" 2>/dev/null
gh label create "quick-win" --description "Quick wins" --color "7ED321" 2>/dev/null
gh label create "analysis" --description "Analysis and research" --color "5319E7" 2>/dev/null
gh label create "architecture" --description "Architecture decisions" --color "C2E0C6" 2>/dev/null
gh label create "planning" --description "Planning and strategy" --color "BFD4F2" 2>/dev/null
gh label create "deployment" --description "Deployment related" --color "0075CA" 2>/dev/null
gh label create "payments" --description "Payment processing" --color "1D76DB" 2>/dev/null
gh label create "email" --description "Email functionality" --color "C5DEF5" 2>/dev/null
gh label create "cms" --description "Content management" --color "BFD4F2" 2>/dev/null
gh label create "monitoring" --description "Monitoring and observability" --color "FBCA04" 2>/dev/null

echo ""
echo "Adding labels to issues..."

# Add labels to issues
gh issue edit 57 --add-label "infrastructure,critical,blocker"
gh issue edit 58 --add-label "maintenance,quick-win"
gh issue edit 59 --add-label "analysis,documentation,architecture"
gh issue edit 60 --add-label "documentation,analysis"
gh issue edit 61 --add-label "analysis,architecture"
gh issue edit 62 --add-label "planning,architecture"
gh issue edit 63 --add-label "infrastructure,deployment,critical,blocker"
gh issue edit 64 --add-label "infrastructure,security"
gh issue edit 65 --add-label "feature,security,critical"
gh issue edit 66 --add-label "feature,payments,critical"
gh issue edit 67 --add-label "feature,cms,critical"
gh issue edit 68 --add-label "feature,email"
gh issue edit 69 --add-label "feature"
gh issue edit 70 --add-label "feature,payments,critical,security"
gh issue edit 71 --add-label "testing"
gh issue edit 72 --add-label "infrastructure"
gh issue edit 73 --add-label "documentation"
gh issue edit 74 --add-label "security,critical"
gh issue edit 75 --add-label "performance"
gh issue edit 76 --add-label "monitoring,infrastructure"

echo ""
echo "✅ Labels added successfully!"
echo "🔗 View your labeled issues at: https://github.com/aviswerdlow/substack-intelligence/issues"