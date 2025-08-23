'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Edit2,
  Trash2,
  Calendar,
  Flag,
  GripVertical,
  Clock,
  Tag,
  FileText,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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

interface TodoItemProps {
  todo: Todo;
  onToggle?: (todoId: string) => Promise<void>;
  onUpdate?: (todoId: string, updates: Partial<Todo>) => Promise<void>;
  onDelete?: (todoId: string) => Promise<void>;
  isDragHandle?: boolean;
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

const PRIORITY_COLORS = {
  urgent: { bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
  high: { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300' },
  medium: { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
  low: { bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300' }
} as const;

const PRIORITY_ICONS = {
  urgent: '🔥',
  high: '⚡',
  medium: '📋',
  low: '✅'
} as const;

const PRIORITY_LABELS = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
} as const;

export function TodoItem({
  todo,
  onToggle,
  onUpdate,
  onDelete,
  isDragHandle = false,
  className,
  compact = false,
  showDetails = true
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  // Calculate if overdue
  const isOverdue = todo.due_date && !todo.completed && new Date(todo.due_date) < new Date();
  const isDueToday = todo.due_date && !todo.completed && 
    new Date(todo.due_date).toDateString() === new Date().toDateString();

  // Handle toggle completion
  const handleToggle = async () => {
    if (isLoading || !onToggle) return;
    
    try {
      setIsLoading(true);
      await onToggle(todo.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update todo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !onUpdate) {
      setIsEditing(false);
      setEditTitle(todo.title);
      setEditDescription(todo.description || '');
      return;
    }

    try {
      setIsLoading(true);
      await onUpdate(todo.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
      
      toast({
        title: 'Todo updated',
        description: 'Your changes have been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update todo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      setIsLoading(true);
      await onDelete(todo.id);
      setShowDeleteDialog(false);
      
      toast({
        title: 'Todo deleted',
        description: todo.title,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete todo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle priority change
  const handlePriorityChange = async (priority: Todo['priority']) => {
    if (!onUpdate) return;
    
    try {
      await onUpdate(todo.id, { priority });
      toast({
        title: 'Priority updated',
        description: `Set to ${PRIORITY_LABELS[priority]}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update priority',
        variant: 'destructive',
      });
    }
  };

  // Format due date
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const todoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (todoDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (todoDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else if (todoDate < today) {
      const daysOverdue = Math.floor((today.getTime() - todoDate.getTime()) / (24 * 60 * 60 * 1000));
      return `${daysOverdue}d overdue`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const priorityStyle = PRIORITY_COLORS[todo.priority];

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "group relative flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm",
          todo.completed ? "bg-muted/30 border-muted" : "bg-background hover:bg-muted/20",
          isOverdue && !todo.completed && "border-destructive/50 bg-destructive/5",
          priorityStyle.bg,
          priorityStyle.border,
          className
        )}
      >
        {/* Drag handle */}
        {isDragHandle && (
          <div className="cursor-move opacity-0 group-hover:opacity-60 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Completion toggle */}
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={cn(
            "mt-0.5 transition-colors rounded-full p-0.5",
            todo.completed 
              ? "text-green-600 hover:text-green-700" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
        >
          {todo.completed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 space-y-1">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                ref={titleInputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                className="text-sm"
                placeholder="Todo title..."
              />
              {showDetails && (
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="text-sm min-h-[60px] resize-none"
                  rows={2}
                />
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editTitle.trim() || isLoading}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Title and metadata */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      className={cn(
                        "font-medium",
                        todo.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {todo.title}
                    </span>
                    
                    {/* Priority indicator */}
                    {!compact && todo.priority !== 'medium' && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs h-5 px-1.5",
                          priorityStyle.text,
                          priorityStyle.border
                        )}
                      >
                        <span className="mr-1">{PRIORITY_ICONS[todo.priority]}</span>
                        {PRIORITY_LABELS[todo.priority]}
                      </Badge>
                    )}

                    {/* Category */}
                    {!compact && todo.category && (
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        <Tag className="h-2.5 w-2.5 mr-1" />
                        {todo.category}
                      </Badge>
                    )}

                    {/* Due date */}
                    {!compact && todo.due_date && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs h-5 px-1.5",
                          isOverdue ? "border-destructive text-destructive" :
                          isDueToday ? "border-orange-500 text-orange-600" : ""
                        )}
                      >
                        {isOverdue && <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                        <Calendar className="h-2.5 w-2.5 mr-1" />
                        {formatDueDate(todo.due_date)}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  {showDetails && todo.description && !compact && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {todo.description}
                    </p>
                  )}

                  {/* Tags */}
                  {!compact && todo.tags && todo.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {todo.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs h-5 px-1.5">
                          #{tag}
                        </Badge>
                      ))}
                      {todo.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          +{todo.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              {!compact && showDetails && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created {new Date(todo.created_at).toLocaleDateString()}
                  </div>
                  {todo.completed_at && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed {new Date(todo.completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions menu */}
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Todo actions"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => handlePriorityChange('urgent')}
                className="text-red-600"
              >
                <Flag className="h-4 w-4 mr-2" />
                Set Urgent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePriorityChange('high')}>
                <Flag className="h-4 w-4 mr-2" />
                Set High Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePriorityChange('medium')}>
                <Flag className="h-4 w-4 mr-2" />
                Set Normal Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePriorityChange('low')}>
                <Flag className="h-4 w-4 mr-2" />
                Set Low Priority
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Todo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{todo.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}