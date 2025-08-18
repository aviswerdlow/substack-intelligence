'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthCheckResult {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: HealthCheck[];
  version: string;
  uptime: number;
}

export function MonitoringDashboard() {
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/monitoring/health');
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      setHealthData(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <XCircle className="h-5 w-5" />
            Monitoring Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchHealthData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading System Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!healthData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Overall System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getStatusIcon(healthData.overall)}
              System Status
            </span>
            <Button onClick={fetchHealthData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Last updated: {new Date(healthData.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(healthData.overall)}>
              {healthData.overall.toUpperCase()}
            </Badge>
            <div className="text-sm text-gray-500">
              Uptime: {formatUptime(healthData.uptime)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthData.checks.map((check) => (
          <Card key={check.service} className="relative">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getStatusIcon(check.status)}
                {check.service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Badge 
                  className={`${getStatusColor(check.status)} text-xs`}
                  variant="outline"
                >
                  {check.status}
                </Badge>
                
                {check.latency && (
                  <div className="text-xs text-gray-500">
                    Latency: {check.latency}ms
                  </div>
                )}
                
                {check.error && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                    {check.error}
                  </div>
                )}
                
                {check.details && Object.keys(check.details).length > 0 && (
                  <div className="text-xs text-gray-500">
                    {Object.entries(check.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className="font-mono">
                          {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-500">Version</div>
              <div className="font-mono">{healthData.version}</div>
            </div>
            <div>
              <div className="font-medium text-gray-500">Services</div>
              <div>{healthData.checks.length} monitored</div>
            </div>
            <div>
              <div className="font-medium text-gray-500">Healthy</div>
              <div className="text-green-600">
                {healthData.checks.filter(c => c.status === 'healthy').length}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-500">Issues</div>
              <div className="text-red-600">
                {healthData.checks.filter(c => c.status === 'unhealthy').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}