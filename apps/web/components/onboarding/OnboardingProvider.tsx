'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

interface OnboardingContextType {
  isOnboarding: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Substack Intelligence! 🎉',
    description: 'Let\'s take a quick tour to help you get started with automated newsletter intelligence.',
    placement: 'bottom'
  },
  {
    id: 'dashboard',
    title: 'Your Intelligence Dashboard',
    description: 'This is your command center. View real-time metrics, recent companies, and system status at a glance.',
    target: '[data-tour="dashboard-stats"]',
    placement: 'bottom'
  },
  {
    id: 'intelligence',
    title: 'Daily Intelligence',
    description: 'Discover companies mentioned in your newsletters with AI-powered extraction and sentiment analysis.',
    target: '[data-tour="intelligence-nav"]',
    placement: 'bottom'
  },
  {
    id: 'emails',
    title: 'Email Processing',
    description: 'Monitor your newsletter pipeline. See which emails have been processed and trigger reprocessing when needed.',
    target: '[data-tour="emails-nav"]',
    placement: 'bottom'
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Trigger manual pipeline runs, extract companies, and check system health with one click.',
    target: '[data-tour="quick-actions"]',
    placement: 'left'
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    description: 'Configure email integration, AI settings, newsletters to track, and more in Settings.',
    target: '[data-tour="settings-nav"]',
    placement: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'Start by connecting your Gmail account in Settings, then trigger your first pipeline run.',
    placement: 'bottom'
  }
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem('hasSeenOnboarding');
    if (!seen && pathname === '/dashboard') {
      // Auto-start onboarding for new users on dashboard
      setTimeout(() => {
        setIsOnboarding(true);
      }, 1000);
    }
    setHasSeenOnboarding(!!seen);
  }, [pathname]);

  const startOnboarding = () => {
    setIsOnboarding(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      
      // Navigate to relevant page for certain steps
      const nextStepId = ONBOARDING_STEPS[currentStep + 1].id;
      if (nextStepId === 'intelligence' && pathname !== '/intelligence') {
        window.location.href = '/intelligence';
      } else if (nextStepId === 'emails' && pathname !== '/emails') {
        window.location.href = '/emails';
      }
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    setIsOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  const completeOnboarding = () => {
    setIsOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('onboardingCompleted', new Date().toISOString());
  };

  const resetOnboarding = () => {
    localStorage.removeItem('hasSeenOnboarding');
    localStorage.removeItem('onboardingCompleted');
    setCurrentStep(0);
    setIsOnboarding(true);
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboarding,
        currentStep,
        steps: ONBOARDING_STEPS,
        startOnboarding,
        nextStep,
        previousStep,
        skipOnboarding,
        completeOnboarding,
        resetOnboarding
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}