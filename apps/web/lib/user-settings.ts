import { createServiceRoleClient } from '@substack-intelligence/database';
import { mapToMissingUserIdColumnError, MissingUserIdColumnError } from './supabase-errors';

export interface UserSettings {
  id?: string;
  user_id: string;
  gmail_connected: boolean;
  gmail_refresh_token?: string | null;
  gmail_access_token?: string | null;
  gmail_token_expiry?: string | null;
  gmail_email?: string | null;
  notifications_enabled: boolean;
  digest_frequency: string;
  created_at?: string;
  updated_at?: string;
  
  // Extended settings
  account_settings?: any;
  newsletter_settings?: any;
  company_settings?: any;
  ai_settings?: any;
  email_settings?: any;
  report_settings?: any;
  privacy_settings?: any;
  appearance_settings?: any;
  notification_settings?: any;
}

export interface ComprehensiveSettings {
  account: {
    name: string;
    email: string;
    role: string;
    timezone: string;
  };
  newsletters: {
    sources: Array<{
      id: string;
      name: string;
      email: string;
      enabled: boolean;
      frequency: string;
    }>;
    autoSubscribe: boolean;
    digestFrequency: string;
  };
  companies: {
    tracking: Array<{
      id: string;
      name: string;
      domain: string;
      keywords: string[];
      enabled: boolean;
    }>;
    autoDetect: boolean;
    minimumMentions: number;
  };
  ai: {
    provider: string;
    model: string;
    apiKey: string;
    anthropicApiKey: string;
    openaiApiKey: string;
    temperature: number;
    maxTokens: number;
    enableEnrichment: boolean;
  };
  email: {
    provider: string;
    connected: boolean;
    syncFrequency: string;
    lastSync: string | null;
    autoProcess: boolean;
    retentionDays: number;
  };
  reports: {
    defaultFormat: string;
    includeCharts: boolean;
    includeSentiment: boolean;
    autoGenerate: {
      daily: boolean;
      weekly: boolean;
      monthly: boolean;
    };
    deliveryTime: string;
    recipients: string[];
  };
  notifications: {
    email: {
      enabled: boolean;
      criticalOnly: boolean;
      dailyDigest: boolean;
    };
    inApp: {
      enabled: boolean;
      soundEnabled: boolean;
    };
    thresholds: {
      negativeSentiment: number;
      mentionVolume: number;
      competitorMentions: boolean;
    };
  };
  api: {
    keys: Array<{
      id: string;
      name: string;
      key: string;
      createdAt: string;
      lastUsed: string | null;
    }>;
    webhooks: Array<{
      id: string;
      url: string;
      events: string[];
      enabled: boolean;
    }>;
  };
  privacy: {
    dataRetention: number;
    shareAnalytics: boolean;
    allowExport: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    showTips: boolean;
  };
}

export class UserSettingsService {
  private supabase;

  constructor() {
    this.supabase = createServiceRoleClient();
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return defaults
          return {
            user_id: userId,
            gmail_connected: false,
            notifications_enabled: true,
            digest_frequency: 'daily'
          };
        }
        const schemaError = mapToMissingUserIdColumnError('user_settings', error);
        if (schemaError) {
          throw schemaError;
        }
        console.error('Error fetching user settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      const schemaError =
        error instanceof MissingUserIdColumnError
          ? error
          : mapToMissingUserIdColumnError('user_settings', error);
      if (schemaError) {
        throw schemaError;
      }
      console.error('Error in getUserSettings:', error);
      return null;
    }
  }

  async getComprehensiveSettings(userId: string): Promise<ComprehensiveSettings | null> {
    try {
      // Get main settings
      const { data: settings, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching comprehensive settings:', error);
        return null;
      }

      // Get related data
      const [
        { data: apiKeys },
        { data: webhooks },
        { data: newsletters },
        { data: trackedCompanies }
      ] = await Promise.all([
        this.supabase
          .from('user_api_keys')
          .select('id, name, key_prefix, created_at, last_used_at')
          .eq('user_id', userId),
        this.supabase
          .from('user_webhooks')
          .select('id, url, events, enabled')
          .eq('user_id', userId),
        this.supabase
          .from('newsletter_sources')
          .select('id, name, email, enabled, frequency')
          .eq('user_id', userId),
        this.supabase
          .from('tracked_companies')
          .select('id, name, domain, keywords, enabled')
          .eq('user_id', userId)
      ]);

      // Build comprehensive settings object
      return {
        account: settings?.account_settings || {
          name: '',
          email: settings?.gmail_email || '',
          role: 'User',
          timezone: 'America/New_York'
        },
        newsletters: {
          sources: newsletters?.map(n => ({
            id: n.id,
            name: n.name,
            email: n.email,
            enabled: n.enabled,
            frequency: n.frequency
          })) || [],
          ...(settings?.newsletter_settings || { autoSubscribe: true, digestFrequency: 'weekly' })
        },
        companies: {
          tracking: trackedCompanies?.map(c => ({
            id: c.id,
            name: c.name,
            domain: c.domain || '',
            keywords: c.keywords || [],
            enabled: c.enabled
          })) || [],
          ...(settings?.company_settings || { autoDetect: true, minimumMentions: 3 })
        },
        ai: settings?.ai_settings || {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          apiKey: '',
          anthropicApiKey: '',
          openaiApiKey: '',
          temperature: 0.7,
          maxTokens: 4096,
          enableEnrichment: true
        },
        email: {
          provider: 'gmail',
          connected: settings?.gmail_connected || false,
          lastSync: settings?.gmail_token_expiry || null,
          ...(settings?.email_settings || { syncFrequency: '15min', autoProcess: true, retentionDays: 90 })
        },
        reports: settings?.report_settings || {
          defaultFormat: 'pdf',
          includeCharts: true,
          includeSentiment: true,
          autoGenerate: { daily: false, weekly: false, monthly: false },
          deliveryTime: '09:00',
          recipients: []
        },
        notifications: settings?.notification_settings || {
          email: { enabled: true, criticalOnly: false, dailyDigest: true },
          inApp: { enabled: true, soundEnabled: false },
          thresholds: { negativeSentiment: -0.5, mentionVolume: 10, competitorMentions: true }
        },
        api: {
          keys: apiKeys?.map(k => ({
            id: k.id,
            name: k.name,
            key: k.key_prefix + '...',
            createdAt: k.created_at,
            lastUsed: k.last_used_at
          })) || [],
          webhooks: webhooks?.map(w => ({
            id: w.id,
            url: w.url,
            events: w.events || [],
            enabled: w.enabled
          })) || []
        },
        privacy: settings?.privacy_settings || {
          dataRetention: 365,
          shareAnalytics: true,
          allowExport: true
        },
        appearance: settings?.appearance_settings || {
          theme: 'system',
          accentColor: 'blue',
          fontSize: 'medium',
          compactMode: false,
          showTips: true
        }
      };
    } catch (error) {
      console.error('Error in getComprehensiveSettings:', error);
      return null;
    }
  }

  async updateComprehensiveSettings(userId: string, settings: Partial<ComprehensiveSettings>): Promise<boolean> {
    try {
      const updates: any = {};
      
      if (settings.account) updates.account_settings = settings.account;
      if (settings.ai) updates.ai_settings = settings.ai;
      if (settings.email) updates.email_settings = settings.email;
      if (settings.reports) updates.report_settings = settings.reports;
      if (settings.notifications) updates.notification_settings = settings.notifications;
      if (settings.privacy) updates.privacy_settings = settings.privacy;
      if (settings.appearance) updates.appearance_settings = settings.appearance;
      
      if (settings.newsletters) {
        updates.newsletter_settings = {
          autoSubscribe: settings.newsletters.autoSubscribe,
          digestFrequency: settings.newsletters.digestFrequency
        };
      }
      
      if (settings.companies) {
        updates.company_settings = {
          autoDetect: settings.companies.autoDetect,
          minimumMentions: settings.companies.minimumMentions
        };
      }

      // Update main settings
      const { error } = await this.supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating comprehensive settings:', error);
        return false;
      }

      // Handle related entities
      if (settings.newsletters?.sources) {
        await this.updateNewsletterSources(userId, settings.newsletters.sources);
      }
      
      if (settings.companies?.tracking) {
        await this.updateTrackedCompanies(userId, settings.companies.tracking);
      }

      return true;
    } catch (error) {
      console.error('Error in updateComprehensiveSettings:', error);
      return false;
    }
  }

  private async updateNewsletterSources(userId: string, sources: any[]) {
    // Delete existing sources
    await this.supabase
      .from('newsletter_sources')
      .delete()
      .eq('user_id', userId);
    
    // Insert new sources
    if (sources.length > 0) {
      const { error } = await this.supabase
        .from('newsletter_sources')
        .insert(sources.map(source => ({
          user_id: userId,
          name: source.name,
          email: source.email,
          enabled: source.enabled,
          frequency: source.frequency
        })));
      
      if (error) {
        console.error('Error updating newsletter sources:', error);
      }
    }
  }

  private async updateTrackedCompanies(userId: string, companies: any[]) {
    // Delete existing tracked companies
    await this.supabase
      .from('tracked_companies')
      .delete()
      .eq('user_id', userId);
    
    // Insert new tracked companies
    if (companies.length > 0) {
      const { error } = await this.supabase
        .from('tracked_companies')
        .insert(companies.map(company => ({
          user_id: userId,
          name: company.name,
          domain: company.domain,
          keywords: company.keywords,
          enabled: company.enabled
        })));
      
      if (error) {
        console.error('Error updating tracked companies:', error);
      }
    }
  }

  async createOrUpdateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings | null> {
    try {
      // First check if settings exist
      const { data: existing, error: existingError } = await this.supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        const schemaError = mapToMissingUserIdColumnError('user_settings', existingError);
        if (schemaError) {
          throw schemaError;
        }
        console.error('Error fetching user settings for update:', existingError);
        return null;
      }

      if (existing) {
        // Update existing settings
        const { data, error } = await this.supabase
          .from('user_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          const schemaError = mapToMissingUserIdColumnError('user_settings', error);
          if (schemaError) {
            throw schemaError;
          }
          console.error('Error updating user settings:', error);
          return null;
        }

        return data;
      } else {
        // Create new settings
        const { data, error } = await this.supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            ...settings
          })
          .select()
          .single();

        if (error) {
          const schemaError = mapToMissingUserIdColumnError('user_settings', error);
          if (schemaError) {
            throw schemaError;
          }
          console.error('Error creating user settings:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      const schemaError =
        error instanceof MissingUserIdColumnError
          ? error
          : mapToMissingUserIdColumnError('user_settings', error);
      if (schemaError) {
        throw schemaError;
      }
      console.error('Error in createOrUpdateUserSettings:', error);
      return null;
    }
  }

  async connectGmail(
    userId: string, 
    refreshToken: string, 
    accessToken: string, 
    email: string, 
    expiryDate?: Date
  ): Promise<boolean> {
    try {
      const settings = await this.createOrUpdateUserSettings(userId, {
        gmail_connected: true,
        gmail_refresh_token: refreshToken,
        gmail_access_token: accessToken,
        gmail_email: email,
        gmail_token_expiry: expiryDate?.toISOString() || null
      });

      return settings !== null;
    } catch (error) {
      const schemaError =
        error instanceof MissingUserIdColumnError
          ? error
          : mapToMissingUserIdColumnError('user_settings', error);
      if (schemaError) {
        throw schemaError;
      }
      console.error('Error connecting Gmail:', error);
      return false;
    }
  }

  async disconnectGmail(userId: string): Promise<boolean> {
    try {
      const settings = await this.createOrUpdateUserSettings(userId, {
        gmail_connected: false,
        gmail_refresh_token: null,
        gmail_access_token: null,
        gmail_email: null,
        gmail_token_expiry: null
      });

      return settings !== null;
    } catch (error) {
      const schemaError =
        error instanceof MissingUserIdColumnError
          ? error
          : mapToMissingUserIdColumnError('user_settings', error);
      if (schemaError) {
        throw schemaError;
      }
      console.error('Error disconnecting Gmail:', error);
      return false;
    }
  }

  async getGmailTokens(userId: string): Promise<{
    refreshToken: string | null;
    accessToken: string | null;
    email: string | null;
  } | null> {
    try {
      const settings = await this.getUserSettings(userId);
      
      if (!settings || !settings.gmail_connected) {
        return null;
      }

      return {
        refreshToken: settings.gmail_refresh_token || null,
        accessToken: settings.gmail_access_token || null,
        email: settings.gmail_email || null
      };
    } catch (error) {
      const schemaError =
        error instanceof MissingUserIdColumnError
          ? error
          : mapToMissingUserIdColumnError('user_settings', error);
      if (schemaError) {
        throw schemaError;
      }
      console.error('Error getting Gmail tokens:', error);
      return null;
    }
  }

  async generateApiKey(userId: string, name: string): Promise<{key: string, id: string} | null> {
    try {
      // Generate a secure API key
      const key = `sk_${userId.slice(0, 8)}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      const keyPrefix = key.slice(0, 8);
      
      // Hash the key for storage
      const keyHash = await this.hashApiKey(key);
      
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .insert({
          user_id: userId,
          name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          permissions: [],
          expires_at: null
        })
        .select()
        .single();

      if (error) {
        console.error('Error generating API key:', error);
        return null;
      }

      return { key, id: data.id };
    } catch (error) {
      console.error('Error in generateApiKey:', error);
      return null;
    }
  }

  async deleteApiKey(userId: string, keyId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', userId)
        .eq('id', keyId);

      if (error) {
        console.error('Error deleting API key:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteApiKey:', error);
      return false;
    }
  }

  async createWebhook(userId: string, url: string, events: string[]): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_webhooks')
        .insert({
          user_id: userId,
          url,
          events,
          enabled: true,
          secret: this.generateWebhookSecret()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating webhook:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in createWebhook:', error);
      return null;
    }
  }

  async deleteWebhook(userId: string, webhookId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_webhooks')
        .delete()
        .eq('user_id', userId)
        .eq('id', webhookId);

      if (error) {
        console.error('Error deleting webhook:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteWebhook:', error);
      return false;
    }
  }

  async toggleWebhook(userId: string, webhookId: string, enabled: boolean): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_webhooks')
        .update({ enabled })
        .eq('user_id', userId)
        .eq('id', webhookId);

      if (error) {
        console.error('Error toggling webhook:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in toggleWebhook:', error);
      return false;
    }
  }

  private async hashApiKey(key: string): Promise<string> {
    // Simple hash for demo - in production, use bcrypt or similar
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateWebhookSecret(): string {
    return 'whsec_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  }
}