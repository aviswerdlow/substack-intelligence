import { RegisterForm } from '@/components/auth/RegisterForm';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import Link from 'next/link';

export const metadata = {
  title: 'Create account • Substack Intelligence',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Get started with secure authentication, role-based access, and AI-driven insights.
          </p>
        </div>

        <SocialLoginButtons />

        <div className="relative text-center">
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />
          <span className="relative bg-background px-3 text-xs uppercase tracking-widest text-muted-foreground">
            or sign up with email
          </span>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
