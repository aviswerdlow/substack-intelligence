'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GmailConnectionModal } from '@/components/gmail/GmailConnectionModal';
import { useIntelligence } from '@/contexts/IntelligenceContext';
import { 
  Zap, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Loader2,
  Play,
  AlertCircle
} from 'lucide-react';

interface QuickStartCardProps {
  gmailConnected: boolean;
  onGmailConnect?: () => void;
}

export function QuickStartCard({ gmailConnected, onGmailConnect }: QuickStartCardProps) {
  const { syncPipeline, pipelineStatus, isSyncing } = useIntelligence();
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [hasRunPipeline, setHasRunPipeline] = useState(false);

  useEffect(() => {
    // Check if user has run pipeline before
    const lastSync = localStorage.getItem('lastPipelineSync');
    setHasRunPipeline(!!lastSync);
  }, [pipelineStatus]);

  const handleRunPipeline = async () => {
    if (!gmailConnected) {
      setShowGmailModal(true);
      return;
    }
    
    await syncPipeline();
    localStorage.setItem('lastPipelineSync', new Date().toISOString());
    setHasRunPipeline(true);
  };

  const handleGmailSuccess = async () => {
    // Call parent callback to refresh Gmail status
    if (onGmailConnect) {
      await onGmailConnect();
    }
    
    // Wait for state to update, then automatically run pipeline
    setTimeout(() => {
      // Re-check Gmail status before running pipeline
      fetch('/api/auth/gmail/status')
        .then(res => res.json())
        .then(data => {
          if (data.connected) {
            handleRunPipeline();
          }
        })
        .catch(console.error);
    }, 2500);
  };

  // Calculate progress
  const steps = [
    { id: 'signin', label: 'Sign In', completed: true },
    { id: 'gmail', label: 'Connect Gmail', completed: gmailConnected },
    { id: 'pipeline', label: 'Run Pipeline', completed: hasRunPipeline }
  ];
  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  if (hasRunPipeline && gmailConnected) {
    // Show success state briefly, then hide
    return null;
  }

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        {/* Decorative background */}
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 translate-y--8 opacity-10">
          <Sparkles className="h-full w-full text-primary" />
        </div>

        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Start
              </CardTitle>
              <CardDescription>
                Get your newsletter intelligence up and running in seconds
              </CardDescription>
            </div>
            <Badge variant="secondary" className="mt-1">
              {completedSteps}/{steps.length} steps
            </Badge>
          </div>
          
          {/* Progress bar */}
          <Progress value={progress} className="mt-4 h-2" />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                  step.completed 
                    ? 'bg-green-50 dark:bg-green-950/20' 
                    : index === completedSteps 
                      ? 'bg-primary/10 ring-2 ring-primary/20' 
                      : 'bg-muted/30'
                }`}
              >
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : index === completedSteps ? (
                    <div className="h-5 w-5 rounded-full border-2 border-primary bg-primary/20" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    step.completed ? 'text-green-700 dark:text-green-300' : ''
                  }`}>
                    {step.label}
                  </p>
                </div>
                {step.completed && (
                  <Badge variant="outline" className="text-xs">
                    Complete
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Action button */}
          <div className="pt-2">
            {!gmailConnected ? (
              <Button 
                onClick={() => setShowGmailModal(true)}
                className="w-full gap-2"
                size="lg"
              >
                <Mail className="h-4 w-4" />
                Connect Gmail to Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : !hasRunPipeline ? (
              <Button 
                onClick={handleRunPipeline}
                disabled={isSyncing}
                className="w-full gap-2"
                size="lg"
                variant="default"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Newsletters...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Your First Pipeline
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : null}
          </div>

          {/* Helper text */}
          {!gmailConnected && (
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Why Gmail?</strong> We analyze your newsletter subscriptions to extract 
                  valuable intelligence about companies and trends in your industry.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gmail Connection Modal */}
      <GmailConnectionModal
        isOpen={showGmailModal}
        onOpenChange={setShowGmailModal}
        onConnectionSuccess={handleGmailSuccess}
      />
    </>
  );
}