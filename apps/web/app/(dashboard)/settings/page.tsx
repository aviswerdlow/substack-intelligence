'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  Download,
  Copy,
  Link,
  Unlink,
  Database,
} from 'lucide-react';

// Import all the new enhanced components
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { SettingsAccordionNav } from '@/components/settings/SettingsAccordionNav';
import { useSettingsTelemetry } from '@/lib/telemetry/settings-telemetry';
import { SettingsTooltips } from '@/components/settings/SettingsTooltips';
import { TabSaveControls } from '@/components/settings/TabSaveControls';
import { ApiKeyValidator } from '@/components/settings/ApiKeyValidator';
import { SettingsOnboardingTour } from '@/components/settings/SettingsOnboardingTour';
import { SettingsImportExport } from '@/components/settings/SettingsImportExport';
import { EmailPreferencesCard } from '@/components/settings/EmailPreferencesCard';

// AI Model mappings for each provider
const AI_MODELS = {
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  openai: [
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ]
};

function SettingsPageContent() {
  const { settings, setSettings, isLoading, error } = useSettings();
  const telemetry = useSettingsTelemetry();
  const [activeTab, setActiveTab] = useState('account');
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [connectingEmail, setConnectingEmail] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Enhanced error handling function
  const handleConnectionError = (errorType: string) => {
    setConnectionError(errorType);
    
    const errorConfig = {
      'missing_refresh_token': {
        title: 'Authorization Issue',
        description: 'Google didn\'t provide a refresh token. This usually happens when reconnecting an already authorized account.',
        action: 'Revoke Access & Retry',
        instructions: [
          'Go to https://myaccount.google.com/permissions',
          'Find this app and click "Remove access"',
          'Wait 30 seconds, then try connecting again'
        ]
      },
      'missing_access_token': {
        title: 'Authentication Failed',
        description: 'Google didn\'t provide an access token. This indicates a problem with the OAuth flow.',
        action: 'Retry Connection',
        instructions: [
          'Check your internet connection',
          'Make sure you complete the full Google authorization',
          'Try again in a few moments'
        ]
      },
      'token_exchange_failed': {
        title: 'Token Exchange Failed',
        description: 'Failed to exchange the authorization code for access tokens. This could be a timing issue.',
        action: 'Retry Quickly',
        instructions: [
          'Try connecting again immediately',
          'Complete the authorization process quickly (within 10 minutes)',
          'Check that your system clock is accurate'
        ]
      },
      'database_storage_failed': {
        title: 'Save Error',
        description: 'Successfully authenticated but failed to save the connection.',
        action: 'Retry Save',
        instructions: [
          'This is a temporary issue on our end',
          'Your Google authentication was successful',
          'Try connecting again to save the tokens'
        ]
      },
      'profile_fetch_failed': {
        title: 'Profile Access Failed',
        description: 'Successfully authenticated but couldn\'t access your Gmail profile.',
        action: 'Check Permissions',
        instructions: [
          'Make sure Gmail API is enabled',
          'Verify your Google account has Gmail access',
          'Try disconnecting and reconnecting'
        ]
      },
      'access_denied': {
        title: 'Permission Denied',
        description: 'You denied access to your Gmail account.',
        action: 'Grant Permissions',
        instructions: [
          'Click "Connect Gmail" again',
          'Make sure to click "Allow" when Google asks for permissions',
          'Grant access to both email reading and management permissions'
        ]
      }
    };
    
    const config = errorConfig[errorType as keyof typeof errorConfig] || {
      title: 'Connection Failed',
      description: `Gmail connection failed: ${errorType}`,
      action: 'Try Again',
      instructions: [
        'Check your internet connection',
        'Make sure popups are allowed',
        'Verify Gmail API is enabled in Google Cloud Console'
      ]
    };
    
    toast.error(config.title, {
      description: config.description,
      duration: 10000,
      action: {
        label: config.action,
        onClick: () => {
          if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => handleEmailConnect(), 1000);
          } else {
            // Show detailed instructions after multiple failures
            toast.info('Troubleshooting Steps', {
              description: config.instructions.join(' • '),
              duration: 15000,
            });
          }
        }
      }
    });
  };
  
  // Show loading state while settings are being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }
  
  // Show error state if settings failed to load
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ Failed to load settings</div>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }
  
  // Show loading if settings haven't loaded yet (but no error)
  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Initializing settings...</p>
        </div>
      </div>
    );
  }

  // Helper function to safely update settings
  const safeUpdateSettings = (updater: (prev: any) => any) => {
    setSettings((prev: any) => {
      const safePrev = prev || {};
      const result = updater(safePrev);
      return result;
    });
  };

  const handleEmailConnect = async () => {
    setConnectingEmail(true);
    try {
      if (settings?.email?.connected) {
        try {
          const response = await fetch('/api/auth/gmail', { method: 'DELETE' });
          const data = await response.json();

          if (response.ok && data.success) {
            safeUpdateSettings((prev: any) => ({
              ...prev,
              email: {
                ...(prev?.email || {}),
                connected: false,
                lastSync: null
              },
              account: {
                ...(prev?.account || {}),
                email: ''
              }
            }));

            toast.success('Gmail Disconnected', {
              description: 'Your Gmail account has been disconnected.'
            });
          } else {
            throw new Error(data.message || data.error || 'Failed to disconnect Gmail account');
          }
        } catch (disconnectError) {
          console.error('Failed to disconnect Gmail:', disconnectError);
          toast.error('Failed to disconnect Gmail', {
            description: disconnectError instanceof Error ? disconnectError.message : 'Unknown error occurred'
          });
        } finally {
          setConnectingEmail(false);
        }
        return;
      }

      const response = await fetch('/api/auth/gmail');
      const data = await response.json();

      if (!response.ok) {
        handleConnectionError(data.error || data.message || 'oauth_initiation_failed');
        setConnectingEmail(false);
        return;
      }

      if (!data.authUrl) {
        throw new Error('Missing Gmail authorization URL');
      }

      const width = 600;
      const height = 700;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);

      const popup = window.open(
        data.authUrl,
        'gmail-auth',
        `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        toast.error('Popup Blocked', {
          description: 'Please allow popups for this site to connect Gmail.'
        });
        setConnectingEmail(false);
        return;
      }

      const verifyConnection = async () => {
        try {
          const statusResponse = await fetch('/api/auth/gmail/status');
          if (!statusResponse.ok) {
            throw new Error('Failed to verify Gmail connection');
          }

          const statusData = await statusResponse.json();

          if (statusData.connected) {
            safeUpdateSettings((prev: any) => ({
              ...prev,
              email: {
                ...(prev?.email || {}),
                connected: true,
                lastSync: new Date().toISOString()
              },
              account: {
                ...(prev?.account || {}),
                email: statusData.email || prev?.account?.email || null
              }
            }));

            setConnectionError(null);
            setRetryCount(0);

            toast.success('Gmail Connected!', {
              description: statusData.email
                ? `Connected as ${statusData.email}`
                : 'Gmail account connected successfully.'
            });

            telemetry.trackUserInteraction('email_connected_oauth', {
              email: statusData.email
            });
          } else {
            setConnectionError('connection_incomplete');
            toast.error('Connection Incomplete', {
              description: 'Gmail connection was not completed. Please try again.'
            });
          }
        } catch (error) {
          console.error('Failed to verify Gmail connection:', error);
          toast.error('Verification Failed', {
            description: 'Unable to verify Gmail connection. Please try again.'
          });
        } finally {
          setConnectingEmail(false);
        }
      };

      const checkInterval = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            verifyConnection();
          }
        } catch (error) {
          console.error('Error monitoring Gmail connection popup:', error);
        }
      }, 1000);

      const timeoutId = window.setTimeout(() => {
        clearInterval(checkInterval);
        if (popup && !popup.closed) {
          popup.close();
        }
        setConnectingEmail(false);
        toast.error('Connection Timeout', {
          description: 'Gmail connection timed out. Please try again.'
        });
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      toast.error('Failed to connect Gmail', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      setConnectingEmail(false);
    }
  };

  const generateApiKey = async () => {
    if (!newApiKeyName) {
      alert('Please enter a name for the API key');
      return;
    }
    
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newApiKeyName })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state with new API key
        setSettings((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            api: {
              ...prev.api,
              keys: [...(prev.api?.keys || []), {
                id: data.data.id,
                name: data.data.name,
                key: data.data.key,
                createdAt: data.data.createdAt,
                lastUsed: null
              }]
            }
          };
        });
        setNewApiKeyName('');
        
        // Show the full API key once, then it will be masked
        alert(`API key "${newApiKeyName}" generated successfully!\n\nFull key (copy now): ${data.data.key}\n\nThis is the only time you'll see the full key.`);
      } else {
        throw new Error(data.error || 'Failed to generate API key');
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate API key. Please try again.');
    }
  };

  const addWebhook = async () => {
    if (!newWebhookUrl) {
      alert('Please enter a webhook URL');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(newWebhookUrl);
    } catch {
      alert('Please enter a valid URL');
      return;
    }
    
    try {
      const response = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          url: newWebhookUrl,
          events: ['email.processed', 'company.extracted']
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state with new webhook
        setSettings((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            api: {
              ...prev.api,
              webhooks: [...(prev.api?.webhooks || []), {
                id: data.data.id,
                url: data.data.url,
                events: data.data.events,
                enabled: data.data.enabled
              }]
            }
          };
        });
        setNewWebhookUrl('');
        
        alert(`Webhook "${newWebhookUrl}" added successfully!`);
      } else {
        throw new Error(data.error || 'Failed to add webhook');
      }
    } catch (error) {
      console.error('Failed to add webhook:', error);
      alert(error instanceof Error ? error.message : 'Failed to add webhook. Please try again.');
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keyId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        setSettings((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            api: {
              ...prev.api,
              keys: (prev.api?.keys || []).filter((key: any) => key.id !== keyId)
            }
          };
        });
        
        alert('API key deleted successfully!');
      } else {
        throw new Error(data.error || 'Failed to delete API key');
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete API key. Please try again.');
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/settings/webhooks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ webhookId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        setSettings((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            api: {
              ...prev.api,
              webhooks: (prev.api?.webhooks || []).filter((webhook: any) => webhook.id !== webhookId)
            }
          };
        });
        
        alert('Webhook deleted successfully!');
      } else {
        throw new Error(data.error || 'Failed to delete webhook');
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete webhook. Please try again.');
    }
  };

  const toggleWebhook = async (webhookId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/settings/webhooks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ webhookId, enabled })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setSettings((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            api: {
              ...prev.api,
              webhooks: (prev.api?.webhooks || []).map((webhook: any) =>
                webhook.id === webhookId ? { ...webhook, enabled } : webhook
              )
            }
          };
        });
      } else {
        throw new Error(data.error || 'Failed to update webhook');
      }
    } catch (error) {
      console.error('Failed to update webhook:', error);
      alert(error instanceof Error ? error.message : 'Failed to update webhook. Please try again.');
    }
  };

  // This loading check is no longer needed as it's handled above

  return (
    <TooltipProvider>
      <SettingsTooltips>
        <div className="flex gap-6">
          {/* Left sidebar with accordion navigation */}
          <div className="w-80 flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
            <SettingsAccordionNav activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          
          {/* Main content area */}
          <div className="flex-1 space-y-6 pb-12">
            {/* Header with onboarding tour and import/export */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Settings</h1>
                  <p className="text-muted-foreground">
                    Manage your account and application preferences
                  </p>
                </div>
                <div className="flex gap-2">
                  <SettingsOnboardingTour />
                  <SettingsImportExport />
                </div>
              </div>
              
              {/* Per-tab save controls */}
              <TabSaveControls tab={activeTab} />
            </div>

            {/* Settings content - disable keyboard shortcuts within settings forms */}
            <Tabs value={activeTab} onValueChange={setActiveTab} data-no-shortcuts>
              {/* Account Settings */}
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>Manage your profile and account preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={settings?.account?.name || ''}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            account: { ...(prev?.account || {}), name: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={settings?.account?.email || ''}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            account: { ...(prev?.account || {}), email: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          value={settings?.account?.role || 'User'}
                          disabled
                        />
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={settings?.account?.timezone || 'America/New_York'}
                          onValueChange={(value) => setSettings((prev: any) => ({
                            ...prev,
                            account: { ...(prev?.account || {}), timezone: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            <SelectItem value="Europe/London">London</SelectItem>
                            <SelectItem value="Europe/Paris">Paris</SelectItem>
                            <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Newsletter Sources */}
              <TabsContent value="newsletters">
                <Card>
                  <CardHeader>
                    <CardTitle>Newsletter Sources</CardTitle>
                    <CardDescription>Configure which newsletters to track and process</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-Subscribe to New Newsletters</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically track new newsletters when detected
                        </p>
                      </div>
                      <Switch
                        checked={settings?.newsletters?.autoSubscribe || false}
                        onCheckedChange={(checked) => setSettings((prev: any) => ({
                          ...prev,
                          newsletters: { ...prev.newsletters, autoSubscribe: checked }
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tracked Newsletters</Label>
                      <div className="space-y-2">
                        {(settings?.newsletters?.sources || []).map((source: any) => (
                          <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={source.enabled}
                                onCheckedChange={(checked) => {
                                  setSettings((prev: any) => ({
                                    ...prev,
                                    newsletters: {
                                      ...prev.newsletters,
                                      sources: (prev.newsletters?.sources || []).map((s: any) =>
                                        s.id === source.id ? { ...s, enabled: checked } : s
                                      )
                                    }
                                  }));
                                }}
                              />
                              <div>
                                <p className="font-medium">{source.name}</p>
                                <p className="text-sm text-muted-foreground">{source.email}</p>
                              </div>
                            </div>
                            <Badge variant={source.frequency === 'daily' ? 'default' : 'secondary'}>
                              {source.frequency}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          // Add a new newsletter source
                          const newSource = {
                            id: Date.now().toString(),
                            name: 'New Newsletter',
                            email: 'newsletter@example.com',
                            enabled: true,
                            frequency: 'weekly'
                          };
                          setSettings((prev: any) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              newsletters: {
                                ...prev.newsletters,
                                sources: [...(prev.newsletters?.sources || []), newSource]
                              }
                            };
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Newsletter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Company Tracking */}
              <TabsContent value="companies">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Watchlist</CardTitle>
                    <CardDescription>
                      Track specific companies you want to monitor across your newsletters
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-Detect Companies</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically identify and track mentioned companies
                        </p>
                      </div>
                      <Switch
                        checked={settings?.companies?.autoDetect || false}
                        onCheckedChange={(checked) => setSettings((prev: any) => ({
                          ...prev,
                          companies: { ...prev.companies, autoDetect: checked }
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tracked Companies</Label>
                      <div className="space-y-2">
                        {(settings?.companies?.tracking || []).map((company: any) => (
                          <div key={company.id} className="p-3 border rounded-lg" data-no-shortcuts>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <Switch
                                  checked={company.enabled}
                                  onCheckedChange={(checked) => {
                                    setSettings((prev: any) => ({
                                      ...prev,
                                      companies: {
                                        ...prev.companies,
                                        tracking: (prev.companies?.tracking || []).map((c: any) =>
                                          c.id === company.id ? { ...c, enabled: checked } : c
                                        )
                                      }
                                    }));
                                  }}
                                />
                                <div className="flex-1 space-y-2">
                                  <Input
                                    value={company.name}
                                    onChange={(e) => {
                                      setSettings((prev: any) => ({
                                        ...prev,
                                        companies: {
                                          ...prev.companies,
                                          tracking: (prev.companies?.tracking || []).map((c: any) =>
                                            c.id === company.id ? { ...c, name: e.target.value } : c
                                          )
                                        }
                                      }));
                                    }}
                                    placeholder="Company name"
                                    className="font-medium"
                                  />
                                  <Input
                                    value={company.domain}
                                    onChange={(e) => {
                                      setSettings((prev: any) => ({
                                        ...prev,
                                        companies: {
                                          ...prev.companies,
                                          tracking: (prev.companies?.tracking || []).map((c: any) =>
                                            c.id === company.id ? { ...c, domain: e.target.value } : c
                                          )
                                        }
                                      }));
                                    }}
                                    placeholder="example.com"
                                    className="text-sm"
                                  />
                                  <Input
                                    value={company.keywords.join(', ')}
                                    onChange={(e) => {
                                      const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                                      setSettings((prev: any) => ({
                                        ...prev,
                                        companies: {
                                          ...prev.companies,
                                          tracking: (prev.companies?.tracking || []).map((c: any) =>
                                            c.id === company.id ? { ...c, keywords } : c
                                          )
                                        }
                                      }));
                                    }}
                                    placeholder="Keywords (comma separated)"
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Remove this company from tracking?')) {
                                    setSettings((prev: any) => ({
                                      ...prev,
                                      companies: {
                                        ...prev.companies,
                                        tracking: (prev.companies?.tracking || []).filter((c: any) => c.id !== company.id)
                                      }
                                    }));
                                  }
                                }}
                                title="Remove company from tracking"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          // Add a new company to track
                          const newCompany = {
                            id: Date.now().toString(),
                            name: 'New Company',
                            domain: 'example.com',
                            keywords: ['keyword'],
                            enabled: true
                          };
                          setSettings((prev: any) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              companies: {
                                ...prev.companies,
                                tracking: [...(prev.companies?.tracking || []), newCompany]
                              }
                            };
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Company
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Configuration with Enhanced API Key Validator */}
              <TabsContent value="ai">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Configuration</CardTitle>
                    <CardDescription>Configure AI model settings and API keys</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Provider</Label>
                        <Select
                          value={settings?.ai?.provider || 'anthropic'}
                          onValueChange={(value) => {
                            const newProvider = value as keyof typeof AI_MODELS;
                            const firstModel = AI_MODELS[newProvider]?.[0]?.value || '';
                            setSettings((prev: any) => ({
                              ...prev,
                              ai: { 
                                ...prev.ai, 
                                provider: value,
                                model: firstModel
                              }
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="anthropic">Anthropic</SelectItem>
                            <SelectItem value="openai">OpenAI</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Model</Label>
                        <Select
                          value={settings?.ai?.model || 'claude-3-5-sonnet-20241022'}
                          onValueChange={(value) => setSettings((prev: any) => ({
                            ...prev,
                            ai: { ...prev.ai, model: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_MODELS[settings?.ai?.provider as keyof typeof AI_MODELS]?.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Enhanced API Key Validation */}
                    {settings?.ai?.provider === 'anthropic' ? (
                      <ApiKeyValidator
                        provider="anthropic"
                        value={settings?.ai?.anthropicApiKey || ''}
                        onChange={(value) => setSettings((prev: any) => ({
                          ...prev,
                          ai: { ...prev.ai, anthropicApiKey: value }
                        }))}
                        showTestButton={true}
                        showMetrics={true}
                      />
                    ) : (
                      <ApiKeyValidator
                        provider="openai"
                        value={settings?.ai?.openaiApiKey || ''}
                        onChange={(value) => setSettings((prev: any) => ({
                          ...prev,
                          ai: { ...prev.ai, openaiApiKey: value }
                        }))}
                        showTestButton={true}
                        showMetrics={true}
                      />
                    )}
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <Label>Temperature: {settings?.ai?.temperature || 0.7}</Label>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings?.ai?.temperature || 0.7}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            ai: { ...prev.ai, temperature: parseFloat(e.target.value) }
                          }))}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable AI Enrichment</Label>
                          <p className="text-sm text-muted-foreground">
                            Use AI to enhance data with additional insights
                          </p>
                        </div>
                        <Switch
                          checked={settings?.ai?.enableEnrichment || false}
                          onCheckedChange={(checked) => setSettings((prev: any) => ({
                            ...prev,
                            ai: { ...prev.ai, enableEnrichment: checked }
                          }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Email Integration */}
              <TabsContent value="email">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Integration</CardTitle>
                    <CardDescription>Configure email sync and processing settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            settings?.email?.connected ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {settings?.email?.connected ? (
                              <Link className="h-5 w-5 text-green-600" />
                            ) : (
                              <Unlink className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">Gmail</p>
                            <p className="text-sm text-muted-foreground">
                              {settings?.email?.connected ? (
                                <>
                                  <span className="text-green-600 font-medium">Connected</span>
                                  {settings.account?.email && (
                                    <span className="text-xs block">{settings?.account?.email || ''}</span>
                                  )}
                                </>
                              ) : (
                                'Not connected'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {settings?.email?.connected && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/auth/gmail/status');
                                  const data = await response.json();
                                  if (data.connected) {
                                    alert(`✅ Gmail connection is active\n\nAccount: ${data.email || 'Unknown'}`);
                                  } else {
                                    alert('⚠️ Gmail connection appears to be inactive. Try reconnecting.');
                                  }
                                } catch (error) {
                                  alert('❌ Unable to check connection status');
                                }
                              }}
                              title="Test Gmail connection"
                            >
                              Test
                            </Button>
                          )}
                          <Button
                            variant={settings?.email?.connected ? "outline" : "default"}
                            onClick={handleEmailConnect}
                            disabled={connectingEmail}
                          >
                            {connectingEmail ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {settings?.email?.connected ? 'Reconnecting...' : 'Connecting...'}
                              </>
                            ) : settings?.email?.connected ? (
                              'Disconnect'
                            ) : (
                              'Connect Gmail'
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {settings?.email?.connected && settings?.email?.lastSync && (
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>Last synced: {new Date(settings?.email?.lastSync).toLocaleString()}</span>
                            <Badge variant="secondary" className="text-xs">
                              {settings?.email?.connected ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      )}
                      
                      {connectingEmail && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-800">
                              {settings?.email?.connected ? 
                                'Reconnecting Gmail account...' : 
                                'Opening Gmail authorization window...'}
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            Complete the authorization in the popup window
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Privacy Settings */}
              <TabsContent value="privacy">
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                    <CardDescription>Control your data privacy and security preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Data Retention Period (days)</Label>
                        <Input
                          type="number"
                          value={settings?.privacy?.dataRetention || 365}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            privacy: { ...prev.privacy, dataRetention: parseInt(e.target.value) }
                          }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Share Analytics Data</Label>
                          <p className="text-sm text-muted-foreground">
                            Help improve the platform by sharing anonymous usage data
                          </p>
                        </div>
                        <Switch
                          checked={settings?.privacy?.shareAnalytics || false}
                          onCheckedChange={(checked) => setSettings((prev: any) => ({
                            ...prev,
                            privacy: { ...prev.privacy, shareAnalytics: checked }
                          }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Allow Data Export</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable exporting your data in various formats
                          </p>
                        </div>
                        <Switch
                          checked={settings?.privacy?.allowExport || false}
                          onCheckedChange={(checked) => setSettings((prev: any) => ({
                            ...prev,
                            privacy: { ...prev.privacy, allowExport: checked }
                          }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Settings */}
              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of the application</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Theme</Label>
                        <Select
                          value={settings?.appearance?.theme || 'system'}
                          onValueChange={(value: 'light' | 'dark' | 'system') => setSettings((prev: any) => ({
                            ...prev,
                            appearance: { ...prev.appearance, theme: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Accent Color</Label>
                        <Select
                          value={settings?.appearance?.accentColor || 'blue'}
                          onValueChange={(value) => setSettings((prev: any) => ({
                            ...prev,
                            appearance: { ...prev.appearance, accentColor: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="blue">Blue</SelectItem>
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="purple">Purple</SelectItem>
                            <SelectItem value="orange">Orange</SelectItem>
                            <SelectItem value="red">Red</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Font Size</Label>
                        <Select
                          value={settings?.appearance?.fontSize || 'medium'}
                          onValueChange={(value: 'small' | 'medium' | 'large') => setSettings((prev: any) => ({
                            ...prev,
                            appearance: { ...prev.appearance, fontSize: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Compact Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Reduce spacing and padding for more content
                          </p>
                        </div>
                        <Switch
                          checked={settings?.appearance?.compactMode || false}
                          onCheckedChange={(checked) => setSettings((prev: any) => ({
                            ...prev,
                            appearance: { ...prev.appearance, compactMode: checked }
                          }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Show Tips</Label>
                          <p className="text-sm text-muted-foreground">
                            Display helpful tips and onboarding guides
                          </p>
                        </div>
                        <Switch
                          checked={settings?.appearance?.showTips || false}
                          onCheckedChange={(checked) => setSettings((prev: any) => ({
                            ...prev,
                            appearance: { ...prev.appearance, showTips: checked }
                          }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reports Settings */}
              <TabsContent value="reports">
                <Card>
                  <CardHeader>
                    <CardTitle>Report Settings</CardTitle>
                    <CardDescription>Configure automated report generation and delivery</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Default Format</Label>
                        <Select
                          value={settings?.reports?.defaultFormat || 'pdf'}
                          onValueChange={(value) => setSettings((prev: any) => ({
                            ...prev,
                            reports: { ...prev.reports, defaultFormat: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="excel">Excel</SelectItem>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="html">HTML</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Delivery Time</Label>
                        <Input
                          type="time"
                          value={settings?.reports?.deliveryTime || '09:00'}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            reports: { ...prev.reports, deliveryTime: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <Label>Auto-Generate Reports</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Daily Reports</Label>
                          <Switch
                            checked={settings?.reports?.autoGenerate?.daily || false}
                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                              ...prev,
                              reports: { 
                                ...prev.reports, 
                                autoGenerate: { ...(prev.reports?.autoGenerate || {}), daily: checked }
                              }
                            }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Weekly Reports</Label>
                          <Switch
                            checked={settings?.reports?.autoGenerate?.weekly || false}
                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                              ...prev,
                              reports: { 
                                ...prev.reports, 
                                autoGenerate: { ...(prev.reports?.autoGenerate || {}), weekly: checked }
                              }
                            }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Monthly Reports</Label>
                          <Switch
                            checked={settings?.reports?.autoGenerate?.monthly || false}
                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                              ...prev,
                              reports: { 
                                ...prev.reports, 
                                autoGenerate: { ...(prev.reports?.autoGenerate || {}), monthly: checked }
                              }
                            }))}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Include Charts</Label>
                          <p className="text-sm text-muted-foreground">
                            Add visual charts and graphs to reports
                          </p>
                        </div>
                        <Switch
                          checked={settings?.reports?.includeCharts || false}
                          onCheckedChange={(checked) => setSettings((prev: any) => ({
                            ...prev,
                            reports: { ...prev.reports, includeCharts: checked }
                          }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Include Sentiment Analysis</Label>
                          <p className="text-sm text-muted-foreground">
                            Add sentiment scores and analysis to reports
                          </p>
                        </div>
                        <Switch
                          checked={settings?.reports?.includeSentiment || false}
                          onCheckedChange={(checked) => setSettings((prev: any) => ({
                            ...prev,
                            reports: { ...prev.reports, includeSentiment: checked }
                          }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Settings */}
              <TabsContent value="notifications">
                <div className="grid gap-6">
                  <EmailPreferencesCard />
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Settings</CardTitle>
                      <CardDescription>Configure how and when you receive alerts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-medium">Email Notifications</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Enable Email Notifications</Label>
                          <Switch
                            checked={settings?.notifications?.email?.enabled || false}
                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                              ...prev,
                              notifications: { 
                                ...prev.notifications, 
                                email: { ...(prev.notifications?.email || {}), enabled: checked }
                              }
                            }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Critical Alerts Only</Label>
                          <Switch
                            checked={settings?.notifications?.email?.criticalOnly || false}
                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                              ...prev,
                              notifications: { 
                                ...prev.notifications, 
                                email: { ...(prev.notifications?.email || {}), criticalOnly: checked }
                              }
                            }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Daily Digest</Label>
                          <Switch
                            checked={settings?.notifications?.email?.dailyDigest || false}
                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                              ...prev,
                              notifications: { 
                                ...prev.notifications, 
                                email: { ...(prev.notifications?.email || {}), dailyDigest: checked }
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-medium">In-App Notifications</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Enable In-App Notifications</Label>
                          <Switch
                            checked={settings?.notifications?.inApp?.enabled || false}
                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                              ...prev,
                              notifications: { 
                                ...prev.notifications, 
                                inApp: { ...(prev.notifications?.inApp || {}), enabled: checked }
                              }
                            }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Sound Enabled</Label>
                          <Switch
                            checked={settings?.notifications?.inApp?.soundEnabled || false}
                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                              ...prev,
                              notifications: { 
                                ...prev.notifications, 
                                inApp: { ...(prev.notifications?.inApp || {}), soundEnabled: checked }
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-medium">Alert Thresholds</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>Negative Sentiment Threshold</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="-1"
                            max="0"
                            value={settings?.notifications?.thresholds?.negativeSentiment || -0.5}
                            onChange={(e) => setSettings((prev: any) => ({
                              ...prev,
                              notifications: { 
                                ...prev.notifications, 
                                thresholds: { 
                                  ...(prev.notifications?.thresholds || {}), 
                                  negativeSentiment: parseFloat(e.target.value) 
                                }
                              }
                            }))}
                          />
                        </div>
                        
                        <div>
                          <Label>Mention Volume Threshold</Label>
                          <Input
                            type="number"
                            min="1"
                            value={settings?.notifications?.thresholds?.mentionVolume || 10}
                            onChange={(e) => setSettings((prev: any) => ({
                              ...prev,
                              notifications: { 
                                ...prev.notifications, 
                                thresholds: { 
                                  ...(prev.notifications?.thresholds || {}), 
                                  mentionVolume: parseInt(e.target.value) 
                                }
                              }
                            }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Alert on Competitor Mentions</Label>
                          <Switch
                            checked={settings?.notifications?.thresholds?.competitorMentions || false}
                            onCheckedChange={(checked) => setSettings((prev: any) => ({
                              ...prev,
                              notifications: { 
                                ...prev.notifications, 
                                thresholds: { 
                                  ...(prev.notifications?.thresholds || {}), 
                                  competitorMentions: checked 
                                }
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* API Settings */}
              <TabsContent value="api">
                <Card>
                  <CardHeader>
                    <CardTitle>API Access</CardTitle>
                    <CardDescription>Manage API keys and access tokens</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>API Keys</Label>
                        <Button size="sm" onClick={generateApiKey}>
                          <Plus className="h-4 w-4 mr-2" />
                          Generate New Key
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Input
                          placeholder="API Key Name"
                          value={newApiKeyName}
                          onChange={(e) => setNewApiKeyName(e.target.value)}
                        />
                        
                        {settings?.api?.keys?.length > 0 ? (
                          <div className="space-y-2">
                            {settings?.api?.keys?.map((key: any) => (
                              <div key={key.id} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{key.name}</p>
                                    <p className="text-sm text-muted-foreground font-mono">{key.key}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Created: {new Date(key.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => navigator.clipboard.writeText(key.key)}
                                      title="Copy API key"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => deleteApiKey(key.id)}
                                      title="Delete API key"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No API keys generated yet
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Webhooks Settings */}
              <TabsContent value="webhooks">
                <Card>
                  <CardHeader>
                    <CardTitle>Webhooks</CardTitle>
                    <CardDescription>Configure webhook endpoints for real-time updates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Webhook Endpoints</Label>
                        <Button size="sm" onClick={addWebhook}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Webhook
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Input
                          placeholder="https://your-endpoint.com/webhook"
                          value={newWebhookUrl}
                          onChange={(e) => setNewWebhookUrl(e.target.value)}
                        />
                        
                        {settings?.api?.webhooks?.length > 0 ? (
                          <div className="space-y-2">
                            {settings?.api?.webhooks?.map((webhook: any) => (
                              <div key={webhook.id} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Switch
                                      checked={webhook.enabled}
                                      onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                                    />
                                    <div>
                                      <p className="font-medium text-sm">{webhook.url}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Events: {webhook.events.join(', ')}
                                      </p>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => deleteWebhook(webhook.id)}
                                    title="Delete webhook"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No webhooks configured yet
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Integrations Settings */}
              <TabsContent value="integrations">
                <Card>
                  <CardHeader>
                    <CardTitle>Integrations</CardTitle>
                    <CardDescription>Connect with third-party services and platforms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Database className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium">Slack</p>
                              <p className="text-sm text-muted-foreground">Send notifications to Slack channels</p>
                            </div>
                          </div>
                          <Button variant="outline">Connect</Button>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Database className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">Zapier</p>
                              <p className="text-sm text-muted-foreground">Automate workflows with 5000+ apps</p>
                            </div>
                          </div>
                          <Button variant="outline">Connect</Button>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                              <Database className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">Google Sheets</p>
                              <p className="text-sm text-muted-foreground">Export data to Google Sheets</p>
                            </div>
                          </div>
                          <Button variant="outline">Connect</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SettingsTooltips>
    </TooltipProvider>
  );
}

// Error boundary component for debugging
class SettingsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('Settings Error Boundary caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Settings Error Details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Settings Error</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main component wrapped with SettingsProvider
export default function SettingsPage() {
  return (
    <SettingsErrorBoundary>
      <SettingsProvider>
        <SettingsPageContent />
      </SettingsProvider>
    </SettingsErrorBoundary>
  );
}