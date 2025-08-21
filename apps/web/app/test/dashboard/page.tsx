import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Building2, Mail, TrendingUp, Zap } from 'lucide-react';
import { DashboardStats } from '@/components/dashboard/stats';
import { TestRecentCompanies } from '@/components/test/recent-companies';
import { QuickActions } from '@/components/dashboard/quick-actions';

export default function TestDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Dashboard</h1>
          <p className="text-muted-foreground">
            Test mode - no authentication required
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Recent Companies */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recent Companies
            </CardTitle>
            <CardDescription>
              Latest company mentions from newsletters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded" />}>
              <TestRecentCompanies />
            </Suspense>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Manage your intelligence pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuickActions />
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pipeline Status
          </CardTitle>
          <CardDescription>
            Current status of the intelligence pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Gmail Connector</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
              </div>
              <div className="h-2 w-2 bg-green-600 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Claude AI</p>
                  <p className="text-sm text-muted-foreground">Operational</p>
                </div>
              </div>
              <div className="h-2 w-2 bg-green-600 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-muted-foreground">Healthy</p>
                </div>
              </div>
              <div className="h-2 w-2 bg-green-600 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}