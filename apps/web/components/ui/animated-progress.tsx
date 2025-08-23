import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

interface AnimatedProgressProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'striped';
  color?: 'primary' | 'success' | 'warning' | 'error';
  animated?: boolean;
  className?: string;
}

export function AnimatedProgress({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  variant = 'default',
  color = 'primary',
  animated = true,
  className
}: AnimatedProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = Math.min((displayValue / max) * 100, 100);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayValue(value);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, animated]);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-4'
  };

  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  const getProgressBarClass = () => {
    let classes = [colorClasses[color]];
    
    if (variant === 'gradient') {
      classes.push('bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500');
    } else if (variant === 'striped') {
      classes.push('bg-striped');
    }
    
    if (animated) {
      classes.push('transition-all duration-500 ease-out');
    }
    
    return classes.join(' ');
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      
      <div className={cn(
        'w-full bg-muted rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full relative',
            getProgressBarClass()
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={displayValue}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          {variant === 'striped' && (
            <div className="absolute inset-0 bg-stripes opacity-20" />
          )}
        </div>
      </div>
      
      <style jsx>{`
        .bg-striped {
          background-image: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 75%,
            transparent
          );
          background-size: 1rem 1rem;
          animation: progress-bar-stripes 1s linear infinite;
        }
        
        @keyframes progress-bar-stripes {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}

// Step Progress Indicator
interface StepProgressProps {
  steps: Array<{
    label: string;
    status: 'pending' | 'current' | 'completed' | 'error';
  }>;
  className?: string;
}

export function StepProgress({ steps, className }: StepProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300',
                  step.status === 'completed' && 'bg-green-500 text-white scale-110',
                  step.status === 'current' && 'bg-primary text-primary-foreground animate-pulse',
                  step.status === 'pending' && 'bg-muted text-muted-foreground',
                  step.status === 'error' && 'bg-red-500 text-white'
                )}
              >
                {step.status === 'completed' ? (
                  <Check className="h-5 w-5" />
                ) : step.status === 'error' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : step.status === 'current' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span className={cn(
                'text-xs mt-2 text-center max-w-[80px]',
                step.status === 'current' && 'font-medium',
                step.status === 'pending' && 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2">
                <div className="h-full bg-muted relative overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      steps[index + 1].status !== 'pending' ? 'bg-primary w-full' : 'w-0'
                    )}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Circular Progress
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  color?: string;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showLabel = true,
  color = 'rgb(59, 130, 246)',
  className
}: CircularProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = Math.min((displayValue / max) * 100, 100);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={cn('relative inline-flex', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
}