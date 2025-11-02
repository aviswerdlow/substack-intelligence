import { LoginForm } from '@/components/auth/LoginForm';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import Link from 'next/link';

export const metadata = {
  title: 'Sign in • Substack Intelligence',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access your intelligence dashboard and pipeline insights.
          </p>
        </div>

        <SocialLoginButtons />

        <div className="relative text-center">
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />
          <span className="relative bg-background px-3 text-xs uppercase tracking-widest text-muted-foreground">
            or continue with email
          </span>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-muted-foreground">
          Need an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
