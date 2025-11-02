'use client';

import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { signIn, getProviders, type ClientSafeProvider } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Github, Mail } from 'lucide-react';

interface SocialLoginButtonsProps {
  callbackUrl?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
};

const PROVIDER_ICONS: Record<string, JSX.Element> = {
  google: <Mail className="h-4 w-4" />, // Placeholder icon
  github: <Github className="h-4 w-4" />,
};

export function SocialLoginButtons({ callbackUrl = '/dashboard' }: SocialLoginButtonsProps) {
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);

  useEffect(() => {
    let mounted = true;
    getProviders()
      .then((loadedProviders) => {
        if (mounted) {
          setProviders(loadedProviders ?? null);
        }
      })
      .catch((error) => {
        console.warn('Failed to load auth providers', error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const socialProviders = useMemo(() => {
    if (!providers) {
      return [] as ClientSafeProvider[];
    }
    return Object.values(providers).filter((provider) => provider.type === 'oauth');
  }, [providers]);

  if (!socialProviders.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {socialProviders.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn(provider.id, { callbackUrl })}
        >
          <span className="mr-2 flex h-4 w-4 items-center justify-center">
            {PROVIDER_ICONS[provider.id] ?? <Mail className="h-4 w-4" />}
          </span>
          {PROVIDER_LABELS[provider.id] ?? `Continue with ${provider.name}`}
        </Button>
      ))}
    </div>
  );
}
