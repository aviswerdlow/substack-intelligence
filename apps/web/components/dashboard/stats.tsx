'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, TrendingUp, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function DashboardStats() {
  const { data: systemStatus, isLoading, error } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const response = await axios.get('/api/monitoring/system-status');
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="animate-pulse bg-muted h-4 w-20 rounded" />
              <div className="animate-pulse bg-muted h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <div className="animate-pulse bg-muted h-8 w-16 rounded mb-1" />
              <div className="animate-pulse bg-muted h-3 w-24 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !systemStatus) {
    return (
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Status
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Error</div>
            <p className="text-xs text-muted-foreground">
              Unable to load system metrics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: 'Emails Processed',
      value: systemStatus.metrics.emailsProcessed.toLocaleString(),
      description: 'Last 7 days',
      icon: Mail,
      trend: systemStatus.metrics.emailsTrend
    },
    {
      title: 'Companies Found',
      value: systemStatus.metrics.companiesFound.toLocaleString(),
      description: 'New discoveries',
      icon: Building2,
      trend: systemStatus.metrics.companiesTrend
    },
    {
      title: 'Total Mentions',
      value: systemStatus.metrics.totalMentions.toLocaleString(),
      description: 'Company mentions',
      icon: TrendingUp,
      trend: systemStatus.metrics.mentionsTrend
    },
    {
      title: 'Processing Rate',
      value: systemStatus.metrics.processingRate,
      description: 'Extraction accuracy',
      icon: Zap,
      trend: systemStatus.metrics.processingTrend
    }
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className={`font-medium ${
                stat.trend.startsWith('+') 
                  ? 'text-green-600' 
                  : stat.trend.startsWith('-') 
                    ? 'text-red-600' 
                    : 'text-gray-600'
              }`}>
                {stat.trend}
              </span>
              <span className="ml-1">vs last period</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}