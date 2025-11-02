'use client';

import { SignIn } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();

  // Monitor for successful authentication to trigger Gmail OAuth
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Check if user just signed in via Clerk
      const urlParams = new URLSearchParams(window.location.search);
      const signInComplete = urlParams.get('__clerk_status') === 'verified';

      if (signInComplete) {
        // After Clerk sign-in, redirect to Gmail OAuth flow
        router.push('/api/auth/gmail/connect');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Welcome to Substack Intelligence</h1>
          <p className="text-muted-foreground mt-4">
            Sign in with Google to access your Gmail newsletters and insights
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>One-click setup:</strong> Sign in with Google to automatically connect your Gmail for newsletter analysis
            </p>
          </div>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
              card: 'shadow-lg border-0',
              socialButtonsBlockButton: 'bg-blue-600 hover:bg-blue-700 text-white border-0',
              socialButtonsBlockButtonText: 'font-medium',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              dividerRow: 'hidden',
              formFieldInput: 'hidden',
              formFieldLabel: 'hidden',
              identityPreview: 'hidden',
              formHeaderTitle: 'hidden',
              formHeaderSubtitle: 'hidden',
              otpCodeFieldInput: 'hidden',
              formResendCodeLink: 'hidden',
            },
            layout: {
              socialButtonsPlacement: 'top',
              socialButtonsVariant: 'blockButton',
            }
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/auth/gmail-setup"
        />
      </div>
    </div>
  );
}