'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Calendar,
  Tag,
  Flag,
  FileText,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Types
interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  category?: string;
  tags: string[];
  position: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface TodoFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  category: string;
  tags: string[];
}

interface TodoFormProps {
  todo?: Todo;
  onSubmit?: (data: Partial<TodoFormData>) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  isDialog?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
}

const PRIORITIES = [
  { value: 'low', label: 'Low Priority', icon: '✅', color: 'text-green-600' },
  { value: 'medium', label: 'Medium Priority', icon: '📋', color: 'text-blue-600' },
  { value: 'high', label: 'High Priority', icon: '⚡', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', icon: '🔥', color: 'text-red-600' },
] as const;

const COMMON_CATEGORIES = [
  'Work',
  'Personal',
  'Health',
  'Learning',
  'Finance',
  'Home',
  'Travel',
  'Projects'
];

const VALIDATION_RULES = {
  title: { required: true, minLength: 1, maxLength: 500 },
  description: { maxLength: 2000 },
  category: { maxLength: 100 },
  tags: { maxItems: 20, maxTagLength: 50 }
};

export function TodoForm({
  todo,
  onSubmit,
  onCancel,
  className,
  isDialog = false,
  open = false,
  onOpenChange,
  title = todo ? 'Edit Todo' : 'Create New Todo',
  description = todo ? 'Update your todo details' : 'Add a new todo to your list'
}: TodoFormProps) {
  const [formData, setFormData] = useState<TodoFormData>({
    title: todo?.title || '',
    description: todo?.description || '',
    priority: todo?.priority || 'medium',
    due_date: todo?.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : '',
    category: todo?.category || '',
    tags: todo?.tags || []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TodoFormData, string>>>({});
  const [newTag, setNewTag] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Focus title input when form opens
  useEffect(() => {
    if (open && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TodoFormData, string>> = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > VALIDATION_RULES.title.maxLength) {
      newErrors.title = `Title must be ${VALIDATION_RULES.title.maxLength} characters or less`;
    }

    // Description validation
    if (formData.description && formData.description.length > VALIDATION_RULES.description.maxLength) {
      newErrors.description = `Description must be ${VALIDATION_RULES.description.maxLength} characters or less`;
    }

    // Category validation
    if (formData.category && formData.category.length > VALIDATION_RULES.category.maxLength) {
      newErrors.category = `Category must be ${VALIDATION_RULES.category.maxLength} characters or less`;
    }

    // Tags validation
    if (formData.tags.length > VALIDATION_RULES.tags.maxItems) {
      newErrors.tags = `Maximum ${VALIDATION_RULES.tags.maxItems} tags allowed`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !onSubmit) return;

    try {
      setIsLoading(true);
      setErrors({});

      // Prepare submission data
      const submitData: Partial<TodoFormData> = {
        title: formData.title.trim(),
        priority: formData.priority,
      };

      if (formData.description.trim()) {
        submitData.description = formData.description.trim();
      }

      if (formData.due_date) {
        submitData.due_date = new Date(formData.due_date).toISOString();
      }

      if (formData.category.trim()) {
        submitData.category = formData.category.trim();
      }

      if (formData.tags.length > 0) {
        submitData.tags = formData.tags;
      }

      await onSubmit(submitData);

      if (!todo) {
        // Reset form for new todos
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          due_date: '',
          category: '',
          tags: []
        });
      }

      if (isDialog && onOpenChange) {
        onOpenChange(false);
      }

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save todo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding tags
  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag) return;

    if (tag.length > VALIDATION_RULES.tags.maxTagLength) {
      setErrors(prev => ({ ...prev, tags: `Tag must be ${VALIDATION_RULES.tags.maxTagLength} characters or less` }));
      return;
    }

    if (formData.tags.includes(tag)) {
      setErrors(prev => ({ ...prev, tags: 'Tag already exists' }));
      return;
    }

    if (formData.tags.length >= VALIDATION_RULES.tags.maxItems) {
      setErrors(prev => ({ ...prev, tags: `Maximum ${VALIDATION_RULES.tags.maxItems} tags allowed` }));
      return;
    }

    setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    setNewTag('');
    setErrors(prev => ({ ...prev, tags: undefined }));
  };

  // Handle removing tags
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (isDialog && onOpenChange) {
      onOpenChange(false);
    }
  };

  const FormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Title *
        </Label>
        <Input
          id="title"
          ref={titleInputRef}
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="What needs to be done?"
          className={cn(errors.title && "border-destructive focus-visible:ring-destructive")}
          maxLength={VALIDATION_RULES.title.maxLength}
          required
        />
        {errors.title && (
          <div className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-3 w-3" />
            {errors.title}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          <FileText className="h-4 w-4 inline mr-1" />
          Description
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Add more details about this todo..."
          className={cn(
            "min-h-[80px] resize-none",
            errors.description && "border-destructive focus-visible:ring-destructive"
          )}
          maxLength={VALIDATION_RULES.description.maxLength}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{errors.description || ''}</span>
          <span>{formData.description.length} / {VALIDATION_RULES.description.maxLength}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Priority */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            <Flag className="h-4 w-4 inline mr-1" />
            Priority
          </Label>
          <Select
            value={formData.priority}
            onValueChange={(value: TodoFormData['priority']) => 
              setFormData(prev => ({ ...prev, priority: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((priority) => (
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

        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="due_date" className="text-sm font-medium">
            <Calendar className="h-4 w-4 inline mr-1" />
            Due Date
          </Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm font-medium">
          <Tag className="h-4 w-4 inline mr-1" />
          Category
        </Label>
        <div className="space-y-2">
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="e.g., Work, Personal, Health"
            className={cn(errors.category && "border-destructive focus-visible:ring-destructive")}
            maxLength={VALIDATION_RULES.category.maxLength}
            list="categories"
          />
          <datalist id="categories">
            {COMMON_CATEGORIES.map(cat => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          {errors.category && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.category}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Tags
        </Label>
        
        {/* Current tags */}
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto w-auto p-0 ml-1 hover:bg-transparent"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add new tag */}
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag..."
            className="flex-1"
            maxLength={VALIDATION_RULES.tags.maxTagLength}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTag}
            disabled={!newTag.trim()}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        {errors.tags && (
          <div className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-3 w-3" />
            {errors.tags}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          {formData.tags.length} / {VALIDATION_RULES.tags.maxItems} tags
        </p>
      </div>

      {/* Form actions */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !formData.title.trim()}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {todo ? 'Update Todo' : 'Create Todo'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  if (isDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FormContent />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <FormContent />
      </CardContent>
    </Card>
  );
}