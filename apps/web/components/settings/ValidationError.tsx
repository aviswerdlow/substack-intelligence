import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationErrorProps {
  message?: string;
  severity?: 'error' | 'warning' | 'info';
  className?: string;
}

export function ValidationError({ 
  message, 
  severity = 'error',
  className 
}: ValidationErrorProps) {
  if (!message) return null;

  const Icon = severity === 'error' ? AlertCircle : 
                severity === 'warning' ? AlertTriangle : 
                Info;

  const colorClasses = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  return (
    <div className={cn(
      'flex items-start gap-1.5 mt-1 text-sm',
      colorClasses[severity],
      className
    )}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface ValidationSummaryProps {
  errors: Array<{ field: string; message: string }>;
  className?: string;
}

export function ValidationSummary({ errors, className }: ValidationSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div className={cn(
      'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4',
      className
    )}>
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
            Please fix the following errors:
          </h4>
          <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
            {errors.map((error, index) => (
              <li key={`${error.field}-${index}`} className="flex items-start gap-1">
                <span className="text-red-500 mt-0.5">•</span>
                <span>
                  <strong>{error.field}:</strong> {error.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}