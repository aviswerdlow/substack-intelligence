import { MailCheck } from 'lucide-react';

interface EmailVerificationProps {
  email?: string;
}

export function EmailVerification({ email }: EmailVerificationProps) {
  return (
    <div className="rounded-lg border border-muted-foreground/20 bg-muted/40 p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-semibold">Verify your email</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {email
          ? `We sent a verification link to ${email}. Click the link to activate your account.`
          : 'We sent a verification link to your inbox. Click the link to activate your account.'}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Didn&apos;t get the email? Check your spam folder or request a new verification link from the sign in page.
      </p>
    </div>
  );
}
