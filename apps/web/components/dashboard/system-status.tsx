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
      <div className="grid md:grid-cols-3 gap-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium">System Status</p>
              <p className="text-sm text-muted-foreground">Error loading status</p>
            </div>
          </div>
          <div className="h-2 w-2 bg-red-600 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {systemStatus.services.map((service: any) => {
        const IconComponent = iconMap[service.name as keyof typeof iconMap] || Zap;
        const isHealthy = service.healthy;
        
        return (
          <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <IconComponent className={`h-5 w-5 ${isHealthy ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-muted-foreground" title={service.details}>
                  {service.status}
                </p>
              </div>
            </div>
            <div className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-green-600' : 'bg-red-600'}`} />
          </div>
        );
      })}
    </div>
  );
}

export function SystemStatusLoading() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-pulse bg-muted h-5 w-5 rounded" />
            <div>
              <div className="animate-pulse bg-muted h-4 w-20 rounded mb-1" />
              <div className="animate-pulse bg-muted h-3 w-16 rounded" />
            </div>
          </div>
          <div className="animate-pulse bg-muted h-2 w-2 rounded-full" />
        </div>
      ))}
    </div>
  );
}