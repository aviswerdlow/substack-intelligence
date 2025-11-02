#!/bin/bash

# Assign issues to milestones
echo "📋 Assigning issues to milestones..."

# Sprint 0: Foundation (Milestone 1)
gh issue edit 57 --milestone "Sprint 0: Foundation"  # Package Manager
gh issue edit 58 --milestone "Sprint 0: Foundation"  # Clean Artifacts
gh issue edit 63 --milestone "Sprint 0: Foundation"  # Fix Vercel
gh issue edit 64 --milestone "Sprint 0: Foundation"  # Environment Config

# Sprint 1: Analysis & Planning (Milestone 2)
gh issue edit 59 --milestone "Sprint 1: Analysis & Planning"  # Audit Structure
gh issue edit 60 --milestone "Sprint 1: Analysis & Planning"  # Document Features
gh issue edit 61 --milestone "Sprint 1: Analysis & Planning"  # Research Payload
gh issue edit 62 --milestone "Sprint 1: Analysis & Planning"  # Migration Plan

# Sprint 2: Payment Infrastructure (Milestone 3)
gh issue edit 70 --milestone "Sprint 2: Payment Infrastructure"  # Payment Processing
gh issue edit 65 --milestone "Sprint 2: Payment Infrastructure"  # Authentication
gh issue edit 66 --milestone "Sprint 2: Payment Infrastructure"  # Subscriptions

# Sprint 3: Content & Communication (Milestone 4)
gh issue edit 67 --milestone "Sprint 3: Content & Communication"  # CMS
gh issue edit 68 --milestone "Sprint 3: Content & Communication"  # Email
gh issue edit 69 --milestone "Sprint 3: Content & Communication"  # Analytics

# Sprint 4: Quality & Testing (Milestone 5)
gh issue edit 71 --milestone "Sprint 4: Quality & Testing"  # Testing Strategy
gh issue edit 72 --milestone "Sprint 4: Quality & Testing"  # CI/CD
gh issue edit 73 --milestone "Sprint 4: Quality & Testing"  # Documentation

# Sprint 5: Production Readiness (Milestone 6)
gh issue edit 74 --milestone "Sprint 5: Production Readiness"  # Security Audit
gh issue edit 75 --milestone "Sprint 5: Production Readiness"  # Performance
gh issue edit 76 --milestone "Sprint 5: Production Readiness"  # Monitoring

echo "✅ Milestones assigned successfully!"
echo "📊 View project board at: https://github.com/aviswerdlow/substack-intelligence/milestones"