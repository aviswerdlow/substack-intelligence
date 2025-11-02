'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface PasswordResetFormProps {
  initialEmail?: string | null;
  initialToken?: string | null;
}

export function PasswordResetForm({ initialEmail, initialToken }: PasswordResetFormProps) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [token, setToken] = useState(initialToken ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetMode = Boolean(initialToken && initialEmail);

  const disableSubmit = useMemo(() => {
    if (resetMode) {
      return submitting || !password || password !== confirmPassword;
    }
    return submitting || !email;
  }, [resetMode, submitting, email, password, confirmPassword]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (resetMode) {
        if (!email || !token) {
          setError('Reset link is missing required information. Please request a new email.');
          setSubmitting(false);
          return;
        }

        const response = await fetch('/api/auth/password/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token, password }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Unable to reset password' }));
          setError(data.error ?? 'Unable to reset password');
          return;
        }

        setSuccess(true);
      } else {
        const response = await fetch('/api/auth/password/reset-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Unable to send reset email' }));
          setError(data.error ?? 'Unable to send reset email');
          return;
        }

        setSuccess(true);
      }
    } catch (err) {
      console.error('Password reset flow failed', err);
      setError('Something went wrong. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }, [resetMode, email, token, password]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!resetMode && (
        <p className="text-sm text-muted-foreground">
          Enter your account email and we&apos;ll send you a secure link to reset your password.
        </p>
      )}

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
          disabled={resetMode}
        />
      </div>

      {resetMode && (
        <>
          <div className="space-y-2">
            <Label htmlFor="token">Verification code</Label>
            <Input
              id="token"
              value={token}
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              This code comes from your password reset email. It is pre-filled when following the reset link directly.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-100/60 p-3 text-sm text-emerald-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {resetMode
                ? 'Password updated successfully. You can now sign in with your new password.'
                : 'If an account exists for this email, you will receive a password reset link shortly.'}
            </span>
          </div>
          {resetMode && (
            <Link href="/login" className="text-sm text-primary underline">
              Back to sign in
            </Link>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={disableSubmit}>
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {resetMode ? 'Updating password…' : 'Sending reset email…'}
          </span>
        ) : resetMode ? (
          'Update password'
        ) : (
          'Send reset link'
        )}
      </Button>
    </form>
  );
}
