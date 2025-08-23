'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useIntelligence } from '@/contexts/IntelligenceContext';
import { 
  Play, 
  RefreshCw, 
  FileText, 
  Settings, 
  Database,
  Mail,
  Brain,
  Sparkles
} from 'lucide-react';

export function QuickActions() {
  const router = useRouter();
  const { toast } = useToast();
  const { syncPipeline, isSyncing, pipelineStatus } = useIntelligence();

  const refreshIntelligence = async () => {
    await syncPipeline(true); // Force refresh
    router.refresh();
    setTimeout(() => router.refresh(), 1500);
  };

  const testExtraction = async () => {
    try {
      const response = await fetch('/api/test/extract');
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Extraction Test Successful',
          description: `Found ${data.data.companies.length} companies in sample content.`,
        });
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Extraction test failed',
        variant: 'destructive',
      });
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (data.status === 'healthy') {
        toast({
          title: 'System Healthy',
          description: 'All services are running properly.',
        });
      } else {
        toast({
          title: 'System Issues Detected',
          description: 'Some services may be experiencing problems.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Health Check Failed',
        description: 'Unable to check system status.',
        variant: 'destructive',
      });
    }
  };

  const viewIntelligence = () => {
    router.push('/intelligence');
  };

  const actions = [
    {
      title: 'Refresh Intelligence',
      description: 'Sync emails and extract companies',
      icon: Sparkles,
      action: refreshIntelligence,
      loading: isSyncing,
      variant: 'default' as const
    },
    {
      title: 'View Intelligence',
      description: 'See latest company mentions',
      icon: Brain,
      action: viewIntelligence,
      variant: 'default' as const
    },
    {
      title: 'System Health',
      description: 'Check all service connections',
      icon: Database,
      action: checkHealth,
      variant: 'outline' as const
    },
    {
      title: 'Test Extraction',
      description: 'Test AI with sample content',
      icon: RefreshCw,
      action: testExtraction,
      variant: 'outline' as const
    },
    {
      title: 'View Reports',
      description: 'Generate intelligence reports',
      icon: FileText,
      action: () => router.push('/reports'),
      variant: 'outline' as const
    },
    {
      title: 'System Settings',
      description: 'Manage configuration',
      icon: Settings,
      action: () => router.push('/settings'),
      variant: 'outline' as const
    }
  ];

  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <Button
          key={action.title}
          variant={action.variant}
          onClick={action.action}
          disabled={action.loading}
          className="w-full justify-start h-auto p-4"
        >
          <div className="flex items-center gap-3">
            <action.icon className={`h-5 w-5 ${action.loading ? 'animate-spin' : ''}`} />
            <div className="text-left">
              <div className="font-medium">{action.title}</div>
              <div className="text-sm text-muted-foreground">
                {action.description}
              </div>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}