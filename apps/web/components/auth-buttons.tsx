'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionUser } from '@/hooks/use-session-user';

export function AuthButtons() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useSessionUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignIn = () => {
    void signIn(undefined, { callbackUrl: '/dashboard' });
  };

  const handleSignUp = () => {
    router.push('/register');
  };

  // Don't render anything until both client-side mounted and session state is resolved
  if (!mounted || isLoading) {
    return (
      <div className="flex gap-4 justify-center">
        <Button size="lg" className="gap-2" disabled>
          Loading...
        </Button>
      </div>
    );
  }

  // User is signed in - show dashboard button
  if (isAuthenticated) {
    return (
      <Link href="/dashboard">
        <Button size="lg" className="gap-2">
          View Intelligence Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  // User is not signed in - show sign in/up buttons
  return (
    <div className="flex gap-4 justify-center">
      <Button
        size="lg"
        className="gap-2"
        onClick={handleSignIn}
      >
        Sign In
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="gap-2"
        onClick={handleSignUp}
      >
        Sign Up
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AuthCTA() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useSessionUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignIn = () => {
    void signIn(undefined, { callbackUrl: '/dashboard' });
  };

  const handleSignUp = () => {
    router.push('/register');
  };

  // Don't render anything until both client-side mounted and session state is resolved
  if (!mounted || isLoading) {
    return (
      <Button size="lg" className="w-full" disabled>
        Loading...
      </Button>
    );
  }

  // User is signed in - show dashboard button
  if (isAuthenticated) {
    return (
      <Link href="/dashboard">
        <Button size="lg" className="w-full">
          Go to Dashboard
        </Button>
      </Link>
    );
  }

  // User is not signed in - show sign in button
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full"
        onClick={handleSignIn}
      >
        Sign In to Dashboard
      </Button>
      <p className="text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Button
          variant="link"
          className="p-0 h-auto"
          onClick={handleSignUp}
        >
          Sign up
        </Button>
      </p>
    </div>
  );
}