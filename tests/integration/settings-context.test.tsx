/**
 * @file Integration test for SettingsContext with React Query
 * @description Tests the full data flow from API to UI to catch React Query integration issues
 */

import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider, useSettings } from '../../apps/web/contexts/SettingsContext';
import axios from 'axios';
import { toast } from '../../apps/web/hooks/use-toast';

// Mock dependencies
jest.mock('axios');
jest.mock('../../apps/web/hooks/use-toast');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedToast = toast as jest.MockedFunction<typeof toast>;

// Test component that uses the SettingsContext
const TestComponent = () => {
  const { settings, isLoading, error, setSettings } = useSettings();
  
  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="error">{error?.message || 'null'}</div>
      <div data-testid="settings">{JSON.stringify(settings?.account?.name || 'null')}</div>
      <button 
        data-testid="update-name" 
        onClick={() => setSettings(prev => ({
          ...prev,
          account: { ...prev.account, name: 'Updated Name' }
        }))}
      >
        Update Name
      </button>
    </div>
  );
};

// Test wrapper with React Query and Settings providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for faster tests
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        {children}
      </SettingsProvider>
    </QueryClientProvider>
  );
};

describe('SettingsContext Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedToast.mockImplementation(() => {});
  });

  describe('Settings Loading', () => {
    it('should load settings successfully', async () => {
      const mockSettings = {
        account: { name: 'Test User', email: 'test@example.com', role: 'User', timezone: 'UTC' },
        companies: { tracking: [], autoDetect: true, minimumMentions: 3 },
        newsletters: { sources: [], autoSubscribe: true, digestFrequency: 'weekly' },
        ai: { provider: 'anthropic', model: 'claude-sonnet-4-5', temperature: 0.7, maxTokens: 4096, enableEnrichment: true, apiKey: '', anthropicApiKey: '', openaiApiKey: '' },
        email: { provider: 'gmail', connected: false, syncFrequency: '15min', lastSync: null, autoProcess: true, retentionDays: 90 },
        reports: { defaultFormat: 'pdf', includeCharts: true, includeSentiment: true, autoGenerate: { daily: false, weekly: false, monthly: false }, deliveryTime: '09:00', recipients: [] },
        notifications: { email: { enabled: true, criticalOnly: false, dailyDigest: true }, inApp: { enabled: true, soundEnabled: false }, thresholds: { negativeSentiment: -0.5, mentionVolume: 10, competitorMentions: true } },
        api: { keys: [], webhooks: [] },
        privacy: { dataRetention: 365, shareAnalytics: true, allowExport: true },
        appearance: { theme: 'system', accentColor: 'blue', fontSize: 'medium', compactMode: false, showTips: true }
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Initially should be loading
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(screen.getByTestId('settings')).toHaveTextContent('null');

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Settings should be loaded
      expect(screen.getByTestId('settings')).toHaveTextContent('"Test User"');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/settings');
    });

    it('should handle loading errors with retry', async () => {
      const errorMessage = 'Network error';
      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Failed to load settings. Please check your connection.');
      expect(screen.getByTestId('settings')).toHaveTextContent('null');
    });

    it('should handle authentication errors without retry', async () => {
      const authError = {
        response: { status: 401, data: { error: 'Unauthorized' } }
      };
      mockedAxios.get.mockRejectedValue(authError);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Authentication required. Please sign in again.');
      
      // Should not retry on auth errors
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle server errors with proper message', async () => {
      const serverError = {
        response: { status: 500, data: { error: 'Internal Server Error' } }
      };
      mockedAxios.get.mockRejectedValue(serverError);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Server error. Please try again later.');
    });
  });

  describe('Settings State Management', () => {
    it('should update settings state locally', async () => {
      const mockSettings = {
        account: { name: 'Initial Name', email: 'test@example.com', role: 'User', timezone: 'UTC' },
        companies: { tracking: [], autoDetect: true, minimumMentions: 3 },
        newsletters: { sources: [], autoSubscribe: true, digestFrequency: 'weekly' },
        ai: { provider: 'anthropic', model: 'claude-sonnet-4-5', temperature: 0.7, maxTokens: 4096, enableEnrichment: true, apiKey: '', anthropicApiKey: '', openaiApiKey: '' },
        email: { provider: 'gmail', connected: false, syncFrequency: '15min', lastSync: null, autoProcess: true, retentionDays: 90 },
        reports: { defaultFormat: 'pdf', includeCharts: true, includeSentiment: true, autoGenerate: { daily: false, weekly: false, monthly: false }, deliveryTime: '09:00', recipients: [] },
        notifications: { email: { enabled: true, criticalOnly: false, dailyDigest: true }, inApp: { enabled: true, soundEnabled: false }, thresholds: { negativeSentiment: -0.5, mentionVolume: 10, competitorMentions: true } },
        api: { keys: [], webhooks: [] },
        privacy: { dataRetention: 365, shareAnalytics: true, allowExport: true },
        appearance: { theme: 'system', accentColor: 'blue', fontSize: 'medium', compactMode: false, showTips: true }
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      const { getByTestId } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId('loading')).toHaveTextContent('false');
      });

      expect(getByTestId('settings')).toHaveTextContent('"Initial Name"');

      // Update settings locally
      act(() => {
        getByTestId('update-name').click();
      });

      // Should immediately reflect the change
      expect(getByTestId('settings')).toHaveTextContent('"Updated Name"');
    });
  });

  describe('Settings Saving', () => {
    it('should save settings successfully', async () => {
      const mockSettings = {
        account: { name: 'Test User', email: 'test@example.com', role: 'User', timezone: 'UTC' },
        companies: { tracking: [], autoDetect: true, minimumMentions: 3 },
        newsletters: { sources: [], autoSubscribe: true, digestFrequency: 'weekly' },
        ai: { provider: 'anthropic', model: 'claude-sonnet-4-5', temperature: 0.7, maxTokens: 4096, enableEnrichment: true, apiKey: '', anthropicApiKey: '', openaiApiKey: '' },
        email: { provider: 'gmail', connected: false, syncFrequency: '15min', lastSync: null, autoProcess: true, retentionDays: 90 },
        reports: { defaultFormat: 'pdf', includeCharts: true, includeSentiment: true, autoGenerate: { daily: false, weekly: false, monthly: false }, deliveryTime: '09:00', recipients: [] },
        notifications: { email: { enabled: true, criticalOnly: false, dailyDigest: true }, inApp: { enabled: true, soundEnabled: false }, thresholds: { negativeSentiment: -0.5, mentionVolume: 10, competitorMentions: true } },
        api: { keys: [], webhooks: [] },
        privacy: { dataRetention: 365, shareAnalytics: true, allowExport: true },
        appearance: { theme: 'system', accentColor: 'blue', fontSize: 'medium', compactMode: false, showTips: true }
      };

      // Mock successful load
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      // Mock successful save
      mockedAxios.put.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      const SaveTestComponent = () => {
        const { saveSettings, isSaving } = useSettings();
        
        return (
          <div>
            <div data-testid="saving">{isSaving.toString()}</div>
            <button 
              data-testid="save-button" 
              onClick={() => saveSettings()}
            >
              Save Settings
            </button>
          </div>
        );
      };

      const { getByTestId } = render(
        <TestWrapper>
          <SaveTestComponent />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId('saving')).toHaveTextContent('false');
      });

      // Trigger save
      act(() => {
        getByTestId('save-button').click();
      });

      // Should show saving state
      expect(getByTestId('saving')).toHaveTextContent('true');

      await waitFor(() => {
        expect(getByTestId('saving')).toHaveTextContent('false');
      });

      // Should call save API
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/settings', mockSettings);
      
      // Should show success toast
      expect(mockedToast).toHaveBeenCalledWith({
        title: 'Settings saved',
        description: 'All settings saved successfully',
      });
    });

    it('should handle save errors', async () => {
      const mockSettings = {
        account: { name: 'Test User', email: 'test@example.com', role: 'User', timezone: 'UTC' },
        companies: { tracking: [], autoDetect: true, minimumMentions: 3 },
        newsletters: { sources: [], autoSubscribe: true, digestFrequency: 'weekly' },
        ai: { provider: 'anthropic', model: 'claude-sonnet-4-5', temperature: 0.7, maxTokens: 4096, enableEnrichment: true, apiKey: '', anthropicApiKey: '', openaiApiKey: '' },
        email: { provider: 'gmail', connected: false, syncFrequency: '15min', lastSync: null, autoProcess: true, retentionDays: 90 },
        reports: { defaultFormat: 'pdf', includeCharts: true, includeSentiment: true, autoGenerate: { daily: false, weekly: false, monthly: false }, deliveryTime: '09:00', recipients: [] },
        notifications: { email: { enabled: true, criticalOnly: false, dailyDigest: true }, inApp: { enabled: true, soundEnabled: false }, thresholds: { negativeSentiment: -0.5, mentionVolume: 10, competitorMentions: true } },
        api: { keys: [], webhooks: [] },
        privacy: { dataRetention: 365, shareAnalytics: true, allowExport: true },
        appearance: { theme: 'system', accentColor: 'blue', fontSize: 'medium', compactMode: false, showTips: true }
      };

      // Mock successful load
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      // Mock failed save
      const saveError = {
        response: { status: 400, data: { error: 'Invalid data' } }
      };
      mockedAxios.put.mockRejectedValue(saveError);

      const SaveTestComponent = () => {
        const { saveSettings, isSaving } = useSettings();
        
        return (
          <div>
            <button 
              data-testid="save-button" 
              onClick={() => saveSettings()}
            >
              Save Settings
            </button>
          </div>
        );
      };

      const { getByTestId } = render(
        <TestWrapper>
          <SaveTestComponent />
        </TestWrapper>
      );

      // Wait for initial load and trigger save
      await waitFor(() => {
        act(() => {
          getByTestId('save-button').click();
        });
      });

      await waitFor(() => {
        // Should show error toast
        expect(mockedToast).toHaveBeenCalledWith({
          title: 'Save failed',
          description: 'Failed to save settings. Please check your connection.',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty settings response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: null }
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Should still show default/null state
      expect(screen.getByTestId('settings')).toHaveTextContent('null');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });

    it('should handle malformed API response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: false } // Missing settings property
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Should handle gracefully
      expect(screen.getByTestId('settings')).toHaveTextContent('null');
    });
  });
});