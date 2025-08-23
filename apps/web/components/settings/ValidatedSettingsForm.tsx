'use client';

import React from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useFieldValidation, useSettingsValidation } from '@/hooks/useSettingsValidation';
import { ValidationError, ValidationSummary } from './ValidationError';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

// Example: Account Settings Form with Validation
export function AccountSettingsForm() {
  const { settings, setSettings, saveSettings, isSaving } = useSettings();
  const validation = useSettingsValidation('account');

  const nameValidation = useFieldValidation('account.name', 'account');
  const emailValidation = useFieldValidation('account.email', 'account');
  const timezoneValidation = useFieldValidation('account.timezone', 'account');

  const handleSave = async () => {
    if (validation.isValid) {
      await saveSettings('account');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Manage your account information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Summary */}
        {validation.errors.length > 0 && (
          <ValidationSummary errors={validation.errors} />
        )}

        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className={nameValidation.hasError ? 'text-red-500' : ''}>
            Name *
          </Label>
          <Input
            id="name"
            value={settings.account.name}
            onChange={(e) => setSettings({
              ...settings,
              account: { ...settings.account, name: e.target.value }
            })}
            className={nameValidation.hasError ? 'border-red-500' : ''}
            placeholder="Enter your name"
          />
          <ValidationError message={nameValidation.error} />
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className={emailValidation.hasError ? 'text-red-500' : ''}>
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={settings.account.email}
            onChange={(e) => setSettings({
              ...settings,
              account: { ...settings.account, email: e.target.value }
            })}
            className={emailValidation.hasError ? 'border-red-500' : ''}
            placeholder="your@email.com"
          />
          <ValidationError message={emailValidation.error} />
        </div>

        {/* Role Field */}
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={settings.account.role}
            onValueChange={(value) => setSettings({
              ...settings,
              account: { ...settings.account, role: value }
            })}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="User">User</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Developer">Developer</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timezone Field */}
        <div className="space-y-2">
          <Label htmlFor="timezone" className={timezoneValidation.hasError ? 'text-red-500' : ''}>
            Timezone *
          </Label>
          <Select
            value={settings.account.timezone}
            onValueChange={(value) => setSettings({
              ...settings,
              account: { ...settings.account, timezone: value }
            })}
          >
            <SelectTrigger id="timezone" className={timezoneValidation.hasError ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select your timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
              <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
              <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
              <SelectItem value="Europe/London">London (GMT)</SelectItem>
              <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
              <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
            </SelectContent>
          </Select>
          <ValidationError message={timezoneValidation.error} />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!validation.isValid || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Example: AI Settings Form with Complex Validation
export function AISettingsForm() {
  const { settings, setSettings, saveSettings, isSaving } = useSettings();
  const validation = useSettingsValidation('ai');

  const handleSave = async () => {
    if (validation.isValid) {
      await saveSettings('ai');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Configuration</CardTitle>
        <CardDescription>
          Configure AI providers and enrichment settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Summary */}
        {validation.errors.length > 0 && (
          <ValidationSummary errors={validation.errors} />
        )}

        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">AI Provider</Label>
          <Select
            value={settings.ai.provider}
            onValueChange={(value) => setSettings({
              ...settings,
              ai: { ...settings.ai, provider: value as 'anthropic' | 'openai' | 'auto' }
            })}
          >
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="openai">OpenAI (GPT)</SelectItem>
              <SelectItem value="auto">Auto-select</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Anthropic API Key */}
        <div className="space-y-2">
          <Label htmlFor="anthropic-key">
            Anthropic API Key {settings.ai.enableEnrichment && '(Required for enrichment)'}
          </Label>
          <Input
            id="anthropic-key"
            type="password"
            value={settings.ai.anthropicApiKey || ''}
            onChange={(e) => setSettings({
              ...settings,
              ai: { ...settings.ai, anthropicApiKey: e.target.value }
            })}
            placeholder="sk-ant-api..."
            className={validation.getFieldError('ai.anthropicApiKey') ? 'border-red-500' : ''}
          />
          <ValidationError message={validation.getFieldError('ai.anthropicApiKey')} />
        </div>

        {/* OpenAI API Key */}
        <div className="space-y-2">
          <Label htmlFor="openai-key">
            OpenAI API Key {settings.ai.enableEnrichment && '(Required for enrichment)'}
          </Label>
          <Input
            id="openai-key"
            type="password"
            value={settings.ai.openaiApiKey || ''}
            onChange={(e) => setSettings({
              ...settings,
              ai: { ...settings.ai, openaiApiKey: e.target.value }
            })}
            placeholder="sk-..."
            className={validation.getFieldError('ai.openaiApiKey') ? 'border-red-500' : ''}
          />
          <ValidationError message={validation.getFieldError('ai.openaiApiKey')} />
        </div>

        {/* Temperature Slider */}
        <div className="space-y-2">
          <Label htmlFor="temperature">
            Temperature: {settings.ai.temperature}
          </Label>
          <input
            id="temperature"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.ai.temperature}
            onChange={(e) => setSettings({
              ...settings,
              ai: { ...settings.ai, temperature: parseFloat(e.target.value) }
            })}
            className="w-full"
          />
          <ValidationError message={validation.getFieldError('ai.temperature')} />
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <Label htmlFor="max-tokens">Max Tokens</Label>
          <Input
            id="max-tokens"
            type="number"
            value={settings.ai.maxTokens}
            onChange={(e) => setSettings({
              ...settings,
              ai: { ...settings.ai, maxTokens: parseInt(e.target.value) || 0 }
            })}
            min="1"
            max="100000"
            className={validation.getFieldError('ai.maxTokens') ? 'border-red-500' : ''}
          />
          <ValidationError message={validation.getFieldError('ai.maxTokens')} />
        </div>

        {/* Enable Enrichment */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enrichment">Enable AI Enrichment</Label>
            <p className="text-sm text-muted-foreground">
              Automatically enrich company data with AI
            </p>
          </div>
          <Switch
            id="enrichment"
            checked={settings.ai.enableEnrichment}
            onCheckedChange={(checked) => setSettings({
              ...settings,
              ai: { ...settings.ai, enableEnrichment: checked }
            })}
          />
        </div>
        <ValidationError message={validation.getFieldError('ai.enableEnrichment')} />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!validation.isValid || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save AI Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}