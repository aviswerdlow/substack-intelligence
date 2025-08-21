'use client';

import React, { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  HelpCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Play,
  Keyboard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Tooltip content database
export const tooltipContent: Record<string, {
  title: string;
  description: string;
  examples?: string[];
  shortcut?: string;
  learnMore?: string;
  video?: string;
  warning?: string;
  tip?: string;
}> = {
  // Account Settings
  'account.name': {
    title: 'Display Name',
    description: 'Your name as it appears throughout the application',
    examples: ['John Doe', 'Jane Smith'],
    tip: 'Use your full name for better team collaboration',
  },
  'account.email': {
    title: 'Email Address',
    description: 'Primary email for account notifications and login',
    warning: 'Changing this will require email verification',
    tip: 'Use a work email for better security',
  },
  'account.timezone': {
    title: 'Timezone',
    description: 'Used for scheduling reports and displaying timestamps',
    examples: ['America/New_York', 'Europe/London', 'Asia/Tokyo'],
    tip: 'Set to your local timezone for accurate scheduling',
  },
  
  // AI Settings
  'ai.temperature': {
    title: 'Temperature',
    description: 'Controls randomness in AI responses. Lower values are more focused and deterministic, higher values are more creative.',
    examples: ['0.0 = Very deterministic', '0.7 = Balanced (recommended)', '1.0 = Very creative'],
    shortcut: 'Cmd+T',
    learnMore: '/docs/ai-settings#temperature',
    tip: 'Use 0.7 for most use cases, 0.2 for data extraction',
  },
  'ai.maxTokens': {
    title: 'Max Tokens',
    description: 'Maximum length of AI responses. Higher values allow longer responses but cost more.',
    examples: ['1000 = Short responses', '4096 = Standard (recommended)', '8192 = Long form content'],
    warning: 'Higher token limits increase API costs',
    tip: '4096 tokens is roughly 3000 words',
  },
  'ai.provider': {
    title: 'AI Provider',
    description: 'Choose between different AI providers based on your needs',
    examples: ['Anthropic = Best for analysis', 'OpenAI = Best for general tasks'],
    tip: 'Each provider has different strengths and pricing',
  },
  'ai.model': {
    title: 'AI Model',
    description: 'Specific model version to use for processing',
    examples: ['Claude 3.5 Sonnet = Fast & smart', 'GPT-4 Turbo = Latest OpenAI'],
    warning: 'Different models have different capabilities and costs',
    learnMore: '/docs/ai-models',
  },
  'ai.enableEnrichment': {
    title: 'AI Enrichment',
    description: 'Automatically enhance data with AI-powered insights',
    examples: ['Sentiment analysis', 'Entity extraction', 'Summary generation'],
    tip: 'Enables deeper insights but increases processing time',
  },
  
  // Newsletter Settings
  'newsletters.autoSubscribe': {
    title: 'Auto-Subscribe',
    description: 'Automatically subscribe to new newsletters when detected',
    warning: 'May increase email volume significantly',
    tip: 'Review subscriptions weekly to manage volume',
  },
  'newsletters.digestFrequency': {
    title: 'Digest Frequency',
    description: 'How often to receive summary digests of all newsletters',
    examples: ['Daily = Every morning at 9 AM', 'Weekly = Monday mornings', 'Monthly = First of month'],
    tip: 'Weekly digest is recommended for most users',
  },
  
  // Company Settings
  'companies.autoDetect': {
    title: 'Auto-Detect Companies',
    description: 'Automatically identify and track new companies mentioned in newsletters',
    examples: ['Detects funding announcements', 'Identifies product launches', 'Tracks acquisitions'],
    tip: 'Review detected companies weekly to maintain quality',
  },
  'companies.minimumMentions': {
    title: 'Minimum Mentions',
    description: 'Number of times a company must be mentioned before tracking',
    examples: ['1 = Track everything', '3 = Balanced (recommended)', '10 = Only frequent mentions'],
    tip: 'Higher thresholds reduce noise but may miss emerging companies',
  },
  
  // Email Settings
  'email.syncFrequency': {
    title: 'Sync Frequency',
    description: 'How often to check for new emails',
    examples: ['5min = Real-time monitoring', '15min = Standard', '1hour = Battery saving'],
    warning: 'Frequent syncing may hit rate limits',
    tip: '15 minute sync is optimal for most users',
  },
  'email.retentionDays': {
    title: 'Data Retention',
    description: 'How long to keep processed emails',
    examples: ['30 days = Minimal storage', '90 days = Standard', '365 days = Full year'],
    warning: 'Longer retention uses more storage',
    tip: '90 days balances storage and historical analysis',
  },
  'email.autoProcess': {
    title: 'Auto-Process',
    description: 'Automatically process new emails as they arrive',
    examples: ['Extracts companies', 'Analyzes sentiment', 'Generates summaries'],
    tip: 'Disable to review emails before processing',
  },
  
  // Report Settings
  'reports.includeCharts': {
    title: 'Include Charts',
    description: 'Add visual charts and graphs to reports',
    examples: ['Trend lines', 'Pie charts', 'Bar graphs'],
    tip: 'Visual reports are easier to understand but larger in size',
  },
  'reports.includeSentiment': {
    title: 'Sentiment Analysis',
    description: 'Include sentiment scores and analysis in reports',
    examples: ['Positive/Negative trends', 'Sentiment by company', 'Overall mood'],
    tip: 'Helps identify PR issues and opportunities',
  },
  'reports.deliveryTime': {
    title: 'Delivery Time',
    description: 'Time of day to deliver scheduled reports',
    examples: ['09:00 = Start of work day', '13:00 = After lunch', '17:00 = End of day'],
    tip: 'Schedule for when you have time to review',
  },
  
  // Notification Settings
  'notifications.thresholds.negativeSentiment': {
    title: 'Negative Sentiment Threshold',
    description: 'Alert when sentiment drops below this level (-1 to 0)',
    examples: ['-0.8 = Very negative only', '-0.5 = Moderate negativity', '-0.2 = Any negativity'],
    warning: 'Lower thresholds generate more alerts',
    tip: '-0.5 catches significant issues without spam',
  },
  'notifications.thresholds.mentionVolume': {
    title: 'Mention Volume Alert',
    description: 'Alert when a company is mentioned more than this many times',
    examples: ['5 = Trending topic', '10 = Hot topic', '20 = Viral'],
    tip: 'Set based on your typical newsletter volume',
  },
  'notifications.email.criticalOnly': {
    title: 'Critical Alerts Only',
    description: 'Only send email alerts for critical issues',
    examples: ['Major negative sentiment', 'Security issues', 'Compliance problems'],
    tip: 'Reduces email volume while keeping you informed',
  },
  
  // API Settings
  'api.keys': {
    title: 'API Keys',
    description: 'Manage API keys for programmatic access',
    warning: 'Keep API keys secret and rotate regularly',
    tip: 'Use different keys for different applications',
    learnMore: '/docs/api-authentication',
  },
  'api.webhooks': {
    title: 'Webhooks',
    description: 'Send real-time notifications to your applications',
    examples: ['Slack notifications', 'Custom integrations', 'Workflow automation'],
    tip: 'Test webhooks with requestbin.com first',
    learnMore: '/docs/webhooks',
  },
  
  // Privacy Settings
  'privacy.dataRetention': {
    title: 'Data Retention Period',
    description: 'How long to keep your data before automatic deletion',
    examples: ['30 days = Minimum', '365 days = Standard', '730 days = Maximum'],
    warning: 'Deleted data cannot be recovered',
    tip: 'Consider compliance requirements for your industry',
  },
  'privacy.shareAnalytics': {
    title: 'Share Analytics',
    description: 'Help improve the product by sharing anonymous usage data',
    examples: ['Feature usage', 'Performance metrics', 'Error reports'],
    tip: 'No personal or company data is ever shared',
  },
  'privacy.allowExport': {
    title: 'Allow Data Export',
    description: 'Enable exporting your data for backup or migration',
    warning: 'Exported data may contain sensitive information',
    tip: 'Export regularly for backup purposes',
  },
  
  // Appearance Settings
  'appearance.theme': {
    title: 'Theme',
    description: 'Choose your preferred color theme',
    examples: ['Light = Better for daytime', 'Dark = Reduces eye strain', 'System = Follows OS'],
    shortcut: 'Cmd+Shift+T',
    tip: 'System theme automatically switches based on time',
  },
  'appearance.fontSize': {
    title: 'Font Size',
    description: 'Adjust text size for better readability',
    examples: ['Small = More content visible', 'Medium = Balanced', 'Large = Easier to read'],
    tip: 'Larger fonts reduce eye strain',
  },
  'appearance.compactMode': {
    title: 'Compact Mode',
    description: 'Reduce spacing to show more content',
    examples: ['Tables show more rows', 'Smaller padding', 'Denser layouts'],
    tip: 'Great for power users with large screens',
  },
  'appearance.showTips': {
    title: 'Show Tips',
    description: 'Display helpful tips and onboarding hints',
    tip: 'Disable after you\'re familiar with the interface',
  },
};

// Tooltip component types
type TooltipType = 'info' | 'validation' | 'example' | 'preview' | 'shortcut';

interface SettingsTooltipProps {
  field: string;
  type?: TooltipType;
  children: ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
}

// Main tooltip component
export function SettingsTooltip({
  field,
  type = 'info',
  children,
  className,
  side = 'top',
  showIcon = true,
}: SettingsTooltipProps) {
  const { toast } = useToast();
  const content = tooltipContent[field];
  
  if (!content) {
    return <>{children}</>;
  }
  
  const handleCopyExample = (example: string) => {
    navigator.clipboard.writeText(example);
    toast({
      title: 'Copied to clipboard',
      description: example,
    });
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('inline-flex items-center gap-1', className)}>
            {children}
            {showIcon && (
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-sm p-3 space-y-2"
          sideOffset={5}
        >
          {/* Title */}
          <div className="font-medium text-sm">{content.title}</div>
          
          {/* Description */}
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {content.description}
          </div>
          
          {/* Warning */}
          {content.warning && (
            <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{content.warning}</span>
            </div>
          )}
          
          {/* Tip */}
          {content.tip && (
            <div className="flex items-start gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{content.tip}</span>
            </div>
          )}
          
          {/* Examples */}
          {content.examples && content.examples.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Examples:
              </div>
              {content.examples.map((example, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1"
                >
                  <span className="text-gray-600 dark:text-gray-400">{example}</span>
                  <button
                    onClick={() => handleCopyExample(example.split(' = ')[0])}
                    className="ml-2 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Keyboard shortcut */}
          {content.shortcut && (
            <div className="flex items-center gap-1.5 text-xs">
              <Keyboard className="h-3 w-3" />
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                {content.shortcut}
              </kbd>
            </div>
          )}
          
          {/* Learn more link */}
          {content.learnMore && (
            <a
              href={content.learnMore}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <span>Learn more</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          
          {/* Video link */}
          {content.video && (
            <a
              href={content.video}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
            >
              <Play className="h-3 w-3" />
              <span>Watch tutorial</span>
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Validation tooltip component
export function ValidationTooltip({
  error,
  children,
}: {
  error?: string;
  children: ReactNode;
}) {
  if (!error) {
    return <>{children}</>;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <div className="absolute -top-1 -right-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <div className="text-xs text-red-700 dark:text-red-300">{error}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Success tooltip component
export function SuccessTooltip({
  message,
  children,
}: {
  message: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <div className="absolute -top-1 -right-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <div className="text-xs text-green-700 dark:text-green-300">{message}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Main wrapper component that provides tooltips context
export function SettingsTooltips({ children }: { children: ReactNode }) {
  // This is a simple wrapper for now, but could be extended
  // to provide tooltip context or global tooltip settings
  return <>{children}</>;
}
