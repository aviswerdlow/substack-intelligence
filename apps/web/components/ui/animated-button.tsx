import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { microAnimations } from '@/lib/design-system';

interface AnimatedButtonProps extends ButtonProps {
  animation?: 'pulse' | 'bounce' | 'scale' | 'wiggle' | 'glow';
  ripple?: boolean;
}

export function AnimatedButton({
  children,
  className,
  animation,
  ripple = true,
  onClick,
  ...props
}: AnimatedButtonProps) {
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && !props.disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      
      setRipples(prev => [...prev, { x, y, id }]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);
    }
    
    onClick?.(e);
  };

  const getAnimationClass = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse';
      case 'bounce':
        return 'animate-bounce';
      case 'wiggle':
        return 'animate-[wiggle_1s_ease-in-out_infinite]';
      case 'glow':
        return 'shadow-lg hover:shadow-primary/25 transition-shadow duration-300';
      case 'scale':
      default:
        return microAnimations.press;
    }
  };

  return (
    <Button
      className={cn(
        'relative overflow-hidden',
        getAnimationClass(),
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {/* Ripple Effect */}
      {ripple && ripples.map(({ x, y, id }) => (
        <span
          key={id}
          className="absolute inline-block rounded-full bg-white/30 animate-[ripple_600ms_ease-out]"
          style={{
            left: x,
            top: y,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      
      {children}
      
      <style jsx>{`
        @keyframes ripple {
          from {
            width: 0;
            height: 0;
            opacity: 1;
          }
          to {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }
      `}</style>
    </Button>
  );
}

// Floating Action Button with animation
export function FloatingActionButton({
  children,
  className,
  position = 'bottom-right',
  ...props
}: AnimatedButtonProps & {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}) {
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <AnimatedButton
      className={cn(
        'fixed z-50 h-14 w-14 rounded-full shadow-xl',
        'hover:scale-110 hover:shadow-2xl',
        'transition-all duration-300',
        positionClasses[position],
        className
      )}
      animation="scale"
      {...props}
    >
      {children}
    </AnimatedButton>
  );
}