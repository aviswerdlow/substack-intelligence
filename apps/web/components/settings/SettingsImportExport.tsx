'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@radix-ui/react-progress';
import {
  Download,
  Upload,
  FileJson,
  FileText,
  FileCode,
  Shield,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  X,
  Copy,
  Share2,
  Archive,
  Clock,
  Users,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useSettingsExport } from '@/hooks/useSettingsHooks';
import { settingsSchema } from '@/schemas/settings.schema';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { createEncryptedExport, parseEncryptedImport, isEncryptedFile } from '@/lib/encryption';

interface SettingsImportExportProps {
  className?: string;
}

export function SettingsImportExport({ className }: SettingsImportExportProps) {
  const { settings, importSettings, exportSettings } = useSettings();
  const { handleExport, handleImport, isExporting, isImporting } = useSettingsExport();
  const { toast } = useToast();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Export options
  const [exportOptions, setExportOptions] = useState({
    format: 'json' as 'json' | 'yaml' | 'env',
    includeSecrets: false,
    includeDefaults: true,
    prettify: true,
    encrypt: false,
    password: '',
    showPassword: false,
    sections: {
      account: true,
      newsletters: true,
      companies: true,
      ai: true,
      email: true,
      reports: true,
      notifications: true,
      api: true,
      privacy: true,
      appearance: true,
    },
  });
  
  // Import options
  const [importOptions, setImportOptions] = useState({
    validate: true,
    merge: false,
    decrypt: false,
    password: '',
    sections: {
      account: true,
      newsletters: true,
      companies: true,
      ai: true,
      email: true,
      reports: true,
      notifications: true,
      api: true,
      privacy: true,
      appearance: true,
    },
  });
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  
  // Dropzone for import
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setImportFile(file);
    
    try {
      const text = await file.text();
      
      // Check if file is encrypted
      if (isEncryptedFile(text)) {
        setPendingImportFile(file);
        setShowPasswordDialog(true);
        return;
      }
      
      let parsed;
      
      if (file.name.endsWith('.json') || file.name.endsWith('.enc.json')) {
        parsed = JSON.parse(text);
      } else if (file.name.endsWith('.env')) {
        // Parse env file
        parsed = {};
        text.split('\n').forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            const settingKey = key.replace('SETTINGS_', '').toLowerCase();
            parsed[settingKey] = JSON.parse(value);
          }
        });
      } else {
        throw new Error('Unsupported file format');
      }
      
      // Validate if enabled
      if (importOptions.validate) {
        const result = settingsSchema.safeParse(parsed);
        if (!result.success) {
          const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
          setValidationErrors(errors);
        } else {
          setValidationErrors([]);
        }
      }
      
      setImportPreview(parsed);
      setShowImportDialog(true);
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message || 'Failed to parse file',
        variant: 'destructive',
      });
    }
  }, [importOptions.validate, toast]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/plain': ['.env', '.txt'],
    },
    maxFiles: 1,
  });
  
  // Handle decryption with password
  const handleDecryptFile = async (password: string) => {
    if (!pendingImportFile) return;
    
    try {
      const text = await pendingImportFile.text();
      const decrypted = parseEncryptedImport(text, password);
      
      // Validate if enabled
      if (importOptions.validate) {
        const result = settingsSchema.safeParse(decrypted);
        if (!result.success) {
          const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
          setValidationErrors(errors);
        } else {
          setValidationErrors([]);
        }
      }
      
      setImportPreview(decrypted);
      setShowPasswordDialog(false);
      setShowImportDialog(true);
      setPendingImportFile(null);
    } catch (error: any) {
      toast({
        title: 'Decryption failed',
        description: error.message || 'Invalid password or corrupted file',
        variant: 'destructive',
      });
    }
  };
  
  // Handle export
  const handleExportSettings = async () => {
    try {
      // Filter settings based on selected sections
      const filteredSettings = Object.entries(settings).reduce((acc, [key, value]) => {
        // Check if the section exists in exportOptions.sections before including it
        const sectionKey = key as keyof typeof exportOptions.sections;
        if (exportOptions.sections[sectionKey]) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      // Remove secrets if needed
      if (!exportOptions.includeSecrets) {
        if (filteredSettings.ai) {
          filteredSettings.ai.apiKey = '';
          filteredSettings.ai.anthropicApiKey = '';
          filteredSettings.ai.openaiApiKey = '';
        }
        if (filteredSettings.api) {
          filteredSettings.api.keys = filteredSettings.api.keys.map((k: any) => ({
            ...k,
            key: '[REDACTED]',
          }));
        }
      }
      
      let content: string;
      let filename: string;
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
      
      switch (exportOptions.format) {
        case 'json':
          content = exportOptions.prettify
            ? JSON.stringify(filteredSettings, null, 2)
            : JSON.stringify(filteredSettings);
          filename = `settings-export-${timestamp}.json`;
          break;
          
        case 'env':
          content = Object.entries(filteredSettings)
            .map(([key, value]) => `SETTINGS_${key.toUpperCase()}=${JSON.stringify(value)}`)
            .join('\n');
          filename = `settings-export-${timestamp}.env`;
          break;
          
        case 'yaml':
          // Simple YAML conversion (would need a proper library for complex objects)
          content = Object.entries(filteredSettings)
            .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2).replace(/"/g, '')}`)
            .join('\n');
          filename = `settings-export-${timestamp}.yaml`;
          break;
          
        default:
          content = JSON.stringify(filteredSettings, null, 2);
          filename = `settings-export-${timestamp}.json`;
      }
      
      // Encrypt if needed
      if (exportOptions.encrypt && exportOptions.password) {
        content = createEncryptedExport(filteredSettings, exportOptions.password);
        filename = filename.replace(/\.(json|env|yaml)$/, '.enc.json');
      }
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, filename);
      
      toast({
        title: 'Export successful',
        description: `Settings exported to ${filename}`,
      });
      
      setShowExportDialog(false);
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export settings',
        variant: 'destructive',
      });
    }
  };
  
  // Handle import
  const handleImportSettings = async () => {
    if (!importFile || !importPreview) return;
    
    try {
      // Filter settings based on selected sections
      const filteredSettings = Object.entries(importPreview).reduce((acc, [key, value]) => {
        if (importOptions.sections[key as keyof typeof importOptions.sections]) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      // Merge or replace
      let finalSettings;
      if (importOptions.merge) {
        finalSettings = { ...settings, ...filteredSettings };
      } else {
        finalSettings = { ...settings, ...filteredSettings };
      }
      
      await handleImport(importFile, importOptions);
      
      toast({
        title: 'Import successful',
        description: 'Settings imported successfully',
      });
      
      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message || 'Failed to import settings',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Import/Export buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setShowExportDialog(true)}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export Settings
        </Button>
        
        <Button
          variant="outline"
          onClick={() => document.getElementById('import-trigger')?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Import Settings
        </Button>
      </div>
      
      {/* Hidden file input for import */}
      <div {...getRootProps()} className="hidden">
        <input {...getInputProps()} id="import-trigger" />
      </div>
      
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
        <p className="text-sm text-gray-600">
          {isDragActive
            ? 'Drop the file here...'
            : 'Drag and drop a settings file here, or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Supports JSON and ENV formats
        </p>
      </div>
      
      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Settings</DialogTitle>
            <DialogDescription>
              Choose what to export and how to format it
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="sections" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="format">Format</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sections" className="space-y-4">
              <div className="space-y-2">
                <Label>Select sections to export:</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(exportOptions.sections).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`export-${key}`}
                        checked={value}
                        onCheckedChange={(checked) =>
                          setExportOptions(prev => ({
                            ...prev,
                            sections: { ...prev.sections, [key]: !!checked },
                          }))
                        }
                      />
                      <label
                        htmlFor={`export-${key}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                      >
                        {key}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="format" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Export format:</Label>
                  <Select
                    value={exportOptions.format}
                    onValueChange={(value: any) =>
                      setExportOptions(prev => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          JSON
                        </div>
                      </SelectItem>
                      <SelectItem value="env">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          ENV
                        </div>
                      </SelectItem>
                      <SelectItem value="yaml">
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4" />
                          YAML
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="prettify"
                    checked={exportOptions.prettify}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, prettify: !!checked }))
                    }
                  />
                  <label htmlFor="prettify" className="text-sm">
                    Pretty print (human readable)
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-defaults"
                    checked={exportOptions.includeDefaults}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeDefaults: !!checked }))
                    }
                  />
                  <label htmlFor="include-defaults" className="text-sm">
                    Include default values
                  </label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-secrets"
                    checked={exportOptions.includeSecrets}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeSecrets: !!checked }))
                    }
                  />
                  <label htmlFor="include-secrets" className="text-sm">
                    Include API keys and secrets
                  </label>
                </div>
                
                {exportOptions.includeSecrets && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-xs text-yellow-700 dark:text-yellow-300">
                        <p className="font-medium">Security Warning</p>
                        <p>Exported file will contain sensitive API keys. Keep it secure!</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="encrypt"
                      checked={exportOptions.encrypt}
                      onCheckedChange={(checked) =>
                        setExportOptions(prev => ({ ...prev, encrypt: !!checked }))
                      }
                    />
                    <label htmlFor="encrypt" className="text-sm">
                      Encrypt exported file
                    </label>
                  </div>
                  
                  {exportOptions.encrypt && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="export-password">Encryption password:</Label>
                        <div className="relative">
                          <Input
                            id="export-password"
                            type={exportOptions.showPassword ? 'text' : 'password'}
                            value={exportOptions.password}
                            onChange={(e) =>
                              setExportOptions(prev => ({ ...prev, password: e.target.value }))
                            }
                            placeholder="Enter a strong password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                              setExportOptions(prev => ({ ...prev, showPassword: !prev.showPassword }))
                            }
                          >
                            {exportOptions.showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          You'll need this password to import the file later. Store it securely!
                        </p>
                      </div>
                      
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="text-xs text-green-700 dark:text-green-300">
                            <p className="font-medium">Strong Encryption</p>
                            <p>AES-256-CBC with PBKDF2 (100,000 iterations)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportSettings} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Password Dialog for Encrypted Import */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Decryption Password</DialogTitle>
            <DialogDescription>
              This file is encrypted. Enter the password to decrypt it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="decrypt-password">Password:</Label>
              <Input
                id="decrypt-password"
                type="password"
                value={importOptions.password}
                onChange={(e) =>
                  setImportOptions(prev => ({ ...prev, password: e.target.value }))
                }
                placeholder="Enter decryption password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && importOptions.password) {
                    handleDecryptFile(importOptions.password);
                  }
                }}
              />
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Security Note</p>
                  <p>This file uses AES-256 encryption with PBKDF2 key derivation.</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPendingImportFile(null);
                setImportOptions(prev => ({ ...prev, password: '' }));
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleDecryptFile(importOptions.password)}
              disabled={!importOptions.password}
            >
              <Unlock className="mr-2 h-4 w-4" />
              Decrypt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Settings</DialogTitle>
            <DialogDescription>
              Review and import settings from {importFile?.name}
            </DialogDescription>
          </DialogHeader>
          
          {validationErrors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-xs text-red-700 dark:text-red-300">
                  <p className="font-medium">Validation Errors:</p>
                  <ul className="list-disc list-inside mt-1">
                    {validationErrors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li>...and {validationErrors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select sections to import:</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(importOptions.sections).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`import-${key}`}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setImportOptions(prev => ({
                          ...prev,
                          sections: { ...prev.sections, [key]: !!checked },
                        }))
                      }
                    />
                    <label
                      htmlFor={`import-${key}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                    >
                      {key}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="merge"
                checked={importOptions.merge}
                onCheckedChange={(checked) =>
                  setImportOptions(prev => ({ ...prev, merge: !!checked }))
                }
              />
              <label htmlFor="merge" className="text-sm">
                Merge with existing settings (instead of replace)
              </label>
            </div>
            
            {importPreview && (
              <div className="space-y-2">
                <Label>Preview:</Label>
                <div className="max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <pre className="text-xs">{JSON.stringify(importPreview, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportSettings}
              disabled={isImporting || validationErrors.length > 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Settings templates component
export function SettingsTemplates({
  onApply,
  className,
}: {
  onApply: (template: any) => void;
  className?: string;
}) {
  const templates = [
    {
      id: 'minimal',
      name: 'Minimal Setup',
      description: 'Basic configuration for getting started',
      icon: '🚀',
      settings: {
        ai: { temperature: 0.7, maxTokens: 4096 },
        notifications: { email: { enabled: true, criticalOnly: true } },
      },
    },
    {
      id: 'power-user',
      name: 'Power User',
      description: 'Advanced configuration with all features enabled',
      icon: '⚡',
      settings: {
        ai: { temperature: 0.8, maxTokens: 8192, enableEnrichment: true },
        companies: { autoDetect: true, minimumMentions: 1 },
        notifications: { email: { enabled: true }, inApp: { enabled: true } },
      },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Optimized for team collaboration and compliance',
      icon: '🏢',
      settings: {
        privacy: { dataRetention: 365, shareAnalytics: false },
        api: { keys: [], webhooks: [] },
        reports: { autoGenerate: { weekly: true, monthly: true } },
      },
    },
  ];
  
  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium">Quick Start Templates</h3>
      <div className="grid gap-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => onApply(template.settings)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-xl">{template.icon}</span>
                {template.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {template.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}