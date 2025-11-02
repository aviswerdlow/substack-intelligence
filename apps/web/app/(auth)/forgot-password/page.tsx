import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset password • Substack Intelligence',
};

interface ForgotPasswordPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const emailParam = (Array.isArray(searchParams.email) ? searchParams.email[0] : searchParams.email) ?? undefined;
  const tokenParam =
    (Array.isArray(searchParams.token) ? searchParams.token[0] : searchParams.token) ??
    (Array.isArray(searchParams.code) ? searchParams.code[0] : searchParams.code) ??
    undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            {tokenParam
              ? 'Enter a new password to secure your account.'
              : 'We will send you a secure link to reset your password.'}
          </p>
        </div>

        <PasswordResetForm initialEmail={emailParam} initialToken={tokenParam} />
      </div>
    </div>
  );
}
