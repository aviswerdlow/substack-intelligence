'use client';

import { useState } from 'react';
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
  const { settings, setSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('account');
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [connectingEmail, setConnectingEmail] = useState(false);

  const handleEmailConnect = async () => {
    setConnectingEmail(true);
    try {
      const response = await fetch('/api/auth/gmail/connect', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          window.open(data.authUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Failed to connect email:', error);
    } finally {
      setConnectingEmail(false);
    }
  };

  const generateApiKey = async () => {
    if (!newApiKeyName) return;
    
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newApiKeyName })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings((prev: any) => ({
          ...prev,
          api: {
            ...prev.api,
            keys: [...prev.api.keys, data.key]
          }
        }));
        setNewApiKeyName('');
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
    }
  };

  const addWebhook = () => {
    if (!newWebhookUrl) return;
    
    const newWebhook = {
      id: Date.now().toString(),
      url: newWebhookUrl,
      events: ['email.processed'],
      enabled: true
    };
    
    setSettings((prev: any) => ({
      ...prev,
      api: {
        ...prev.api,
        webhooks: [...prev.api.webhooks, newWebhook]
      }
    }));
    setNewWebhookUrl('');
  };

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
                          value={settings.account.name}
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
                          value={settings.account.email}
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
                          value={settings.account.role}
                          disabled
                        />
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={settings.account.timezone}
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
                        {settings.newsletters.sources.map((source: any) => (
                          <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={source.enabled}
                                onCheckedChange={(checked) => {
                                  setSettings((prev: any) => ({
                                    ...prev,
                                    newsletters: {
                                      ...prev.newsletters,
                                      sources: prev.newsletters.sources.map((s: any) =>
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
                      <Button variant="outline" className="w-full">
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
                        {settings.companies.tracking.map((company: any) => (
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
                                        tracking: prev.companies.tracking.map((c: any) =>
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
                              <Button size="sm" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full">
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
                          value={settings.ai.provider}
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
                          value={settings.ai.model}
                          onValueChange={(value) => setSettings((prev: any) => ({
                            ...prev,
                            ai: { ...prev.ai, model: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_MODELS[settings.ai.provider as keyof typeof AI_MODELS]?.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Enhanced API Key Validation */}
                    {settings.ai.provider === 'anthropic' ? (
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
                            settings.email.connected ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {settings.email.connected ? (
                              <Link className="h-5 w-5 text-green-600" />
                            ) : (
                              <Unlink className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">Gmail</p>
                            <p className="text-sm text-muted-foreground">
                              {settings.email.connected ? 'Connected' : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={settings.email.connected ? "outline" : "default"}
                          onClick={handleEmailConnect}
                          disabled={connectingEmail}
                        >
                          {connectingEmail ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : settings.email.connected ? (
                            'Reconnect'
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                      
                      {settings.email.connected && (
                        <div className="text-sm text-muted-foreground">
                          Last synced: {new Date(settings.email.lastSync).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Other tabs would continue here... */}
            </Tabs>
          </div>
        </div>
      </SettingsTooltips>
    </TooltipProvider>
  );
}

// Main component wrapped with SettingsProvider
export default function SettingsPage() {
  return (
    <SettingsProvider>
      <SettingsPageContent />
    </SettingsProvider>
  );
}