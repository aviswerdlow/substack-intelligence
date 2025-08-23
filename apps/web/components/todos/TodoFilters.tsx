'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Filter,
  X,
  Calendar,
  Flag,
  Tag,
  Search,
  RotateCcw,
  Check,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodoFilters {
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  search?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  overdue?: boolean;
}

interface TodoFiltersProps {
  filters: TodoFilters;
  onFiltersChange: (filters: TodoFilters) => void;
  onReset?: () => void;
  categories?: string[];
  tags?: string[];
  className?: string;
  compact?: boolean;
}

const PRIORITIES = [
  { value: 'low', label: 'Low', icon: '✅', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', icon: '📋', color: 'text-blue-600' },
  { value: 'high', label: 'High', icon: '⚡', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', icon: '🔥', color: 'text-red-600' },
];

const QUICK_FILTERS = [
  { id: 'all', label: 'All', filter: {} },
  { id: 'active', label: 'Active', filter: { completed: false } },
  { id: 'completed', label: 'Completed', filter: { completed: true } },
  { id: 'today', label: 'Due Today', filter: { dueDateStart: new Date().toISOString().split('T')[0], dueDateEnd: new Date().toISOString().split('T')[0] } },
  { id: 'overdue', label: 'Overdue', filter: { overdue: true, completed: false } },
  { id: 'urgent', label: 'Urgent', filter: { priority: 'urgent' as const, completed: false } },
];

export function TodoFilters({
  filters,
  onFiltersChange,
  onReset,
  categories = [],
  tags = [],
  className,
  compact = false
}: TodoFiltersProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(filters.tags || []);

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof TodoFilters];
    return value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  const handleQuickFilter = (filter: Partial<TodoFilters>) => {
    onFiltersChange(filter);
  };

  const handlePriorityChange = (priority: string) => {
    if (priority === 'all') {
      const { priority: _, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, priority: priority as TodoFilters['priority'] });
    }
  };

  const handleCompletionChange = (value: string) => {
    if (value === 'all') {
      const { completed, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, completed: value === 'completed' });
    }
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    if (newTags.length === 0) {
      const { tags: _, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, tags: newTags });
    }
  };

  const handleReset = () => {
    setSelectedTags([]);
    if (onReset) {
      onReset();
    } else {
      onFiltersChange({});
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Quick filter buttons */}
        <div className="flex gap-1">
          {QUICK_FILTERS.slice(0, 4).map(quickFilter => (
            <Button
              key={quickFilter.id}
              variant="ghost"
              size="sm"
              onClick={() => handleQuickFilter(quickFilter.filter)}
              className={cn(
                "h-7 text-xs",
                JSON.stringify(filters) === JSON.stringify(quickFilter.filter) && "bg-muted"
              )}
            >
              {quickFilter.label}
            </Button>
          ))}
        </div>

        {/* Advanced filters popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1">
              <Filter className="h-3 w-3" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filters</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-6 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Priority filter */}
              <div className="space-y-2">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={filters.priority || 'all'}
                  onValueChange={handlePriorityChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {PRIORITIES.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <span>{priority.icon}</span>
                          <span className={priority.color}>{priority.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Completion filter */}
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select
                  value={filters.completed === undefined ? 'all' : filters.completed ? 'completed' : 'active'}
                  onValueChange={handleCompletionChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Todos</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date range */}
              <div className="space-y-2">
                <Label className="text-xs">Due Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filters.dueDateStart || ''}
                    onChange={(e) => onFiltersChange({ ...filters, dueDateStart: e.target.value })}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="date"
                    value={filters.dueDateEnd || ''}
                    onChange={(e) => onFiltersChange({ ...filters, dueDateEnd: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Tags</Label>
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                        className="text-xs cursor-pointer"
                        onClick={() => handleTagToggle(tag)}
                      >
                        #{tag}
                        {selectedTags.includes(tag) && (
                          <Check className="h-2.5 w-2.5 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Overdue filter */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overdue"
                  checked={filters.overdue || false}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onFiltersChange({ ...filters, overdue: true });
                    } else {
                      const { overdue, ...rest } = filters;
                      onFiltersChange(rest);
                    }
                  }}
                />
                <Label htmlFor="overdue" className="text-xs cursor-pointer">
                  Show only overdue
                </Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Full size filters
  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">Quick filters:</span>
        {QUICK_FILTERS.map(quickFilter => (
          <Button
            key={quickFilter.id}
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter(quickFilter.filter)}
            className={cn(
              "h-8",
              JSON.stringify(filters) === JSON.stringify(quickFilter.filter) && "bg-primary text-primary-foreground"
            )}
          >
            {quickFilter.id === 'overdue' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {quickFilter.id === 'today' && <Calendar className="h-3 w-3 mr-1" />}
            {quickFilter.id === 'urgent' && <Flag className="h-3 w-3 mr-1" />}
            {quickFilter.id === 'completed' && <Check className="h-3 w-3 mr-1" />}
            {quickFilter.id === 'active' && <Clock className="h-3 w-3 mr-1" />}
            {quickFilter.label}
          </Button>
        ))}
      </div>

      {/* Advanced filters */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-sm">Priority</Label>
            <Select
              value={filters.priority || 'all'}
              onValueChange={handlePriorityChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map(priority => (
                  <SelectItem key={priority.value} value={priority.value}>
                    <div className="flex items-center gap-2">
                      <span>{priority.icon}</span>
                      <span className={priority.color}>{priority.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm">Status</Label>
            <Select
              value={filters.completed === undefined ? 'all' : filters.completed ? 'completed' : 'active'}
              onValueChange={handleCompletionChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Todos</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Category</Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    const { category, ...rest } = filters;
                    onFiltersChange(rest);
                  } else {
                    onFiltersChange({ ...filters, category: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date range */}
          <div className="space-y-2">
            <Label className="text-sm">Due Date</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.dueDateStart || ''}
                onChange={(e) => onFiltersChange({ ...filters, dueDateStart: e.target.value })}
                placeholder="From"
              />
              <Input
                type="date"
                value={filters.dueDateEnd || ''}
                onChange={(e) => onFiltersChange({ ...filters, dueDateEnd: e.target.value })}
                placeholder="To"
              />
            </div>
          </div>

          {/* Tags section - full width */}
          {tags.length > 0 && (
            <div className="col-span-full space-y-2">
              <Label className="text-sm">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                    {selectedTags.includes(tag) && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Special filters */}
          <div className="col-span-full flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="overdue"
                checked={filters.overdue || false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFiltersChange({ ...filters, overdue: true });
                  } else {
                    const { overdue, ...rest } = filters;
                    onFiltersChange(rest);
                  }
                }}
              />
              <Label htmlFor="overdue" className="text-sm cursor-pointer flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                Show only overdue
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.priority && (
            <Badge variant="secondary" className="gap-1">
              <Flag className="h-3 w-3" />
              {PRIORITIES.find(p => p.value === filters.priority)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const { priority, ...rest } = filters;
                  onFiltersChange(rest);
                }}
              />
            </Badge>
          )}
          {filters.completed !== undefined && (
            <Badge variant="secondary" className="gap-1">
              {filters.completed ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {filters.completed ? 'Completed' : 'Active'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const { completed, ...rest } = filters;
                  onFiltersChange(rest);
                }}
              />
            </Badge>
          )}
          {filters.overdue && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Overdue
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const { overdue, ...rest } = filters;
                  onFiltersChange(rest);
                }}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              <Tag className="h-3 w-3" />
              {filters.category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const { category, ...rest } = filters;
                  onFiltersChange(rest);
                }}
              />
            </Badge>
          )}
          {filters.tags && filters.tags.length > 0 && (
            filters.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                #{tag}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    const newTags = filters.tags!.filter(t => t !== tag);
                    if (newTags.length === 0) {
                      const { tags: _, ...rest } = filters;
                      onFiltersChange(rest);
                    } else {
                      onFiltersChange({ ...filters, tags: newTags });
                    }
                  }}
                />
              </Badge>
            ))
          )}
        </div>
      )}
    </div>
  );
}