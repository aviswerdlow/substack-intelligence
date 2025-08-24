/**
 * @file Integration test for Settings Page loading states
 * @description Tests that the settings page properly handles loading, error, and success states without hanging
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider } from '../../apps/web/contexts/SettingsContext';
import SettingsPage from '../../apps/web/app/(dashboard)/settings/page';
import axios from 'axios';
import { toast } from '../../apps/web/hooks/use-toast';

// Mock dependencies
jest.mock('axios');
jest.mock('../../apps/web/hooks/use-toast');
jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn(() => Promise.resolve({ id: 'test-user-id' }))
}));

// Mock UI components that might not be available in test environment
jest.mock('../../apps/web/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../apps/web/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

jest.mock('../../apps/web/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

jest.mock('../../apps/web/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../apps/web/components/settings/SettingsAccordionNav', () => ({
  SettingsAccordionNav: () => <div data-testid="settings-nav">Settings Navigation</div>
}));

jest.mock('../../apps/web/components/settings/SettingsTooltips', () => ({
  SettingsTooltips: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('../../apps/web/components/settings/TabSaveControls', () => ({
  TabSaveControls: () => <div data-testid="tab-save-controls">Tab Save Controls</div>
}));

jest.mock('../../apps/web/components/settings/ApiKeyValidator', () => ({
  ApiKeyValidator: () => <div data-testid="api-key-validator">API Key Validator</div>
}));

jest.mock('../../apps/web/components/settings/SettingsOnboardingTour', () => ({
  SettingsOnboardingTour: () => <div data-testid="onboarding-tour">Onboarding Tour</div>
}));

jest.mock('../../apps/web/components/settings/SettingsImportExport', () => ({
  SettingsImportExport: () => <div data-testid="import-export">Import/Export</div>
}));

jest.mock('../../apps/web/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedToast = toast as jest.MockedFunction<typeof toast>;

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
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

describe('Settings Page Loading States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedToast.mockImplementation(() => {});
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching settings', async () => {
      // Create a promise that we can resolve manually
      let resolvePromise: (value: any) => void;
      const loadingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockedAxios.get.mockReturnValue(loadingPromise as any);

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loader2 should have role="status"

      // Should NOT show settings content
      expect(screen.queryByText('Settings Navigation')).not.toBeInTheDocument();

      // Resolve the promise to complete the test
      resolvePromise!({
        data: {
          success: true,
          settings: createMockSettings()
        }
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });
    });

    it('should not hang in loading state when settings are successfully loaded', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          settings: createMockSettings()
        }
      });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Initially shows loading
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show settings content
      expect(screen.getByText('Settings Navigation')).toBeInTheDocument();
      expect(screen.getByText('Tab Save Controls')).toBeInTheDocument();
    });

    it('should show initializing state when settings is null but no error', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          settings: null // Settings is null but no error
        }
      });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Initializing settings...')).toBeInTheDocument();
      });

      // Should show loader
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when settings fail to load', async () => {
      const errorMessage = 'Failed to load settings. Please check your connection.';
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('⚠️ Failed to load settings')).toBeInTheDocument();
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

      // Should NOT show settings content
      expect(screen.queryByText('Settings Navigation')).not.toBeInTheDocument();
    });

    it('should show authentication error with proper message', async () => {
      const authError = {
        response: { status: 401, data: { error: 'Unauthorized' } }
      };
      mockedAxios.get.mockRejectedValueOnce(authError);

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication required. Please sign in again.')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('should show server error with proper message', async () => {
      const serverError = {
        response: { status: 500, data: { error: 'Internal Server Error' } }
      };
      mockedAxios.get.mockRejectedValueOnce(serverError);

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Server error. Please try again later.')).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('should render settings content when loaded successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          settings: createMockSettings()
        }
      });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      // Should show all main settings components
      expect(screen.getByText('Settings Navigation')).toBeInTheDocument();
      expect(screen.getByText('Tab Save Controls')).toBeInTheDocument();
      expect(screen.getByText('Onboarding Tour')).toBeInTheDocument();
      expect(screen.getByText('Import/Export')).toBeInTheDocument();

      // Should NOT show loading or error states
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText('⚠️ Failed to load settings')).not.toBeInTheDocument();
    });

    it('should handle empty settings gracefully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          settings: {
            account: { name: '', email: '', role: 'User', timezone: 'UTC' },
            companies: { tracking: [], autoDetect: true, minimumMentions: 3 },
            // ... other empty sections
          }
        }
      });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      // Should still render the page
      expect(screen.getByText('Settings Navigation')).toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading to success without hanging', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          settings: createMockSettings()
        }
      });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Phase 1: Loading
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText('Settings Navigation')).not.toBeInTheDocument();

      // Phase 2: Loaded
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('Settings Navigation')).toBeInTheDocument();
    });

    it('should transition from loading to error without hanging', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Phase 1: Loading
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();

      // Phase 2: Error
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('⚠️ Failed to load settings')).toBeInTheDocument();
      expect(screen.queryByText('Settings Navigation')).not.toBeInTheDocument();
    });

    it('should not get stuck in infinite loading loop', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          settings: createMockSettings()
        }
      });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Wait with a reasonable timeout to ensure it doesn't hang
      await waitFor(() => {
        expect(screen.getByText('Settings Navigation')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify loading is definitely gone
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      expect(screen.queryByText('Initializing settings...')).not.toBeInTheDocument();
    });
  });
});

// Helper function to create mock settings
function createMockSettings() {
  return {
    account: {
      name: 'Test User',
      email: 'test@example.com',
      role: 'User',
      timezone: 'America/New_York'
    },
    companies: {
      tracking: [],
      autoDetect: true,
      minimumMentions: 3
    },
    newsletters: {
      sources: [],
      autoSubscribe: true,
      digestFrequency: 'weekly'
    },
    ai: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096,
      enableEnrichment: true,
      apiKey: '',
      anthropicApiKey: '',
      openaiApiKey: ''
    },
    email: {
      provider: 'gmail',
      connected: false,
      syncFrequency: '15min',
      lastSync: null,
      autoProcess: true,
      retentionDays: 90
    },
    reports: {
      defaultFormat: 'pdf',
      includeCharts: true,
      includeSentiment: true,
      autoGenerate: {
        daily: false,
        weekly: false,
        monthly: false
      },
      deliveryTime: '09:00',
      recipients: []
    },
    notifications: {
      email: {
        enabled: true,
        criticalOnly: false,
        dailyDigest: true
      },
      inApp: {
        enabled: true,
        soundEnabled: false
      },
      thresholds: {
        negativeSentiment: -0.5,
        mentionVolume: 10,
        competitorMentions: true
      }
    },
    api: {
      keys: [],
      webhooks: []
    },
    privacy: {
      dataRetention: 365,
      shareAnalytics: true,
      allowExport: true
    },
    appearance: {
      theme: 'system' as const,
      accentColor: 'blue',
      fontSize: 'medium' as const,
      compactMode: false,
      showTips: true
    }
  };
}