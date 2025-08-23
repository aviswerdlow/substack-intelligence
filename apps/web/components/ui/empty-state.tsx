import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Mail, 
  Building2, 
  FileText, 
  Search, 
  Inbox,
  Database,
  AlertCircle,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {Icon && (
        <div className="mb-4 p-3 bg-muted rounded-full">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button
              variant={action.variant || 'default'}
              onClick={action.onClick}
              className="gap-2"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      
      {children}
    </div>
  );
}

// Predefined empty states for common scenarios
export function NoEmailsEmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <EmptyState
      icon={Mail}
      title="No emails processed yet"
      description="Connect your Gmail account to start automatically processing newsletters and extracting valuable insights."
      action={{
        label: "Connect Gmail",
        onClick: onConnect,
        variant: 'default'
      }}
      secondaryAction={{
        label: "Learn more",
        onClick: () => window.open('/docs/email-setup', '_blank')
      }}
    />
  );
}

export function NoCompaniesEmptyState({ onAddCompany, onRunPipeline }: { 
  onAddCompany?: () => void;
  onRunPipeline?: () => void;
}) {
  return (
    <EmptyState
      icon={Building2}
      title="No companies found"
      description="Start tracking companies by running your first pipeline or manually adding companies to your watchlist."
      action={onRunPipeline ? {
        label: "Run Pipeline",
        onClick: onRunPipeline,
        variant: 'default'
      } : undefined}
      secondaryAction={onAddCompany ? {
        label: "Add Company",
        onClick: onAddCompany
      } : undefined}
    >
      <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Tip:</span> The pipeline automatically runs daily at 9 AM, 
          or you can trigger it manually from the dashboard.
        </p>
      </div>
    </EmptyState>
  );
}

export function NoReportsEmptyState({ onGenerateReport }: { onGenerateReport: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No reports generated"
      description="Generate your first intelligence report to get insights on company mentions and trends."
      action={{
        label: "Generate Report",
        onClick: onGenerateReport,
        variant: 'default'
      }}
    />
  );
}

export function NoSearchResultsEmptyState({ 
  searchTerm, 
  onClearSearch 
}: { 
  searchTerm: string;
  onClearSearch: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${searchTerm}". Try adjusting your search or filters.`}
      action={{
        label: "Clear search",
        onClick: onClearSearch,
        variant: 'outline'
      }}
    >
      <div className="mt-6 text-left max-w-sm">
        <p className="text-sm font-medium mb-2">Search tips:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Check your spelling</li>
          <li>• Try using different keywords</li>
          <li>• Remove filters to broaden results</li>
          <li>• Search by company name or industry</li>
        </ul>
      </div>
    </EmptyState>
  );
}

export function ErrorEmptyState({ 
  error, 
  onRetry 
}: { 
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description={error || "We encountered an error while loading the data. Please try again."}
      action={onRetry ? {
        label: "Try again",
        onClick: onRetry,
        variant: 'default'
      } : undefined}
    />
  );
}

export function ComingSoonEmptyState({ feature }: { feature: string }) {
  return (
    <EmptyState
      icon={Sparkles}
      title="Coming Soon"
      description={`${feature} is currently under development and will be available soon.`}
    >
      <div className="mt-6 p-4 bg-primary/5 rounded-lg max-w-md">
        <p className="text-sm text-muted-foreground">
          Want to be notified when this feature launches?
        </p>
        <Button variant="link" className="mt-2">
          Join the waitlist →
        </Button>
      </div>
    </EmptyState>
  );
}

export function FirstTimeUserEmptyState({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <EmptyState
      icon={Zap}
      title="Welcome to Substack Intelligence!"
      description="Let's get you set up with automated newsletter processing and intelligence extraction."
      action={{
        label: "Get Started",
        onClick: onGetStarted,
        variant: 'default'
      }}
    >
      <div className="mt-8 grid grid-cols-3 gap-4 text-left max-w-lg">
        <div className="text-center">
          <div className="mb-2 p-2 bg-primary/10 rounded-lg inline-block">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <p className="text-xs font-medium">Connect Email</p>
        </div>
        <div className="text-center">
          <div className="mb-2 p-2 bg-primary/10 rounded-lg inline-block">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <p className="text-xs font-medium">Process Newsletters</p>
        </div>
        <div className="text-center">
          <div className="mb-2 p-2 bg-primary/10 rounded-lg inline-block">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-xs font-medium">Track Companies</p>
        </div>
      </div>
    </EmptyState>
  );
}