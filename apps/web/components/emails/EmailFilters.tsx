'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  Save,
  Calendar,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmailFilter {
  search: string;
  status: string;
  newsletter: string;
  dateRange: string;
  customDateStart?: string;
  customDateEnd?: string;
  sentiment?: string;
  hasCompanies?: boolean;
  minConfidence?: number;
}

interface SavedFilter {
  id: string;
  name: string;
  filter: EmailFilter;
  isDefault?: boolean;
}

interface EmailFiltersProps {
  filters: EmailFilter;
  onFiltersChange: (filters: EmailFilter) => void;
  newsletters: string[];
  onApply?: () => void;
  onReset?: () => void;
}

export function EmailFilters({ 
  filters, 
  onFiltersChange, 
  newsletters,
  onApply,
  onReset 
}: EmailFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const saved = localStorage.getItem('emailSavedFilters');
    return saved ? JSON.parse(saved) : [];
  });
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value !== '';
    if (key === 'status') return value !== 'all';
    if (key === 'newsletter') return value !== 'all';
    if (key === 'dateRange') return value !== '7';
    return !!value;
  }).length;

  const handleSaveFilter = () => {
    if (!filterName) return;
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filter: { ...filters }
    };
    
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('emailSavedFilters', JSON.stringify(updated));
    
    setFilterName('');
    setShowSaveDialog(false);
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    onFiltersChange(savedFilter.filter);
    if (onApply) onApply();
  };

  const handleDeleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('emailSavedFilters', JSON.stringify(updated));
  };

  const handleReset = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      newsletter: 'all',
      dateRange: '7',
      sentiment: undefined,
      hasCompanies: undefined,
      minConfidence: undefined
    });
    if (onReset) onReset();
  };

  return (
    <div className="space-y-4">
      {/* Quick Filters Bar */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 pr-9"
            data-search-input
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Select 
          value={filters.status} 
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Pending
              </div>
            </SelectItem>
            <SelectItem value="processing">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 animate-pulse" />
                Processing
              </div>
            </SelectItem>
            <SelectItem value="completed">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Completed
              </div>
            </SelectItem>
            <SelectItem value="failed">
              <div className="flex items-center gap-2">
                <XCircle className="h-3 w-3 text-red-600" />
                Failed
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Newsletter Filter */}
        <Select 
          value={filters.newsletter} 
          onValueChange={(value) => onFiltersChange({ ...filters, newsletter: value })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Newsletter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Newsletters</SelectItem>
            {newsletters.map(newsletter => (
              <SelectItem key={newsletter} value={newsletter}>
                {newsletter}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <Select 
          value={filters.dateRange} 
          onValueChange={(value) => onFiltersChange({ ...filters, dateRange: value })}
        >
          <SelectTrigger className="w-[150px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters */}
        <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Advanced
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">Advanced Filters</h4>
              
              {/* Sentiment Filter */}
              <div>
                <Label>Sentiment</Label>
                <Select 
                  value={filters.sentiment || 'all'} 
                  onValueChange={(value) => onFiltersChange({ 
                    ...filters, 
                    sentiment: value === 'all' ? undefined : value 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any sentiment</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Has Companies */}
              <div className="flex items-center justify-between">
                <Label>Has Companies</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filters.hasCompanies === true ? 'default' : 'outline'}
                    onClick={() => onFiltersChange({ 
                      ...filters, 
                      hasCompanies: filters.hasCompanies === true ? undefined : true 
                    })}
                  >
                    Yes
                  </Button>
                  <Button
                    size="sm"
                    variant={filters.hasCompanies === false ? 'default' : 'outline'}
                    onClick={() => onFiltersChange({ 
                      ...filters, 
                      hasCompanies: filters.hasCompanies === false ? undefined : false 
                    })}
                  >
                    No
                  </Button>
                </div>
              </div>

              {/* Min Confidence */}
              <div>
                <Label>Min Confidence: {filters.minConfidence || 0}%</Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.minConfidence || 0}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    minConfidence: parseInt(e.target.value) || undefined 
                  })}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setIsAdvancedOpen(false);
                    if (onApply) onApply();
                  }}
                >
                  Apply Filters
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleReset}
                >
                  Reset
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Saved:</span>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map(savedFilter => (
              <div key={savedFilter.id} className="group">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleLoadFilter(savedFilter)}
                  className="gap-1 pr-1"
                >
                  {savedFilter.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSavedFilter(savedFilter.id);
                    }}
                    className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Button>
              </div>
            ))}
          </div>
          
          {/* Save Current Filter */}
          <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="gap-1">
                <Save className="h-3 w-3" />
                Save Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Save Current Filter</h4>
                <Input
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveFilter();
                  }}
                />
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleSaveFilter}
                  disabled={!filterName}
                >
                  Save Filter
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active:</span>
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Search: {filters.search}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, search: '' })}
                />
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Status: {filters.status}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, status: 'all' })}
                />
              </Badge>
            )}
            {filters.newsletter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Newsletter: {filters.newsletter}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, newsletter: 'all' })}
                />
              </Badge>
            )}
            {filters.sentiment && (
              <Badge variant="secondary" className="gap-1">
                Sentiment: {filters.sentiment}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, sentiment: undefined })}
                />
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}