'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Plus,
  Calendar,
  Flag,
  TrendingUp,
  AlertTriangle,
  MoreHorizontal,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { TodoList } from '@/components/todos/TodoList';
import { TodoForm } from '@/components/todos/TodoForm';

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

interface TodoStats {
  totalTodos: number;
  completedTodos: number;
  activeTodos: number;
  overdueeTodos: number;
  dueToday: number;
  dueThisWeek: number;
  completionRate: number;
  productivity: {
    completionRate: number;
    overdueRate: number;
    onTimeRate: number;
  };
  summary: {
    todayFocus: number;
    weekAhead: number;
    needsAttention: number;
    inProgress: number;
  };
}

interface TodoWidgetProps {
  size?: 'small' | 'medium' | 'large' | 'full';
  className?: string;
}

const PRIORITY_ICONS = {
  urgent: '🔥',
  high: '⚡',
  medium: '📋',
  low: '✅'
} as const;

export function TodoWidget({ size = 'medium', className }: TodoWidgetProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch todos and stats
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      const [todosResponse, statsResponse] = await Promise.all([
        fetch('/api/todos?limit=10&completed=false&orderBy=priority'),
        fetch('/api/todos/stats')
      ]);

      if (!todosResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch todo data');
      }

      const [todosData, statsData] = await Promise.all([
        todosResponse.json(),
        statsResponse.json()
      ]);

      if (!todosData.success || !statsData.success) {
        throw new Error('Failed to fetch todo data');
      }

      setTodos(todosData.data.todos || []);
      setStats(statsData.data.stats || null);
      
    } catch (err) {
      console.error('Failed to load todo data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load todos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // Handle todo creation
  const handleCreateTodo = async (data: any) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create todo');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create todo');
      }

      // Refresh data
      await fetchData();
      setShowCreateDialog(false);
      
      toast({
        title: 'Todo created!',
        description: data.title,
      });

    } catch (error) {
      throw error; // Re-throw to be handled by the form
    }
  };

  // Handle todo toggle
  const handleToggleTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/todos/${todoId}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle todo');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle todo');
      }

      // Update local state
      setTodos(prev => prev.map(todo => 
        todo.id === todoId 
          ? { ...todo, completed: result.data.todo.completed, completed_at: result.data.todo.completed_at }
          : todo
      ));

      // Refresh stats
      await fetchData();

      toast({
        title: result.data.action === 'completed' ? 'Todo completed!' : 'Todo uncompleted',
        description: result.data.todo.title,
      });

    } catch (error) {
      console.error('Failed to toggle todo:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to toggle todo',
        variant: 'destructive',
      });
    }
  };

  // Small size widget (shows just stats)
  if (size === 'small') {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Todos</span>
            </div>
            {stats && (
              <Badge variant="secondary" className="text-xs">
                {stats.activeTodos}
              </Badge>
            )}
          </div>
          
          {loading ? (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
            </div>
          ) : stats ? (
            <div className="space-y-2">
              <Progress value={stats.completionRate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.completedTodos} completed</span>
                <span>{stats.completionRate}%</span>
              </div>
              {stats.overdueeTodos > 0 && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.overdueeTodos} overdue
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Medium size widget (shows stats + recent todos)
  if (size === 'medium') {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Todos
              {stats && stats.activeTodos > 0 && (
                <Badge variant="secondary">
                  {stats.activeTodos}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              </Button>
              
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <TodoForm
                  isDialog
                  open={showCreateDialog}
                  onOpenChange={setShowCreateDialog}
                  onSubmit={handleCreateTodo}
                />
              </Dialog>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullView(true)}
                className="h-7 w-7 p-0"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Quick stats */}
          {stats && (
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>{stats.completionRate}% complete</span>
              </div>
              {stats.dueToday > 0 && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Calendar className="h-3 w-3" />
                  <span>{stats.dueToday} due today</span>
                </div>
              )}
              {stats.overdueeTodos > 0 && (
                <div className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{stats.overdueeTodos} overdue</span>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 flex-1 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => fetchData()}
              >
                Try Again
              </Button>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No active todos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first todo to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {todos.slice(0, 5).map((todo) => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg border transition-colors hover:bg-muted/50",
                      todo.due_date && new Date(todo.due_date) < new Date() && "border-destructive/50 bg-destructive/5"
                    )}
                  >
                    <button
                      onClick={() => handleToggleTodo(todo.id)}
                      className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{todo.title}</span>
                        <span className="text-xs">{PRIORITY_ICONS[todo.priority]}</span>
                        {todo.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs h-4 px-1">
                            Urgent
                          </Badge>
                        )}
                        {todo.due_date && new Date(todo.due_date) < new Date() && (
                          <Badge variant="destructive" className="text-xs h-4 px-1">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {todos.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowFullView(true)}
                >
                  View {todos.length - 5} more todos
                </Button>
              )}
            </div>
          )}
        </CardContent>

        {/* Full view dialog */}
        <Dialog open={showFullView} onOpenChange={setShowFullView}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>All Todos</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              <TodoList 
                showHeader={false}
                className="border-0 shadow-none"
              />
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Large and full size widgets (show full TodoList)
  return (
    <div className={className}>
      <TodoList 
        className="h-full"
        compact={size === 'large'}
        maxItems={size === 'large' ? 10 : undefined}
      />
    </div>
  );
}