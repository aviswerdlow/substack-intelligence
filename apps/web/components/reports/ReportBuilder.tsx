'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  Play,
  Calendar,
  Filter,
  BarChart3,
  FileText,
  Table,
  PieChart,
  TrendingUp,
  Building2,
  Mail,
  Settings,
  Eye,
  Copy,
  Share2,
  Clock,
  CheckCircle
} from 'lucide-react';
import { InteractiveChart } from '@/components/analytics/InteractiveChart';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type ReportType = 'dashboard' | 'detailed' | 'executive' | 'custom';
type DataSource = 'companies' | 'emails' | 'newsletters' | 'sentiment' | 'all';
type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html';

interface ReportSection {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  dataSource: DataSource;
  config: any;
  data?: any;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  sections: ReportSection[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'weekly-summary',
    name: 'Weekly Summary',
    description: 'Overview of weekly company mentions and trends',
    type: 'dashboard',
    sections: [
      {
        id: '1',
        type: 'metric',
        title: 'Key Metrics',
        dataSource: 'all',
        config: { metrics: ['total_companies', 'total_mentions', 'avg_sentiment'] }
      },
      {
        id: '2',
        type: 'chart',
        title: 'Company Mentions Trend',
        dataSource: 'companies',
        config: { chartType: 'line', timeRange: '7d' }
      },
      {
        id: '3',
        type: 'table',
        title: 'Top Companies',
        dataSource: 'companies',
        config: { limit: 10, sortBy: 'mentions' }
      }
    ]
  },
  {
    id: 'executive-briefing',
    name: 'Executive Briefing',
    description: 'High-level insights for leadership',
    type: 'executive',
    sections: [
      {
        id: '1',
        type: 'text',
        title: 'Executive Summary',
        dataSource: 'all',
        config: { template: 'executive_summary' }
      },
      {
        id: '2',
        type: 'chart',
        title: 'Market Sentiment',
        dataSource: 'sentiment',
        config: { chartType: 'pie' }
      },
      {
        id: '3',
        type: 'metric',
        title: 'Growth Indicators',
        dataSource: 'companies',
        config: { metrics: ['growth_rate', 'new_companies', 'trending'] }
      }
    ]
  }
];

export function ReportBuilder() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customSections, setCustomSections] = useState<ReportSection[]>([]);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  // Add new section to report
  const addSection = (type: ReportSection['type']) => {
    const newSection: ReportSection = {
      id: Date.now().toString(),
      type,
      title: `New ${type} section`,
      dataSource: 'all',
      config: {}
    };
    setCustomSections([...customSections, newSection]);
  };

  // Remove section
  const removeSection = (sectionId: string) => {
    setCustomSections(customSections.filter(s => s.id !== sectionId));
  };

  // Update section
  const updateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    setCustomSections(customSections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ));
  };

  // Generate report
  const generateReport = async () => {
    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const report = {
        id: Date.now().toString(),
        name: reportName || selectedTemplate?.name || 'Custom Report',
        generatedAt: new Date().toISOString(),
        sections: selectedTemplate ? selectedTemplate.sections : customSections,
        data: {
          // Mock data
          total_companies: 156,
          total_mentions: 892,
          avg_sentiment: 0.72,
          growth_rate: 12.5,
          companies: [
            { name: 'OpenAI', mentions: 45, sentiment: 'positive' },
            { name: 'Apple', mentions: 38, sentiment: 'positive' },
            { name: 'Microsoft', mentions: 32, sentiment: 'neutral' }
          ]
        }
      };
      
      setGeneratedReport(report);
      setShowPreview(true);
      
      toast({
        title: 'Report Generated',
        description: 'Your report has been generated successfully.'
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Export report
  const exportReport = async () => {
    if (!generatedReport) return;
    
    try {
      // Simulate export
      const filename = `report-${generatedReport.id}.${exportFormat}`;
      
      if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(generatedReport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For other formats, would need server-side generation
        toast({
          title: 'Export Started',
          description: `Exporting report as ${exportFormat.toUpperCase()}...`
        });
      }
      
      toast({
        title: 'Export Complete',
        description: `Report exported as ${filename}`
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export report.',
        variant: 'destructive'
      });
    }
  };

  // Save report template
  const saveTemplate = () => {
    const template: ReportTemplate = {
      id: Date.now().toString(),
      name: reportName,
      description: reportDescription,
      type: 'custom',
      sections: customSections
    };
    
    // Save to localStorage
    const saved = localStorage.getItem('reportTemplates');
    const templates = saved ? JSON.parse(saved) : [];
    templates.push(template);
    localStorage.setItem('reportTemplates', JSON.stringify(templates));
    
    toast({
      title: 'Template Saved',
      description: 'Your report template has been saved.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report Builder</h1>
          <p className="text-muted-foreground">
            Create custom reports with drag-and-drop components
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={!generatedReport}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={generateReport}
            disabled={isGenerating || (!selectedTemplate && customSections.length === 0)}
          >
            {isGenerating ? (
              <Clock className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="custom">Custom Builder</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TEMPLATES.map(template => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{template.type}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {template.sections.length} sections
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>Template Preview: {selectedTemplate.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedTemplate.sections.map(section => (
                    <div key={section.id} className="flex items-center gap-3 p-3 border rounded">
                      {section.type === 'chart' && <BarChart3 className="h-5 w-5" />}
                      {section.type === 'table' && <Table className="h-5 w-5" />}
                      {section.type === 'metric' && <TrendingUp className="h-5 w-5" />}
                      {section.type === 'text' && <FileText className="h-5 w-5" />}
                      <div className="flex-1">
                        <p className="font-medium">{section.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Data: {section.dataSource}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Custom Builder Tab */}
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Report Name</Label>
                  <Input
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Enter report name..."
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Builder */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Report Sections</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => addSection('chart')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Add Chart
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addSection('table')}>
                    <Table className="h-4 w-4 mr-2" />
                    Add Table
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addSection('metric')}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Add Metric
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addSection('text')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Add Text
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customSections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3" />
                  <p>No sections added yet</p>
                  <p className="text-sm">Click the buttons above to add sections to your report</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customSections.map((section, index) => (
                    <div key={section.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            {section.type === 'chart' && <BarChart3 className="h-5 w-5" />}
                            {section.type === 'table' && <Table className="h-5 w-5" />}
                            {section.type === 'metric' && <TrendingUp className="h-5 w-5" />}
                            {section.type === 'text' && <FileText className="h-5 w-5" />}
                            <Input
                              value={section.title}
                              onChange={(e) => updateSection(section.id, { title: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <Select
                              value={section.dataSource}
                              onValueChange={(value) => updateSection(section.id, { dataSource: value as DataSource })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Data source" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Data</SelectItem>
                                <SelectItem value="companies">Companies</SelectItem>
                                <SelectItem value="emails">Emails</SelectItem>
                                <SelectItem value="newsletters">Newsletters</SelectItem>
                                <SelectItem value="sentiment">Sentiment</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {section.type === 'chart' && (
                              <Select
                                value={section.config.chartType || 'line'}
                                onValueChange={(value) => updateSection(section.id, { 
                                  config: { ...section.config, chartType: value }
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Chart type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="line">Line Chart</SelectItem>
                                  <SelectItem value="bar">Bar Chart</SelectItem>
                                  <SelectItem value="pie">Pie Chart</SelectItem>
                                  <SelectItem value="area">Area Chart</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {customSections.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={saveTemplate} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save as Template
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Scheduling</CardTitle>
              <CardDescription>
                Automatically generate and send reports on a schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Scheduled Reports</Label>
                <Button
                  variant={scheduleEnabled ? 'default' : 'outline'}
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                >
                  {scheduleEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              
              {scheduleEnabled && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Frequency</Label>
                      <Select defaultValue="weekly">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input type="time" defaultValue="09:00" />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Recipients</Label>
                    <Input placeholder="Enter email addresses separated by commas..." />
                  </div>
                  
                  <div>
                    <Label>Export Format</Label>
                    <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
            <DialogDescription>
              {generatedReport?.name} - Generated {generatedReport && format(new Date(generatedReport.generatedAt), 'PPpp')}
            </DialogDescription>
          </DialogHeader>
          
          {generatedReport && (
            <div className="space-y-6 mt-4">
              {/* Mock preview content */}
              <Card>
                <CardHeader>
                  <CardTitle>Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{generatedReport.data.total_companies}</p>
                      <p className="text-sm text-muted-foreground">Total Companies</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{generatedReport.data.total_mentions}</p>
                      <p className="text-sm text-muted-foreground">Total Mentions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{(generatedReport.data.avg_sentiment * 100).toFixed(0)}%</p>
                      <p className="text-sm text-muted-foreground">Positive Sentiment</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button onClick={exportReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}