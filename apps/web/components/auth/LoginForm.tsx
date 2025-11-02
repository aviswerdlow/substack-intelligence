'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = '/dashboard' }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authError = searchParams?.get('error');

  const disableSubmit = useMemo(() => {
    return submitting || !email || !password;
  }, [email, password, submitting]);

  const onSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        remember: rememberMe ? 'true' : 'false',
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      console.error('Failed to sign in', err);
      setError('Unable to sign in. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, rememberMe, redirectTo, router]);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 text-sm">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <span>Remember me for 30 days</span>
        </label>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      {(error || authError) && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error || authError}</span>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={disableSubmit}>
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </span>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
