import { google, gmail_v1 } from 'googleapis';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { z } from 'zod';
import { parseNewsletterHTML } from './utils/html-parser';
import pMap from 'p-map';
import { GmailMessageSchema } from '@substack-intelligence/shared';
import { axiomLogger } from './utils/logging';
import { redactSensitiveData } from './utils/validation';
import { burstProtection } from './utils/rate-limiting';

interface ProcessedEmail {
  id: string;
  messageId: string;
  subject: string;
  sender: string;
  newsletterName: string;
  html: string;
  text: string;
  receivedAt: Date;
  processedAt: Date;
}

export class GmailConnector {
  private gmail: gmail_v1.Gmail;
  private supabase;
  
  constructor(refreshToken?: string) {
    // Set up OAuth2 client
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    );
    
    // Set refresh token for persistent access
    // Use provided token or fall back to environment variable for backwards compatibility
    auth.setCredentials({
      refresh_token: refreshToken || process.env.GOOGLE_REFRESH_TOKEN!
    });
    
    this.gmail = google.gmail({ version: 'v1', auth });
    this.supabase = createServiceRoleClient();
  }

  async fetchDailySubstacks(daysBack: number = 30): Promise<ProcessedEmail[]> {
    const startTime = Date.now();
    
    try {
      // Check burst protection for expensive Gmail API operations
      const canProceed = await burstProtection.checkBurstLimit(
        'gmail-api',
        'daily-fetch',
        5, // max 5 requests per hour
        '1h'
      );
      
      if (!canProceed) {
        throw new Error('Gmail API rate limit exceeded for daily fetch');
      }
      
      console.log(`Starting Substack email fetch for the past ${daysBack} days...`);
      await axiomLogger.logEmailEvent('fetch_started', {
        operation: 'fetchDailySubstacks',
        daysBack
      });
      
      // Calculate date range for the past N days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      // Build Gmail search query
      const query = [
        'from:substack.com',
        `after:${this.formatGmailDate(startDate)}`,
        `before:${this.formatGmailDate(endDate)}`,
        '-in:spam',
        '-in:trash'
      ].join(' ');
      
      console.log(`Gmail query: ${query}`);
      
      // Fetch all matching messages
      const messages = await this.fetchAllMessages(query);
      console.log(`Found ${messages.length} Substack emails`);
      
      await axiomLogger.logEmailEvent('messages_found', {
        count: messages.length,
        query,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        daysBack
      });

      if (messages.length === 0) {
        return [];
      }
      
      // Process messages with controlled concurrency
      const processed = await pMap(
        messages,
        (msg) => this.processMessage(msg),
        { concurrency: 5 }
      );
      
      // Filter out failed processing
      const successful = processed.filter(Boolean) as ProcessedEmail[];
      console.log(`Successfully processed ${successful.length}/${messages.length} emails`);
      
      await axiomLogger.logEmailEvent('processing_completed', {
        total: messages.length,
        successful: successful.length,
        failed: messages.length - successful.length,
        processingTime: Date.now() - startTime
      });
      
      // Store in Supabase with conflict handling
      if (successful.length > 0) {
        await this.storeEmails(successful);
      }
      
      await axiomLogger.logEmailEvent('fetch_completed', {
        emailsProcessed: successful.length,
        totalTime: Date.now() - startTime
      });
      
      return successful;
      
    } catch (error) {
      console.error('Failed to fetch daily Substack emails:', error);
      
      await axiomLogger.logError(error as Error, {
        operation: 'fetchDailySubstacks',
        processingTime: Date.now() - startTime
      });
      
      throw error;
    }
  }

  private async fetchAllMessages(query: string): Promise<gmail_v1.Schema$Message[]> {
    const messages: gmail_v1.Schema$Message[] = [];
    let nextPageToken: string | undefined;
    let pageCount = 0;
    
    do {
      try {
        const response = await this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 100,
          pageToken: nextPageToken
        });
        
        if (response.data.messages) {
          messages.push(...response.data.messages);
        }
        
        nextPageToken = response.data.nextPageToken || undefined;
        pageCount++;
        
        await axiomLogger.logEmailEvent('gmail_api_page_fetched', {
          page: pageCount,
          messagesInPage: response.data.messages?.length || 0,
          totalMessages: messages.length
        });
        
      } catch (error) {
        await axiomLogger.logError(error as Error, {
          operation: 'fetchAllMessages',
          page: pageCount,
          query
        });
        throw error;
      }
    } while (nextPageToken);
    
    return messages;
  }

  private async processMessage(message: gmail_v1.Schema$Message): Promise<ProcessedEmail | null> {
    const messageStart = Date.now();
    
    try {
      if (!message.id) {
        console.warn('Message missing ID, skipping');
        return null;
      }
      
      // Fetch full message details
      const fullMessage = await this.gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });
      
      const parsed = GmailMessageSchema.parse(fullMessage.data);
      
      // Extract basic information
      const subject = this.getHeader(parsed, 'Subject') || 'No Subject';
      const sender = this.getHeader(parsed, 'From') || 'Unknown Sender';
      const dateHeader = this.getHeader(parsed, 'Date');
      const messageId = this.getHeader(parsed, 'Message-ID') || parsed.id;
      
      // Parse received date
      let receivedAt: Date;
      try {
        receivedAt = dateHeader ? new Date(dateHeader) : new Date();
      } catch {
        receivedAt = new Date();
      }
      
      // Extract newsletter name from sender
      const newsletterName = this.extractNewsletterName(sender);
      
      // Extract HTML and convert to text
      const html = await this.extractHTML(parsed);
      const text = await this.cleanText(html);
      
      // Skip if we couldn't extract meaningful content
      if (!text || text.length < 100) {
        console.warn(`Skipping message ${parsed.id}: insufficient content`);
        
        await axiomLogger.logEmailEvent('message_skipped', {
          messageId: parsed.id,
          reason: 'insufficient_content',
          textLength: text?.length || 0
        });
        
        return null;
      }
      
      const processingTime = Date.now() - messageStart;
      
      await axiomLogger.logEmailEvent('message_processed', {
        messageId: parsed.id,
        newsletterName,
        subject: subject.slice(0, 100),
        textLength: text.length,
        htmlLength: html.length,
        processingTime
      });
      
      return {
        id: parsed.id,
        messageId,
        subject,
        sender,
        newsletterName,
        html,
        text,
        receivedAt,
        processedAt: new Date()
      };
      
    } catch (error) {
      console.error(`Failed to process message ${message.id}:`, error);
      
      await axiomLogger.logError(error as Error, {
        operation: 'processMessage',
        messageId: message.id,
        processingTime: Date.now() - messageStart
      });
      
      return null;
    }
  }

  private extractHTML(message: gmail_v1.Schema$Message): string {
    // First try to get HTML from parts
    if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return this.decodeBase64(part.body.data);
        }
        
        // Check nested parts
        if (part.parts) {
          for (const nestedPart of part.parts) {
            if (nestedPart.mimeType === 'text/html' && nestedPart.body?.data) {
              return this.decodeBase64(nestedPart.body.data);
            }
          }
        }
      }
    }
    
    // Fall back to main body if it's HTML
    if (message.payload?.mimeType === 'text/html' && message.payload.body?.data) {
      return this.decodeBase64(message.payload.body.data);
    }
    
    // Last resort: try plain text
    if (message.payload?.body?.data) {
      return this.decodeBase64(message.payload.body.data);
    }
    
    return '';
  }

  private async cleanText(html: string): Promise<string> {
    if (!html) return '';
    
    try {
      // Use robust HTML parser with multiple fallback strategies
      const text = await parseNewsletterHTML(html);
      
      // Additional validation
      if (text.length < 50) {
        console.warn('Extracted text too short, may indicate parsing issue');
        await axiomLogger.logEmailEvent('html_text_too_short', {
          textLength: text.length,
          htmlLength: html.length
        });
      }
      
      return text;
      
    } catch (error) {
      console.error('HTML parsing failed completely:', error);
      
      await axiomLogger.logEmailEvent('html_parsing_critical_failure', {
        error: error instanceof Error ? error.message : 'Unknown error',
        htmlLength: html.length
      });
      
      // Emergency fallback - this should rarely be reached due to robust parser
      return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  private async storeEmails(emails: ProcessedEmail[]): Promise<void> {
    const storeStart = Date.now();
    
    try {
      console.log(`Storing ${emails.length} emails in database...`);
      
      // Convert to database format with data sanitization
      const dbEmails = emails.map(email => ({
        message_id: email.messageId,
        subject: redactSensitiveData(email.subject),
        sender: redactSensitiveData(email.sender),
        newsletter_name: email.newsletterName,
        received_at: email.receivedAt.toISOString(),
        processed_at: email.processedAt.toISOString(),
        raw_html: redactSensitiveData(email.html),
        clean_text: redactSensitiveData(email.text),
        processing_status: 'completed' as const
      }));
      
      // Upsert emails (insert or update if message_id exists)
      const { data, error } = await this.supabase
        .from('emails')
        .upsert(dbEmails, {
          onConflict: 'message_id',
          ignoreDuplicates: false
        })
        .select('id, message_id');
      
      if (error) {
        console.error('Failed to store emails:', error);
        
        await axiomLogger.logDatabaseEvent('email_storage_failed', {
          error: error.message,
          emailCount: emails.length
        });
        
        throw error;
      }
      
      console.log(`Successfully stored ${data?.length || 0} emails`);
      
      await axiomLogger.logDatabaseEvent('emails_stored', {
        emailCount: emails.length,
        storedCount: data?.length || 0,
        storageTime: Date.now() - storeStart
      });
      
    } catch (error) {
      console.error('Error storing emails in database:', error);
      
      await axiomLogger.logError(error as Error, {
        operation: 'storeEmails',
        emailCount: emails.length,
        storageTime: Date.now() - storeStart
      });
      
      throw error;
    }
  }

  private getHeader(message: gmail_v1.Schema$Message, name: string): string | null {
    const headers = message.payload?.headers || [];
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || null;
  }

  private extractNewsletterName(sender: string): string {
    // Extract newsletter name from sender email
    // e.g., "Morning Brew <crew@morningbrew.com>" -> "Morning Brew"
    const match = sender.match(/^(.+?)\s*<.*@.*substack\.com>/);
    if (match) {
      return match[1].trim();
    }
    
    // Fall back to domain extraction
    const emailMatch = sender.match(/<.*@(.+?)\.substack\.com>/);
    if (emailMatch) {
      return this.titleCase(emailMatch[1].replace(/[-_]/g, ' '));
    }
    
    // Last resort: use full sender
    return sender.split('<')[0].trim() || 'Unknown Newsletter';
  }

  private decodeBase64(data: string): string {
    try {
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } catch (error) {
      console.warn('Failed to decode base64 data:', error);
      return '';
    }
  }

  private formatGmailDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private titleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  // Health check method
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      
      await axiomLogger.logHealthCheck('gmail', 'healthy', {
        emailAddress: response.data.emailAddress
      });
      
      return !!response.data.emailAddress;
    } catch (error) {
      console.error('Gmail connection test failed:', error);
      
      await axiomLogger.logHealthCheck('gmail', 'unhealthy', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
  }

  // Get processing statistics
  async getStats(): Promise<{
    totalEmails: number;
    recentEmails: number;
    topNewsletters: Array<{ name: string; count: number }>;
  }> {
    try {
      const [totalResult, recentResult, topNewsletters] = await Promise.all([
        this.supabase
          .from('emails')
          .select('*', { count: 'exact', head: true }),
        
        this.supabase
          .from('emails')
          .select('*', { count: 'exact', head: true })
          .gte('received_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        this.supabase
          .from('emails')
          .select('newsletter_name')
          .gte('received_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);
      
      // Count newsletters
      const newsletterCounts = (topNewsletters.data || []).reduce((acc, email) => {
        acc[email.newsletter_name] = (acc[email.newsletter_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const sortedNewsletters = Object.entries(newsletterCounts)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 10);
      
      const stats = {
        totalEmails: Number(totalResult.count) || 0,
        recentEmails: Number(recentResult.count) || 0,
        topNewsletters: sortedNewsletters
      };
      
      await axiomLogger.logBusinessMetric('gmail_stats_fetched', 1, stats);
      
      return stats;
      
    } catch (error) {
      console.error('Failed to get Gmail stats:', error);
      
      await axiomLogger.logError(error as Error, {
        operation: 'getStats'
      });
      
      return {
        totalEmails: 0,
        recentEmails: 0,
        topNewsletters: []
      };
    }
  }
}