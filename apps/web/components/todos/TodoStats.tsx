'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton-loader';
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Trophy,
  Target,
  Clock,
  Activity,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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

interface TodoStatsProps {
  className?: string;
  refreshInterval?: number;
  compact?: boolean;
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'primary',
  loading = false 
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}) => {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-green-600',
    warning: 'text-orange-600',
    danger: 'text-red-600'
  };

  const bgClasses = {
    primary: 'bg-primary/10',
    success: 'bg-green-50 dark:bg-green-950/20',
    warning: 'bg-orange-50 dark:bg-orange-950/20',
    danger: 'bg-red-50 dark:bg-red-950/20'
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {trend && trendValue && (
                <div className="flex items-center gap-1">
                  {trend === 'up' && <ArrowUp className="h-3 w-3 text-green-600" />}
                  {trend === 'down' && <ArrowDown className="h-3 w-3 text-red-600" />}
                  {trend === 'neutral' && <Minus className="h-3 w-3 text-muted-foreground" />}
                  <span className={cn(
                    "text-xs",
                    trend === 'up' && "text-green-600",
                    trend === 'down' && "text-red-600",
                    trend === 'neutral' && "text-muted-foreground"
                  )}>
                    {trendValue}
                  </span>
                </div>
              )}
            </div>
            <div className={cn("p-2.5 rounded-lg", bgClasses[color])}>
              <Icon className={cn("h-5 w-5", colorClasses[color])} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export function TodoStats({ 
  className, 
  refreshInterval = 60000, // 1 minute default
  compact = false 
}: TodoStatsProps) {
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/todos/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data.data.stats);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to load todo stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up auto-refresh if interval is provided
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const getProductivityLevel = (rate: number): { label: string; color: string } => {
    if (rate >= 80) return { label: 'Excellent', color: 'text-green-600' };
    if (rate >= 60) return { label: 'Good', color: 'text-blue-600' };
    if (rate >= 40) return { label: 'Fair', color: 'text-orange-600' };
    return { label: 'Needs Improvement', color: 'text-red-600' };
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Todo Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-2 w-full" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            </>
          ) : stats ? (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{stats.completionRate}%</span>
                </div>
                <Progress value={stats.completionRate} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <p className="text-2xl font-bold text-green-600">{stats.completedTodos}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-2xl font-bold text-blue-600">{stats.activeTodos}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>

              {stats.overdueeTodos > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-600">{stats.overdueeTodos} overdue</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center">No data available</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main stats header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Todo Analytics
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Updated {lastUpdated.toLocaleTimeString()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Overall progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Overall Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      {stats.completedTodos} of {stats.totalTodos} todos completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{stats.completionRate}%</p>
                    <p className={cn(
                      "text-sm font-medium",
                      getProductivityLevel(stats.completionRate).color
                    )}>
                      {getProductivityLevel(stats.completionRate).label}
                    </p>
                  </div>
                </div>
                <Progress value={stats.completionRate} className="h-3" />
              </div>

              {/* Productivity metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">On-Time Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.productivity.onTimeRate}%</p>
                  <Progress value={stats.productivity.onTimeRate} className="h-1.5" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Completion</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.productivity.completionRate}%</p>
                  <Progress value={stats.productivity.completionRate} className="h-1.5" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Overdue Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.productivity.overdueRate}%</p>
                  <Progress 
                    value={stats.productivity.overdueRate} 
                    className="h-1.5"
                    // @ts-ignore - custom color prop
                    indicatorClassName="bg-orange-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No statistics available</p>
          )}
        </CardContent>
      </Card>

      {/* Detailed stat cards */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Todos"
            value={stats.totalTodos}
            icon={CheckCircle2}
            color="primary"
          />
          
          <StatCard
            title="Completed"
            value={stats.completedTodos}
            icon={Trophy}
            color="success"
            trend={stats.completedTodos > 0 ? 'up' : 'neutral'}
            trendValue={`${stats.completionRate}% completion`}
          />
          
          <StatCard
            title="Active"
            value={stats.activeTodos}
            icon={Activity}
            color="primary"
          />
          
          <StatCard
            title="Overdue"
            value={stats.overdueeTodos}
            icon={AlertTriangle}
            color={stats.overdueeTodos > 0 ? 'danger' : 'success'}
            trend={stats.overdueeTodos > 0 ? 'down' : 'neutral'}
            trendValue={stats.overdueeTodos > 0 ? 'Needs attention' : 'All on track'}
          />
          
          <StatCard
            title="Due Today"
            value={stats.dueToday}
            icon={Calendar}
            color={stats.dueToday > 0 ? 'warning' : 'primary'}
          />
          
          <StatCard
            title="This Week"
            value={stats.dueThisWeek}
            icon={Clock}
            color="primary"
          />
          
          <StatCard
            title="In Progress"
            value={stats.summary.inProgress}
            icon={TrendingUp}
            color="primary"
          />
          
          <StatCard
            title="Focus Items"
            value={stats.summary.todayFocus}
            icon={Target}
            color={stats.summary.todayFocus > 0 ? 'warning' : 'success'}
          />
        </div>
      )}

      {/* Achievement badges */}
      {!loading && stats && stats.completionRate >= 75 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="font-semibold">Great Progress!</p>
                  <p className="text-sm text-muted-foreground">
                    You've completed {stats.completionRate}% of your todos
                  </p>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600">
                Productivity Star
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}