# Issue #10: Implement Subscription Management

**Priority:** 🔴 Critical
**Type:** Feature
**Estimated Time:** 20-24 hours
**Sprint:** Core Features Sprint 1

## Description
Build complete subscription management system with free/paid tiers, payment processing, and access control.

## Current State
- No subscription system implemented
- Stripe integration needed
- Access control system required

## Acceptance Criteria
- [ ] Free tier with limited access
- [ ] Multiple paid subscription tiers
- [ ] Stripe integration for payments
- [ ] Subscription lifecycle management
- [ ] Payment method management
- [ ] Invoice generation and history
- [ ] Subscription analytics
- [ ] Grace period for failed payments
- [ ] Cancellation and refund handling
- [ ] Subscriber-only content gating

## Dependencies
**Blocks:** Issue #11 (CMS content gating)
**Blocked by:** Issue #9 (Authentication), Issue #14 (Payment Processing)

## Technical Implementation
1. **Database Schema**
   ```sql
   CREATE TABLE subscriptions (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     stripe_subscription_id TEXT,
     status TEXT, -- active, cancelled, past_due
     tier TEXT, -- free, basic, premium
     current_period_end TIMESTAMP,
     cancel_at_period_end BOOLEAN DEFAULT false
   );

   CREATE TABLE subscription_items (
     id UUID PRIMARY KEY,
     subscription_id UUID REFERENCES subscriptions(id),
     stripe_price_id TEXT,
     quantity INTEGER DEFAULT 1
   );
   ```

2. **API Endpoints**
   ```typescript
   // app/api/subscriptions/
   - GET /api/subscriptions/current
   - POST /api/subscriptions/create
   - POST /api/subscriptions/cancel
   - POST /api/subscriptions/resume
   - PUT /api/subscriptions/update-payment
   ```

3. **Subscription Components**
   ```typescript
   // components/subscription/
   - PricingTable.tsx
   - SubscriptionManager.tsx
   - PaymentMethodForm.tsx
   - InvoiceHistory.tsx
   - UpgradeModal.tsx
   ```

4. **Access Control Hook**
   ```typescript
   export function useSubscription() {
     const { data: subscription } = useSWR('/api/subscriptions/current');

     const hasAccess = (requiredTier: string) => {
       return checkTierAccess(subscription?.tier, requiredTier);
     };

     return { subscription, hasAccess };
   }
   ```

## Human Actions Required
- [ ] **SETUP:** Stripe account and products
- [ ] **PROVIDE:** Stripe API keys
- [ ] **DEFINE:** Subscription tiers and pricing
- [ ] **CONFIGURE:** Webhook endpoints in Stripe
- [ ] **TEST:** Payment flows with test cards

## Labels
`feature`, `payments`, `critical`, `monetization`

## Related Files
- `/app/api/subscriptions/`
- `/lib/stripe.ts`
- `/components/subscription/`
- Database migration files