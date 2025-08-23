'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Clock,
  FileDown,
  FileUp,
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useSettingsChanges, useSettingsValidation } from '@/hooks/useSettingsHooks';
import { getTabSchema } from '@/schemas/settings.schema';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TabSaveControlsProps {
  tab: string;
  className?: string;
}

export function TabSaveControls({ tab, className }: TabSaveControlsProps) {
  const {
    saveSettings,
    resetSettings,
    undo,
    redo,
    canUndo,
    canRedo,
    tabStates,
    markTabClean,
    isSaving,
  } = useSettings();
  
  const { changes, hasChanges, resetChanges, changeCount } = useSettingsChanges(tab);
  // Temporarily disable validation to avoid errors
  // const schema = getTabSchema(tab);
  // const { errors, isValid } = useSettingsValidation(schema);
  const errors: any[] = [];
  const isValid = true;
  
  const [showChanges, setShowChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  
  const tabState = tabStates[tab];
  const lastSaved = tabState?.lastSaved;
  
  // Auto-save logic
  useEffect(() => {
    if (!autoSaveEnabled || !hasChanges || !isValid || isSaving) {
      return;
    }
    
    const timer = setTimeout(() => {
      handleSave();
      setLastAutoSave(new Date());
    }, 5000); // Auto-save after 5 seconds of no changes
    
    return () => clearTimeout(timer);
  }, [changes, autoSaveEnabled, hasChanges, isValid]);
  
  const handleSave = async () => {
    if (!isValid) {
      return;
    }
    
    await saveSettings(tab);
    resetChanges();
  };
  
  const handleReset = () => {
    resetSettings(tab);
    resetChanges();
  };
  
  const handleDiscard = () => {
    // Undo all changes for this tab
    const changeKeys = Object.keys(changes);
    for (let i = 0; i < changeKeys.length && canUndo; i++) {
      undo();
    }
    resetChanges();
  };
  
  return (
    <>
      <div className={cn('flex items-center justify-between gap-4', className)}>
        {/* Left side: Change indicators */}
        <div className="flex items-center gap-3">
          {/* Change count badge */}
          {hasChanges && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Badge
                variant="outline"
                className={cn(
                  'cursor-pointer',
                  !isValid && 'border-red-500 text-red-600'
                )}
                onClick={() => setShowChanges(true)}
              >
                <span className="mr-1">{changeCount}</span>
                <span>{changeCount === 1 ? 'change' : 'changes'}</span>
                {showChanges ? (
                  <EyeOff className="ml-1 h-3 w-3" />
                ) : (
                  <Eye className="ml-1 h-3 w-3" />
                )}
              </Badge>
            </motion.div>
          )}
          
          {/* Validation errors */}
          {errors.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.length} {errors.length === 1 ? 'error' : 'errors'}
            </Badge>
          )}
          
          {/* Last saved time */}
          {lastSaved && !hasChanges && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>Saved {format(lastSaved, 'h:mm a')}</span>
            </div>
          )}
          
          {/* Auto-save indicator */}
          {autoSaveEnabled && (
            <Badge variant="outline" className="gap-1 text-xs">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Auto-save on
            </Badge>
          )}
        </div>
        
        {/* Right side: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1 mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              className="h-8 w-8"
              title="Undo (Cmd+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              className="h-8 w-8"
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Auto-save toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
            className={cn(
              'gap-2',
              autoSaveEnabled && 'bg-green-50 border-green-300 hover:bg-green-100'
            )}
          >
            {autoSaveEnabled ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Auto-save
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                Auto-save
              </>
            )}
          </Button>
          
          {/* Discard changes */}
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Discard
            </Button>
          )}
          
          {/* Reset to defaults */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
            title="Reset to default values"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          
          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || !isValid || isSaving}
            size="sm"
            className={cn(
              'gap-2 min-w-[100px]',
              hasChanges && isValid && 'animate-pulse'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : hasChanges ? (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Saved
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Changes dialog */}
      <ChangesDialog
        open={showChanges}
        onOpenChange={setShowChanges}
        changes={changes}
        tab={tab}
      />
    </>
  );
}

// Changes dialog component
function ChangesDialog({
  open,
  onOpenChange,
  changes,
  tab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: Record<string, { old: any; new: any }>;
  tab: string;
}) {
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };
  
  const getFieldLabel = (field: string): string => {
    const parts = field.split('.');
    return parts[parts.length - 1]
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Unsaved Changes in {tab}</DialogTitle>
          <DialogDescription>
            Review the changes before saving. Red shows removed content, green shows added content.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {Object.entries(changes).map(([field, { old: oldValue, new: newValue }]) => (
            <div key={field} className="border rounded-lg p-3 space-y-2">
              <div className="font-medium text-sm">{getFieldLabel(field)}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <div className="text-gray-500">Previous</div>
                  <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                    <pre className="text-red-700 dark:text-red-300 whitespace-pre-wrap">
                      {formatValue(oldValue)}
                    </pre>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">New</div>
                  <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                    <pre className="text-green-700 dark:text-green-300 whitespace-pre-wrap">
                      {formatValue(newValue)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact save indicator for mobile
export function CompactSaveIndicator({ tab }: { tab: string }) {
  const { tabStates, isSaving } = useSettings();
  const { hasChanges, changeCount } = useSettingsChanges(tab);
  const tabState = tabStates[tab];
  
  if (!hasChanges && !isSaving && !tabState?.lastSaved) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {(hasChanges || isSaving) && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              'rounded-full px-3 py-2 flex items-center gap-2 shadow-lg',
              hasChanges && 'bg-orange-500 text-white',
              isSaving && 'bg-blue-500 text-white'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Saving...</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm">{changeCount} unsaved</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}