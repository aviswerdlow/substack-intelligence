'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/test/dashboard' },
  { name: 'Intelligence', href: '/test/intelligence' },
  { name: 'Companies', href: '/test/companies' },
  { name: 'Emails', href: '/test/emails' },
  { name: 'Reports', href: '/test/reports' },
  { name: 'Analytics', href: '/test/analytics' },
  { name: 'Settings', href: '/test/settings' },
];

export function TestDashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-6">
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname === item.href
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}