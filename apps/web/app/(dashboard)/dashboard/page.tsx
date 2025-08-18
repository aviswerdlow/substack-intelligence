import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Building2, Mail, TrendingUp, Zap } from 'lucide-react';
import { DashboardStats } from '@/components/dashboard/stats';
import { RecentCompanies } from '@/components/dashboard/recent-companies';
import { QuickActions } from '@/components/dashboard/quick-actions';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Daily venture intelligence from your curated Substack sources
          </p>
        </div>
        <Button className="gap-2">
          <Zap className="h-4 w-4" />
          Trigger Manual Sync
        </Button>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsLoading />}>
        <DashboardStats />
      </Suspense>

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
              Latest company mentions from today's newsletters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded" />}>
              <RecentCompanies />
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
            System Status
          </CardTitle>
          <CardDescription>
            Current status of all intelligence services
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

function StatsLoading() {
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