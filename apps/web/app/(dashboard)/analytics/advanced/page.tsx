'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InteractiveChart } from '@/components/analytics/InteractiveChart';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { 
  TrendingUp, 
  BarChart3, 
  Activity,
  Download,
  Filter,
  Calendar,
  Building2,
  Mail,
  Hash,
  DollarSign,
  Users,
  Globe,
  Zap
} from 'lucide-react';
import { format, subDays } from 'date-fns';

// Generate mock data
const generateMockData = (days: number) => {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i);
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      companies: Math.floor(Math.random() * 50) + 20,
      mentions: Math.floor(Math.random() * 200) + 100,
      emails: Math.floor(Math.random() * 30) + 10,
      sentiment: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
      confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
      value: Math.floor(Math.random() * 100) + 50
    });
  }
  
  return data;
};

const generateCategoryData = () => [
  { category: 'Technology', value: 342, percentage: 38 },
  { category: 'Healthcare', value: 198, percentage: 22 },
  { category: 'Finance', value: 156, percentage: 17 },
  { category: 'Retail', value: 112, percentage: 13 },
  { category: 'Other', value: 89, percentage: 10 }
];

const generateCompanyData = () => [
  { name: 'OpenAI', mentions: 156, sentiment: 0.85, growth: 23.5, category: 'AI/ML' },
  { name: 'Apple', mentions: 142, sentiment: 0.78, growth: 12.3, category: 'Technology' },
  { name: 'Microsoft', mentions: 128, sentiment: 0.72, growth: 8.7, category: 'Technology' },
  { name: 'Tesla', mentions: 98, sentiment: 0.65, growth: -5.2, category: 'Automotive' },
  { name: 'Amazon', mentions: 87, sentiment: 0.69, growth: 15.8, category: 'E-commerce' }
];

export default function AdvancedAnalyticsPage() {
  const [timeSeriesData, setTimeSeriesData] = useState(generateMockData(30));
  const [categoryData, setCategoryData] = useState(generateCategoryData());
  const [companyData, setCompanyData] = useState(generateCompanyData());
  const [selectedMetric, setSelectedMetric] = useState('companies');
  const [isExporting, setIsExporting] = useState(false);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Add new data point and remove oldest
      setTimeSeriesData(prev => {
        const newData = [...prev.slice(1)];
        const lastDate = new Date(prev[prev.length - 1].date);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);
        
        newData.push({
          date: format(nextDate, 'yyyy-MM-dd'),
          companies: Math.floor(Math.random() * 50) + 20,
          mentions: Math.floor(Math.random() * 200) + 100,
          emails: Math.floor(Math.random() * 30) + 10,
          sentiment: Math.random() * 0.4 + 0.6,
          confidence: Math.random() * 0.3 + 0.7,
          value: Math.floor(Math.random() * 100) + 50
        });
        
        return newData;
      });
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        timeSeriesData,
        categoryData,
        companyData,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate summary metrics
  const summaryMetrics = {
    totalCompanies: companyData.reduce((sum, c) => sum + c.mentions, 0),
    avgSentiment: (companyData.reduce((sum, c) => sum + c.sentiment, 0) / companyData.length * 100).toFixed(1),
    totalMentions: timeSeriesData.reduce((sum, d) => sum + d.mentions, 0),
    growthRate: ((timeSeriesData[timeSeriesData.length - 1].value - timeSeriesData[0].value) / timeSeriesData[0].value * 100).toFixed(1)
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Interactive data visualization and insights
          </p>
        </div>
        <Button onClick={handleExportData} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summaryMetrics.totalCompanies}</p>
            <Badge variant="outline" className="mt-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              {summaryMetrics.growthRate}%
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Total Mentions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summaryMetrics.totalMentions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Avg Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summaryMetrics.avgSentiment}%</p>
            <Badge variant="default" className="mt-2">Positive</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Processing Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">98.5%</p>
            <p className="text-xs text-muted-foreground mt-2">Success rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visualizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visualizations">Data Visualizations</TabsTrigger>
          <TabsTrigger value="comparisons">Comparisons</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="reports">Report Builder</TabsTrigger>
        </TabsList>

        {/* Data Visualizations Tab */}
        <TabsContent value="visualizations" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <InteractiveChart
              title="Company Mentions Over Time"
              description="Daily company mentions from newsletters"
              data={timeSeriesData.map(d => ({
                date: d.date,
                value: d.companies,
                mentions: d.mentions
              }))}
              config={{
                type: 'line',
                dataKey: 'value',
                showBrush: true
              }}
              height={300}
            />
            
            <InteractiveChart
              title="Sentiment Analysis"
              description="Average sentiment scores by day"
              data={timeSeriesData.map(d => ({
                date: d.date,
                value: d.sentiment * 100,
                confidence: d.confidence * 100
              }))}
              config={{
                type: 'area',
                dataKey: 'value'
              }}
              height={300}
            />
            
            <InteractiveChart
              title="Industry Distribution"
              description="Companies by industry category"
              data={categoryData.map(c => ({
                date: c.category,
                value: c.value,
                percentage: c.percentage
              }))}
              config={{
                type: 'pie',
                dataKey: 'value'
              }}
              height={300}
            />
            
            <InteractiveChart
              title="Email Processing Volume"
              description="Emails processed per day"
              data={timeSeriesData.map(d => ({
                date: d.date,
                value: d.emails,
                processed: Math.floor(d.emails * 0.95),
                failed: Math.floor(d.emails * 0.05)
              }))}
              config={{
                type: 'bar',
                dataKey: 'value',
                stacked: true
              }}
              height={300}
            />
          </div>
        </TabsContent>

        {/* Comparisons Tab */}
        <TabsContent value="comparisons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Performance Comparison</CardTitle>
              <CardDescription>
                Compare metrics across top companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InteractiveChart
                title=""
                data={companyData.map(c => ({
                  date: c.name,
                  mentions: c.mentions,
                  sentiment: c.sentiment * 100,
                  growth: c.growth
                }))}
                config={{
                  type: 'radar',
                  dataKey: 'mentions'
                }}
                height={400}
                showControls={false}
              />
              
              {/* Company Details Table */}
              <div className="mt-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Company</th>
                      <th className="text-center py-2">Mentions</th>
                      <th className="text-center py-2">Sentiment</th>
                      <th className="text-center py-2">Growth</th>
                      <th className="text-center py-2">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyData.map((company, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 font-medium">{company.name}</td>
                        <td className="text-center">{company.mentions}</td>
                        <td className="text-center">
                          <Badge variant={company.sentiment > 0.7 ? 'default' : 'secondary'}>
                            {(company.sentiment * 100).toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="text-center">
                          <span className={company.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                            {company.growth > 0 ? '+' : ''}{company.growth}%
                          </span>
                        </td>
                        <td className="text-center">
                          <Badge variant="outline">{company.category}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Analysis Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Growth Trends</CardTitle>
                <CardDescription>
                  Identify emerging companies and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart
                  title=""
                  data={timeSeriesData.map(d => ({
                    date: d.date,
                    value: d.value,
                    trend: d.value * 1.1 // Mock trend line
                  }))}
                  config={{
                    type: 'composed',
                    dataKey: 'value'
                  }}
                  height={250}
                  showControls={false}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Correlation Analysis</CardTitle>
                <CardDescription>
                  Sentiment vs. mention volume correlation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart
                  title=""
                  data={timeSeriesData.map(d => ({
                    date: d.date,
                    value: d.mentions,
                    sentiment: d.sentiment * 200 // Scale for visibility
                  }))}
                  config={{
                    type: 'scatter',
                    dataKey: 'value'
                  }}
                  height={250}
                  showControls={false}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Predictions */}
          <Card>
            <CardHeader>
              <CardTitle>Predictive Analytics</CardTitle>
              <CardDescription>
                ML-based predictions for the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Expected Companies</p>
                  <p className="text-2xl font-bold">245</p>
                  <Badge variant="outline" className="mt-2">+15% from last week</Badge>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Predicted Sentiment</p>
                  <p className="text-2xl font-bold">82%</p>
                  <Badge variant="default" className="mt-2">Positive trend</Badge>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Processing Volume</p>
                  <p className="text-2xl font-bold">1,250</p>
                  <Badge variant="secondary" className="mt-2">Emails/week</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Builder Tab */}
        <TabsContent value="reports">
          <ReportBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}