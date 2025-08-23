import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Building2, Mail, TrendingUp, Zap } from 'lucide-react';
import { DashboardStats } from '@/components/dashboard/stats';
import { RecentCompanies } from '@/components/dashboard/recent-companies';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { DashboardHeader } from '@/components/dashboard/header';
import { SystemStatus, SystemStatusLoading } from '@/components/dashboard/system-status';
import { SkeletonCard, SkeletonDashboard } from '@/components/ui/skeleton-loader';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <DashboardHeader />

      {/* Stats Cards */}
      <div data-tour="dashboard-stats">
        <Suspense fallback={<StatsLoading />}>
          <DashboardStats />
        </Suspense>
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
              Latest company mentions from today's newsletters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<SkeletonCard />}>
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
          <CardContent data-tour="quick-actions">
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
          <Suspense fallback={<SystemStatusLoading />}>
            <SystemStatus />
          </Suspense>
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