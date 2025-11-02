import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', role = 'separator', ...props }, ref) => {
    const isHorizontal = orientation === 'horizontal';
    return (
      <div
        ref={ref}
        role={role}
        aria-orientation={orientation}
        className={cn(
          'bg-border',
          isHorizontal ? 'h-px w-full' : 'h-full w-px',
          className
        )}
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';

export default Separator;
