'use client';

import { Building2, Mail, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const iconMap = {
  'Gmail Connector': Mail,
  'Claude AI': Zap,
  'Database': Building2
};

export function SystemStatus() {
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
    return <SystemStatusLoading />;
  }

  if (error || !systemStatus) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold mb-3">System Status</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-sm font-medium">Error</p>
              <p className="text-xs text-muted-foreground">Unable to load status</p>
            </div>
          </div>
          <div className="h-2 w-2 bg-red-600 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold mb-3">System Status</h3>
      {systemStatus.services.map((service: any) => {
        const IconComponent = iconMap[service.name as keyof typeof iconMap] || Zap;
        const isHealthy = service.healthy;
        
        return (
          <div key={service.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconComponent className={`h-4 w-4 ${isHealthy ? 'text-green-600' : 'text-red-600'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{service.name}</p>
                <p className="text-xs text-muted-foreground truncate" title={service.details}>
                  {service.status}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isHealthy ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SystemStatusLoading() {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold mb-3">System Status</h3>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="animate-pulse bg-muted h-4 w-4 rounded" />
            <div>
              <div className="animate-pulse bg-muted h-3 w-20 rounded mb-1" />
              <div className="animate-pulse bg-muted h-2 w-16 rounded" />
            </div>
          </div>
          <div className="animate-pulse bg-muted h-2 w-2 rounded-full" />
        </div>
      ))}
    </div>
  );
}