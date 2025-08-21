'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHotkeys } from 'react-hotkeys-hook';
import { z } from 'zod';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import type { Settings, ValidationError } from '@/contexts/SettingsContext';

// Hook for real-time validation
export function useSettingsValidation(schema?: z.ZodSchema) {
  const { settings, validateTab } = useSettings();
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(true);
  
  const validate = useCallback((data: any) => {
    if (!schema) return true;
    
    try {
      schema.parse(data);
      setErrors([]);
      setIsValid(true);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error' as const,
        }));
        setErrors(validationErrors);
        setIsValid(false);
        return false;
      }
      return false;
    }
  }, [schema]);
  
  useEffect(() => {
    if (schema) {
      validate(settings);
    }
  }, [settings, validate, schema]);
  
  return {
    errors,
    isValid,
    validate,
    clearErrors: () => setErrors([]),
  };
}

// Hook for settings persistence with SWR
export function useSettingsPersistence() {
  const queryClient = useQueryClient();
  const { settings, saveSettings } = useSettings();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: Settings) => {
      setSyncStatus('syncing');
      const response = await axios.put('/api/settings', data);
      return response.data;
    },
    onSuccess: () => {
      setSyncStatus('success');
      setLastSyncTime(new Date());
      setTimeout(() => setSyncStatus('idle'), 2000);
    },
    onError: () => {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    },
  });
  
  // Auto-save with debounce
  const [debouncedSettings, setDebouncedSettings] = useState(settings);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSettings(settings);
    }, 1000); // 1 second debounce
    
    return () => clearTimeout(timer);
  }, [settings]);
  
  useEffect(() => {
    if (debouncedSettings) {
      autoSaveMutation.mutate(debouncedSettings);
    }
  }, [debouncedSettings]);
  
  return {
    lastSyncTime,
    syncStatus,
    isSyncing: syncStatus === 'syncing',
    forceSync: () => autoSaveMutation.mutate(settings),
  };
}

// Hook for settings history tracking
export function useSettingsHistory() {
  const { settings } = useSettings();
  const [history, setHistory] = useState<Array<{
    timestamp: Date;
    action: string;
    field: string;
    oldValue: any;
    newValue: any;
  }>>([]);
  
  const addHistoryEntry = useCallback((
    action: string,
    field: string,
    oldValue: any,
    newValue: any
  ) => {
    setHistory(prev => [
      {
        timestamp: new Date(),
        action,
        field,
        oldValue,
        newValue,
      },
      ...prev.slice(0, 49), // Keep last 50 entries
    ]);
  }, []);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);
  
  const getFieldHistory = useCallback((field: string) => {
    return history.filter(entry => entry.field === field);
  }, [history]);
  
  return {
    history,
    addHistoryEntry,
    clearHistory,
    getFieldHistory,
  };
}

// Hook for export/import functionality
export function useSettingsExport() {
  const { settings, exportSettings, importSettings } = useSettings();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const handleExport = useCallback(async (
    format: 'json' | 'yaml' | 'env' = 'json',
    options?: {
      includeSecrets?: boolean;
      includeDefaults?: boolean;
      prettify?: boolean;
      encrypt?: boolean;
      password?: string;
    }
  ) => {
    setIsExporting(true);
    try {
      let exportData = { ...settings };
      
      // Remove secrets if needed
      if (!options?.includeSecrets) {
        exportData = {
          ...exportData,
          ai: {
            ...exportData.ai,
            apiKey: '',
            anthropicApiKey: '',
            openaiApiKey: '',
          },
          api: {
            ...exportData.api,
            keys: exportData.api.keys.map(key => ({ ...key, key: '[REDACTED]' })),
          },
        };
      }
      
      // TODO: Add encryption if needed
      if (options?.encrypt && options?.password) {
        // Implement encryption logic
      }
      
      exportSettings(format);
      
      toast({
        title: 'Export successful',
        description: `Settings exported as ${format} file`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export settings',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [settings, exportSettings]);
  
  const handleImport = useCallback(async (
    file: File,
    options?: {
      validate?: boolean;
      merge?: boolean;
      decrypt?: boolean;
      password?: string;
    }
  ) => {
    setIsImporting(true);
    try {
      // TODO: Add decryption if needed
      if (options?.decrypt && options?.password) {
        // Implement decryption logic
      }
      
      await importSettings(file);
      
      toast({
        title: 'Import successful',
        description: 'Settings imported successfully',
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to import settings',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  }, [importSettings]);
  
  return {
    handleExport,
    handleImport,
    isExporting,
    isImporting,
  };
}

// Hook for keyboard shortcuts
export function useSettingsKeyboard() {
  const { 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    saveSettings,
    hasUnsavedChanges 
  } = useSettings();
  const { toast } = useToast();
  
  // Undo: Cmd+Z
  useHotkeys('cmd+z, ctrl+z', (e) => {
    e.preventDefault();
    if (canUndo) {
      undo();
      toast({
        title: 'Undo',
        description: 'Action undone',
      });
    }
  }, [canUndo, undo]);
  
  // Redo: Cmd+Shift+Z
  useHotkeys('cmd+shift+z, ctrl+shift+z', (e) => {
    e.preventDefault();
    if (canRedo) {
      redo();
      toast({
        title: 'Redo',
        description: 'Action redone',
      });
    }
  }, [canRedo, redo]);
  
  // Save: Cmd+S
  useHotkeys('cmd+s, ctrl+s', (e) => {
    e.preventDefault();
    if (hasUnsavedChanges) {
      saveSettings();
    }
  }, [hasUnsavedChanges, saveSettings]);
  
  // Quick search: Cmd+K
  useHotkeys('cmd+k, ctrl+k', (e) => {
    e.preventDefault();
    // TODO: Open settings search modal
    console.log('Opening settings search...');
  });
}

// Hook for API key validation
export function useApiKeyValidation() {
  const [validationStatus, setValidationStatus] = useState<Record<string, {
    isValid: boolean;
    isValidating: boolean;
    error?: string;
    models?: string[];
    rateLimit?: string;
  }>>({});
  
  const validateApiKey = useCallback(async (
    provider: 'anthropic' | 'openai',
    apiKey: string
  ) => {
    const key = `${provider}_${apiKey}`;
    
    setValidationStatus(prev => ({
      ...prev,
      [key]: { isValid: false, isValidating: true },
    }));
    
    try {
      const response = await axios.post('/api/settings/validate-api-key', {
        provider,
        apiKey,
      });
      
      setValidationStatus(prev => ({
        ...prev,
        [key]: {
          isValid: true,
          isValidating: false,
          models: response.data.models,
          rateLimit: response.data.rateLimit,
        },
      }));
      
      return true;
    } catch (error: any) {
      setValidationStatus(prev => ({
        ...prev,
        [key]: {
          isValid: false,
          isValidating: false,
          error: error.response?.data?.error || 'Invalid API key',
        },
      }));
      
      return false;
    }
  }, []);
  
  const getValidationStatus = useCallback((provider: string, apiKey: string) => {
    return validationStatus[`${provider}_${apiKey}`] || {
      isValid: false,
      isValidating: false,
    };
  }, [validationStatus]);
  
  return {
    validateApiKey,
    getValidationStatus,
    validationStatus,
  };
}

// Hook for settings search
export function useSettingsSearch() {
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    path: string;
    value: any;
    label: string;
    category: string;
  }>>([]);
  
  const search = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query) {
      setSearchResults([]);
      return;
    }
    
    // Simple search implementation
    const results: typeof searchResults = [];
    const searchInObject = (obj: any, path: string[] = [], category = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = [...path, key];
        const pathString = currentPath.join('.');
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          searchInObject(value, currentPath, category || key);
        } else {
          const searchableText = `${key} ${value}`.toLowerCase();
          if (searchableText.includes(query.toLowerCase())) {
            results.push({
              path: pathString,
              value,
              label: key,
              category: category || path[0] || 'General',
            });
          }
        }
      });
    };
    
    searchInObject(settings);
    setSearchResults(results.slice(0, 10)); // Limit to 10 results
  }, [settings]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      search(searchQuery);
    }, 300); // Debounce search
    
    return () => clearTimeout(timer);
  }, [searchQuery, search]);
  
  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    search,
  };
}

// Hook for change detection
export function useSettingsChanges(tab?: string) {
  const { settings, tabStates, markTabDirty, markTabClean } = useSettings();
  const [originalSettings, setOriginalSettings] = useState(settings);
  const [changes, setChanges] = useState<Record<string, { old: any; new: any }>>({});
  
  useEffect(() => {
    // Track changes
    const findChanges = (original: any, current: any, path: string[] = []): void => {
      Object.keys(current).forEach(key => {
        const currentPath = [...path, key].join('.');
        
        if (tab && !currentPath.startsWith(tab)) {
          return; // Skip if not in the current tab
        }
        
        if (typeof current[key] === 'object' && current[key] !== null) {
          if (typeof original[key] === 'object' && original[key] !== null) {
            findChanges(original[key], current[key], [...path, key]);
          } else if (JSON.stringify(original[key]) !== JSON.stringify(current[key])) {
            setChanges(prev => ({
              ...prev,
              [currentPath]: { old: original[key], new: current[key] },
            }));
          }
        } else if (original[key] !== current[key]) {
          setChanges(prev => ({
            ...prev,
            [currentPath]: { old: original[key], new: current[key] },
          }));
        }
      });
    };
    
    findChanges(originalSettings, settings);
    
    // Mark tab as dirty if there are changes
    if (tab && Object.keys(changes).length > 0) {
      markTabDirty(tab);
    }
  }, [settings, originalSettings, tab, markTabDirty]);
  
  const resetChanges = useCallback(() => {
    setOriginalSettings(settings);
    setChanges({});
    if (tab) {
      markTabClean(tab);
    }
  }, [settings, tab, markTabClean]);
  
  return {
    changes,
    hasChanges: Object.keys(changes).length > 0,
    resetChanges,
    changeCount: Object.keys(changes).length,
  };
}