import { createServiceRoleClient } from '@substack-intelligence/database';

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
}

export class UserSettingsService {
  private supabase;

  constructor() {
    this.supabase = createServiceRoleClient();
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
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
        console.error('Error fetching user settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserSettings:', error);
      return null;
    }
  }

  async createOrUpdateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings | null> {
    try {
      // First check if settings exist
      const { data: existing } = await this.supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing settings
        const { data, error } = await this.supabase
          .from('user_preferences')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating user settings:', error);
          return null;
        }

        return data;
      } else {
        // Create new settings
        const { data, error } = await this.supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            ...settings
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user settings:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
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
      console.error('Error getting Gmail tokens:', error);
      return null;
    }
  }
}