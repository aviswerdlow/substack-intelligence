'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { SessionContextValue } from 'next-auth/react';

interface SessionUserHookResult {
  session: Session | null;
  status: SessionContextValue['status'];
  user: Session['user'] | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  update: SessionContextValue['update'];
}

export function useSessionUser(): SessionUserHookResult {
  const { data, status, update } = useSession();
  const user = data?.user ?? null;
  const userId = user?.id ?? null;

  return useMemo(
    () => ({
      session: data ?? null,
      status,
      user,
      userId,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      update,
    }),
    [data, status, update, user, userId]
  );
}
