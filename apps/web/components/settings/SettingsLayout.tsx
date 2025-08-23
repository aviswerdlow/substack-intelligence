'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Search,
  User,
  Mail,
  Building2,
  Bell,
  Shield,
  Palette,
  FileText,
  Zap,
  Database,
  Globe,
  Settings as SettingsIcon,
  ChevronRight,
  Check,
  AlertCircle
} from 'lucide-react';
import { microAnimations } from '@/lib/design-system';
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  isNew?: boolean;
  hasChanges?: boolean;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'account',
    title: 'Account',
    description: 'Profile and account preferences',
    icon: User,
  },
  {
    id: 'email',
    title: 'Email Integration',
    description: 'Gmail connection and sync',
    icon: Mail,
    badge: 'Connected',
  },
  {
    id: 'newsletters',
    title: 'Newsletter Sources',
    description: 'Manage tracked newsletters',
    icon: FileText,
  },
  {
    id: 'companies',
    title: 'Company Tracking',
    description: 'Companies to monitor',
    icon: Building2,
  },
  {
    id: 'ai',
    title: 'AI Configuration',
    description: 'Model settings and API keys',
    icon: Zap,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Alerts and preferences',
    icon: Bell,
    isNew: true,
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Theme and display settings',
    icon: Palette,
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    description: 'Data and security settings',
    icon: Shield,
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Automated report settings',
    icon: FileText,
  },
  {
    id: 'api',
    title: 'API Access',
    description: 'API keys and webhooks',
    icon: Database,
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Third-party connections',
    icon: Globe,
  },
  {
    id: 'advanced',
    title: 'Advanced',
    description: 'Advanced configuration',
    icon: SettingsIcon,
  },
];

interface SettingsLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
}

export function SettingsLayout({
  activeSection,
  onSectionChange,
  hasUnsavedChanges = false,
  onSave,
  onCancel,
  children
}: SettingsLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { announce } = useAccessibility();

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter sections based on search
  const filteredSections = settingsSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle section change
  const handleSectionChange = (sectionId: string) => {
    onSectionChange(sectionId);
    setShowMobileMenu(false);
    
    // Announce change for screen readers
    const section = settingsSections.find(s => s.id === sectionId);
    if (section) {
      announce(`Navigated to ${section.title} settings`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* Sidebar Navigation */}
      <aside className={cn(
        'lg:w-80 lg:flex-shrink-0',
        isMobile && !showMobileMenu && 'hidden'
      )}>
        <div className="lg:sticky lg:top-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search settings"
            />
          </div>

          {/* Settings Navigation */}
          <nav className="space-y-1" role="navigation" aria-label="Settings sections">
            {filteredSections.map((section) => {
              const isActive = activeSection === section.id;
              const Icon = section.icon;
              
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    microAnimations.hover,
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{section.title}</span>
                      {section.isNew && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                      {section.hasChanges && (
                        <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-xs opacity-80 truncate">
                      {section.description}
                    </p>
                  </div>
                  {section.badge && (
                    <Badge variant={isActive ? 'secondary' : 'outline'} className="text-xs">
                      {section.badge}
                    </Badge>
                  )}
                  <ChevronRight className={cn(
                    'h-4 w-4 flex-shrink-0 transition-transform',
                    isActive && 'rotate-90'
                  )} />
                </button>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => window.open('/docs/settings', '_blank')}
              >
                <AlertCircle className="h-4 w-4" />
                Settings Help
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Toggle */}
      {isMobile && (
        <Button
          variant="outline"
          className="lg:hidden mb-4"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          <SettingsIcon className="h-4 w-4 mr-2" />
          {showMobileMenu ? 'Hide Menu' : 'Show Menu'}
        </Button>
      )}

      {/* Main Content Area */}
      <main className={cn(
        'flex-1 min-w-0',
        isMobile && showMobileMenu && 'hidden'
      )}>
        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm font-medium">You have unsaved changes</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={onSave}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Content */}
        <div className="bg-card rounded-lg border">
          {children}
        </div>
      </main>
    </div>
  );
}