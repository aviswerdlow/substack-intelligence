'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIntelligence } from '@/contexts/IntelligenceContext';
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
import { PipelineStatusWidget } from '@/components/dashboard/widgets/PipelineStatusWidget';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { DataFreshness } from '@/components/dashboard/DataFreshness';
import { cn } from '@/lib/utils';

function DashboardContent() {
  const { widgets, isEditing, toggleEditMode, resetLayout, saveLayout, addWidget } = useDashboard();
  const { syncPipeline, pipelineStatus, isSyncing } = useIntelligence();
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  
  // Auto-refresh on dashboard load
  useEffect(() => {
    const checkAndSync = async () => {
      // Only sync if data is stale (not fresh)
      if (!pipelineStatus || !pipelineStatus.dataIsFresh) {
        console.log('Dashboard loaded - syncing intelligence data...');
        await syncPipeline();
      } else {
        console.log('Dashboard loaded - data is fresh, skipping sync');
      }
    };
    
    // Small delay to let the page render first
    const timer = setTimeout(checkAndSync, 500);
    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  const renderWidgetContent = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'stats':
        return <DashboardStats />;
      case 'recent-companies':
        return <RecentCompanies />;
      case 'quick-actions':
        return <QuickActions />;
      case 'system-status':
        return <SystemStatus />;
      case 'activity-feed':
        return <ActivityFeedWidget />;
      case 'email-stats':
        return <EmailStatsWidget />;
      case 'pipeline-status':
        return <PipelineStatusWidget />;
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

      {/* Dashboard Grid */}
      <div 
        className={cn(
          'grid grid-cols-4 gap-6 relative',
          showGrid && 'dashboard-grid-overlay',
          isEditing && 'min-h-[600px]'
        )}
        style={{
          backgroundImage: showGrid ? 
            'repeating-linear-gradient(0deg, transparent, transparent 249px, rgba(0,0,0,0.05) 249px, rgba(0,0,0,0.05) 250px), repeating-linear-gradient(90deg, transparent, transparent 249px, rgba(0,0,0,0.05) 249px, rgba(0,0,0,0.05) 250px)' 
            : undefined
        }}
      >
        {widgets.map((widget) => (
          <DashboardWidget key={widget.id} widget={widget}>
            {renderWidgetContent(widget)}
          </DashboardWidget>
        ))}
        
        {/* Empty State */}
        {widgets.length === 0 && (
          <div className="col-span-4 flex flex-col items-center justify-center py-16">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No widgets added</h3>
            <p className="text-muted-foreground mb-4">
              Start building your dashboard by adding widgets
            </p>
            <Button onClick={() => setShowAddWidget(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Widget
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomizableDashboardPage() {
  return (
    <DashboardWidgetProvider>
      <DashboardContent />
    </DashboardWidgetProvider>
  );
}