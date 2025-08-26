'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';
export type WidgetType = 
  | 'stats' 
  | 'quick-actions' 
  | 'system-status' 
  | 'chart' 
  | 'activity-feed'
  | 'email-stats'
  | 'top-newsletters'
  | 'sentiment-analysis'
  | 'todos';
// Note: 'recent-companies' is shown in the main dashboard
// Note: 'pipeline-status' is handled by ActiveOperationsBar

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: { x: number; y: number };
  isVisible: boolean;
  settings?: Record<string, any>;
}

interface DashboardLayout {
  widgets: WidgetConfig[];
  gridCols: number;
  isEditing: boolean;
}

interface DashboardContextType {
  layout: DashboardLayout;
  widgets: WidgetConfig[];
  isEditing: boolean;
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  moveWidget: (widgetId: string, newPosition: { x: number; y: number }) => void;
  toggleEditMode: () => void;
  resetLayout: () => void;
  saveLayout: () => void;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'stats-1',
    type: 'stats',
    title: 'Key Metrics',
    size: 'full',
    position: { x: 0, y: 0 },
    isVisible: true
  },
  {
    id: 'quick-actions-1',
    type: 'quick-actions',
    title: 'Quick Actions',
    size: 'medium',
    position: { x: 0, y: 1 },
    isVisible: true
  }
  // Note: system-status is now shown in the sidebar
];

const AVAILABLE_WIDGETS: Omit<WidgetConfig, 'id' | 'position'>[] = [
  { type: 'stats', title: 'Key Metrics', size: 'full', isVisible: true },
  { type: 'quick-actions', title: 'Quick Actions', size: 'medium', isVisible: true },
  { type: 'todos', title: 'Todo List', size: 'medium', isVisible: true },
  { type: 'chart', title: 'Analytics Chart', size: 'large', isVisible: true },
  { type: 'activity-feed', title: 'Activity Feed', size: 'medium', isVisible: true },
  { type: 'email-stats', title: 'Email Statistics', size: 'small', isVisible: true },
  { type: 'top-newsletters', title: 'Top Newsletters', size: 'medium', isVisible: true },
  { type: 'sentiment-analysis', title: 'Sentiment Trends', size: 'medium', isVisible: true }
  // Note: system-status is now permanently shown in the sidebar
];

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardWidgetProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<DashboardLayout>({
    widgets: DEFAULT_WIDGETS,
    gridCols: 4,
    isEditing: false
  });

  // Load saved layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboardLayout');
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        setLayout(prev => ({
          ...prev,
          widgets: parsed.widgets || DEFAULT_WIDGETS
        }));
      } catch (e) {
        console.error('Failed to load dashboard layout:', e);
      }
    }
  }, []);

  const saveLayout = () => {
    localStorage.setItem('dashboardLayout', JSON.stringify({
      widgets: layout.widgets
    }));
  };

  const addWidget = (widget: WidgetConfig) => {
    setLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, widget]
    }));
  };

  const removeWidget = (widgetId: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId)
    }));
  };

  const updateWidget = (widgetId: string, updates: Partial<WidgetConfig>) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      )
    }));
  };

  const moveWidget = (widgetId: string, newPosition: { x: number; y: number }) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, position: newPosition } : w
      )
    }));
  };

  const toggleEditMode = () => {
    setLayout(prev => ({
      ...prev,
      isEditing: !prev.isEditing
    }));
    
    // Auto-save when exiting edit mode
    if (layout.isEditing) {
      saveLayout();
    }
  };

  const resetLayout = () => {
    setLayout({
      widgets: DEFAULT_WIDGETS,
      gridCols: 4,
      isEditing: false
    });
    localStorage.removeItem('dashboardLayout');
  };

  return (
    <DashboardContext.Provider
      value={{
        layout,
        widgets: layout.widgets,
        isEditing: layout.isEditing,
        addWidget,
        removeWidget,
        updateWidget,
        moveWidget,
        toggleEditMode,
        resetLayout,
        saveLayout
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardWidgetProvider');
  }
  return context;
}

export { AVAILABLE_WIDGETS };