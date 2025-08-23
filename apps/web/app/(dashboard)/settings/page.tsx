'use client';

import React, { useState } from 'react';
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
import { SettingsTooltips } from '@/components/settings/SettingsTooltips';
import { TabSaveControls } from '@/components/settings/TabSaveControls';
import { ApiKeyValidator } from '@/components/settings/ApiKeyValidator';
import { SettingsOnboardingTour } from '@/components/settings/SettingsOnboardingTour';
import { SettingsImportExport } from '@/components/settings/SettingsImportExport';

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
  const { settings, setSettings, isLoading } = useSettings();
  const [activeTab, setActiveTab] = useState('account');
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [connectingEmail, setConnectingEmail] = useState(false);
  
  // Show loading state while settings are being fetched
  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  const handleEmailConnect = async () => {
    setConnectingEmail(true);
    try {
      if (!settings?.email?.connected) {
        // Initiate Gmail OAuth flow
        const response = await fetch('/api/auth/gmail');
        const data = await response.json();
        
        if (data.authUrl) {
          // Open OAuth flow in new window
          const authWindow = window.open(data.authUrl, 'gmail-auth', 'width=500,height=600');
          
          // Check for window close and update status
          const checkInterval = setInterval(() => {
            if (authWindow?.closed) {
              clearInterval(checkInterval);
              // Check if connection was successful (would be set by callback)
              const connectedEmail = localStorage.getItem('gmail_connected_email');
              if (connectedEmail) {
                setSettings((prev: any) => ({
                  ...prev,
                  email: {
                    ...prev.email,
                    connected: true,
                    lastSync: new Date().toISOString()
                  },
                  account: {
                    ...prev.account,
                    email: connectedEmail
                  }
                }));
                localStorage.removeItem('gmail_connected_email');
                alert(`Successfully connected Gmail account: ${connectedEmail}`);
              }
              setConnectingEmail(false);
            }
          }, 1000);
        } else {
          throw new Error('Failed to get authentication URL');
        }
      } else {
        // Disconnect Gmail
        await fetch('/api/auth/gmail', { method: 'DELETE' });
        setSettings((prev: any) => ({
          ...prev,
          email: {
            ...(prev.email || {}),
            connected: false,
            lastSync: null
          }
        }));
        setConnectingEmail(false);
        alert('Gmail account disconnected');
      }
    } catch (error) {
      console.error('Failed to connect email:', error);
      
      // In development, offer to use mock connection
      if (process.env.NODE_ENV === 'development') {
        const useMock = confirm(
          'Google OAuth failed (this is common in development).\n\n' +
          'Would you like to use a mock connection for testing?\n\n' +
          'Note: To use real Google OAuth, you need to:\n' +
          '1. Add http://localhost:3000/api/auth/gmail/callback to your Google OAuth redirect URIs\n' +
          '2. Add your email as a test user in Google Cloud Console'
        );
        
        if (useMock) {
          try {
            const mockResponse = await fetch('/api/auth/gmail/mock', { method: 'POST' });
            const mockData = await mockResponse.json();
            
            if (mockData.success) {
              setSettings((prev: any) => ({
                ...prev,
                email: {
                  ...(prev.email || {}),
                  connected: true,
                  lastSync: new Date().toISOString()
                },
                account: {
                  ...(prev.account || {}),
                  email: mockData.email
                }
              }));
              alert(`Mock Gmail connection created for: ${mockData.email}`);
            }
          } catch (mockError) {
            console.error('Mock connection failed:', mockError);
            alert('Failed to create mock connection.');
          }
        }
      } else {
        alert('Failed to connect email. Please try again.');
      }
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

  // Show loading state while settings are being fetched
  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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

            {/* Settings content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                            account: { ...prev.account, name: e.target.value }
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
                            account: { ...prev.account, email: e.target.value }
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
                            account: { ...prev.account, timezone: value }
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
                        checked={settings.newsletters.autoSubscribe}
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
                        checked={settings.companies.autoDetect}
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
                          <div key={company.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
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
                                <div>
                                  <p className="font-medium">{company.name}</p>
                                  <p className="text-sm text-muted-foreground">{company.domain}</p>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {company.keywords.map((keyword: string, i: number) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
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
                        value={settings.ai.anthropicApiKey}
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
                        value={settings.ai.openaiApiKey}
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
                          <Label>Temperature: {settings.ai.temperature}</Label>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.ai.temperature}
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
                          checked={settings.ai.enableEnrichment}
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
                              {settings?.email?.connected ? 'Connected' : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={settings?.email?.connected ? "outline" : "default"}
                          onClick={handleEmailConnect}
                          disabled={connectingEmail}
                        >
                          {connectingEmail ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : settings?.email?.connected ? (
                            'Reconnect'
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                      
                      {settings?.email?.connected && settings?.email?.lastSync && (
                        <div className="text-sm text-muted-foreground">
                          Last synced: {new Date(settings?.email?.lastSync).toLocaleString()}
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
                          value={settings.privacy.dataRetention}
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
                          checked={settings.privacy.shareAnalytics}
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
                          checked={settings.privacy.allowExport}
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
                          value={settings.appearance.theme}
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
                          value={settings.appearance.accentColor}
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
                          value={settings.appearance.fontSize}
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
                          checked={settings.appearance.compactMode}
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
                          checked={settings.appearance.showTips}
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
                          value={settings.reports.defaultFormat}
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
                          value={settings.reports.deliveryTime}
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
                            checked={settings.reports.autoGenerate.daily}
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
                            checked={settings.reports.autoGenerate.weekly}
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
                            checked={settings.reports.autoGenerate.monthly}
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
                          checked={settings.reports.includeCharts}
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
                          checked={settings.reports.includeSentiment}
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
                            checked={settings.notifications.inApp.enabled}
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
                            checked={settings.notifications.inApp.soundEnabled}
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
                            value={settings.notifications.thresholds.negativeSentiment}
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
                            value={settings.notifications.thresholds.mentionVolume}
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
                            checked={settings.notifications.thresholds.competitorMentions}
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
                        
                        {settings.api.keys.length > 0 ? (
                          <div className="space-y-2">
                            {settings.api.keys.map((key: any) => (
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
                        
                        {settings.api.webhooks.length > 0 ? (
                          <div className="space-y-2">
                            {settings.api.webhooks.map((webhook: any) => (
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