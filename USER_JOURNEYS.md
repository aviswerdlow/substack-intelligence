# User Journey Maps

**Version:** 1.0
**Last Updated:** 2025-11-02
**Purpose:** Document all user flows and interaction patterns in the Substack Intelligence platform

---

## Table of Contents

1. [User Personas](#user-personas)
2. [New User Onboarding](#new-user-onboarding)
3. [Investor Daily Workflow](#investor-daily-workflow)
4. [Company Discovery Journey](#company-discovery-journey)
5. [Report Management Journey](#report-management-journey)
6. [Settings & Customization Journey](#settings--customization-journey)
7. [Error Recovery Journeys](#error-recovery-journeys)

---

## User Personas

### Primary Persona: Sarah - Consumer VC Investor

**Demographics:**
- Age: 32
- Role: Associate at Consumer-focused VC fund
- Experience: 5 years in venture capital
- Tech proficiency: High

**Goals:**
- Discover culturally-relevant investment opportunities early
- Stay ahead of competitors in identifying trends
- Build deal flow from newsletter insights
- Track emerging consumer brands

**Pain Points:**
- Information overload from 50+ newsletters
- Manual tracking of company mentions
- Missing important signals in newsletters
- Time-consuming research process

**Usage Pattern:**
- Checks dashboard daily in morning (30 minutes)
- Reviews weekly reports thoroughly (60 minutes)
- Deep dives on interesting companies (as needed)
- Shares insights with investment team

---

### Secondary Persona: Michael - Senior Partner

**Demographics:**
- Age: 45
- Role: Managing Partner
- Experience: 20 years in VC
- Tech proficiency: Medium

**Goals:**
- Stay informed on portfolio and market trends
- Consume curated intelligence without manual work
- Validate investment hypotheses
- Monitor competition and market sentiment

**Pain Points:**
- Limited time for detailed research
- Prefers digest format over raw data
- Needs high-level insights quickly

**Usage Pattern:**
- Reviews email reports (15 minutes, 2-3x/week)
- Occasional dashboard check (monthly)
- Relies on team for deep analysis

---

### Tertiary Persona: Alex - Investment Analyst

**Demographics:**
- Age: 26
- Role: Junior Analyst
- Experience: 2 years
- Tech proficiency: Very high

**Goals:**
- Build comprehensive company profiles
- Track sentiment across sources
- Support deal sourcing efforts
- Generate insights for senior team

**Pain Points:**
- Manual data entry
- Scattered information sources
- Difficulty proving cultural relevance

**Usage Pattern:**
- Daily deep dives (2-3 hours)
- Exports data for further analysis
- Creates custom tracking lists
- Manages todos for research tasks

---

## New User Onboarding

### Journey: First-Time Setup

**User Goal:** Get the platform set up and receive first intelligence report

**Touchpoints:** Sign-up page → Gmail auth → Dashboard → First sync

---

#### Step 1: Account Creation

**Entry Point:** Landing page or direct link

**Actions:**
1. User lands on homepage (/)
2. Clicks "Sign Up" button
3. Redirected to Clerk sign-up page (/sign-up)
4. Chooses sign-up method:
   - Email + password, OR
   - Google OAuth (recommended)
5. Completes Clerk registration flow
6. Email verification (if email/password)

**Success Criteria:**
- Account created in Clerk
- User record in database
- Session established

**Potential Issues:**
- Email already registered → Show error, link to sign-in
- Verification email not received → Resend option
- OAuth permission denied → Fallback to email/password

**Duration:** 2-3 minutes

---

#### Step 2: Gmail Connection

**Entry Point:** Redirect after sign-up → Dashboard with onboarding modal

**Actions:**
1. Dashboard loads with "Welcome" modal
2. Modal explains Gmail connection requirement
3. User clicks "Connect Gmail"
4. Gmail OAuth flow initiated:
   - Opens Google consent screen
   - User selects Google account
   - User grants Gmail read permissions
   - Redirected back to app with auth code
5. App exchanges code for tokens
6. Tokens encrypted and stored
7. Connection verified
8. Success message displayed

**Success Criteria:**
- Gmail tokens stored in `user_settings.gmail_tokens`
- `user_settings.gmail_connected` = true
- `user_settings.gmail_email` captured
- Connection health check passes

**Potential Issues:**
- User denies permissions → Show explanation of why needed, retry button
- Token exchange fails → Error message, retry option
- Invalid scopes → Clear error, re-initiate flow with correct scopes
- User connects wrong Gmail account → Show connected email, option to reconnect

**Duration:** 1-2 minutes

**UI Elements:**
- Progress indicator
- Clear permission explanation
- Security badges (encryption, privacy)

---

#### Step 3: Initial Email Sync

**Entry Point:** Automatic after Gmail connection, or manual "Sync Now" button

**Actions:**
1. User clicks "Start First Sync" (or automatic)
2. Pipeline status widget shows "Fetching emails..."
3. Backend triggers `/api/pipeline/sync`:
   - State changes to "fetching"
   - Gmail API called for past 30 days
   - Filters: `from:substack.com`
   - Emails saved to database
   - Progress bar updates in real-time
4. State changes to "extracting"
5. Claude extraction runs on each email:
   - Progress: "Processing email 5 of 23..."
   - Companies extracted and saved
6. State changes to "complete"
7. Dashboard updates with new data:
   - Stats widget shows totals
   - Recent companies appear
   - Activity feed populated

**Success Criteria:**
- At least 1 email fetched
- At least 1 company extracted
- Dashboard shows fresh data
- No pipeline errors

**Potential Issues:**
- No Substack emails found → Show message, suggest checking other email accounts
- Gmail quota exceeded → Rate limit error, suggest waiting or reducing date range
- Claude API error → Retry logic kicks in, show "Processing with retries..."
- All extractions fail → Show error, offer to contact support

**Duration:** 5-15 minutes (depending on email volume)

**UI Elements:**
- Real-time progress bar
- Live status messages
- Estimated time remaining
- "Cancel" option for long syncs

---

#### Step 4: Onboarding Tour

**Entry Point:** After first sync completes

**Actions:**
1. Confetti animation (celebrate first sync!)
2. Interactive tour begins:
   - **Stop 1:** Dashboard Stats
     - "This shows your intelligence metrics"
     - Highlights key numbers
   - **Stop 2:** Recent Companies
     - "Here are companies we discovered"
     - Shows example company card
   - **Stop 3:** Quick Actions
     - "Manually trigger syncs or reports here"
   - **Stop 4:** System Status
     - "Monitor pipeline health"
   - **Stop 5:** Settings
     - "Customize your preferences"
3. User can skip tour or go step-by-step
4. Tour completion tracked

**Success Criteria:**
- User understands dashboard layout
- User knows how to trigger manual sync
- User aware of settings customization

**Duration:** 2-3 minutes (if completed)

**UI Elements:**
- Spotlight highlights
- Tooltips with arrows
- "Next" / "Skip" buttons
- Progress dots (5 steps)

---

#### Step 5: First Report Setup

**Entry Point:** Settings page → Reports tab

**Actions:**
1. User navigates to Settings → Reports
2. Sees report frequency options:
   - Daily (default 6 AM)
   - Weekly (Monday default)
   - Monthly (1st of month default)
3. User configures:
   - Report frequency: Daily ✓
   - Delivery time: 7:00 AM
   - Timezone: Auto-detected (America/New_York)
   - Include PDF: ✓
   - Additional recipients: (optional)
4. Clicks "Save Report Settings"
5. Confirmation: "Daily reports will arrive at 7:00 AM EST"
6. Option to "Generate Test Report Now"

**Success Criteria:**
- Report schedule saved to database
- User receives test report email (if requested)
- Cron job scheduled for daily delivery

**Potential Issues:**
- Invalid email for additional recipients → Validation error
- Timezone detection fails → Manual dropdown selection
- Test report generation fails → Error message, link to support

**Duration:** 2-3 minutes

---

### Onboarding Completion Metrics

**Success Indicators:**
- Gmail connected: 100% required
- First sync completed: 100% required
- At least 1 company extracted: 90% (some users may have no Substack emails)
- Tour viewed: 50% (optional)
- Report scheduled: 30% (many wait to see data first)

**Completion Time:**
- Fast path (skip tour): 10-15 minutes
- Complete path (full tour): 15-20 minutes

**Drop-off Points to Monitor:**
1. Gmail permission denial (Step 2) - Biggest drop-off
2. No emails found (Step 3) - Second biggest
3. First sync errors (Step 3)

---

## Investor Daily Workflow

### Journey: Morning Intelligence Review

**User Goal:** Quickly review new companies and trends before daily work begins

**Frequency:** Daily (weekday mornings)

**Duration:** 15-30 minutes

---

#### Step 1: Email Report Arrival

**Entry Point:** User's inbox at 7:00 AM

**Actions:**
1. User receives "Daily Intelligence Report" email
2. Email contains:
   - Summary stats (X new companies, Y mentions)
   - Top 5 companies by mentions
   - Sentiment breakdown
   - Notable trends
   - PDF attachment with full details
3. User scans email in inbox preview
4. Decides to:
   - Read in email (quick scan), OR
   - Download PDF (deep dive), OR
   - Click "View in Dashboard" link

**Success Criteria:**
- Email delivered successfully
- Email opened (tracking pixel)
- At least one link clicked

**User Mental Model:**
- "What's new and interesting today?"
- "Any companies I should research?"
- "Are there trending themes?"

---

#### Step 2: Dashboard Review

**Entry Point:** Direct navigation to /dashboard or click from email

**Actions:**
1. User arrives at dashboard
2. Sees "Data Freshness" indicator: "Updated 32 minutes ago"
3. Scans Dashboard Stats widget:
   - Notes total companies (growing over time)
   - Checks new companies today
4. Reviews Recent Companies widget:
   - Sorted by mention count (descending)
   - Each card shows:
     - Company name
     - Description (one line)
     - Mention count badge
     - Newsletter diversity badge
     - Sentiment indicator
5. User identifies interesting companies
6. Clicks on company name to see details

**Success Criteria:**
- Dashboard loads in <2 seconds
- Data is fresh (synced this morning)
- At least 1 new company visible

**User Mental Model:**
- "Quick pulse check on what's trending"
- "Anything jump out as investment-worthy?"

**Duration:** 3-5 minutes

---

#### Step 3: Company Deep Dive

**Entry Point:** Click company name from Recent Companies widget

**Actions:**
1. Company detail modal/page opens
2. User sees comprehensive view:
   - Company name and description
   - Website link (opens in new tab)
   - Funding status (if known)
   - Industry tags
   - First seen date
   - Total mentions across all newsletters
   - Newsletter diversity score
3. **Mentions Section:**
   - List of all mentions with:
     - Newsletter source
     - Date mentioned
     - Context snippet (why mentioned)
     - Sentiment badge
     - Confidence score
4. User reads context to understand why company is interesting
5. User clicks website to visit company
6. User may click "Find Similar Companies" to see related opportunities

**Success Criteria:**
- All company data loads correctly
- Context snippets are meaningful
- Website link works
- Similar companies found (if available)

**User Mental Model:**
- "Why is this company being mentioned?"
- "What's the cultural signal here?"
- "Is this investment-worthy?"
- "Who else is talking about this?"

**Actions User May Take:**
1. Visit company website
2. Add company to "Tracked Companies" in settings
3. Create a todo: "Research [Company Name]"
4. Export company data for investment memo
5. Share with team (copy link)

**Duration:** 5-10 minutes per company

---

#### Step 4: Todo Management

**Entry Point:** Dashboard → Todo Widget or `/dashboard/todos`

**Actions:**
1. User sees active todos from yesterday:
   - "Research Brand X" (Priority: High, Due: Today)
   - "Follow up with Brand Y founder" (Priority: Medium, Due: Tomorrow)
2. User adds new todo:
   - Clicks "+ New Todo"
   - Title: "Deep dive on Brand Z from today's report"
   - Priority: High
   - Due date: Today
   - Category: Research
   - Tags: consumer, dtc
3. User completes yesterday's todos:
   - Checks off "Research Brand X"
   - Completion timestamp recorded
4. User reorders todos by dragging (priority order)

**Success Criteria:**
- Todos saved successfully
- Completed todos archived
- Todo stats updated

**User Mental Model:**
- "What research tasks do I need to do?"
- "What's on my plate for today?"

**Duration:** 3-5 minutes

---

#### Step 5: Analytics Check (Weekly)

**Entry Point:** Dashboard → Analytics page (every Monday)

**Actions:**
1. User navigates to /dashboard/analytics
2. Reviews weekly trends:
   - **Mention Volume Chart:** Line graph showing mentions over past 7 days
   - **Top Companies:** Bar chart of most-mentioned companies
   - **Sentiment Distribution:** Pie chart (60% positive, 30% neutral, 10% negative)
   - **Funding Stage Breakdown:** Shows where interest is (seed-stage trending)
3. User filters to specific date range (past week)
4. User exports chart data as CSV for weekly team meeting
5. User identifies trend: "DTC brands getting more attention"

**Success Criteria:**
- Charts render with accurate data
- Export successfully downloads
- User gains actionable insights

**User Mental Model:**
- "What are the meta-trends this week?"
- "What should I tell the team?"
- "Where should we focus our sourcing?"

**Duration:** 10-15 minutes

---

### Daily Workflow Summary

**Total Time:** 15-30 minutes
**Frequency:** Daily (weekdays)
**Peak Usage:** 7:00 AM - 10:00 AM

**Key Success Metrics:**
- Daily email open rate: >70%
- Dashboard daily active users: >60%
- Avg companies reviewed per session: 3-5
- Avg todos created per day: 1-2

---

## Company Discovery Journey

### Journey: From Newsletter Mention to Investment Memo

**User Goal:** Discover a company mentioned in newsletters and evaluate for investment

**Trigger:** Company appears in daily report or dashboard

**Duration:** 1-7 days (multi-session)

---

#### Session 1: Initial Discovery (Day 1, Morning)

**Entry Point:** Dashboard Recent Companies widget

**Actions:**
1. User sees "GreenBottle Co." in recent companies
2. Mention count: 3 (impressive for new company)
3. Newsletter diversity: 3 (mentioned in 3 different newsletters)
4. Sentiment: Positive
5. User clicks to see details

**Outcome:** Interest piqued

---

#### Session 2: Context Review (Day 1, Morning)

**Entry Point:** Company detail page

**Actions:**
1. User reads 3 mention contexts:
   - **Newsletter A:** "GreenBottle Co. is revolutionizing sustainable packaging with their compostable water bottles. Raised $2M seed round."
   - **Newsletter B:** "Spotted GreenBottle Co. at Whole Foods—finally a sustainable alternative that doesn't compromise on design."
   - **Newsletter C:** "GreenBottle Co. founder previously at Patagonia. Strong team pedigree in sustainability space."
2. User notes:
   - Product innovation (compostable bottles)
   - Retail traction (Whole Foods)
   - Strong founding team
   - Recent funding (seed stage—perfect for Series A fund)
3. User clicks website link → Opens GreenBottle.co
4. User browses website, watches product video
5. User adds company to "Tracked Companies" in settings
6. User creates todo: "Research GreenBottle Co. - Check if they're fundraising"

**Outcome:** Strong interest, added to tracking

---

#### Session 3: Similar Company Research (Day 1, Afternoon)

**Entry Point:** Company detail page → "Find Similar Companies" button

**Actions:**
1. User clicks "Find Similar Companies"
2. Vector similarity search runs
3. Returns 5 similar companies:
   - SustainaSip (also compostable packaging)
   - EcoVessel (reusable bottles)
   - PlantPack (plant-based packaging)
   - PureFlow (water purification startup)
   - GreenWrap (sustainable food wrapping)
4. User reviews each similar company:
   - Checks funding status
   - Reads contexts
   - Visits websites
5. User realizes GreenBottle is unique in combining compostability + premium design
6. User exports all 6 companies (GreenBottle + 5 similar) as CSV for comparison

**Outcome:** Market landscape mapped, GreenBottle stands out

---

#### Session 4: Sentiment & Trend Analysis (Day 2)

**Entry Point:** Analytics page

**Actions:**
1. User navigates to Analytics
2. Searches for "sustainable packaging" in semantic search
3. Sees trend: Mentions of sustainability increased 40% this quarter
4. Filters to "seed-stage" companies in "sustainability" category
5. Identifies 10 companies in space
6. GreenBottle has highest mention count
7. User creates dashboard bookmark for this query

**Outcome:** Confirmed thesis—sustainability is trending, GreenBottle is leader

---

#### Session 5: Tracking & Alerts (Day 2)

**Entry Point:** Settings → Company Settings

**Actions:**
1. User goes to Settings → Tracked Companies
2. Finds GreenBottle in list (added earlier)
3. Enables alerts: "Notify me when GreenBottle is mentioned again"
4. Sets alert threshold: Any new mention (high sensitivity)
5. Saves settings

**Outcome:** Will receive email alert on next GreenBottle mention

---

#### Session 6: New Mention Alert (Day 5)

**Entry Point:** Email notification

**Actions:**
1. User receives email: "New mention of GreenBottle Co."
2. Email contains:
   - Newsletter: "The Breakthrough"
   - Context: "GreenBottle Co. just launched in Target. 500 stores nationwide. This is the scale-up moment for sustainable packaging."
   - Sentiment: Very Positive
3. User clicks "View in Dashboard"
4. Sees updated mention count: 4 mentions
5. Reads new context—major retail expansion
6. User marks todo as complete: "Research GreenBottle"
7. User creates new todo: "Reach out to GreenBottle founder for intro call"

**Outcome:** Retail traction confirmed, moving to outreach phase

---

#### Session 7: Investment Memo Preparation (Day 7)

**Entry Point:** Export and external tools

**Actions:**
1. User goes to GreenBottle company page
2. Clicks "Export Company Data" → Downloads JSON
3. JSON includes:
   - All mentions with contexts
   - Sentiment breakdown
   - Timeline of mentions
   - Similar companies
   - Website and metadata
4. User copies data into investment memo template
5. User cites newsletters as primary research sources
6. User schedules intro call with founder
7. User updates todo: "Complete investment memo" → Marked complete

**Outcome:** From discovery to qualified lead in 7 days

---

### Company Discovery Success Metrics

**Conversion Funnel:**
1. Company viewed: 100 companies/week
2. Company clicked for details: 30 companies/week (30% CTR)
3. Company tracked: 5 companies/week (17% of clicked)
4. Company researched (todo created): 3 companies/week (60% of tracked)
5. Company exported for memo: 1 company/week (33% of researched)

**Time to Action:**
- Discovery to tracking: Same day
- Discovery to deep research: 1-2 days
- Discovery to outreach: 3-7 days

---

## Report Management Journey

### Journey: Customizing and Consuming Reports

**User Goal:** Receive tailored intelligence reports at the right time and frequency

---

#### Journey 1: Setting Up Weekly Reports

**Entry Point:** Settings → Reports tab

**Actions:**
1. User navigates to /dashboard/settings → Reports tab
2. Sees current settings:
   - Daily reports: Enabled ✓
   - Weekly reports: Disabled ✗
   - Monthly reports: Disabled ✗
3. User wants weekly deep dive for Monday morning
4. User toggles "Weekly Reports" ON
5. User configures:
   - Day: Monday
   - Time: 7:00 AM
   - Timezone: America/New_York (auto-detected)
   - Include PDF: ✓
   - Format: Detailed (vs. Summary)
6. User adds team member email to recipients:
   - Additional Recipients: michael@vcfund.com
7. User clicks "Save Report Settings"
8. Confirmation toast: "Weekly reports will arrive Mondays at 7:00 AM EST"
9. User clicks "Send Test Report Now"
10. Test report email received within 2 minutes
11. User reviews test report, confirms format is good

**Outcome:** Weekly reports configured for self + team

**Duration:** 5 minutes

---

#### Journey 2: Reviewing Report History

**Entry Point:** Dashboard → Reports page

**Actions:**
1. User navigates to /dashboard/reports
2. Sees paginated list of all generated reports:
   - Daily Report - Nov 2, 2025 (Sent to 2 recipients)
   - Daily Report - Nov 1, 2025 (Sent to 2 recipients)
   - Weekly Report - Oct 28, 2025 (Sent to 2 recipients)
3. User clicks on "Weekly Report - Oct 28"
4. Modal shows report details:
   - Generated at: Oct 28, 2025 6:58 AM
   - Recipients: sarah@vcfund.com, michael@vcfund.com
   - Companies included: 23
   - Mentions analyzed: 87
   - Status: Delivered ✓
   - PDF size: 2.3 MB
5. User clicks "Download PDF"
6. PDF downloads, user can review offline
7. User sees delivery log:
   - sarah@vcfund.com: Delivered (Opened Oct 28, 7:15 AM)
   - michael@vcfund.com: Delivered (Opened Oct 28, 9:32 AM)

**Outcome:** Report history accessible, can re-download PDFs

**Duration:** 2-3 minutes

---

#### Journey 3: Generating Ad-Hoc Report

**Entry Point:** Dashboard → Reports page

**Actions:**
1. User wants special report for investor meeting
2. User clicks "Generate Custom Report"
3. Modal appears with options:
   - Date range: Oct 1 - Oct 31 (Last month)
   - Include companies with minimum: 2 mentions
   - Include sentiment: All (Positive, Neutral, Negative)
   - Include industries: Consumer, Retail, DTC
   - Format: Detailed with charts
4. User clicks "Generate Report"
5. Loading spinner: "Generating report... (est. 30 seconds)"
6. Report generated
7. Download link appears
8. User downloads PDF
9. Option to email to additional recipients
10. User enters: "partners@vcfund.com"
11. Email sent

**Outcome:** Custom report created for specific use case

**Duration:** 3-5 minutes

---

## Settings & Customization Journey

### Journey: Personalizing the Experience

**User Goal:** Tailor the platform to individual workflow and preferences

---

#### Journey 1: Adjusting AI Sensitivity

**Entry Point:** Settings → AI Settings

**Actions:**
1. User notices some low-quality companies in reports
2. User goes to Settings → AI Settings
3. Sees "Minimum Confidence Threshold" slider:
   - Current: 0.6 (60%)
   - Range: 0.3 - 0.95
4. User adjusts slider to 0.75 (75%)
5. Help text: "Only companies with 75%+ confidence will appear in reports"
6. User clicks "Save Settings"
7. Confirmation: "Settings saved. New threshold applies to future extractions."

**Outcome:** Higher quality companies in future reports

---

#### Journey 2: Excluding Newsletters

**Entry Point:** Settings → Newsletter Settings

**Actions:**
1. User receives spam from one newsletter
2. User goes to Settings → Newsletters
3. Sees list of all newsletters user is subscribed to:
   - The Breakdown (23 emails) ✓
   - Consumer Insider (18 emails) ✓
   - Startup Weekly (12 emails) ✓
   - Spam Newsletter (5 emails) ✓
4. User unchecks "Spam Newsletter"
5. Confirmation dialog: "Future emails from Spam Newsletter will be ignored. Past data will remain."
6. User confirms

**Outcome:** Spam newsletter excluded from future processing

---

#### Journey 3: API Key Creation for Integration

**Entry Point:** Settings → API Keys

**Actions:**
1. User wants to integrate with internal CRM
2. User goes to Settings → API Keys
3. Clicks "Create API Key"
4. Modal appears:
   - Name: "CRM Integration"
   - Permissions: Read companies, Read mentions
   - Expires: 1 year from now
5. User clicks "Generate Key"
6. API key displayed: sk_live_abc123...
7. Warning: "This key will only be shown once. Store it securely."
8. User copies key
9. User clicks "I've stored the key safely"
10. Key added to list, showing:
    - Name: CRM Integration
    - Prefix: sk_live_abc1...
    - Created: Nov 2, 2025
    - Last used: Never
    - Expires: Nov 2, 2026
11. User tests key in CRM
12. Returns to settings, sees "Last used: Just now"

**Outcome:** API key created for external integration

---

## Error Recovery Journeys

### Journey 1: Gmail Connection Lost

**Trigger:** Token expired or user revoked access

**Entry Point:** Dashboard System Status widget shows "Gmail: Disconnected ⚠️"

**Actions:**
1. User sees red badge on System Status
2. Clicks widget to expand
3. Sees error message: "Gmail connection lost. Please reconnect to continue receiving updates."
4. User clicks "Reconnect Gmail"
5. Gmail OAuth flow initiated (same as onboarding)
6. User grants permissions again
7. Tokens refreshed and stored
8. System Status updates: "Gmail: Connected ✓"
9. User clicks "Sync Now" to catch up on missed emails
10. Sync runs successfully

**Outcome:** Connection restored, no data loss

**Duration:** 2-3 minutes

---

### Journey 2: Extraction Failed

**Trigger:** Claude API error or rate limit

**Entry Point:** Email list shows "Processing Failed" status

**Actions:**
1. User sees failed email in /dashboard/emails
2. Error message: "Extraction failed: AI service temporarily unavailable"
3. User clicks "Retry Extraction"
4. Backend retries with exponential backoff
5. Extraction succeeds on retry
6. Status updates to "Completed ✓"
7. Extracted companies appear in dashboard

**Outcome:** Failed extraction recovered automatically

---

### Journey 3: Report Delivery Failed

**Trigger:** Email bounced or Resend API error

**Entry Point:** Email notification or report history page

**Actions:**
1. User expects morning report but didn't receive it
2. User checks /dashboard/reports
3. Sees "Daily Report - Nov 2" with status "Failed ✗"
4. User clicks on report
5. Error details: "Email bounced: Invalid recipient address michael@oldvcfund.com"
6. User clicks "Update Recipients"
7. Removes old email, adds new: michael@newvcfund.com
8. User clicks "Resend Report"
9. Report successfully delivered
10. Status updates to "Delivered ✓"

**Outcome:** Report delivered after fixing recipient

---

## Journey Success Metrics

### Onboarding Success
- Gmail connection rate: 95%+
- First sync completion: 90%+
- Time to first company: <20 minutes
- 7-day retention: 80%+

### Daily Engagement
- Daily active users: 70%+ of total users
- Email open rate: 70%+
- Dashboard sessions: 1.5/day per user
- Company deep dives: 3-5/session

### Feature Adoption
- Report scheduling: 60% of users
- Todo usage: 40% of users
- Tracked companies: 50% of users
- Analytics usage: 30% of users (weekly)

### Retention & Satisfaction
- 30-day retention: 85%+
- 90-day retention: 75%+
- Weekly active users: 85%+
- Monthly active users: 95%+

---

**End of User Journey Maps**
