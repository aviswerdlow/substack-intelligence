'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  User,
  Mail,
  Building2,
  Brain,
  Key,
  Bell,
  Database,
  Palette,
  Shield,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Download,
  Copy,
  Eye,
  EyeOff,
  Link,
  Unlink,
  Calendar,
  Clock,
  Globe,
  Zap,
  HelpCircle
} from 'lucide-react';

interface Settings {
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
    lastSync: string;
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
      created: string;
      lastUsed: string;
      permissions: string[];
    }>;
    webhooks: Array<{
      id: string;
      url: string;
      events: string[];
      enabled: boolean;
    }>;
  };
  appearance: {
    theme: string;
    accentColor: string;
    fontSize: string;
    compactMode: boolean;
    showTips: boolean;
  };
}

// AI Model mappings for each provider
const AI_MODELS = {
  anthropic: [
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  openai: [
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ]
};

// API Key validation functions
const validateAnthropicKey = (key: string): boolean => {
  // Anthropic keys start with 'sk-ant-api'
  return key.startsWith('sk-ant-api') && key.length > 40;
};

const validateOpenAIKey = (key: string): boolean => {
  // OpenAI keys start with 'sk-' and are typically 51 characters
  return key.startsWith('sk-') && key.length > 40;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [connectingEmail, setConnectingEmail] = useState(false);
  const [anthropicKeyValid, setAnthropicKeyValid] = useState(true);
  const [openAIKeyValid, setOpenAIKeyValid] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  
  const [settings, setSettings] = useState<Settings>({
    account: {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      timezone: 'America/New_York'
    },
    newsletters: {
      sources: [
        { id: '1', name: 'Stratechery', email: 'ben@stratechery.com', enabled: true, frequency: 'daily' },
        { id: '2', name: 'The Information', email: 'newsletter@theinformation.com', enabled: true, frequency: 'weekly' },
        { id: '3', name: 'Platformer', email: 'casey@platformer.news', enabled: true, frequency: 'daily' }
      ],
      autoSubscribe: true,
      digestFrequency: 'weekly'
    },
    companies: {
      tracking: [
        { id: '1', name: 'OpenAI', domain: 'openai.com', keywords: ['GPT', 'ChatGPT', 'DALL-E'], enabled: true },
        { id: '2', name: 'Anthropic', domain: 'anthropic.com', keywords: ['Claude', 'Constitutional AI'], enabled: true }
      ],
      autoDetect: true,
      minimumMentions: 3
    },
    ai: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      apiKey: 'sk-ant-api03-...',
      anthropicApiKey: 'sk-ant-api03-...',
      openaiApiKey: 'sk-...',
      temperature: 0.7,
      maxTokens: 4096,
      enableEnrichment: true
    },
    email: {
      provider: 'gmail',
      connected: true,
      syncFrequency: '15min',
      lastSync: '2024-01-22T10:30:00Z',
      autoProcess: true,
      retentionDays: 90
    },
    reports: {
      defaultFormat: 'pdf',
      includeCharts: true,
      includeSentiment: true,
      autoGenerate: {
        daily: true,
        weekly: true,
        monthly: false
      },
      deliveryTime: '09:00',
      recipients: ['team@company.com', 'ceo@company.com']
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
      keys: [
        { 
          id: '1', 
          name: 'Production API', 
          key: 'si_live_...', 
          created: '2024-01-15', 
          lastUsed: '2024-01-22',
          permissions: ['read', 'write']
        }
      ],
      webhooks: [
        { 
          id: '1', 
          url: 'https://api.company.com/webhooks/substack', 
          events: ['email.processed', 'report.generated'], 
          enabled: true 
        }
      ]
    },
    appearance: {
      theme: 'system',
      accentColor: 'blue',
      fontSize: 'medium',
      compactMode: false,
      showTips: true
    }
  });

  // Helper to update settings and track changes
  const updateSettings = (updater: (prev: Settings) => Settings, tab?: string) => {
    setSettings(updater);
    if (tab) {
      setUnsavedChanges(prev => new Set(Array.from(prev).concat(tab)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setSaved(true);
        setUnsavedChanges(new Set()); // Clear all unsaved changes
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveTab = async (tab: string) => {
    setSaving(true);
    try {
      // Save only the specific tab's settings
      const tabSettings = { [tab]: (settings as any)[tab] };
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabSettings)
      });
      
      if (response.ok) {
        setSaved(true);
        setUnsavedChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(tab);
          return newSet;
        });
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error(`Failed to save ${tab} settings:`, error);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailConnect = async () => {
    setConnectingEmail(true);
    try {
      // Simulate OAuth flow
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
        setSettings(prev => ({
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
    
    setSettings(prev => ({
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account and application preferences
            </p>
          </div>
        <div className="flex gap-2">
          {saved && (
            <Badge variant="default" className="bg-green-600">
              <Check className="h-3 w-3 mr-1" />
              Saved
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden lg:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="newsletters" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden lg:inline">Newsletters</span>
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden lg:inline">Companies</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden lg:inline">AI</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden lg:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden lg:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden lg:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden lg:inline">API</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden lg:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden lg:inline">Theme</span>
          </TabsTrigger>
        </TabsList>

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
                    onChange={(e) => setSettings(prev => ({
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
                    onChange={(e) => setSettings(prev => ({
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
                    onValueChange={(value) => setSettings(prev => ({
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
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    newsletters: { ...prev.newsletters, autoSubscribe: checked }
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tracked Newsletters</Label>
                <div className="space-y-2">
                  {settings.newsletters.sources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={source.enabled}
                          onCheckedChange={(checked) => {
                            setSettings(prev => ({
                              ...prev,
                              newsletters: {
                                ...prev.newsletters,
                                sources: prev.newsletters.sources.map(s =>
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
                Track specific companies you want to monitor across your newsletters. 
                Add competitors, portfolio companies, or any businesses you're interested in following.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Detect Companies</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically identify and track mentioned companies in your emails
                  </p>
                </div>
                <Switch
                  checked={settings.companies.autoDetect}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    companies: { ...prev.companies, autoDetect: checked }
                  }))}
                />
              </div>
              
              <div>
                <Label>Minimum Mentions for Tracking</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Companies must be mentioned at least this many times to be added to your watchlist
                </p>
                <Select
                  value={settings.companies.minimumMentions.toString()}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    companies: { ...prev.companies, minimumMentions: parseInt(value) }
                  }))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mention (Most sensitive)</SelectItem>
                    <SelectItem value="3">3 mentions (Recommended)</SelectItem>
                    <SelectItem value="5">5 mentions (Moderate)</SelectItem>
                    <SelectItem value="10">10 mentions (High confidence)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tracked Companies</Label>
                <div className="space-y-2">
                  {settings.companies.tracking.map((company) => (
                    <div key={company.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Switch
                            checked={company.enabled}
                            onCheckedChange={(checked) => {
                              setSettings(prev => ({
                                ...prev,
                                companies: {
                                  ...prev.companies,
                                  tracking: prev.companies.tracking.map(c =>
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
                              {company.keywords.map((keyword, i) => (
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

        {/* AI Configuration */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Configure AI model settings and API keys</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Provider</Label>
                  <Select
                    value={settings.ai.provider}
                    onValueChange={(value) => {
                      const newProvider = value as keyof typeof AI_MODELS;
                      const firstModel = AI_MODELS[newProvider]?.[0]?.value || '';
                      setSettings(prev => ({
                        ...prev,
                        ai: { 
                          ...prev.ai, 
                          provider: value,
                          model: firstModel // Auto-select first model for new provider
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
                    onValueChange={(value) => setSettings(prev => ({
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
              
              {/* Provider-specific API Key Fields */}
              {settings.ai.provider === 'anthropic' ? (
                <div>
                  <Label>Anthropic API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type={showAnthropicKey ? "text" : "password"}
                      value={settings.ai.anthropicApiKey}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSettings(prev => ({
                          ...prev,
                          ai: { ...prev.ai, anthropicApiKey: value }
                        }));
                        // Validate on change (skip if empty or just starting to type)
                        if (value.length > 10) {
                          setAnthropicKeyValid(validateAnthropicKey(value));
                        }
                      }}
                      placeholder="sk-ant-api03-..."
                      className={!anthropicKeyValid ? "border-red-500" : ""}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                    >
                      {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a>
                  </p>
                  {!anthropicKeyValid && (
                    <p className="text-sm text-red-500 mt-1">
                      Invalid API key format. Anthropic keys should start with "sk-ant-api"
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <Label>OpenAI API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type={showOpenAIKey ? "text" : "password"}
                      value={settings.ai.openaiApiKey}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSettings(prev => ({
                          ...prev,
                          ai: { ...prev.ai, openaiApiKey: value }
                        }));
                        // Validate on change (skip if empty or just starting to type)
                        if (value.length > 10) {
                          setOpenAIKeyValid(validateOpenAIKey(value));
                        }
                      }}
                      placeholder="sk-..."
                      className={!openAIKeyValid ? "border-red-500" : ""}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    >
                      {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a>
                  </p>
                  {!openAIKeyValid && (
                    <p className="text-sm text-red-500 mt-1">
                      Invalid API key format. OpenAI keys should start with "sk-"
                    </p>
                  )}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Label>Temperature: {settings.ai.temperature}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>Controls randomness in AI responses. Lower values (0.0-0.3) make output more focused and deterministic. Higher values (0.7-1.0) make output more creative and varied.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.ai.temperature}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      ai: { ...prev.ai, temperature: parseFloat(e.target.value) }
                    }))}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label>Enable AI Enrichment</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>When enabled, AI will automatically analyze company mentions to extract additional context like funding status, industry classification, and key personnel. This uses additional API credits.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use AI to enhance data with additional insights
                    </p>
                  </div>
                  <Switch
                    checked={settings.ai.enableEnrichment}
                    onCheckedChange={(checked) => setSettings(prev => ({
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
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Sync Frequency</Label>
                  <Select
                    value={settings.email.syncFrequency}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, syncFrequency: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5min">Every 5 minutes</SelectItem>
                      <SelectItem value="15min">Every 15 minutes</SelectItem>
                      <SelectItem value="30min">Every 30 minutes</SelectItem>
                      <SelectItem value="1hr">Every hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Data Retention</Label>
                  <Select
                    value={settings.email.retentionDays.toString()}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, retentionDays: parseInt(value) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Process Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically process new emails as they arrive
                  </p>
                </div>
                <Switch
                  checked={settings.email.autoProcess}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, autoProcess: checked }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Settings */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
              <CardDescription>Configure report generation and delivery preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Default Format</Label>
                  <Select
                    value={settings.reports.defaultFormat}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      reports: { ...prev.reports, defaultFormat: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="markdown">Markdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Delivery Time</Label>
                  <Input
                    type="time"
                    value={settings.reports.deliveryTime}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      reports: { ...prev.reports, deliveryTime: e.target.value }
                    }))}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Auto-Generate Reports</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Daily Reports</Label>
                    <Switch
                      checked={settings.reports.autoGenerate.daily}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        reports: {
                          ...prev.reports,
                          autoGenerate: { ...prev.reports.autoGenerate, daily: checked }
                        }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Weekly Reports</Label>
                    <Switch
                      checked={settings.reports.autoGenerate.weekly}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        reports: {
                          ...prev.reports,
                          autoGenerate: { ...prev.reports.autoGenerate, weekly: checked }
                        }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Monthly Reports</Label>
                    <Switch
                      checked={settings.reports.autoGenerate.monthly}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        reports: {
                          ...prev.reports,
                          autoGenerate: { ...prev.reports.autoGenerate, monthly: checked }
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Report Recipients</Label>
                <Textarea
                  placeholder="Enter email addresses, one per line"
                  value={settings.reports.recipients.join('\n')}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    reports: {
                      ...prev.reports,
                      recipients: e.target.value.split('\n').filter(Boolean)
                    }
                  }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how and when you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Enable Email Notifications</Label>
                    <Switch
                      checked={settings.notifications.email.enabled}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          email: { ...prev.notifications.email, enabled: checked }
                        }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Critical Alerts Only</Label>
                    <Switch
                      checked={settings.notifications.email.criticalOnly}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          email: { ...prev.notifications.email, criticalOnly: checked }
                        }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Daily Digest</Label>
                    <Switch
                      checked={settings.notifications.email.dailyDigest}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          email: { ...prev.notifications.email, dailyDigest: checked }
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Alert Thresholds</h3>
                <div className="space-y-3">
                  <div>
                    <Label>Negative Sentiment Alert</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Get notified when company mentions have negative sentiment. Scale: -1 (very negative) to +1 (very positive)
                    </p>
                    <Select
                      value={settings.notifications.thresholds.negativeSentiment.toString()}
                      onValueChange={(value) => setSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          thresholds: {
                            ...prev.notifications.thresholds,
                            negativeSentiment: parseFloat(value)
                          }
                        }
                      }))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-0.3">-0.3 (Slightly negative)</SelectItem>
                        <SelectItem value="-0.5">-0.5 (Moderately negative)</SelectItem>
                        <SelectItem value="-0.7">-0.7 (Very negative)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>High Volume Alert</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Get notified when a company is mentioned more than this number of times per week
                    </p>
                    <Select
                      value={settings.notifications.thresholds.mentionVolume.toString()}
                      onValueChange={(value) => setSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          thresholds: {
                            ...prev.notifications.thresholds,
                            mentionVolume: parseInt(value)
                          }
                        }
                      }))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5+ mentions per week</SelectItem>
                        <SelectItem value="10">10+ mentions per week</SelectItem>
                        <SelectItem value="20">20+ mentions per week</SelectItem>
                        <SelectItem value="50">50+ mentions per week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Alert on Competitor Mentions</Label>
                    <Switch
                      checked={settings.notifications.thresholds.competitorMentions}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          thresholds: {
                            ...prev.notifications.thresholds,
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

        {/* API Access */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>Developer API</CardTitle>
              <CardDescription>
                Generate API keys to access Substack Intelligence programmatically. 
                Use our API to integrate intelligence data into your own applications and workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Documentation Link */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Available API Endpoints</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                  <li>• Get company intelligence and mentions</li>
                  <li>• Retrieve newsletter summaries and insights</li>
                  <li>• Access sentiment analysis and trends</li>
                  <li>• Export reports and analytics data</li>
                </ul>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View API Documentation
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">API Keys</h3>
                  <Button size="sm" onClick={generateApiKey}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Key
                  </Button>
                </div>
                
                {newApiKeyName !== '' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Key name (e.g., Production API)"
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                    />
                    <Button onClick={generateApiKey}>Create</Button>
                  </div>
                )}
                
                <div className="space-y-2">
                  {settings.api.keys.map((key) => (
                    <div key={key.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{key.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {key.key.substring(0, 12)}...
                            </code>
                            <Button size="sm" variant="ghost">
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {key.created} • Last used: {key.lastUsed}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Webhooks</h3>
                  <Button size="sm" onClick={() => setNewWebhookUrl('https://')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </div>
                
                {newWebhookUrl && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Webhook URL"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                    />
                    <Button onClick={addWebhook}>Add</Button>
                  </div>
                )}
                
                <div className="space-y-2">
                  {settings.api.webhooks.map((webhook) => (
                    <div key={webhook.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm">{webhook.url}</p>
                            <Badge variant={webhook.enabled ? "default" : "secondary"}>
                              {webhook.enabled ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex gap-1 mt-2">
                            {webhook.events.map((event, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Switch
                            checked={webhook.enabled}
                            onCheckedChange={(checked) => {
                              setSettings(prev => ({
                                ...prev,
                                api: {
                                  ...prev.api,
                                  webhooks: prev.api.webhooks.map(w =>
                                    w.id === webhook.id ? { ...w, enabled: checked } : w
                                  )
                                }
                              }));
                            }}
                          />
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy & Data */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data</CardTitle>
              <CardDescription>Manage your data and privacy preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium">Data Management</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Request Data Backup
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Data
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Data Retention Policy</h4>
                <p className="text-sm text-muted-foreground">
                  Your data is retained for {settings.email.retentionDays} days as configured in Email settings.
                  After this period, data is automatically archived and removed from active storage.
                </p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Privacy Compliance</h4>
                <p className="text-sm text-muted-foreground">
                  We comply with GDPR, CCPA, and other privacy regulations. Your data is encrypted
                  at rest and in transit. We never share your data with third parties without your consent.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Theme</Label>
                <Select
                  value={settings.appearance.theme}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    appearance: { ...prev.appearance, theme: value }
                  }))}
                >
                  <SelectTrigger className="w-[200px] mt-1">
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
                <div className="flex gap-2 mt-2">
                  {['blue', 'green', 'purple', 'red', 'orange'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        appearance: { ...prev.appearance, accentColor: color }
                      }))}
                      className={`h-8 w-8 rounded-full bg-${color}-500 ${
                        settings.appearance.accentColor === color ? 'ring-2 ring-offset-2' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Font Size</Label>
                <Select
                  value={settings.appearance.fontSize}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    appearance: { ...prev.appearance, fontSize: value }
                  }))}
                >
                  <SelectTrigger className="w-[200px] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce spacing for more content density
                    </p>
                  </div>
                  <Switch
                    checked={settings.appearance.compactMode}
                    onCheckedChange={(checked) => setSettings(prev => ({
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
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, showTips: checked }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </TooltipProvider>
  );
}
