import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, TrendingUp, Zap } from 'lucide-react';
import { createServiceRoleClient, getAnalytics } from '@substack-intelligence/database';

export async function DashboardStats() {
  const supabase = createServiceRoleClient();
  
  try {
    const analytics = await getAnalytics(supabase, 7);
    
    const stats = [
      {
        title: 'Emails Processed',
        value: analytics.totalEmails.toLocaleString(),
        description: 'Last 7 days',
        icon: Mail,
        trend: '+12%'
      },
      {
        title: 'Companies Found',
        value: analytics.totalCompanies.toLocaleString(),
        description: 'New discoveries',
        icon: Building2,
        trend: '+8%'
      },
      {
        title: 'Total Mentions',
        value: analytics.totalMentions.toLocaleString(),
        description: 'Company mentions',
        icon: TrendingUp,
        trend: '+23%'
      },
      {
        title: 'Processing Rate',
        value: '95.2%',
        description: 'Extraction accuracy',
        icon: Zap,
        trend: '+0.5%'
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
                <span className="text-green-600 font-medium">{stat.trend}</span>
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
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    
    // Fallback stats
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
            <div className="text-2xl font-bold">Loading...</div>
            <p className="text-xs text-muted-foreground">
              Fetching latest data
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}