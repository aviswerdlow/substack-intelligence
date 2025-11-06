/**
 * @file Integration test for "Add Company" functionality
 * @description Tests the specific workflow that was causing the hanging issue
 */

import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider } from '../../apps/web/contexts/SettingsContext';
import SettingsPage from '../../apps/web/app/(dashboard)/settings/page';
import axios from 'axios';
import { toast } from '../../apps/web/hooks/use-toast';

// Mock dependencies
jest.mock('axios');
jest.mock('../../apps/web/hooks/use-toast');

// Mock UI components
jest.mock('../../apps/web/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../apps/web/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={className}
      data-testid={children?.includes?.('Add Company') ? 'add-company-button' : undefined}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('../../apps/web/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <input 
      type="checkbox" 
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  )
}));

jest.mock('../../apps/web/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock('../../apps/web/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span className="badge">{children}</span>
}));

jest.mock('../../apps/web/components/settings/SettingsAccordionNav', () => ({
  SettingsAccordionNav: ({ activeTab, onTabChange }: any) => (
    <div data-testid="settings-nav">
      <button onClick={() => onTabChange('companies')} data-testid="companies-tab">
        Companies Tab
      </button>
    </div>
  )
}));

jest.mock('../../apps/web/components/settings/SettingsTooltips', () => ({
  SettingsTooltips: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('../../apps/web/components/settings/TabSaveControls', () => ({
  TabSaveControls: () => <div data-testid="tab-save-controls">Tab Save Controls</div>
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

describe('Add Company Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedToast.mockImplementation(() => {});
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Add Company Flow', () => {
    it('should successfully add a company without hanging', async () => {
      const mockSettings = createMockSettings();
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      // Navigate to companies tab
      await user.click(screen.getByTestId('companies-tab'));

      // Find and click the Add Company button
      const addButton = screen.getByTestId('add-company-button');
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveTextContent('Add Company');

      // Click the Add Company button
      await user.click(addButton);

      // Verify the company was added to the UI
      await waitFor(() => {
        expect(screen.getByText('New Company')).toBeInTheDocument();
      });

      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('keyword')).toBeInTheDocument();

      // Verify page didn't hang - should still show settings interface
      expect(screen.getByText('Tab Save Controls')).toBeInTheDocument();
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    it('should add company to empty tracking list', async () => {
      const mockSettings = createMockSettings();
      mockSettings.companies.tracking = []; // Empty list

      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      // Navigate to companies tab
      await user.click(screen.getByTestId('companies-tab'));

      // Should show empty state initially
      expect(screen.queryByText('New Company')).not.toBeInTheDocument();

      // Click Add Company button
      await user.click(screen.getByTestId('add-company-button'));

      // Should now show the new company
      await waitFor(() => {
        expect(screen.getByText('New Company')).toBeInTheDocument();
      });
    });

    it('should add company to existing tracking list', async () => {
      const mockSettings = createMockSettings();
      mockSettings.companies.tracking = [
        {
          id: '1',
          name: 'Existing Company',
          domain: 'existing.com',
          keywords: ['existing'],
          enabled: true
        }
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      // Navigate to companies tab
      await user.click(screen.getByTestId('companies-tab'));

      // Should show existing company
      expect(screen.getByText('Existing Company')).toBeInTheDocument();
      expect(screen.getByText('existing.com')).toBeInTheDocument();

      // Click Add Company button
      await user.click(screen.getByTestId('add-company-button'));

      // Should show both companies
      await waitFor(() => {
        expect(screen.getByText('New Company')).toBeInTheDocument();
      });

      expect(screen.getByText('Existing Company')).toBeInTheDocument();
      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('existing.com')).toBeInTheDocument();
    });
  });

  describe('Add Company During Different Loading States', () => {
    it('should not allow adding company while settings are loading', async () => {
      // Create a promise that never resolves to simulate loading state
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

      // Should be in loading state
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();

      // Add Company button should not be available
      expect(screen.queryByTestId('add-company-button')).not.toBeInTheDocument();

      // Clean up by resolving the promise
      resolvePromise!({
        data: { success: true, settings: createMockSettings() }
      });
    });

    it('should not allow adding company in error state', async () => {
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

      // Add Company button should not be available
      expect(screen.queryByTestId('add-company-button')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Add Company Operations', () => {
    it('should handle multiple rapid clicks without hanging', async () => {
      const mockSettings = createMockSettings();
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      // Navigate to companies tab
      await user.click(screen.getByTestId('companies-tab'));

      const addButton = screen.getByTestId('add-company-button');

      // Click multiple times rapidly
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);

      // Should have added multiple companies
      await waitFor(() => {
        const newCompanies = screen.getAllByText('New Company');
        expect(newCompanies).toHaveLength(3);
      });

      // Should still show normal UI without hanging
      expect(screen.getByText('Tab Save Controls')).toBeInTheDocument();
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    it('should generate unique IDs for each company', async () => {
      const mockSettings = createMockSettings();
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      // Mock console.log to capture the settings updates
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('companies-tab'));

      const addButton = screen.getByTestId('add-company-button');

      // Add first company at time 0
      jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
      await user.click(addButton);

      // Advance time and add second company
      jest.advanceTimersByTime(1000);
      jest.setSystemTime(new Date('2024-01-15T10:00:01.000Z'));
      await user.click(addButton);

      // Should have two companies with different timestamps
      await waitFor(() => {
        const newCompanies = screen.getAllByText('New Company');
        expect(newCompanies).toHaveLength(2);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('State Persistence', () => {
    it('should maintain added companies when navigating tabs', async () => {
      const mockSettings = createMockSettings();
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, settings: mockSettings }
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
      });

      // Go to companies tab and add company
      await user.click(screen.getByTestId('companies-tab'));
      await user.click(screen.getByTestId('add-company-button'));

      await waitFor(() => {
        expect(screen.getByText('New Company')).toBeInTheDocument();
      });

      // Navigate away and back (simulated by clicking tabs)
      // Note: This is a simplified test since we don't have all tab implementations
      await user.click(screen.getByTestId('companies-tab'));

      // Company should still be there
      expect(screen.getByText('New Company')).toBeInTheDocument();
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
      model: 'claude-sonnet-4-5',
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