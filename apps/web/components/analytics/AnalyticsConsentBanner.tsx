'use client';

import { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/lib/analytics';

export function AnalyticsConsentBanner() {
  const { consentStatus, updateConsent } = useAnalytics();
  const [dismissed, setDismissed] = useState(false);

  if (consentStatus !== 'unset' || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 md:inset-x-auto md:right-6 md:w-[380px]">
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <h2 className="font-semibold leading-none">Help us improve Substack Intelligence</h2>
              <p className="mt-1 text-muted-foreground">
                We use privacy-focused analytics to understand product usage. Data is anonymized, stored in the EU, and processed only after consent.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="sm:flex-1"
                onClick={async () => {
                  setDismissed(true);
                  await updateConsent(false);
                }}
              >
                <ShieldOff className="mr-2 h-4 w-4" aria-hidden="true" />
                Decline
              </Button>
              <Button
                size="sm"
                className="sm:flex-1"
                onClick={async () => {
                  setDismissed(true);
                  await updateConsent(true);
                }}
              >
                <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                Accept
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
