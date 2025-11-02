'use client';

import { useMemo } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut, UserRound } from 'lucide-react';

interface SessionAccountControlsProps {
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

function getInitials(user?: SessionAccountControlsProps['user']): string {
  const source = user?.name || user?.email || '';
  if (!source) {
    return 'U';
  }

  const [first, second] = source.trim().split(/\s+/);
  if (first && second) {
    return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
  }

  return (first?.[0] ?? source[0] ?? 'U').toUpperCase();
}

export function SessionAccountControls({ user }: SessionAccountControlsProps) {
  const initials = useMemo(() => getInitials(user), [user]);
  const displayName = user?.name || user?.email || 'Account';

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
        {user?.name || user?.email ? initials : <UserRound className="h-4 w-4" />}
      </div>
      <div className="text-right text-sm">
        <p className="font-medium leading-tight">{displayName}</p>
        {user?.email && (
          <p className="text-xs text-muted-foreground">{user.email}</p>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
