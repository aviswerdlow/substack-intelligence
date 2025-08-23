'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Command, 
  Search, 
  Home, 
  Building2, 
  Mail, 
  FileText, 
  Settings, 
  HelpCircle,
  Keyboard,
  BarChart3
} from 'lucide-react';

interface Shortcut {
  key: string;
  label: string;
  description: string;
  action: () => void;
  icon?: React.ElementType;
  category: 'navigation' | 'action' | 'help';
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const shortcuts: Shortcut[] = [
    // Navigation shortcuts
    {
      key: 'g h',
      label: 'Go to Dashboard',
      description: 'Navigate to dashboard',
      action: () => router.push('/dashboard'),
      icon: Home,
      category: 'navigation'
    },
    {
      key: 'g i',
      label: 'Go to Intelligence',
      description: 'View daily intelligence',
      action: () => router.push('/intelligence'),
      icon: Building2,
      category: 'navigation'
    },
    {
      key: 'g e',
      label: 'Go to Emails',
      description: 'View email processing',
      action: () => router.push('/emails'),
      icon: Mail,
      category: 'navigation'
    },
    {
      key: 'g r',
      label: 'Go to Reports',
      description: 'View reports',
      action: () => router.push('/reports'),
      icon: FileText,
      category: 'navigation'
    },
    {
      key: 'g a',
      label: 'Go to Analytics',
      description: 'View analytics',
      action: () => router.push('/analytics'),
      icon: BarChart3,
      category: 'navigation'
    },
    {
      key: 'g s',
      label: 'Go to Settings',
      description: 'Open settings',
      action: () => router.push('/settings'),
      icon: Settings,
      category: 'navigation'
    },
    // Action shortcuts
    {
      key: 'cmd+k',
      label: 'Command Palette',
      description: 'Open command palette',
      action: () => setIsCommandPaletteOpen(true),
      icon: Command,
      category: 'action'
    },
    {
      key: '/',
      label: 'Search',
      description: 'Focus search input',
      action: () => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      },
      icon: Search,
      category: 'action'
    },
    {
      key: 'r',
      label: 'Refresh',
      description: 'Refresh current page',
      action: () => window.location.reload(),
      category: 'action'
    },
    {
      key: 'p',
      label: 'Run Pipeline',
      description: 'Trigger pipeline manually',
      action: () => {
        const pipelineButton = document.querySelector('[data-pipeline-trigger]') as HTMLButtonElement;
        pipelineButton?.click();
      },
      category: 'action'
    },
    // Help shortcuts
    {
      key: '?',
      label: 'Keyboard Shortcuts',
      description: 'Show this help dialog',
      action: () => setIsShortcutsHelpOpen(true),
      icon: Keyboard,
      category: 'help'
    },
    {
      key: 'h',
      label: 'Help',
      description: 'Open help documentation',
      action: () => window.open('/docs', '_blank'),
      icon: HelpCircle,
      category: 'help'
    }
  ];

  // Key sequence tracking for multi-key shortcuts
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [sequenceTimeout, setSequenceTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        e.target instanceof HTMLSelectElement) {
      return;
    }

    const key = e.key.toLowerCase();
    const cmdKey = e.metaKey || e.ctrlKey;
    const shiftKey = e.shiftKey;

    // Handle Cmd+K
    if (cmdKey && key === 'k') {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
      return;
    }

    // Handle ? (Shift+/)
    if (shiftKey && key === '/') {
      e.preventDefault();
      setIsShortcutsHelpOpen(true);
      return;
    }

    // Handle single key shortcuts
    if (!cmdKey && !shiftKey) {
      const singleKeyShortcut = shortcuts.find(s => s.key === key);
      if (singleKeyShortcut) {
        e.preventDefault();
        singleKeyShortcut.action();
        return;
      }
    }

    // Handle key sequences (like 'g h')
    if (!cmdKey && !shiftKey && key.match(/^[a-z]$/)) {
      const newSequence = [...keySequence, key];
      setKeySequence(newSequence);

      // Clear existing timeout
      if (sequenceTimeout) {
        clearTimeout(sequenceTimeout);
      }

      // Check if sequence matches any shortcut
      const sequenceStr = newSequence.join(' ');
      const matchingShortcut = shortcuts.find(s => s.key === sequenceStr);
      
      if (matchingShortcut) {
        e.preventDefault();
        matchingShortcut.action();
        setKeySequence([]);
        return;
      }

      // Check if this could be the start of a sequence
      const potentialMatch = shortcuts.some(s => s.key.startsWith(sequenceStr));
      
      if (potentialMatch) {
        // Wait for next key
        const timeout = setTimeout(() => {
          setKeySequence([]);
        }, 1000);
        setSequenceTimeout(timeout);
      } else {
        // No match, clear sequence
        setKeySequence([]);
      }
    }
  }, [keySequence, sequenceTimeout, shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeout) {
        clearTimeout(sequenceTimeout);
      }
    };
  }, [handleKeyDown, sequenceTimeout]);

  // Filter shortcuts for command palette
  const filteredShortcuts = shortcuts.filter(shortcut =>
    shortcut.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatKey = (key: string) => {
    return key
      .replace('cmd', '⌘')
      .replace('shift', '⇧')
      .replace('alt', '⌥')
      .replace('ctrl', '⌃')
      .split('+')
      .map(k => k.trim())
      .join('');
  };

  return (
    <>
      {/* Command Palette */}
      <Dialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type a command or search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto p-2">
            {['navigation', 'action', 'help'].map(category => {
              const categoryShortcuts = filteredShortcuts.filter(s => s.category === category);
              if (categoryShortcuts.length === 0) return null;
              
              return (
                <div key={category} className="mb-4">
                  <div className="px-2 py-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {category}
                    </p>
                  </div>
                  {categoryShortcuts.map(shortcut => (
                    <button
                      key={shortcut.key}
                      onClick={() => {
                        shortcut.action();
                        setIsCommandPaletteOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-accent text-left transition-colors"
                    >
                      {shortcut.icon && <shortcut.icon className="h-4 w-4 text-muted-foreground" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{shortcut.label}</p>
                        <p className="text-xs text-muted-foreground">{shortcut.description}</p>
                      </div>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded font-mono">
                        {formatKey(shortcut.key)}
                      </kbd>
                    </button>
                  ))}
                </div>
              );
            })}
            
            {filteredShortcuts.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <p>No commands found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help */}
      <Dialog open={isShortcutsHelpOpen} onOpenChange={setIsShortcutsHelpOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {['navigation', 'action', 'help'].map(category => (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted-foreground uppercase mb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter(s => s.category === category)
                    .map(shortcut => (
                      <div key={shortcut.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {shortcut.icon && <shortcut.icon className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-sm">{shortcut.label}</span>
                        </div>
                        <kbd className="px-2 py-1 text-xs bg-muted rounded font-mono">
                          {formatKey(shortcut.key)}
                        </kbd>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Press <kbd className="px-1 py-0.5 text-xs bg-background rounded">⌘K</kbd> to 
              open the command palette from anywhere.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}