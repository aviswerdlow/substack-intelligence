import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
  ...props
}: SkeletonProps) {
  const baseClass = 'animate-pulse bg-muted rounded';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    card: 'rounded-lg'
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClass,
              variantClasses[variant],
              i === lines - 1 && 'w-3/4', // Last line shorter
              className
            )}
            style={{ width: i === lines - 1 ? '75%' : width, height: height || '1rem' }}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClass, variantClasses[variant], className)}
      style={{ width, height }}
      {...props}
    />
  );
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)} {...props}>
      <div className="space-y-4">
        <Skeleton variant="rectangular" height={20} width="40%" />
        <Skeleton variant="text" lines={3} />
        <div className="flex gap-2">
          <Skeleton variant="rectangular" height={32} width={80} />
          <Skeleton variant="rectangular" height={32} width={80} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full">
      <div className="border rounded-lg">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex gap-4">
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
          </div>
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b last:border-0 p-4">
            <div className="flex gap-4">
              <Skeleton variant="text" width="20%" />
              <Skeleton variant="text" width="30%" />
              <Skeleton variant="text" width="20%" />
              <Skeleton variant="rectangular" width="15%" height={24} />
              <Skeleton variant="rectangular" width="15%" height={24} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-4">
            <Skeleton variant="text" width="60%" className="mb-2" />
            <Skeleton variant="rectangular" height={32} width="40%" className="mb-1" />
            <Skeleton variant="text" width="80%" />
          </div>
        ))}
      </div>
      
      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}