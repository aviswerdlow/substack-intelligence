'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  RefreshCw, 
  FileText, 
  Settings, 
  Database,
  Mail,
  Brain
} from 'lucide-react';

export function QuickActions() {
  const [isTriggering, setIsTriggering] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const triggerPipeline = async () => {
    setIsTriggering(true);
    try {
      // First try the test Gmail endpoint for development
      // Add timestamp to bypass cache
      const response = await fetch(`/api/test/gmail?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Pipeline Triggered',
          description: `Successfully fetched ${data.data.emailsProcessed} emails from Gmail.`,
        });
        // Refresh the router to show new data
        router.refresh();
        setTimeout(() => router.refresh(), 1500);
      } else {
        // Fallback to original trigger endpoint
        const fallbackResponse = await fetch('/api/trigger/intelligence', {
          method: 'POST'
        });
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.success) {
          toast({
            title: 'Pipeline Triggered',
            description: 'Intelligence processing has been started manually.',
          });
        } else {
          throw new Error(fallbackData.error || 'Failed to trigger pipeline');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to trigger pipeline',
        variant: 'destructive',
      });
    } finally {
      setIsTriggering(false);
    }
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

  const extractCompanies = async () => {
    setIsExtracting(true);
    try {
      const response = await fetch(`/api/emails/extract?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Extraction Complete',
          description: `Extracted ${data.data.companiesExtracted} companies from ${data.data.emailsProcessed} emails.`,
        });
        // Refresh the router to show new companies
        router.refresh();
        setTimeout(() => router.refresh(), 1500);
      } else {
        throw new Error(data.error || 'Extraction failed');
      }
    } catch (error) {
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Failed to extract companies',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const actions = [
    {
      title: 'Trigger Pipeline',
      description: 'Fetch emails from Gmail',
      icon: Mail,
      action: triggerPipeline,
      loading: isTriggering,
      variant: 'default' as const
    },
    {
      title: 'Extract Companies',
      description: 'Run AI extraction on emails',
      icon: Brain,
      action: extractCompanies,
      loading: isExtracting,
      variant: 'default' as const
    },
    {
      title: 'Test Extraction',
      description: 'Test Claude AI with sample content',
      icon: RefreshCw,
      action: testExtraction,
      variant: 'outline' as const
    },
    {
      title: 'System Health',
      description: 'Check all service connections',
      icon: Database,
      action: checkHealth,
      variant: 'outline' as const
    },
    {
      title: 'View Reports',
      description: 'Generate intelligence reports',
      icon: FileText,
      action: () => window.open('/reports', '_self'),
      variant: 'outline' as const
    },
    {
      title: 'Email Settings',
      description: 'Configure Gmail integration',
      icon: Mail,
      action: () => window.open('/settings', '_self'),
      variant: 'outline' as const
    },
    {
      title: 'System Settings',
      description: 'Manage platform configuration',
      icon: Settings,
      action: () => window.open('/settings', '_self'),
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