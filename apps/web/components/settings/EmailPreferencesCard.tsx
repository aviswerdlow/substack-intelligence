'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailPreferences } from '@/hooks/useEmailPreferences';

type ToggleKey = 'newsletter' | 'new_posts' | 'comments' | 'marketing' | 'product_updates';

const DIGEST_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const FORMAT_OPTIONS = [
  { value: 'html', label: 'Rich HTML' },
  { value: 'text', label: 'Plain text' },
  { value: 'both', label: 'Send both' },
];

export function EmailPreferencesCard() {
  const { preferences, isLoading, isSaving, updatePreferences } = useEmailPreferences();
  const [localPreferences, setLocalPreferences] = useState(preferences);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleToggle = async (key: ToggleKey, value: boolean) => {
    if (!localPreferences) return;

    const previous = localPreferences;
    const optimistic = { ...localPreferences, [key]: value };
    setLocalPreferences(optimistic);

    try {
      await updatePreferences({ [key]: value } as any);
      toast.success('Email preferences updated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update preference');
      // revert on failure
      setLocalPreferences(previous);
    }
  };

  const handleSelectChange = async (key: 'digest_frequency' | 'preferred_format', value: string) => {
    if (!localPreferences) return;

    const previous = localPreferences;
    const optimistic = { ...localPreferences, [key]: value } as typeof localPreferences;
    setLocalPreferences(optimistic);

    try {
      await updatePreferences({ [key]: value } as any);
      toast.success('Email preferences updated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update preference');
      setLocalPreferences(previous);
    }
  };

  if (isLoading && !localPreferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
          <CardDescription>Configure the categories of email you want to receive.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!localPreferences) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email notifications</CardTitle>
            <CardDescription>Control transactional, marketing, and digest emails.</CardDescription>
          </div>
          {isSaving && <Badge variant="outline">Saving…</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-dashed border-muted p-4">
          <div>
            <Label className="text-base">Product updates & newsletters</Label>
            <p className="text-sm text-muted-foreground">
              Insights on new features, curated newsletter summaries, and platform announcements.
            </p>
          </div>
          <Switch
            checked={localPreferences.newsletter}
            onCheckedChange={value => handleToggle('newsletter', value)}
            disabled={isSaving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-dashed border-muted p-4">
          <div>
            <Label className="text-base">New post alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified whenever we publish fresh analyses or intelligence briefings.
            </p>
          </div>
          <Switch
            checked={localPreferences.new_posts}
            onCheckedChange={value => handleToggle('new_posts', value)}
            disabled={isSaving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-dashed border-muted p-4">
          <div>
            <Label className="text-base">Comment notifications</Label>
            <p className="text-sm text-muted-foreground">Alerts when collaborators respond to your intelligence notes.</p>
          </div>
          <Switch
            checked={localPreferences.comments}
            onCheckedChange={value => handleToggle('comments', value)}
            disabled={isSaving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-dashed border-muted p-4">
          <div>
            <Label className="text-base">Marketing updates</Label>
            <p className="text-sm text-muted-foreground">Occasional offers, webinars, and customer programs.</p>
          </div>
          <Switch
            checked={localPreferences.marketing}
            onCheckedChange={value => handleToggle('marketing', value)}
            disabled={isSaving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-dashed border-muted p-4">
          <div>
            <Label className="text-base">Product changelog</Label>
            <p className="text-sm text-muted-foreground">Critical improvements and infrastructure updates.</p>
          </div>
          <Switch
            checked={localPreferences.product_updates}
            onCheckedChange={value => handleToggle('product_updates', value)}
            disabled={isSaving}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Digest cadence</Label>
            <Select
              value={localPreferences.digest_frequency}
              onValueChange={value => handleSelectChange('digest_frequency', value)}
              disabled={isSaving}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select cadence" />
              </SelectTrigger>
              <SelectContent>
                {DIGEST_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Email format</Label>
            <Select
              value={localPreferences.preferred_format}
              onValueChange={value => handleSelectChange('preferred_format', value)}
              disabled={isSaving}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-muted bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Unsubscribe link</p>
          <p className="mt-1">
            Each email includes a one-click unsubscribe link referencing your token
            {localPreferences.unsubscribe_token ? ` (${localPreferences.unsubscribe_token.slice(0, 8)}…)` : ''}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
