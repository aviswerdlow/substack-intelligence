import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

export interface CurrentUserEmail {
  emailAddress: string | null;
}

export interface CurrentUser {
  id: string;
  fullName: string | null;
  primaryEmailAddress: CurrentUserEmail | null;
  emailAddresses: CurrentUserEmail[];
}

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return null;
  }

  const id = user.id ?? user.email ?? null;
  if (!id) {
    return null;
  }

  const email = user.email ?? null;
  const fullName = user.name ?? null;
  const primaryEmail = email ? { emailAddress: email } : null;
  const emailAddresses = email ? [primaryEmail] : [];

  return {
    id,
    fullName,
    primaryEmailAddress: primaryEmail,
    emailAddresses,
  };
}
