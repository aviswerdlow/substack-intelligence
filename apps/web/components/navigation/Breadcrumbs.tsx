'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
}

const routeMap: Record<string, string> = {
  dashboard: 'Dashboard',
  intelligence: 'Intelligence',
  emails: 'Email Processing',
  reports: 'Reports',
  analytics: 'Analytics',
  settings: 'Settings',
  companies: 'Companies',
  'sign-in': 'Sign In',
  'sign-up': 'Sign Up'
};

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  
  // Don't show breadcrumbs on home page
  if (pathname === '/' || pathname === '') return null;
  
  // Parse the pathname into segments
  const segments = pathname.split('/').filter(Boolean);
  
  // Build breadcrumb items
  const items: BreadcrumbItem[] = [
    {
      label: 'Home',
      href: '/',
      icon: Home
    }
  ];
  
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    
    // Get the label for this segment
    const label = routeMap[segment] || segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    items.push({
      label,
      href: isLast ? undefined : currentPath
    });
  });
  
  // Don't show breadcrumbs if only home
  if (items.length <= 1) return null;
  
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-4', className)}>
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
              )}
              
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-foreground font-medium">
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Breadcrumb with custom items support
export function CustomBreadcrumbs({ 
  items,
  className 
}: { 
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-4', className)}>
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
              )}
              
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-foreground font-medium">
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}