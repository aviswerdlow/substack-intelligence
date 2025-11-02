import { EmailVerification } from '@/components/auth/EmailVerification';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify your email • Substack Intelligence',
};

interface VerifyEmailPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const emailParam = searchParams?.email;
  const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We just sent you a verification email. Follow the link inside to activate your account and access the dashboard.
        </p>
        <EmailVerification email={email} />
      </div>
    </div>
  );
}
