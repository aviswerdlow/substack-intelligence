import { redirect } from 'next/navigation';

interface SignInPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  const redirectUrl = typeof searchParams?.redirect_url === 'string' ? searchParams.redirect_url : undefined;
  const target = redirectUrl ? `/login?callbackUrl=${encodeURIComponent(redirectUrl)}` : '/login';

  redirect(target);
}
