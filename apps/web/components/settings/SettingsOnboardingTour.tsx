'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@radix-ui/react-progress';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle,
  Trophy,
  Zap,
  Target,
  Compass,
  Flag,
  Play,
  Pause,
  SkipForward,
  HelpCircle,
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import Cookies from 'js-cookie';

// Tour steps configuration
const tourSteps: Step[] = [
  {
    target: '.settings-header',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold">Welcome to Settings!</h3>
        </div>
        <p className="text-sm text-gray-600">
          Let\'s take a quick tour to help you get the most out of your Substack Intelligence settings.
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Zap className="h-3 w-3" />
          <span>This tour takes about 2 minutes</span>
        </div>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.settings-accordion-nav',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold">Organized Settings Groups</h3>
        <p className="text-sm text-gray-600">
          Your settings are organized into logical groups. Click any group to expand and see the settings inside.
        </p>
        <div className="bg-blue-50 rounded p-2 text-xs">
          💡 Tip: Groups with unsaved changes show an orange dot
        </div>
      </div>
    ),
    placement: 'right',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="account-settings"]',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold">Account Settings</h3>
        <p className="text-sm text-gray-600">
          Start by setting up your profile information and timezone. This helps personalize your experience.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="ai-provider"]',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold">AI Configuration</h3>
        <p className="text-sm text-gray-600">
          Choose your preferred AI provider. The models will automatically update based on your selection.
        </p>
        <div className="bg-purple-50 rounded p-2 text-xs">
          🤖 We support both Anthropic Claude and OpenAI GPT models
        </div>
      </div>
    ),
    placement: 'bottom',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="api-key-field"]',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold">API Key Validation</h3>
        <p className="text-sm text-gray-600">
          Enter your API key and we\'ll automatically validate it. You\'ll see available models and rate limits.
        </p>
        <div className="bg-green-50 rounded p-2 text-xs">
          ✅ Keys are validated in real-time as you type
        </div>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="temperature-slider"]',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold">Temperature Control</h3>
        <p className="text-sm text-gray-600">
          Adjust AI creativity. Lower values (0.2) are more focused, higher values (0.8) are more creative.
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
          <div className="text-center p-1 bg-gray-100 rounded">
            <div className="font-medium">0.2</div>
            <div className="text-gray-500">Precise</div>
          </div>
          <div className="text-center p-1 bg-blue-100 rounded">
            <div className="font-medium">0.7</div>
            <div className="text-gray-500">Balanced</div>
          </div>
          <div className="text-center p-1 bg-purple-100 rounded">
            <div className="font-medium">1.0</div>
            <div className="text-gray-500">Creative</div>
          </div>
        </div>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="company-watchlist"]',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold">Company Tracking</h3>
        <p className="text-sm text-gray-600">
          Add companies you want to track across all your newsletters. We\'ll alert you when they\'re mentioned.
        </p>
        <div className="bg-yellow-50 rounded p-2 text-xs">
          📊 Auto-detect finds new companies automatically
        </div>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="notification-thresholds"]',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold">Alert Thresholds</h3>
        <p className="text-sm text-gray-600">
          Set when you want to be notified. Adjust sentiment thresholds and mention volume triggers.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.tab-save-controls',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold">Smart Save System</h3>
        <p className="text-sm text-gray-600">
          Each tab saves independently. Enable auto-save or use Cmd+S to save manually.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <span>Orange = Unsaved changes</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Green = Auto-save active</span>
          </div>
        </div>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="help-tooltips"]',
    content: (
      <div className="space-y-3">
        <h3 className="font-semibold">Help is Always Available</h3>
        <p className="text-sm text-gray-600">
          Look for the <HelpCircle className="inline h-3 w-3" /> icons next to settings. Hover for detailed explanations and examples.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.settings-header',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold">You\'re All Set!</h3>
        </div>
        <p className="text-sm text-gray-600">
          You now know the basics of the settings page. Explore each section to customize your experience.
        </p>
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded p-3 mt-3">
          <p className="text-xs font-medium text-gray-700">Quick Actions:</p>
          <ul className="text-xs text-gray-600 mt-1 space-y-1">
            <li>• Add your API keys to enable AI features</li>
            <li>• Set up company tracking for insights</li>
            <li>• Configure alerts for important updates</li>
          </ul>
        </div>
      </div>
    ),
    placement: 'center',
  },
];

// Achievement system
const achievements = [
  { id: 'first-save', name: 'First Save', icon: '💾', description: 'Save your first setting' },
  { id: 'api-connected', name: 'API Connected', icon: '🔗', description: 'Connect an AI provider' },
  { id: 'company-added', name: 'Tracker Set', icon: '📊', description: 'Add your first company' },
  { id: 'tour-completed', name: 'Tour Master', icon: '🎓', description: 'Complete the onboarding tour' },
  { id: 'all-configured', name: 'Fully Configured', icon: '✨', description: 'Configure all settings' },
];

interface SettingsOnboardingTourProps {
  autoStart?: boolean;
  onComplete?: () => void;
  className?: string;
}

export function SettingsOnboardingTour({
  autoStart = false,
  onComplete,
  className,
}: SettingsOnboardingTourProps) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [showAchievement, setShowAchievement] = useState<typeof achievements[0] | null>(null);
  
  // Check if user has completed tour before
  useEffect(() => {
    const completed = Cookies.get('settings-tour-completed');
    const isFirstTime = !completed && !settings?.account?.name;
    
    if (autoStart && isFirstTime) {
      setTimeout(() => setRun(true), 1000);
    }
    
    // Load unlocked achievements
    const saved = localStorage.getItem('settings-achievements');
    if (saved) {
      setUnlockedAchievements(JSON.parse(saved));
    }
  }, [autoStart, settings?.account?.name]);
  
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      setTourCompleted(true);
      Cookies.set('settings-tour-completed', 'true', { expires: 365 });
      
      // Unlock tour completion achievement
      unlockAchievement('tour-completed');
      
      onComplete?.();
      
      toast({
        title: 'Tour completed!',
        description: 'You can restart the tour anytime from the help menu.',
      });
    }
    
    if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + 1);
    }
  };
  
  const unlockAchievement = useCallback((achievementId: string) => {
    setUnlockedAchievements(prev => {
      if (!prev.includes(achievementId)) {
        const achievement = achievements.find(a => a.id === achievementId);
        if (achievement) {
          setShowAchievement(achievement);
          
          // Save to localStorage
          const newAchievements = [...prev, achievementId];
          localStorage.setItem(
            'settings-achievements',
            JSON.stringify(newAchievements)
          );
          
          // Hide achievement notification after 3 seconds
          setTimeout(() => setShowAchievement(null), 3000);
          
          return newAchievements;
        }
      }
      return prev;
    });
  }, []);
  
  // Monitor for achievements
  useEffect(() => {
    if (settings?.ai?.apiKey || settings?.ai?.anthropicApiKey || settings?.ai?.openaiApiKey) {
      unlockAchievement('api-connected');
    }
    
    if (settings?.companies?.tracking?.length > 0) {
      unlockAchievement('company-added');
    }
  }, [settings, unlockAchievement]);
  
  const startTour = () => {
    setRun(true);
    setStepIndex(0);
  };
  
  const resetTour = () => {
    setRun(false);
    setStepIndex(0);
    setTourCompleted(false);
    Cookies.remove('settings-tour-completed');
  };
  
  return (
    <>
      {/* Tour component */}
      <Joyride
        steps={tourSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#6366f1',
            textColor: '#1f2937',
            backgroundColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
            beaconSize: 36,
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: 8,
            padding: 16,
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipContent: {
            padding: '8px 0',
          },
          buttonNext: {
            backgroundColor: '#6366f1',
            borderRadius: 6,
            padding: '8px 16px',
          },
          buttonBack: {
            color: '#6366f1',
            marginRight: 8,
          },
          buttonSkip: {
            color: '#9ca3af',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip tour',
        }}
      />
      
      {/* Tour controls */}
      {!run && (
        <div className={cn('flex items-center gap-2', className)}>
          <Button
            variant="outline"
            size="sm"
            onClick={startTour}
            className="gap-2"
          >
            <Compass className="h-4 w-4" />
            {tourCompleted ? 'Restart Tour' : 'Start Tour'}
          </Button>
          
          {tourCompleted && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Tour completed
            </Badge>
          )}
        </div>
      )}
      
      {/* Achievement notification */}
      <AnimatePresence>
        {showAchievement && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex items-center gap-3 border-2 border-yellow-400">
              <div className="text-2xl">{showAchievement.icon}</div>
              <div>
                <p className="font-semibold text-sm">Achievement Unlocked!</p>
                <p className="text-xs text-gray-500">{showAchievement.name}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Achievement gallery */}
      <AchievementGallery
        achievements={achievements}
        unlockedAchievements={unlockedAchievements}
      />
    </>
  );
}

// Achievement gallery component
function AchievementGallery({
  achievements,
  unlockedAchievements,
}: {
  achievements: typeof achievements;
  unlockedAchievements: string[];
}) {
  const [showGallery, setShowGallery] = useState(false);
  
  const progress = (unlockedAchievements.length / achievements.length) * 100;
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowGallery(!showGallery)}
        className="gap-2"
      >
        <Trophy className="h-4 w-4" />
        {unlockedAchievements.length}/{achievements.length} Achievements
      </Button>
      
      {showGallery && (
        <div className="mt-4 p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Your Achievements</h3>
            <span className="text-xs text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {achievements.map((achievement) => {
              const isUnlocked = unlockedAchievements.includes(achievement.id);
              
              return (
                <div
                  key={achievement.id}
                  className={cn(
                    'p-3 rounded-lg border text-center transition-all',
                    isUnlocked
                      ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20'
                      : 'bg-gray-50 border-gray-200 opacity-50 dark:bg-gray-900/20'
                  )}
                >
                  <div className="text-2xl mb-1">{achievement.icon}</div>
                  <p className="text-xs font-medium">{achievement.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{achievement.description}</p>
                  {isUnlocked && (
                    <CheckCircle className="h-3 w-3 text-green-500 mx-auto mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}