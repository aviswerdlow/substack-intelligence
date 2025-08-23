'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton-loader';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, MoreHorizontal, Loader2, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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

interface TodoListProps {
  className?: string;
  compact?: boolean;
  showHeader?: boolean;
  maxItems?: number;
  initialFilters?: TodoFilters;
}

const PRIORITY_COLORS = {
  urgent: 'destructive',
  high: 'orange',
  medium: 'blue',
  low: 'green'
} as const;

const PRIORITY_ICONS = {
  urgent: '🔥',
  high: '⚡',
  medium: '📋',
  low: '✅'
} as const;

export function TodoList({ 
  className,
  compact = false,
  showHeader = true,
  maxItems,
  initialFilters = {}
}: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TodoFilters>(initialFilters);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const { toast } = useToast();

  // Fetch todos
  const fetchTodos = useCallback(async (appliedFilters: TodoFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const searchParams = new URLSearchParams();
      
      // Apply filters
      const mergedFilters = { ...filters, ...appliedFilters };
      if (mergedFilters.completed !== undefined) searchParams.set('completed', String(mergedFilters.completed));
      if (mergedFilters.priority) searchParams.set('priority', mergedFilters.priority);
      if (mergedFilters.category) searchParams.set('category', mergedFilters.category);
      if (mergedFilters.search) searchParams.set('search', mergedFilters.search);
      if (mergedFilters.overdue) searchParams.set('overdue', String(mergedFilters.overdue));
      if (maxItems) searchParams.set('limit', String(maxItems));
      
      // Default sorting
      searchParams.set('orderBy', 'position');
      searchParams.set('orderDirection', 'asc');

      const response = await fetch(`/api/todos?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch todos');
      }

      setTodos(data.data.todos || []);
    } catch (err) {
      console.error('Failed to load todos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [filters, maxItems]);

  // Initial load
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Search todos
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        fetchTodos({ ...filters, search: searchTerm.trim() });
      } else {
        const { search, ...filtersWithoutSearch } = filters;
        fetchTodos(filtersWithoutSearch);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchTodos, filters]);

  // Toggle todo completion
  const toggleTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle todo');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to toggle todo');
      }

      // Optimistically update the todo
      setTodos(prev => prev.map(todo => 
        todo.id === todoId 
          ? { ...todo, completed: data.data.todo.completed, completed_at: data.data.todo.completed_at }
          : todo
      ));

      toast({
        title: data.data.action === 'completed' ? 'Todo completed!' : 'Todo uncompleted',
        description: data.data.todo.title,
      });

    } catch (err) {
      console.error('Failed to toggle todo:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to toggle todo',
        variant: 'destructive',
      });
    }
  };

  // Add new todo
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      setIsAdding(true);
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          priority: 'medium'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create todo');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create todo');
      }

      // Add to the list
      setTodos(prev => [...prev, data.data.todo]);
      setNewTodoTitle('');
      
      toast({
        title: 'Todo created!',
        description: newTodoTitle.trim(),
      });

    } catch (err) {
      console.error('Failed to create todo:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create todo',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Filter todos for display
  const filteredTodos = todos.filter(todo => {
    if (!showCompleted && todo.completed) return false;
    return true;
  });

  const activeTodos = filteredTodos.filter(t => !t.completed);
  const completedTodos = filteredTodos.filter(t => t.completed);
  const overdueTodos = activeTodos.filter(t => 
    t.due_date && new Date(t.due_date) < new Date()
  );

  // Loading state
  if (loading) {
    return (
      <Card className={cn("", className)}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Todos
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {Array.from({ length: compact ? 3 : 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("", className)}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Todos
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Failed to load todos</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => fetchTodos()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Todos
              {activeTodos.length > 0 && (
                <Badge variant="secondary">
                  {activeTodos.length}
                </Badge>
              )}
              {overdueTodos.length > 0 && (
                <Badge variant="destructive">
                  {overdueTodos.length} overdue
                </Badge>
              )}
            </CardTitle>
            
            {!compact && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {showCompleted ? 'Hide' : 'Show'} Completed
                </Button>
              </div>
            )}
          </div>

          {!compact && (
            <div className="flex items-center space-x-2 pt-2">
              <form onSubmit={addTodo} className="flex-1">
                <div className="relative">
                  <Input
                    placeholder="Add a new todo..."
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    disabled={!newTodoTitle.trim() || isAdding}
                  >
                    {isAdding ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className={cn("space-y-2", showHeader ? "pt-0" : "pt-4")}>
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8">
            <Circle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No todos match your search' : 'No todos yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? 'Try a different search term' : 'Add your first todo above'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {/* Active todos */}
            {activeTodos.map((todo) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50",
                  todo.due_date && new Date(todo.due_date) < new Date() && "border-destructive/50 bg-destructive/5"
                )}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Circle className="h-4 w-4" />
                </button>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{todo.title}</span>
                    <span className="text-sm">{PRIORITY_ICONS[todo.priority]}</span>
                    {todo.priority !== 'medium' && (
                      <Badge 
                        variant={PRIORITY_COLORS[todo.priority] as any}
                        className="text-xs"
                      >
                        {todo.priority}
                      </Badge>
                    )}
                  </div>
                  
                  {todo.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {todo.description}
                    </p>
                  )}
                  
                  {todo.due_date && (
                    <p className={cn(
                      "text-xs",
                      new Date(todo.due_date) < new Date() 
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    )}>
                      Due {new Date(todo.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Completed todos (if showing) */}
            {showCompleted && completedTodos.map((todo) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 transition-colors"
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="mt-0.5 text-green-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium line-through text-muted-foreground">
                      {todo.title}
                    </span>
                  </div>
                  
                  {todo.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Completed {new Date(todo.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}