'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Building2, 
  Mail, 
  BarChart3,
  Activity,
  Users,
  Clock,
  Target,
  Zap,
  Globe,
  DollarSign,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { useAnalytics } from '@/lib/analytics';

interface Metrics {
  totalCompanies: number;
  companiesChange: number;
  discoveryVelocity: number;
  velocityChange: number;
  avgConfidence: number;
  confidenceChange: number;
  newsletterCount: number;
  successRate: number;
  pageViews: number;
  pageViewChange: number;
  uniqueVisitors: number;
  totalEvents: number;
  conversionRate: number;
  activeExperiments: number;
  realtime?: {
    pageViews: number;
    events: number;
    lastEventAt: string | null;
  };
}

interface TrendData {
  date: string;
  companies: number;
  mentions: number;
  confidence: number;
}

interface NewsletterPerformance {
  name: string;
  emails: number;
  companies: number;
  avgConfidence: number;
  effectiveness: number;
}

interface IndustryDistribution {
  industry: string;
  count: number;
  percentage: number;
}

interface FundingDistribution {
  stage: string;
  count: number;
  percentage: number;
}

interface TopCompany {
  name: string;
  mentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  lastSeen: string;
  newsletters: string[];
}

export default function AnalyticsPage() {
  const { trackEvent, trackConversion } = useAnalytics();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [newsletterPerformance, setNewsletterPerformance] = useState<NewsletterPerformance[]>([]);
  const [industryDistribution, setIndustryDistribution] = useState<IndustryDistribution[]>([]);
  const [fundingDistribution, setFundingDistribution] = useState<FundingDistribution[]>([]);
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [timeRange, setTimeRange] = useState('7');
  const [view, setView] = useState('overview');
  const lastTrackedRangeRef = useRef<string | null>(null);

  const trackFetchError = useCallback(async (resource: string, error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await trackEvent('analytics_fetch_error', {
      resource,
      message,
    });
  }, [trackEvent]);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/metrics?days=${timeRange}`);
      const data = await response.json();
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      await trackFetchError('metrics', error);
    }
  }, [timeRange, trackFetchError]);

  const fetchTrendData = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/trends?days=${timeRange}`);
      const data = await response.json();
      if (data.success) {
        setTrendData(data.trends || []);
      }
    } catch (error) {
      console.error('Failed to fetch trend data:', error);
      await trackFetchError('trends', error);
    }
  }, [timeRange, trackFetchError]);

  const fetchNewsletterPerformance = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/newsletters?days=${timeRange}`);
      const data = await response.json();
      if (data.success) {
        setNewsletterPerformance(data.newsletters || []);
      }
    } catch (error) {
      console.error('Failed to fetch newsletter performance:', error);
      await trackFetchError('newsletters', error);
    }
  }, [timeRange, trackFetchError]);

  const fetchDistributions = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/distributions?days=${timeRange}`);
      const data = await response.json();
      if (data.success) {
        const distributions = data.distributions || {};
        setIndustryDistribution(distributions.industry || data.industries || []);
        setFundingDistribution(distributions.funding || data.funding || []);
      }
    } catch (error) {
      console.error('Failed to fetch distributions:', error);
      await trackFetchError('distributions', error);
    }
  }, [timeRange, trackFetchError]);

  const fetchTopCompanies = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/top-companies?days=${timeRange}`);
      const data = await response.json();
      if (data.success) {
        setTopCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Failed to fetch top companies:', error);
      await trackFetchError('top_companies', error);
    }
  }, [timeRange, trackFetchError]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchMetrics(),
      fetchTrendData(),
      fetchNewsletterPerformance(),
      fetchDistributions(),
      fetchTopCompanies()
    ]);
    setLoading(false);

    const previousRange = lastTrackedRangeRef.current;
    lastTrackedRangeRef.current = timeRange;

    await trackEvent(previousRange === timeRange ? 'analytics_dashboard_refresh' : 'analytics_dashboard_view', {
      timeRange: Number(timeRange),
    });
  }, [
    fetchDistributions,
    fetchMetrics,
    fetchNewsletterPerformance,
    fetchTopCompanies,
    fetchTrendData,
    timeRange,
    trackEvent,
  ]);

  useEffect(() => {
    fetchAllData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData, fetchMetrics]);

  const handleExport = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/export?days=${timeRange}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      await trackConversion('analytics_export', {
        format: 'csv',
        timeRange: Number(timeRange),
      });
    } catch (error) {
      console.error('Failed to export analytics:', error);
      await trackFetchError('export', error);
    }
  }, [timeRange, trackConversion, trackFetchError]);

  const handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value);
    void trackEvent('analytics_time_range_change', { value: Number(value) });
  }, [trackEvent]);

  const handleViewChange = useCallback((value: string) => {
    setView(value);
    void trackEvent('analytics_view_change', { view: value });
  }, [trackEvent]);

  const renderChange = (value: number) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {Math.abs(value)}%
      </span>
    );
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Simple chart visualization (in production, use a proper charting library)
  const renderMiniChart = (data: number[]) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return (
      <div className="flex items-end gap-1 h-8">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/20 hover:bg-primary/30 transition-colors rounded-t"
            style={{ height: `${((value - min) / range) * 100}%` }}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Intelligence metrics and performance insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Button variant="outline" onClick={fetchAllData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Total Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold">{metrics.totalCompanies}</p>
                {renderChange(metrics.companiesChange)}
              </div>
              <div className="mt-2">
                {renderMiniChart([65, 72, 68, 75, 82, 89, metrics.totalCompanies])}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Discovery Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold">{metrics.discoveryVelocity}/day</p>
                {renderChange(metrics.velocityChange)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Companies per day
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Avg Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold">{(metrics.avgConfidence * 100).toFixed(1)}%</p>
                {renderChange(metrics.confidenceChange)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${metrics.avgConfidence * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold">{(metrics.successRate * 100).toFixed(1)}%</p>
                <Badge variant="outline" className="text-xs">
                  {metrics.newsletterCount} sources
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Email processing success
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Engagement Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Page Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold">{metrics.pageViews}</p>
                {renderChange(metrics.pageViewChange)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total over selected range
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Unique Visitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold">{metrics.uniqueVisitors}</p>
                <Badge variant="outline" className="text-xs">
                  {metrics.totalEvents} events
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sessions captured
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold">{(metrics.conversionRate * 100).toFixed(1)}%</p>
                <Badge variant="secondary" className="text-xs">
                  {metrics.activeExperiments} experiments
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across tracked funnels
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {metrics?.realtime && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Real-time Activity (last 15 min)
            </CardTitle>
            <CardDescription>
              {metrics.realtime.lastEventAt ? `Last event at ${formatDateTime(metrics.realtime.lastEventAt)}` : 'No recent events recorded'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div>
              <p className="text-xl font-semibold">{metrics.realtime.pageViews}</p>
              <p className="text-xs text-muted-foreground">Page views</p>
            </div>
            <div>
              <p className="text-xl font-semibold">{metrics.realtime.events}</p>
              <p className="text-xs text-muted-foreground">Events captured</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Tabs */}
      <div className="flex gap-2">
        {['overview', 'newsletters', 'companies', 'trends'].map((v) => (
          <Button
            key={v}
            variant={view === v ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange(v)}
            className="capitalize"
          >
            {v}
          </Button>
        ))}
      </div>

      {/* Content based on view */}
      {view === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Industry Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Industry Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(industryDistribution || []).slice(0, 5).map((industry) => (
                  <div key={industry.industry} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-medium capitalize">
                        {industry.industry}
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${industry.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground ml-3">
                      {industry.count} ({industry.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Funding Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Funding Stage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(fundingDistribution || []).map((stage) => (
                  <div key={stage.stage} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="capitalize">
                        {stage.stage.replace('-', ' ')}
                      </Badge>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${stage.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground ml-3">
                      {stage.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {view === 'newsletters' && (
        <Card>
          <CardHeader>
            <CardTitle>Newsletter Performance</CardTitle>
            <CardDescription>
              Effectiveness of each newsletter source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {newsletterPerformance.map((newsletter) => (
                <div key={newsletter.name} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{newsletter.name}</h4>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{newsletter.emails} emails</span>
                      <span>•</span>
                      <span>{newsletter.companies} companies</span>
                      <span>•</span>
                      <span>{(newsletter.avgConfidence * 100).toFixed(1)}% confidence</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Effectiveness</div>
                    <div className="text-2xl font-bold">
                      {(newsletter.effectiveness * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {view === 'companies' && (
        <Card>
          <CardHeader>
            <CardTitle>Top Companies</CardTitle>
            <CardDescription>
              Most mentioned companies in the last {timeRange} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCompanies.map((company, index) => (
                <div key={company.name} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-muted-foreground">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{company.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span className={getSentimentColor(company.sentiment)}>
                        {company.sentiment}
                      </span>
                      <span className="text-muted-foreground">
                        {company.mentions} mentions
                      </span>
                      <span className="text-muted-foreground">
                        Last seen: {formatDateTime(company.lastSeen)}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {(company.newsletters || []).slice(0, 3).map(nl => (
                        <Badge key={nl} variant="secondary" className="text-xs">
                          {nl}
                        </Badge>
                      ))}
                      {company.newsletters.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{company.newsletters.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {view === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle>Discovery Trends</CardTitle>
            <CardDescription>
              Company discovery and mention trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {trendData.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-1">
                    <div 
                      className="bg-blue-500 rounded"
                      style={{ height: `${day.companies * 5}px` }}
                      title={`${day.companies} companies`}
                    />
                    <div 
                      className="bg-green-500 rounded"
                      style={{ height: `${day.mentions * 3}px` }}
                      title={`${day.mentions} mentions`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground -rotate-45">
                    {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm">Companies</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-sm">Mentions</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}