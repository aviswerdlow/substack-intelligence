'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useUndo } from '@/hooks/useUndo';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  validateSettingsTab, 
  validateAllSettings, 
  settingsTabSchemas,
  type ValidationError 
} from '@/lib/validation/settings-schemas';

// Settings type definition
export interface Settings {
  account: {
    name: string;
    email: string;
    role: string;
    timezone: string;
  };
  newsletters: {
    sources: Array<{
      id: string;
      name: string;
      email: string;
      enabled: boolean;
      frequency: string;
    }>;
    autoSubscribe: boolean;
    digestFrequency: string;
  };
  companies: {
    tracking: Array<{
      id: string;
      name: string;
      domain: string;
      keywords: string[];
      enabled: boolean;
    }>;
    autoDetect: boolean;
    minimumMentions: number;
  };
  ai: {
    provider: string;
    model: string;
    apiKey: string;
    anthropicApiKey: string;
    openaiApiKey: string;
    temperature: number;
    maxTokens: number;
    enableEnrichment: boolean;
  };
  email: {
    provider: string;
    connected: boolean;
    syncFrequency: string;
    lastSync: string | null;
    autoProcess: boolean;
    retentionDays: number;
  };
  reports: {
    defaultFormat: string;
    includeCharts: boolean;
    includeSentiment: boolean;
    autoGenerate: {
      daily: boolean;
      weekly: boolean;
      monthly: boolean;
    };
    deliveryTime: string;
    recipients: string[];
  };
  notifications: {
    email: {
      enabled: boolean;
      criticalOnly: boolean;
      dailyDigest: boolean;
    };
    inApp: {
      enabled: boolean;
      soundEnabled: boolean;
    };
    thresholds: {
      negativeSentiment: number;
      mentionVolume: number;
      competitorMentions: boolean;
    };
  };
  api: {
    keys: Array<{
      id: string;
      name: string;
      key: string;
      createdAt: string;
      lastUsed: string | null;
    }>;
    webhooks: Array<{
      id: string;
      url: string;
      events: string[];
      enabled: boolean;
    }>;
  };
  privacy: {
    dataRetention: number;
    shareAnalytics: boolean;
    allowExport: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    showTips: boolean;
  };
}

// Tab state tracking
export interface TabState {
  isDirty: boolean;
  changes: Record<string, any>;
  originalValues: Record<string, any>;
  lastSaved: Date | null;
  validationErrors: ValidationError[];
}

// Context type
interface SettingsContextType {
  // Settings state
  settings: Settings;
  setSettings: (settings: Settings | ((prev: Settings) => Settings)) => void;
  
  // Tab states
  tabStates: Record<string, TabState>;
  setTabState: (tab: string, state: TabState) => void;
  
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  
  // Change tracking
  hasUnsavedChanges: boolean;
  unsavedTabs: string[];
  markTabDirty: (tab: string) => void;
  markTabClean: (tab: string) => void;
  
  // Persistence
  saveSettings: (tab?: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: (tab?: string) => void;
  
  // Export/Import
  exportSettings: (format?: 'json' | 'yaml' | 'env') => void;
  importSettings: (file: File) => Promise<void>;
  
  // Validation
  validateTab: (tab: string) => ValidationError[];
  validateAll: () => Record<string, ValidationError[]>;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
}

// Default settings
const getDefaultSettings = (): Settings => ({
  account: {
    name: '',
    email: '',
    role: 'User',
    timezone: 'America/New_York'
  },
  newsletters: {
    sources: [],
    autoSubscribe: true,
    digestFrequency: 'weekly'
  },
  companies: {
    tracking: [],
    autoDetect: true,
    minimumMentions: 3
  },
  ai: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: '',
    anthropicApiKey: '',
    openaiApiKey: '',
    temperature: 0.7,
    maxTokens: 4096,
    enableEnrichment: true
  },
  email: {
    provider: 'gmail',
    connected: false,
    syncFrequency: '15min',
    lastSync: null,
    autoProcess: true,
    retentionDays: 90
  },
  reports: {
    defaultFormat: 'pdf',
    includeCharts: true,
    includeSentiment: true,
    autoGenerate: {
      daily: false,
      weekly: false,
      monthly: false
    },
    deliveryTime: '09:00',
    recipients: []
  },
  notifications: {
    email: {
      enabled: true,
      criticalOnly: false,
      dailyDigest: true
    },
    inApp: {
      enabled: true,
      soundEnabled: false
    },
    thresholds: {
      negativeSentiment: -0.5,
      mentionVolume: 10,
      competitorMentions: true
    }
  },
  api: {
    keys: [],
    webhooks: []
  },
  privacy: {
    dataRetention: 365,
    shareAnalytics: true,
    allowExport: true
  },
  appearance: {
    theme: 'system',
    accentColor: 'blue',
    fontSize: 'medium',
    compactMode: false,
    showTips: true
  }
});

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Undo/Redo state management
  const [
    settingsState,
    {
      set: setSettingsState,
      reset: resetSettingsState,
      undo: undoSettings,
      redo: redoSettings,
      canUndo,
      canRedo,
    }
  ] = useUndo(getDefaultSettings());
  
  const { present: settings } = settingsState;
  
  // Tab states
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({});
  
  // Computed properties (moved here to avoid temporal dead zone)
  const hasUnsavedChanges = Object.values(tabStates).some(state => state.isDirty);
  const unsavedTabs = Object.entries(tabStates)
    .filter(([_, state]) => state.isDirty)
    .map(([tab]) => tab);
  
  // Auto-save draft to localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        localStorage.setItem('settings-draft', JSON.stringify(settings));
        localStorage.setItem('settings-draft-timestamp', new Date().toISOString());
      }
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, [settings, hasUnsavedChanges]);
  
  // Load settings from API
  const { data: serverSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await axios.get('/api/settings');
      return response.data.settings;
    },
    onSuccess: (data) => {
      if (data) {
        setSettingsState(data);
      }
    }
  });
  
  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { tab?: string; settings: Settings }) => {
      const response = await axios.put('/api/settings', data.settings);
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Settings saved',
        description: variables.tab ? `${variables.tab} settings saved successfully` : 'All settings saved successfully',
      });
      
      if (variables.tab) {
        markTabClean(variables.tab);
      } else {
        // Mark all tabs as clean
        Object.keys(tabStates).forEach(tab => markTabClean(tab));
      }
      
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.response?.data?.error || 'Failed to save settings',
        variant: 'destructive',
      });
    }
  });
  
  // Methods
  const setSettings = useCallback((newSettings: Settings | ((prev: Settings) => Settings)) => {
    if (typeof newSettings === 'function') {
      setSettingsState((prev) => newSettings(prev.present));
    } else {
      setSettingsState(newSettings);
    }
  }, [setSettingsState]);
  
  const setTabState = useCallback((tab: string, state: TabState) => {
    setTabStates(prev => ({ ...prev, [tab]: state }));
  }, []);
  
  const markTabDirty = useCallback((tab: string) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        isDirty: true
      }
    }));
  }, []);
  
  const markTabClean = useCallback((tab: string) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        isDirty: false,
        lastSaved: new Date()
      }
    }));
  }, []);
  
  const saveSettings = useCallback(async (tab?: string) => {
    // Validate before saving
    if (tab) {
      const errors = validateTab(tab);
      if (errors.length > 0) {
        toast({
          title: 'Validation Error',
          description: `Please fix the following errors: ${errors.map(e => e.message).join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
    } else {
      const errors = validateAll();
      const errorCount = Object.values(errors).flat().length;
      if (errorCount > 0) {
        toast({
          title: 'Validation Error',
          description: `Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''} before saving`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({ tab, settings });
      if (tab) {
        markTabClean(tab);
      }
    } finally {
      setIsSaving(false);
    }
  }, [settings, saveMutation, validateTab, validateAll, toast, markTabClean]);
  
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['settings'] });
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);
  
  const resetSettings = useCallback((tab?: string) => {
    if (tab) {
      // Reset specific tab
      const defaultSettings = getDefaultSettings();
      setSettings(prev => ({
        ...prev,
        [tab]: defaultSettings[tab as keyof Settings]
      }));
      markTabDirty(tab);
    } else {
      // Reset all
      resetSettingsState();
      setTabStates({});
    }
  }, [setSettings, resetSettingsState, markTabDirty]);
  
  const exportSettings = useCallback((format: 'json' | 'yaml' | 'env' = 'json') => {
    const data = { ...settings };
    
    // Remove sensitive data if needed
    const exportData = {
      ...data,
      ai: {
        ...data.ai,
        apiKey: '[REDACTED]',
        anthropicApiKey: '[REDACTED]',
        openaiApiKey: '[REDACTED]'
      }
    };
    
    let content: string;
    let filename: string;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(exportData, null, 2);
        filename = 'settings.json';
        break;
      case 'env':
        content = Object.entries(exportData).map(([key, value]) => 
          `SETTINGS_${key.toUpperCase()}=${JSON.stringify(value)}`
        ).join('\n');
        filename = 'settings.env';
        break;
      default:
        content = JSON.stringify(exportData, null, 2);
        filename = 'settings.json';
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Settings exported',
      description: `Settings exported as ${filename}`,
    });
  }, [settings]);
  
  const importSettings = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      // Validate imported settings
      const validationResult = validateAllSettings(imported);
      
      if (!validationResult.success) {
        const errorCount = Object.values(validationResult.errors || {}).flat().length;
        const firstErrors = Object.values(validationResult.errors || {})
          .flat()
          .slice(0, 3)
          .map(e => e.message);
        
        toast({
          title: 'Invalid Settings File',
          description: `Found ${errorCount} validation error${errorCount > 1 ? 's' : ''}. ${firstErrors.join('. ')}${errorCount > 3 ? '...' : ''}`,
          variant: 'destructive',
        });
        return;
      }
      
      setSettings(validationResult.data!);
      
      toast({
        title: 'Settings imported',
        description: 'Settings imported and validated successfully',
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to import settings. Please check the file format.',
        variant: 'destructive',
      });
    }
  }, [setSettings]);
  
  const validateTab = useCallback((tab: string): ValidationError[] => {
    // Get the data for the specific tab
    const tabData = settings[tab as keyof Settings];
    
    if (!tabData) {
      return [];
    }
    
    // Check if we have a schema for this tab
    if (!(tab in settingsTabSchemas)) {
      return [];
    }
    
    // Validate the tab data
    const result = validateSettingsTab(tab as keyof typeof settingsTabSchemas, tabData);
    
    if (result.success) {
      return [];
    } else {
      return result.errors || [];
    }
  }, [settings]);
  
  const validateAll = useCallback((): Record<string, ValidationError[]> => {
    const result = validateAllSettings(settings);
    
    if (result.success) {
      return {};
    } else {
      return result.errors || {};
    }
  }, [settings]);
  
  const value: SettingsContextType = {
    settings,
    setSettings,
    tabStates,
    setTabState,
    canUndo,
    canRedo,
    undo: undoSettings,
    redo: redoSettings,
    reset: resetSettingsState,
    hasUnsavedChanges,
    unsavedTabs,
    markTabDirty,
    markTabClean,
    saveSettings,
    loadSettings,
    resetSettings,
    exportSettings,
    importSettings,
    validateTab,
    validateAll,
    isLoading,
    isSaving,
    error,
  };
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// Hook to use settings context
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}