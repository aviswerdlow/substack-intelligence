'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AuthButtons() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until both client-side mounted and Clerk is loaded
  if (!mounted || !isLoaded) {
    return (
      <div className="flex gap-4 justify-center">
        <Button size="lg" className="gap-2" disabled>
          Loading...
        </Button>
      </div>
    );
  }

  // User is signed in - show dashboard button
  if (isSignedIn) {
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
        onClick={() => openSignIn({ redirectUrl: '/dashboard' })}
      >
        Sign In
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="gap-2"
        onClick={() => openSignUp({ redirectUrl: '/dashboard' })}
      >
        Sign Up
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AuthCTA() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until both client-side mounted and Clerk is loaded
  if (!mounted || !isLoaded) {
    return (
      <Button size="lg" className="w-full" disabled>
        Loading...
      </Button>
    );
  }

  // User is signed in - show dashboard button
  if (isSignedIn) {
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
        onClick={() => openSignIn({ redirectUrl: '/dashboard' })}
      >
        Sign In to Dashboard
      </Button>
      <p className="text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Button
          variant="link"
          className="p-0 h-auto"
          onClick={() => openSignUp({ redirectUrl: '/dashboard' })}
        >
          Sign up
        </Button>
      </p>
    </div>
  );
}