'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Building2, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'email' | 'company' | 'report' | 'pipeline' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ElementType;
}

export function ActivityFeedWidget() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      // Simulate fetching activities - replace with actual API call
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'email',
          title: 'New emails processed',
          description: '5 newsletters processed successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          status: 'success',
          icon: Mail
        },
        {
          id: '2',
          type: 'company',
          title: 'Companies extracted',
          description: '12 new companies identified',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          status: 'success',
          icon: Building2
        },
        {
          id: '3',
          type: 'pipeline',
          title: 'Pipeline triggered',
          description: 'Daily intelligence pipeline started',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          status: 'info',
          icon: Zap
        },
        {
          id: '4',
          type: 'report',
          title: 'Report generated',
          description: 'Weekly summary report created',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          status: 'success',
          icon: FileText
        },
        {
          id: '5',
          type: 'system',
          title: 'System update',
          description: 'AI model upgraded to latest version',
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          status: 'info',
          icon: TrendingUp
        }
      ];
      
      setActivities(mockActivities);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
      {activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        activities.map((activity) => {
          const Icon = activity.icon || Clock;
          return (
            <div key={activity.id} className="flex items-start gap-3 group">
              <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}