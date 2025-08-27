'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PipelineStateProvider, usePipelineState } from '@/contexts/PipelineStateContext';
import { ActiveOperationsBar } from '@/components/dashboard/ActiveOperationsBarWrapper';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Settings, 
  Plus, 
  LayoutGrid, 
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { DashboardWidgetProvider, useDashboard, AVAILABLE_WIDGETS, WidgetConfig } from '@/components/dashboard/DashboardWidgetProvider';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { DashboardStats } from '@/components/dashboard/stats';
import { RecentCompanies } from '@/components/dashboard/recent-companies';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { SystemStatus } from '@/components/dashboard/system-status';
import { ActivityFeedWidget } from '@/components/dashboard/widgets/ActivityFeedWidget';
import { EmailStatsWidget } from '@/components/dashboard/widgets/EmailStatsWidget';
import { TodoWidget } from '@/components/dashboard/widgets/TodoWidget';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { DataFreshness } from '@/components/dashboard/DataFreshness';
import { QuickStartCard } from '@/components/dashboard/QuickStartCard';
import { cn } from '@/lib/utils';

function DashboardContent() {
  const { widgets, isEditing, toggleEditMode, resetLayout, saveLayout, addWidget } = useDashboard();
  const { state: pipelineState, isRunning, checkDataFreshness } = usePipelineState();
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  // Initialize to false to prevent hydration mismatch
  const [gmailConnected, setGmailConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check Gmail connection status and auto-connect if signed in with Google
  useEffect(() => {
    const checkGmailStatus = async () => {
      try {
        // First check if user signed in with Google through Clerk
        const clerkResponse = await fetch('/api/auth/gmail/clerk-status');
        const clerkData = await clerkResponse.json();
        
        if (clerkData.hasGoogleOAuth && !gmailConnected) {
          // User has Google OAuth through Clerk but Gmail not marked as connected
          // Auto-mark as connected
          await fetch('/api/auth/gmail/mark-connected', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: clerkData.googleEmail })
          });
          setGmailConnected(true);
        } else {
          // Check normal Gmail connection status
          const response = await fetch('/api/auth/gmail/status');
          const data = await response.json();
          setGmailConnected(data.connected || false);
        }
      } catch (error) {
        console.error('Failed to check Gmail status:', error);
        setGmailConnected(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkGmailStatus();
  }, []);
  
  // Check data freshness on dashboard load (but don't auto-sync)
  useEffect(() => {
    const checkFreshness = async () => {
      // Skip if loading or Gmail not connected
      if (isLoading || !gmailConnected) {
        return;
      }
      
      // Just check freshness, don't auto-sync
      await checkDataFreshness();
      
      if (pipelineState.dataFreshness === 'stale' || pipelineState.dataFreshness === 'outdated') {
        console.log('Dashboard: Data is stale, user can manually sync');
      } else if (isRunning) {
        console.log('Dashboard: Pipeline already running');
      } else {
        console.log('Dashboard: Data is fresh');
      }
    };
    
    // Small delay to let the page render and state settle
    const timer = setTimeout(checkFreshness, 1000);
    return () => clearTimeout(timer);
  }, [gmailConnected, isLoading, checkDataFreshness, pipelineState.dataFreshness, isRunning]);

  const renderWidgetContent = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'stats':
        return <DashboardStats />;
      case 'quick-actions':
        return <QuickActions />;
      case 'system-status':
        return <SystemStatus />;
      case 'activity-feed':
        return <ActivityFeedWidget />;
      case 'email-stats':
        return <EmailStatsWidget />;
      case 'todos':
        return <TodoWidget size={widget.size} />;
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Widget coming soon</p>
          </div>
        );
    }
  };

  const handleAddWidget = (widgetType: typeof AVAILABLE_WIDGETS[0]) => {
    const newWidget: WidgetConfig = {
      id: `${widgetType.type}-${Date.now()}`,
      type: widgetType.type,
      title: widgetType.title,
      size: widgetType.size,
      position: { x: 0, y: widgets.length }, // Add at the bottom
      isVisible: true
    };
    addWidget(newWidget);
    setShowAddWidget(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Your personalized intelligence command center
          </p>
        </div>
        
        {/* Dashboard Controls */}
        <div className="flex items-center gap-4">
          {/* Data Freshness Indicator */}
          <DataFreshness />
          
          <div className="flex items-center gap-2">
          {/* Add Widget Dialog */}
          <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Widget</DialogTitle>
                <DialogDescription>
                  Choose a widget to add to your dashboard
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {AVAILABLE_WIDGETS.map((widget) => (
                  <button
                    key={widget.type}
                    onClick={() => handleAddWidget(widget)}
                    className="p-4 border rounded-lg hover:bg-accent text-left transition-colors"
                  >
                    <h4 className="font-medium mb-1">{widget.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {widget.size}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Grid Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            {showGrid ? 'Hide' : 'Show'} Grid
          </Button>

          {/* Edit Mode Toggle */}
          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            onClick={toggleEditMode}
            className="gap-2"
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4" />
                Save Layout
              </>
            ) : (
              <>
                <Settings className="h-4 w-4" />
                Customize
              </>
            )}
          </Button>

          {/* Reset Layout */}
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('Reset dashboard to default layout?')) {
                  resetLayout();
                }
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
          </div>
        </div>
      </div>

      {/* ActiveOperationsBar - unified pipeline status (show after loading) */}
      {!isLoading && gmailConnected && (
        <ActiveOperationsBar />
      )}
      
      {/* Show QuickStartCard ONLY for initial onboarding */}
      {!isLoading && !gmailConnected && (
        <QuickStartCard 
          gmailConnected={gmailConnected} 
          onGmailConnect={async () => {
            // Refresh Gmail status after connection
            // Wait a bit longer for the database to be updated
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
              const response = await fetch('/api/auth/gmail/status');
              const data = await response.json();
              setGmailConnected(data.connected || false);
              
              // Force a re-render by also checking pipeline status
              if (data.connected) {
                const pipelineResponse = await fetch('/api/pipeline/status');
                const pipelineData = await pipelineResponse.json();
                // This will trigger the IntelligenceContext to update
              }
            } catch (error) {
              console.error('Failed to refresh Gmail status:', error);
            }
          }}
        />
      )}

      {/* Edit Mode Banner */}
      {isEditing && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Customization Mode</p>
                <p className="text-sm text-muted-foreground">
                  Drag widgets to reposition, resize, or remove them from your dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {widgets.filter(w => w.isVisible).length} widgets active
              </Badge>
              <Badge variant="outline">
                {widgets.filter(w => !w.isVisible).length} hidden
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Content - 2 Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics */}
          <DashboardStats />
          
          {/* Dashboard Grid for other widgets */}
          <div 
            className={cn(
              'grid grid-cols-2 gap-6 relative',
              showGrid && 'dashboard-grid-overlay',
              isEditing && 'min-h-[600px]'
            )}
            style={{
              backgroundImage: showGrid ? 
                'repeating-linear-gradient(0deg, transparent, transparent 249px, rgba(0,0,0,0.05) 249px, rgba(0,0,0,0.05) 250px), repeating-linear-gradient(90deg, transparent, transparent 249px, rgba(0,0,0,0.05) 249px, rgba(0,0,0,0.05) 250px)' 
                : undefined
            }}
          >
            {widgets.filter(w => w.type !== 'stats' && w.type !== 'system-status').map((widget) => (
              <DashboardWidget key={widget.id} widget={widget}>
                {renderWidgetContent(widget)}
              </DashboardWidget>
            ))}
            
            {/* Empty State */}
            {widgets.filter(w => w.type !== 'stats' && w.type !== 'system-status').length === 0 && !isEditing && (
              <div className="col-span-2 flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-sm">
                  Customize your dashboard by adding widgets
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Sidebar - Recent Companies and other info */}
        <div className="space-y-6">
          {/* Recent Companies Card */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Recent Companies
            </h3>
            <RecentCompanies />
          </div>
          
          {/* System Status Card */}
          <div className="rounded-lg border bg-card p-6">
            <SystemStatus />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomizableDashboardPage() {
  return (
    <PipelineStateProvider>
      <DashboardWidgetProvider>
        <DashboardContent />
      </DashboardWidgetProvider>
    </PipelineStateProvider>
  );
}