'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { a11y } from '@/lib/design-system';

interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  screenReaderMode: boolean;
  focusIndicators: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  setFocus: (element: HTMLElement | null) => void;
  trapFocus: (container: HTMLElement) => () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    keyboardNavigation: true,
    screenReaderMode: false,
    focusIndicators: true,
  });
  
  const announcerRef = useRef<HTMLDivElement>(null);
  const focusHistoryRef = useRef<HTMLElement[]>([]);

  // Detect user preferences on mount
  useEffect(() => {
    // Check for reduced motion preference
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Check for high contrast preference
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    // Check for saved preferences
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(prev => ({ ...prev, ...parsed }));
    } else {
      setSettings(prev => ({
        ...prev,
        reduceMotion,
        highContrast,
      }));
    }

    // Apply settings to document
    applySettingsToDocument(settings);
  }, []);

  // Apply settings to document element
  const applySettingsToDocument = useCallback((newSettings: AccessibilitySettings) => {
    const html = document.documentElement;
    
    // Reduce motion
    if (newSettings.reduceMotion) {
      html.classList.add('reduce-motion');
    } else {
      html.classList.remove('reduce-motion');
    }
    
    // High contrast
    if (newSettings.highContrast) {
      html.classList.add('high-contrast');
    } else {
      html.classList.remove('high-contrast');
    }
    
    // Large text
    if (newSettings.largeText) {
      html.classList.add('large-text');
    } else {
      html.classList.remove('large-text');
    }
    
    // Focus indicators
    if (newSettings.focusIndicators) {
      html.classList.add('focus-indicators');
    } else {
      html.classList.remove('focus-indicators');
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Save to localStorage
      localStorage.setItem('accessibilitySettings', JSON.stringify(updated));
      
      // Apply to document
      applySettingsToDocument(updated);
      
      return updated;
    });
  }, [applySettingsToDocument]);

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcerRef.current) return;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.textContent = message;
    
    announcerRef.current.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      if (announcerRef.current?.contains(announcement)) {
        announcerRef.current.removeChild(announcement);
      }
    }, 1000);
  }, []);

  // Focus management
  const setFocus = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    
    // Store current focus
    if (document.activeElement instanceof HTMLElement) {
      focusHistoryRef.current.push(document.activeElement);
    }
    
    // Set new focus
    element.focus();
    
    // Ensure element is in view
    element.scrollIntoView({ block: 'nearest', behavior: settings.reduceMotion ? 'auto' : 'smooth' });
  }, [settings.reduceMotion]);

  // Focus trap for modals/dialogs
  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    firstElement?.focus();
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore previous focus
      const previousFocus = focusHistoryRef.current.pop();
      previousFocus?.focus();
    };
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSettings,
        announce,
        setFocus,
        trapFocus,
      }}
    >
      {children}
      
      {/* Screen reader announcer (visually hidden) */}
      <div
        ref={announcerRef}
        className={a11y.srOnly}
        aria-live="polite"
        aria-atomic="true"
      />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// Accessibility toolbar component
export function AccessibilityToolbar() {
  const { settings, updateSettings } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Accessibility settings"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-64 bg-background border rounded-lg shadow-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Accessibility Options</h3>
          
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
              className="rounded"
            />
            Reduce motion
          </label>
          
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => updateSettings({ highContrast: e.target.checked })}
              className="rounded"
            />
            High contrast
          </label>
          
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={settings.largeText}
              onChange={(e) => updateSettings({ largeText: e.target.checked })}
              className="rounded"
            />
            Large text
          </label>
          
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={settings.focusIndicators}
              onChange={(e) => updateSettings({ focusIndicators: e.target.checked })}
              className="rounded"
            />
            Focus indicators
          </label>
        </div>
      )}
    </div>
  );
}