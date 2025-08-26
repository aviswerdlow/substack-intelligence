'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduleConfigModal } from '@/components/reports/ScheduleConfigModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Calendar,
  Download,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Settings,
  TrendingUp,
  Users,
  Mail,
  Loader2,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface Report {
  id: string;
  report_type: 'daily' | 'weekly' | 'monthly';
  report_date: string;
  generated_at: string;
  recipients_count: number;
  companies_count: number;
  mentions_count: number;
  status: 'pending' | 'generating' | 'sent' | 'failed';
  error_message?: string;
  pdf_size?: number;
}

interface ReportSchedule {
  id: string;
  report_type: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  delivery_time: string;
  recipients: string[];
  last_run?: string;
  next_run?: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Filters
  const [reportType, setReportType] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  
  // Report generation modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateType, setGenerateType] = useState('daily');
  const [generateDateRange, setGenerateDateRange] = useState('1');
  const [generateRecipients, setGenerateRecipients] = useState('');
  
  // Schedule configuration modal
  const [selectedSchedule, setSelectedSchedule] = useState<ReportSchedule | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchSchedules();
  }, [reportType, dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        days: dateRange
      });
      
      const response = await fetch(`/api/reports?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/reports/schedules');
      const data = await response.json();
      
      if (data.success) {
        setSchedules(data.schedules);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: generateType,
          dateRange: generateDateRange,
          recipients: generateRecipients.split(',').map(e => e.trim()).filter(Boolean)
        })
      });
      
      if (response.ok) {
        setShowGenerateModal(false);
        setGenerateRecipients('');
        // Refresh reports list after a delay
        setTimeout(() => fetchReports(), 2000);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/pdf`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const handleResendReport = async (reportId: string) => {
    try {
      await fetch(`/api/reports/${reportId}/resend`, { method: 'POST' });
      alert('Report has been queued for resending.');
      fetchReports();
    } catch (error) {
      console.error('Failed to resend report:', error);
      alert('Failed to resend report. Please try again.');
    }
  };
  
  const handleConfigureSchedule = (schedule: ReportSchedule) => {
    setSelectedSchedule(schedule);
    setShowConfigModal(true);
  };
  
  const handleSaveSchedule = async (updatedSchedule: ReportSchedule) => {
    try {
      const response = await fetch(`/api/reports/schedules/${updatedSchedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSchedule),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }
      
      // Refresh schedules
      await fetchSchedules();
      setShowConfigModal(false);
    } catch (error) {
      console.error('Failed to save schedule:', error);
      throw error; // Let the modal handle the error
    }
  };

  const toggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      await fetch(`/api/reports/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      fetchSchedules();
    } catch (error) {
      console.error('Failed to update schedule:', error);
    }
  };

  const getStatusIcon = (status: Report['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'generating':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'generating': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-100 text-blue-800';
      case 'weekly': return 'bg-purple-100 text-purple-800';
      case 'monthly': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and manage intelligence reports
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => setShowGenerateModal(true)}
        >
          <Plus className="h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Report Schedules */}
      <div className="grid md:grid-cols-3 gap-4">
        {schedules.map((schedule) => (
          <Card key={schedule.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base capitalize">
                    {schedule.report_type} Report
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {schedule.enabled ? 'Active' : 'Inactive'}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant={schedule.enabled ? "default" : "outline"}
                  onClick={() => toggleSchedule(schedule.id, !schedule.enabled)}
                >
                  {schedule.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>Delivery: {schedule.delivery_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span>{schedule.recipients.length} recipients</span>
                </div>
                {schedule.next_run && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>Next: {formatDateTime(schedule.next_run)}</span>
                  </div>
                )}
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="w-full mt-3"
                onClick={() => handleConfigureSchedule(schedule)}
              >
                <Settings className="h-3 w-3 mr-1" />
                Configure
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reports found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowGenerateModal(true)}
              >
                Generate First Report
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                >
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">
                        {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)} Report
                      </h4>
                      <Badge className={getReportTypeColor(report.report_type)}>
                        {report.report_type}
                      </Badge>
                      <Badge className={getStatusColor(report.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(report.status)}
                          {report.status}
                        </span>
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{formatDateTime(report.generated_at)}</span>
                      <span>•</span>
                      <span>{report.companies_count} companies</span>
                      <span>•</span>
                      <span>{report.mentions_count} mentions</span>
                      {report.recipients_count > 0 && (
                        <>
                          <span>•</span>
                          <span>{report.recipients_count} recipients</span>
                        </>
                      )}
                      {report.pdf_size && (
                        <>
                          <span>•</span>
                          <span>{(report.pdf_size / 1024).toFixed(1)} KB</span>
                        </>
                      )}
                    </div>
                    
                    {report.error_message && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {report.error_message}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`/reports/${report.id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {report.status === 'sent' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadReport(report.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResendReport(report.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Configuration Modal */}
      <ScheduleConfigModal
        schedule={selectedSchedule}
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveSchedule}
      />
      
      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
              <CardDescription>
                Create a new intelligence report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Report Type</label>
                <Select value={generateType} onValueChange={setGenerateType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Report</SelectItem>
                    <SelectItem value="weekly">Weekly Report</SelectItem>
                    <SelectItem value="monthly">Monthly Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Date Range</label>
                <Select value={generateDateRange} onValueChange={setGenerateDateRange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 24 hours</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Recipients (comma-separated)</label>
                <Input
                  className="mt-1"
                  placeholder="email1@example.com, email2@example.com"
                  value={generateRecipients}
                  onChange={(e) => setGenerateRecipients(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowGenerateModal(false)}
                  disabled={generating}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleGenerateReport}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}