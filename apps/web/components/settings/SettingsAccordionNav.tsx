'use client';

import React, { useState, useEffect } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  User,
  Mail,
  Building2,
  Brain,
  Key,
  Bell,
  Database,
  Palette,
  Shield,
  Calendar,
  Code,
  Globe,
  ChevronDown,
  Circle,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

// Settings group configuration
export const settingsGroups = {
  'User & Access': {
    icon: User,
    tabs: [
      { id: 'account', label: 'Account', icon: User },
      { id: 'privacy', label: 'Privacy', icon: Shield },
      { id: 'appearance', label: 'Appearance', icon: Palette },
    ],
    color: 'blue',
    description: 'Manage your profile, privacy, and appearance settings',
  },
  'Data Sources': {
    icon: Database,
    tabs: [
      { id: 'newsletters', label: 'Newsletters', icon: Mail },
      { id: 'email', label: 'Email Integration', icon: Mail },
      { id: 'companies', label: 'Company Watchlist', icon: Building2 },
    ],
    color: 'green',
    description: 'Configure data sources and tracking preferences',
  },
  'Intelligence': {
    icon: Brain,
    tabs: [
      { id: 'ai', label: 'AI Configuration', icon: Brain },
      { id: 'reports', label: 'Reports', icon: Calendar },
      { id: 'notifications', label: 'Alerts', icon: Bell },
    ],
    color: 'purple',
    description: 'AI-powered analysis and reporting settings',
  },
  'Developer': {
    icon: Code,
    tabs: [
      { id: 'api', label: 'API Access', icon: Key },
      { id: 'webhooks', label: 'Webhooks', icon: Globe },
      { id: 'integrations', label: 'Integrations', icon: Globe },
    ],
    color: 'orange',
    description: 'Developer tools and API configurations',
  },
};

interface SettingsAccordionNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export function SettingsAccordionNav({
  activeTab,
  onTabChange,
  className,
}: SettingsAccordionNavProps) {
  const { tabStates, unsavedTabs } = useSettings();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
  // Load expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('settings-expanded-groups');
    if (saved) {
      setExpandedGroups(JSON.parse(saved));
    } else {
      // Default to all expanded
      setExpandedGroups(Object.keys(settingsGroups));
    }
  }, []);
  
  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem('settings-expanded-groups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);
  
  // Auto-expand group when tab inside is selected
  useEffect(() => {
    const groupWithActiveTab = Object.entries(settingsGroups).find(([_, group]) =>
      group.tabs.some(tab => tab.id === activeTab)
    );
    
    if (groupWithActiveTab && !expandedGroups.includes(groupWithActiveTab[0])) {
      setExpandedGroups(prev => [...prev, groupWithActiveTab[0]]);
    }
  }, [activeTab]);
  
  const getTabStatus = (tabId: string) => {
    const state = tabStates[tabId];
    if (!state) return 'idle';
    
    if (state.validationErrors.some(e => e.severity === 'error')) {
      return 'error';
    }
    if (state.isDirty) {
      return 'unsaved';
    }
    if (state.lastSaved && new Date().getTime() - state.lastSaved.getTime() < 5000) {
      return 'saved';
    }
    return 'idle';
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'unsaved':
        return <Circle className="h-2 w-2 fill-orange-500 text-orange-500" />;
      case 'saved':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'saving':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };
  
  const getGroupStatus = (groupName: string) => {
    const group = settingsGroups[groupName as keyof typeof settingsGroups];
    const tabStatuses = group.tabs.map(tab => getTabStatus(tab.id));
    
    if (tabStatuses.includes('error')) return 'error';
    if (tabStatuses.includes('unsaved')) return 'unsaved';
    if (tabStatuses.includes('saved')) return 'saved';
    return 'idle';
  };
  
  return (
    <Accordion.Root
      type="multiple"
      value={expandedGroups}
      onValueChange={setExpandedGroups}
      className={cn('w-full space-y-2', className)}
    >
      {Object.entries(settingsGroups).map(([groupName, group]) => {
        const GroupIcon = group.icon;
        const groupStatus = getGroupStatus(groupName);
        
        return (
          <Accordion.Item
            key={groupName}
            value={groupName}
            className={cn(
              'rounded-lg border transition-all duration-200',
              groupStatus === 'error' && 'border-red-500/50 bg-red-50/10',
              groupStatus === 'unsaved' && 'border-orange-500/50 bg-orange-50/10',
              groupStatus === 'saved' && 'border-green-500/50 bg-green-50/10',
              groupStatus === 'idle' && 'border-gray-200 dark:border-gray-800'
            )}
          >
            <Accordion.Header>
              <Accordion.Trigger
                className={cn(
                  'flex w-full items-center justify-between p-4',
                  'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2',
                  `focus:ring-${group.color}-500`
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'rounded-lg p-2',
                    `bg-${group.color}-100 dark:bg-${group.color}-900/20`,
                    `text-${group.color}-600 dark:text-${group.color}-400`
                  )}>
                    <GroupIcon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{groupName}</h3>
                      {getStatusIcon(groupStatus)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {group.description}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    expandedGroups.includes(groupName) && 'rotate-180'
                  )}
                />
              </Accordion.Trigger>
            </Accordion.Header>
            
            <Accordion.Content className="overflow-hidden">
              <AnimatePresence initial={false}>
                {expandedGroups.includes(groupName) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <div className="px-2 pb-2">
                      {group.tabs.map((tab) => {
                        const TabIcon = tab.icon;
                        const tabStatus = getTabStatus(tab.id);
                        const isActive = activeTab === tab.id;
                        
                        return (
                          <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                              'flex w-full items-center justify-between',
                              'rounded-md px-3 py-2.5 mb-1',
                              'transition-all duration-150',
                              'hover:bg-gray-100 dark:hover:bg-gray-800',
                              isActive && 'bg-gray-100 dark:bg-gray-800',
                              isActive && `border-l-4 border-${group.color}-500`,
                              'focus:outline-none focus:ring-2 focus:ring-offset-1',
                              `focus:ring-${group.color}-500`
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <TabIcon className={cn(
                                'h-4 w-4',
                                isActive && `text-${group.color}-600 dark:text-${group.color}-400`
                              )} />
                              <span className={cn(
                                'text-sm',
                                isActive && 'font-medium'
                              )}>
                                {tab.label}
                              </span>
                            </div>
                            {getStatusIcon(tabStatus)}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
}

// Export a simple tab list for mobile view
export function SettingsTabList({
  activeTab,
  onTabChange,
  className,
}: SettingsAccordionNavProps) {
  const { tabStates } = useSettings();
  
  const allTabs = Object.values(settingsGroups).flatMap(group => group.tabs);
  
  return (
    <div className={cn('flex overflow-x-auto gap-2 pb-2', className)}>
      {allTabs.map((tab) => {
        const TabIcon = tab.icon;
        const tabStatus = tabStates[tab.id]?.isDirty ? 'unsaved' : 'idle';
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2',
              'rounded-lg whitespace-nowrap',
              'transition-all duration-150',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              isActive && 'bg-gray-100 dark:bg-gray-800',
              isActive && 'font-medium'
            )}
          >
            <TabIcon className="h-4 w-4" />
            <span className="text-sm">{tab.label}</span>
            {tabStatus === 'unsaved' && (
              <Circle className="h-2 w-2 fill-orange-500 text-orange-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}