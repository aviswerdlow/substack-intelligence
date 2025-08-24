import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PipelineStatusWidget } from '../PipelineStatusWidget';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('PipelineStatusWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading States', () => {
    it('shows loading skeleton initially', () => {
      // Mock fetch to never resolve to keep component in loading state
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<PipelineStatusWidget />);

      // Check for loading skeleton elements
      expect(screen.getByText('Configuration Required').closest('.animate-pulse')).toBeInTheDocument();
    });

    it('shows improved loading skeleton with proper structure', () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () => new Promise(() => {})
      );

      render(<PipelineStatusWidget />);

      // Should show animated skeleton with proper structure
      const skeletons = document.querySelectorAll('.animate-pulse .bg-muted');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Error States', () => {
    it('shows configuration error when Gmail OAuth is not set up', async () => {
      // Mock Gmail health check to return configuration error
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (url === '/api/auth/gmail/health') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({
              success: false,
              error: 'Gmail OAuth configuration incomplete',
              details: {
                configurationIssues: true,
                missingEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
                setupInstructions: 'Please configure OAuth credentials'
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<PipelineStatusWidget />);

      await waitFor(() => {
        expect(screen.getByText('Configuration Required')).toBeInTheDocument();
        expect(screen.getByText('Gmail pipeline setup is incomplete. Missing environment variables:')).toBeInTheDocument();
        expect(screen.getByText('GOOGLE_CLIENT_ID')).toBeInTheDocument();
        expect(screen.getByText('GOOGLE_CLIENT_SECRET')).toBeInTheDocument();
      });
    });

    it('shows all missing environment variables in config error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (url === '/api/auth/gmail/health') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({
              success: false,
              details: {
                configurationIssues: true,
                missingEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<PipelineStatusWidget />);

      await waitFor(() => {
        expect(screen.getByText('GOOGLE_CLIENT_ID')).toBeInTheDocument();
        expect(screen.getByText('GOOGLE_CLIENT_SECRET')).toBeInTheDocument();
        expect(screen.getByText('GOOGLE_REFRESH_TOKEN')).toBeInTheDocument();
      });
    });
  });

  describe('Normal Operation', () => {
    const mockHealthResponse = {
      success: true,
      healthy: true,
      details: { emailAddress: 'test@gmail.com' }
    };

    const mockStatusResponse = {
      success: true,
      data: {
        metrics: {
          totalEmails: 100,
          totalCompanies: 50,
          totalMentions: 200,
          recentEmails: 10,
          recentCompanies: 5,
          lastSyncTime: new Date().toISOString()
        },
        health: {
          status: 'healthy',
          suggestedNextSync: new Date(Date.now() + 3600000).toISOString()
        }
      }
    };

    it('displays pipeline status when healthy', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (url === '/api/auth/gmail/health') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHealthResponse)
          } as Response);
        }
        if (url === '/api/pipeline/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatusResponse)
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<PipelineStatusWidget />);

      await waitFor(() => {
        expect(screen.getByText('Fetch Emails')).toBeInTheDocument();
        expect(screen.getByText('Extract Companies')).toBeInTheDocument();
        expect(screen.getByText('Enrich Data')).toBeInTheDocument();
        expect(screen.getByText('Generate Reports')).toBeInTheDocument();
      });
    });

    it('shows correct step statuses based on metrics', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (url === '/api/auth/gmail/health') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHealthResponse)
          } as Response);
        }
        if (url === '/api/pipeline/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ...mockStatusResponse,
              data: {
                ...mockStatusResponse.data,
                metrics: {
                  ...mockStatusResponse.data.metrics,
                  recentEmails: 0, // No recent emails
                  recentCompanies: 0,
                  totalMentions: 0,
                  totalCompanies: 0
                }
              }
            })
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<PipelineStatusWidget />);

      await waitFor(() => {
        // All steps should show as pending when no data
        const pendingSteps = screen.getAllByText(/Fetch Emails|Extract Companies|Enrich Data|Generate Reports/);
        expect(pendingSteps.length).toBe(4);
      });
    });
  });

  describe('Pipeline Triggering', () => {
    const mockHealthResponse = {
      success: true,
      healthy: true,
      details: { emailAddress: 'test@gmail.com' }
    };

    const mockStatusResponse = {
      success: true,
      data: {
        metrics: {
          totalEmails: 100,
          recentEmails: 10,
          recentCompanies: 5,
          totalCompanies: 50,
          totalMentions: 200,
          lastSyncTime: new Date().toISOString()
        },
        health: { status: 'healthy' }
      }
    };

    it('triggers pipeline sync when Run Now button is clicked', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url, options) => {
        if (url === '/api/auth/gmail/health') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHealthResponse)
          } as Response);
        }
        if (url === '/api/pipeline/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatusResponse)
          } as Response);
        }
        if (url === '/api/pipeline/sync' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { status: 'running' }
            })
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<PipelineStatusWidget />);

      await waitFor(() => {
        expect(screen.getByText('Run Now')).toBeInTheDocument();
      });

      const runButton = screen.getByText('Run Now');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Pipeline Started',
          description: 'Intelligence pipeline has been triggered manually.'
        });
      });
    });

    it('handles pipeline trigger errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url, options) => {
        if (url === '/api/auth/gmail/health') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHealthResponse)
          } as Response);
        }
        if (url === '/api/pipeline/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatusResponse)
          } as Response);
        }
        if (url === '/api/pipeline/sync' && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({
              success: false,
              error: 'Pipeline execution failed'
            })
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<PipelineStatusWidget />);

      await waitFor(() => {
        expect(screen.getByText('Run Now')).toBeInTheDocument();
      });

      const runButton = screen.getByText('Run Now');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Pipeline Error',
          description: 'Pipeline execution failed',
          variant: 'destructive'
        });
      });
    });

    it('shows data is fresh message when pipeline is skipped', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url, options) => {
        if (url === '/api/auth/gmail/health') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHealthResponse)
          } as Response);
        }
        if (url === '/api/pipeline/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatusResponse)
          } as Response);
        }
        if (url === '/api/pipeline/sync' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              skipped: true,
              data: { status: 'idle' }
            })
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<PipelineStatusWidget />);

      await waitFor(() => {
        expect(screen.getByText('Run Now')).toBeInTheDocument();
      });

      const runButton = screen.getByText('Run Now');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Data is Fresh',
          description: 'Pipeline data is up-to-date. No sync needed.'
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('shows retry button when status is unavailable', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      render(<PipelineStatusWidget />);

      await waitFor(() => {
        expect(screen.getByText('Pipeline status unavailable')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('handles API errors and shows error toasts', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (url === '/api/auth/gmail/health') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, healthy: true })
          } as Response);
        }
        if (url === '/api/pipeline/status') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ success: false, error: 'Server error' })
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<PipelineStatusWidget />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Pipeline Status Error',
          description: 'API responded with status: 500',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Polling Behavior', () => {
    it('polls for status updates every 5 seconds', async () => {
      const mockHealthResponse = {
        success: true,
        healthy: true,
        details: { emailAddress: 'test@gmail.com' }
      };

      let callCount = 0;
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        callCount++;
        if (url === '/api/auth/gmail/health') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHealthResponse)
          } as Response);
        }
        if (url === '/api/pipeline/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { metrics: {}, health: { status: 'healthy' } }
            })
          } as Response);
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      render(<PipelineStatusWidget />);

      // Initial calls
      await waitFor(() => expect(callCount).toBe(2));

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);

      // Should have made additional calls
      await waitFor(() => expect(callCount).toBe(4));
    });
  });
});