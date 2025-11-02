'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Building2,
  Home,
  Mail,
  Settings,
  FileText,
  PenSquare
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    dataTour: 'dashboard-nav'
  },
  {
    name: 'Intelligence',
    href: '/intelligence',
    icon: Building2,
    dataTour: 'intelligence-nav'
  },
  {
    name: 'Emails',
    href: '/emails',
    icon: Mail,
    dataTour: 'emails-nav'
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    dataTour: 'reports-nav'
  },
  {
    name: 'Content',
    href: '/content',
    icon: PenSquare,
    dataTour: 'content-nav'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    dataTour: 'analytics-nav'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    dataTour: 'settings-nav'
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href || 
          (pathname.startsWith(item.href) && item.href !== '/dashboard');
        
        return (
          <Link
            key={item.name}
            href={item.href}
            data-tour={item.dataTour}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}