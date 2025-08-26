'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  Mail, 
  Building2, 
  FileText, 
  Settings,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from './OnboardingProvider';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action: () => void;
  actionLabel: string;
}

export function OnboardingChecklist() {
  const router = useRouter();
  const { startOnboarding } = useOnboarding();
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'tour',
      title: 'Take the product tour',
      description: 'Learn the basics in 2 minutes',
      icon: Sparkles,
      completed: false,
      action: () => {
        startOnboarding();
        updateChecklistItem('tour', true);
      },
      actionLabel: 'Start Tour'
    },
    {
      id: 'gmail',
      title: 'Connect Gmail account',
      description: 'Enable automatic newsletter processing',
      icon: Mail,
      completed: false,
      action: () => {
        router.push('/settings?tab=email');
      },
      actionLabel: 'Connect'
    },
    {
      id: 'newsletters',
      title: 'Configure newsletters',
      description: 'Select which newsletters to track',
      icon: FileText,
      completed: false,
      action: () => {
        router.push('/settings?tab=newsletters');
      },
      actionLabel: 'Configure'
    },
    {
      id: 'companies',
      title: 'Add companies to track',
      description: 'Set up your company watchlist',
      icon: Building2,
      completed: false,
      action: () => {
        router.push('/settings?tab=companies');
      },
      actionLabel: 'Add Companies'
    },
    {
      id: 'pipeline',
      title: 'Run first pipeline',
      description: 'Process your first batch of newsletters',
      icon: Settings,
      completed: false,
      action: () => {
        router.push('/dashboard');
        // Trigger pipeline after navigation
        setTimeout(() => {
          document.querySelector('[data-tour="quick-actions"] button')?.dispatchEvent(new Event('click'));
        }, 500);
      },
      actionLabel: 'Run Pipeline'
    }
  ]);

  useEffect(() => {
    // Check Gmail connection status
    const checkGmailStatus = async () => {
      try {
        const response = await fetch('/api/auth/gmail/status');
        const data = await response.json();
        const isConnected = data.connected || false;
        setGmailConnected(isConnected);
        
        // Auto-complete Gmail step if already connected
        if (isConnected) {
          updateChecklistItem('gmail', true);
        }
      } catch (error) {
        console.error('Failed to check Gmail status:', error);
      }
    };

    checkGmailStatus();

    // Load saved progress from localStorage
    const savedProgress = localStorage.getItem('onboardingChecklist');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        setChecklist(prev => prev.map(item => ({
          ...item,
          completed: progress[item.id] || false
        })));
      } catch (e) {
        console.error('Failed to load onboarding progress');
      }
    }

    // Check if user has dismissed the checklist
    const dismissed = localStorage.getItem('onboardingChecklistDismissed');
    if (dismissed) {
      setIsVisible(false);
    }
  }, []);

  const updateChecklistItem = (id: string, completed: boolean) => {
    setChecklist(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, completed } : item
      );
      
      // Save progress to localStorage
      const progress = updated.reduce((acc, item) => ({
        ...acc,
        [item.id]: item.completed
      }), {});
      localStorage.setItem('onboardingChecklist', JSON.stringify(progress));
      
      return updated;
    });
  };

  const dismissChecklist = () => {
    localStorage.setItem('onboardingChecklistDismissed', 'true');
    setIsVisible(false);
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;
  const isComplete = completedCount === checklist.length;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
      >
        <Card className={`shadow-2xl border-primary/20 ${isMinimized ? 'cursor-pointer' : ''}`}>
          {/* Header */}
          <CardHeader 
            className="pb-3 cursor-pointer"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {isComplete ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Setup Complete!
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-primary" />
                      Getting Started
                    </>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {isComplete 
                    ? "You're all set up and ready to go!"
                    : `${completedCount} of ${checklist.length} steps completed`
                  }
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(!isMinimized);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${isMinimized ? '' : 'rotate-90'}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissChecklist();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Progress bar */}
            <Progress value={progress} className="mt-3 h-2" />
          </CardHeader>

          {/* Checklist items */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {checklist.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                          item.completed ? 'bg-muted/30' : 'bg-muted/50 hover:bg-muted/70'
                        }`}
                      >
                        <div className="mt-0.5">
                          {item.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            <p className={`text-sm font-medium ${
                              item.completed ? 'line-through text-muted-foreground' : ''
                            }`}>
                              {item.title}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        {!item.completed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              item.action();
                              if (item.id !== 'tour' && item.id !== 'gmail') {
                                // Mark as completed for non-tour/non-gmail items
                                // Tour and Gmail completion are handled separately
                                setTimeout(() => updateChecklistItem(item.id, true), 1000);
                              }
                            }}
                            className="text-xs"
                          >
                            {item.id === 'gmail' && gmailConnected ? 'Connected' : item.actionLabel}
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {isComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-center"
                    >
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        🎉 Congratulations! You're ready to start using Substack Intelligence.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={dismissChecklist}
                        className="mt-2"
                      >
                        Dismiss
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}