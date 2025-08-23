// Design System Tokens and Constants
// This file defines the core design system for consistent UI across the application

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;

export const typography = {
  // Font families
  fonts: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  
  // Font sizes
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  
  // Font weights
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line heights
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
} as const;

export const colors = {
  // Semantic colors for different states
  semantic: {
    success: {
      light: '#10b981', // green-500
      DEFAULT: '#059669', // green-600
      dark: '#047857', // green-700
      bg: '#d1fae5', // green-100
      bgDark: '#064e3b', // green-900
    },
    warning: {
      light: '#f59e0b', // amber-500
      DEFAULT: '#d97706', // amber-600
      dark: '#b45309', // amber-700
      bg: '#fed7aa', // amber-100
      bgDark: '#78350f', // amber-900
    },
    error: {
      light: '#ef4444', // red-500
      DEFAULT: '#dc2626', // red-600
      dark: '#b91c1c', // red-700
      bg: '#fee2e2', // red-100
      bgDark: '#7f1d1d', // red-900
    },
    info: {
      light: '#3b82f6', // blue-500
      DEFAULT: '#2563eb', // blue-600
      dark: '#1d4ed8', // blue-700
      bg: '#dbeafe', // blue-100
      bgDark: '#1e3a8a', // blue-900
    },
  },
  
  // Chart colors for data visualization
  chart: [
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#84cc16', // lime-500
  ],
} as const;

export const animations = {
  // Transition durations
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  // Easing functions
  easings: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Predefined animations
  presets: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    slideIn: {
      from: { transform: 'translateY(10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
  },
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.125rem',  // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// Z-index scale for layering
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  notification: 70,
} as const;

// Accessibility helpers
export const a11y = {
  // Focus styles
  focusRing: 'ring-2 ring-primary ring-offset-2',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  
  // Screen reader only
  srOnly: 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
  
  // Reduced motion
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  
  // High contrast
  highContrast: '@media (prefers-contrast: high)',
} as const;

// Micro-interaction animations
export const microAnimations = {
  hover: 'transition-all duration-200 ease-out hover:scale-105',
  press: 'transition-all duration-150 ease-out active:scale-95',
  focus: 'transition-all duration-200 ease-out focus:scale-105',
  loading: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  wiggle: 'animate-[wiggle_1s_ease-in-out_infinite]',
} as const;

// Helper function to apply consistent transitions
export function transition(
  property: string = 'all',
  duration: keyof typeof animations.durations = 'normal',
  easing: keyof typeof animations.easings = 'inOut'
): string {
  return `transition-${property} duration-${animations.durations[duration]} ${animations.easings[easing]}`;
}

// Helper function for responsive design
export function responsive<T>(values: {
  base?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}): string {
  const classes: string[] = [];
  
  if (values.base) classes.push(`${values.base}`);
  if (values.sm) classes.push(`sm:${values.sm}`);
  if (values.md) classes.push(`md:${values.md}`);
  if (values.lg) classes.push(`lg:${values.lg}`);
  if (values.xl) classes.push(`xl:${values.xl}`);
  if (values['2xl']) classes.push(`2xl:${values['2xl']}`);
  
  return classes.join(' ');
}