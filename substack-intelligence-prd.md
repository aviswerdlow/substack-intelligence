# Product Requirements Document
## Substack Intelligence Platform for Consumer VC Deal Sourcing

**Version:** 1.0  
**Date:** November 2024  
**Author:** [Your Name]  
**Status:** Draft

---

## Executive Summary

The Substack Intelligence Platform automates the extraction and analysis of company mentions from curated Substack newsletters, transforming a manual 5-hour weekly process into an automated daily intelligence briefing. This system directly addresses the critical venture capital challenge of identifying culturally-relevant consumer brands before competitors, leveraging Substack writers as proxies for cultural zeitgeist.

By systematically processing newsletters from 26 cultural tastemakers, we capture early signals about emerging consumer brands across beauty, fashion, food, beverage, and lifestyle categories. The platform delivers a 95%+ capture rate of mentioned companies, enabling faster investment decisions and preventing missed opportunities.

---

## Problem Statement

### Current State
Consumer venture capital success depends on identifying culturally-resonant brands before they achieve mainstream recognition. Currently, this requires:
- **5 hours weekly** manually reviewing Substack newsletters
- Clicking through to investigate every mentioned company
- Risk of missing mentions due to time constraints
- No systematic way to track mention patterns across publications
- Delayed response to investment opportunities

### The Cultural Intelligence Gap
Substack writers represent the vanguard of cultural commentary. When multiple tastemakers independently mention a brand, it signals product-market-culture fit that traditional data sources miss. However, manually processing this intelligence doesn't scale with the increasing volume of relevant content.

### Business Impact
- **Missed Opportunities**: Unknown number of potential investments overlooked
- **Competitive Disadvantage**: Other firms may act on signals we miss
- **Inefficient Time Allocation**: 5 hours of high-value investor time spent on manual data extraction
- **Pattern Blindness**: Cannot identify cross-publication trends without manual correlation

---

## Solution Overview

An automated email intelligence system that:

1. **Ingests** daily Substack emails from Gmail
2. **Extracts** company mentions using LLM-powered analysis
3. **Enriches** each company with website and funding status
4. **Delivers** a daily PDF digest for review
5. **Tracks** mention patterns over time for trend identification

### Key Innovation
Unlike generic news monitoring, this system understands the unique value of Substack curation. These writers don't just report on companies—they signal cultural relevance through their editorial choices.

---

## User Personas

### Primary User: Consumer VC Investor
- **Goal**: Identify culturally-relevant investment opportunities before competitors
- **Pain Points**: Manual process, missed companies, time inefficiency
- **Technical Skill**: Beginner with automation tools
- **Success Metric**: More qualified conversations with founders

### Secondary Users: Investment Team Members
- **Goal**: Stay informed about cultural trends and emerging brands
- **Usage**: Consume curated intelligence reports
- **Value**: Shared context for investment discussions

---

## Functional Requirements

### 1. Data Ingestion
- **Source**: Gmail account with 26 Substack subscriptions
- **Volume**: 2-3 emails daily
- **Filtering**: Only process emails from `*.substack.com` domains
- **Timing**: Process emails received in last 24 hours

### 2. Company Extraction
- **Primary Entities**: Private companies and startups
- **Secondary Entities**: New ventures from established company executives or serial entrepreneurs
- **Context Capture**: Include surrounding text explaining why company was mentioned
- **Accuracy Target**: 95% recall (miss no more than 5 of 100 companies)

### 3. Entity Enrichment
Each extracted company must include:
- **Company Name**: As mentioned in newsletter
- **Website**: Direct link to company site
- **Description**: What the company does (extracted or researched)
- **Funding Status**: Has the company raised venture capital?
- **Source Context**: Which newsletter mentioned it and why

### 4. Output Generation
- **Format**: PDF document
- **Frequency**: Daily
- **Delivery**: Email to primary user's inbox
- **Structure**:
  - Executive summary of companies found
  - Detailed list organized by newsletter source
  - Companies mentioned in multiple newsletters highlighted
  - New companies (first-time mentions) flagged

### 5. Edge Case Handling
- **Ambiguous Status**: When uncertain if company is private, include with uncertainty flag
- **Multiple Mentions**: Consolidate same company from multiple sources
- **Non-Companies**: Filter out personal brands, defunct companies
- **Context**: Distinguish between positive/negative mentions

---

## Technical Architecture

### High-Level Flow
```
Gmail API → Extract HTML → Clean Text → LLM Analysis → Enrichment → PDF Generation → Email Delivery
```

### Key Components

1. **Gmail Integration**
   - OAuth2 authentication
   - Daily batch processing
   - Search query: `from:substack.com after:{yesterday}`

2. **Content Processing**
   - HTML parsing with BeautifulSoup
   - Article text extraction
   - Remove UI elements and ads

3. **LLM Analysis**
   - Model: GPT-4 or Claude for high accuracy
   - Structured extraction with JSON schema
   - Two-pass approach: extract then verify

4. **Enrichment Pipeline**
   - Web scraping for company websites
   - Basic funding status check
   - Deduplication logic

5. **Report Generation**
   - PDF creation with company profiles
   - Email delivery via Gmail API

---

## Success Metrics

### Primary KPIs
1. **Time Saved**: 5 hours/week → 10 minutes/day (96% reduction)
2. **Coverage Rate**: 95%+ of companies captured
3. **Deal Flow Quality**: Number of companies advancing to diligence

### Secondary Metrics
- False positive rate < 10%
- Report delivery reliability > 99%
- Processing time < 5 minutes per batch
- User engagement with daily reports

### Long-term Success Indicators
- Investment made from platform-sourced lead
- Earlier stage entry compared to historical investments
- Identification of cultural trends before mainstream adoption

---

## Implementation Roadmap

### Phase 1: MVP (Weeks 1-4)
- Gmail API integration
- Basic LLM extraction
- Simple PDF generation
- Daily email delivery

### Phase 2: Enhancement (Weeks 5-8)
- Funding status enrichment
- Deduplication logic
- Multi-mention highlighting
- Executive/founder tracking

### Phase 3: Intelligence (Weeks 9-12)
- Trend detection across time
- Sentiment analysis
- Category clustering
- Weekly trend reports

---

## Risks and Mitigations

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| LLM extraction errors | Medium | High | Two-stage verification, confidence scores |
| Gmail API limits | Low | Medium | Batch processing, caching |
| Substack format changes | Medium | Low | Flexible HTML parsing |

### Business Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Information overload | Medium | Medium | Relevance scoring, filtering |
| Missed cultural context | Low | High | Include full context quotes |
| Competitive intelligence leak | Low | High | Secure storage, access controls |

---

## Future Vision

### 6-Month Horizon
- Sentiment analysis to distinguish hype from genuine endorsement
- Category-specific intelligence (beauty vs. food vs. fashion)
- Integration with CRM for automatic lead creation
- Team collaboration features

### 18-Month Vision
- Expand beyond Substack to podcasts transcripts, YouTube essays
- Predictive modeling of breakout potential
- Automated outreach workflows
- Industry benchmarking and competitive intelligence

### Platform Potential
This infrastructure creates a foundation for broader cultural intelligence:
- Creator economy trend analysis
- Consumer behavior prediction
- Brand partnership opportunities
- Platform-specific virality patterns

---

## Resource Requirements

### Technical Resources
- Development: 1 engineer for 4 weeks
- LLM API costs: ~$50-100/month
- Gmail API: Free tier sufficient
- Hosting: Minimal (serverless functions)

### Maintenance
- Weekly monitoring of extraction accuracy
- Monthly review of missed companies
- Quarterly newsletter source evaluation

---

## Conclusion

The Substack Intelligence Platform transforms cultural commentary into actionable investment intelligence. By automating the extraction of company mentions from trusted tastemakers, we gain systematic access to early signals about emerging consumer brands. This positions us to identify and invest in culturally-resonant companies before they reach mainstream awareness, directly supporting our mission to find the next consumer unicorn.

The platform's success will be measured not just in time saved, but in the quality of investment opportunities surfaced and the competitive advantage gained through systematic cultural intelligence gathering.