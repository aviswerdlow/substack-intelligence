import { redirect } from 'next/navigation';

interface SignUpPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  const redirectUrl = typeof searchParams?.redirect_url === 'string' ? searchParams.redirect_url : undefined;
  const target = redirectUrl ? `/register?callbackUrl=${encodeURIComponent(redirectUrl)}` : '/register';

  redirect(target);
}
