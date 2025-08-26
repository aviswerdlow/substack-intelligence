'use client';

import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues with the ActiveOperationsBar
export const ActiveOperationsBar = dynamic(
  () => import('./ActiveOperationsBar').then(mod => mod.ActiveOperationsBar),
  { 
    ssr: false,
    loading: () => (
      <div className="mb-6 rounded-lg border bg-card p-4 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </div>
    )
  }
);