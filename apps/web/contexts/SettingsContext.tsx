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
import { settingsTelemetry } from '@/lib/telemetry/settings-telemetry';

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
  
  const { present: settings = getDefaultSettings() } = settingsState || { present: getDefaultSettings() };
  
  // Helper to get default tab state
  const getDefaultTabState = (): TabState => ({
    isDirty: false,
    changes: {},
    originalValues: {},
    lastSaved: null,
    validationErrors: []
  });

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
  const { data: serverSettings, isLoading: isLoadingSettings, error: settingsError } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const startTime = performance.now();
      settingsTelemetry.trackLoadStart();
      
      try {
        const response = await axios.get('/api/settings');
        
        // Track API call performance
        const duration = performance.now() - startTime;
        settingsTelemetry.trackApiCall('/api/settings', 'GET', duration, true);
        
        return response.data.settings;
      } catch (error: any) {
        // Track API call failure
        const duration = performance.now() - startTime;
        const errorType = error.response?.status === 401 ? 'auth' :
                         error.response?.status === 403 ? 'auth' :
                         error.response?.status >= 500 ? 'server' :
                         'network';
        
        settingsTelemetry.trackApiCall('/api/settings', 'GET', duration, false, errorType);
        settingsTelemetry.trackLoadError(error, errorType);
        
        // Log error for debugging
        console.error('Failed to load settings:', error);
        
        // Throw a user-friendly error message
        const message = error.response?.data?.error || 
                       error.response?.status === 401 ? 'Authentication required. Please sign in again.' :
                       error.response?.status === 403 ? 'Access denied. Please check your permissions.' :
                       error.response?.status >= 500 ? 'Server error. Please try again later.' :
                       'Failed to load settings. Please check your connection.';
        
        throw new Error(message);
      }
    },
    retry: (failureCount, error: any) => {
      // Track retry attempts
      settingsTelemetry.trackRetry(failureCount + 1, error.message);
      
      // Don't retry on authentication errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  
  // Sync server settings to local state when data changes
  useEffect(() => {
    if (serverSettings) {
      setSettingsState(serverSettings);
      settingsTelemetry.trackLoadSuccess();
      settingsTelemetry.trackQueryState('settings', 'success', serverSettings);
    }
  }, [serverSettings, setSettingsState]);
  
  // Track query state changes
  useEffect(() => {
    if (isLoadingSettings) {
      settingsTelemetry.trackQueryState('settings', 'loading');
    } else if (settingsError) {
      settingsTelemetry.trackQueryState('settings', 'error', settingsError);
    }
  }, [isLoadingSettings, settingsError]);
  
  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { tab?: string; settings: Settings }) => {
      try {
        const response = await axios.put('/api/settings', data.settings);
        return { data: response.data, variables: data };
      } catch (error: any) {
        console.error('Failed to save settings:', error);
        
        const message = error.response?.data?.error ||
                       error.response?.status === 401 ? 'Authentication required. Please sign in again.' :
                       error.response?.status === 403 ? 'Access denied. Please check your permissions.' :
                       error.response?.status >= 500 ? 'Server error. Please try again later.' :
                       'Failed to save settings. Please check your connection.';
        
        throw new Error(message);
      }
    }
  });
  
  // Methods
  const setSettings = useCallback((newSettings: Settings | ((prev: Settings) => Settings)) => {
    if (typeof newSettings === 'function') {
      setSettingsState((prev) => {
        const currentSettings = prev?.present || getDefaultSettings();
        return newSettings(currentSettings);
      });
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
        ...(prev[tab] || getDefaultTabState()),
        isDirty: true
      }
    }));
  }, []);
  
  const markTabClean = useCallback((tab: string) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: {
        ...(prev[tab] || getDefaultTabState()),
        isDirty: false,
        lastSaved: new Date()
      }
    }));
  }, []);
  
  // Validation functions (moved before saveSettings to avoid temporal dead zone)
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
      const result = await saveMutation.mutateAsync({ tab, settings });
      
      // Handle success
      toast({
        title: 'Settings saved',
        description: tab ? `${tab} settings saved successfully` : 'All settings saved successfully',
      });
      
      if (tab) {
        markTabClean(tab);
      } else {
        // Mark all tabs as clean
        Object.keys(tabStates).forEach(tab => markTabClean(tab));
      }
      
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      
    } catch (error: any) {
      // Handle error
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
      console.error('Save settings error:', error);
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
  
  const value: SettingsContextType = {
    settings: settings || getDefaultSettings(),
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
    isLoading: isLoadingSettings || isLoading,
    isSaving,
    error: settingsError || error,
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