'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  RefreshCw, 
  Search, 
  Filter, 
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface Email {
  id: string;
  message_id: string;
  subject: string;
  sender: string;
  newsletter_name: string;
  received_at: string;
  processed_at: string | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  companies_extracted?: number;
  confidence_avg?: number;
}

interface EmailStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  success_rate: number;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newsletterFilter, setNewsletterFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  // Unique newsletters for filter
  const [newsletters, setNewsletters] = useState<string[]>([]);

  useEffect(() => {
    fetchEmails();
    fetchStats();
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      if (processingIds.size > 0) {
        fetchEmails();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [page, statusFilter, newsletterFilter, dateRange]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
        newsletter: newsletterFilter,
        days: dateRange,
        search: searchTerm
      });
      
      const response = await fetch(`/api/emails?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setEmails(data.emails);
        setTotalPages(data.totalPages || 1);
        setNewsletters(data.newsletters || []);
        
        // Track which emails are processing
        const processing = new Set(
          data.emails
            .filter((e: Email) => e.processing_status === 'processing')
            .map((e: Email) => e.id)
        );
        setProcessingIds(processing);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/emails/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleReprocess = async (emailId: string) => {
    setProcessingIds(prev => new Set(prev).add(emailId));
    try {
      const response = await fetch('/api/emails/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: [emailId] })
      });
      
      if (response.ok) {
        // Update local state to show processing
        setEmails(prev => prev.map(email => 
          email.id === emailId 
            ? { ...email, processing_status: 'processing' as const }
            : email
        ));
        // Refresh after a delay
        setTimeout(() => fetchEmails(), 1500);
      }
    } catch (error) {
      console.error('Failed to reprocess email:', error);
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(emailId);
        return next;
      });
    }
  };

  const handleBulkReprocess = async () => {
    const emailIds = Array.from(selectedEmails);
    emailIds.forEach(id => setProcessingIds(prev => new Set(prev).add(id)));
    
    try {
      const response = await fetch('/api/emails/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds })
      });
      
      if (response.ok) {
        setSelectedEmails(new Set());
        setTimeout(() => fetchEmails(), 1500);
      }
    } catch (error) {
      console.error('Failed to bulk reprocess:', error);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        newsletter: newsletterFilter,
        days: dateRange
      });
      
      const response = await fetch(`/api/emails/export?${params}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emails-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getStatusIcon = (status: Email['processing_status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Email['processing_status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = searchTerm === '' || 
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.newsletter_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Processing</h1>
          <p className="text-muted-foreground">
            Monitor and manage newsletter ingestion pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            className="gap-2"
            onClick={() => fetchEmails()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{(stats.success_rate * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={newsletterFilter} onValueChange={setNewsletterFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Newsletter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Newsletters</SelectItem>
                {newsletters.map(newsletter => (
                  <SelectItem key={newsletter} value={newsletter}>
                    {newsletter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {selectedEmails.size > 0 && (
            <div className="mt-4 flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {selectedEmails.size} emails selected
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkReprocess}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Reprocess Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedEmails(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Processed Emails
          </CardTitle>
          <CardDescription>
            Click on an email to view details or trigger reprocessing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No emails found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmails.has(email.id)}
                    onChange={(e) => {
                      const next = new Set(selectedEmails);
                      if (e.target.checked) {
                        next.add(email.id);
                      } else {
                        next.delete(email.id);
                      }
                      setSelectedEmails(next);
                    }}
                    className="h-4 w-4"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium truncate">{email.subject}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{email.newsletter_name}</span>
                          <span>•</span>
                          <span>{formatDateTime(email.received_at)}</span>
                          {email.companies_extracted !== undefined && (
                            <>
                              <span>•</span>
                              <span>{email.companies_extracted} companies</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(email.processing_status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(email.processing_status)}
                            {email.processing_status}
                          </span>
                        </Badge>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/emails/${email.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {email.processing_status !== 'processing' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReprocess(email.id)}
                              disabled={processingIds.has(email.id)}
                            >
                              {processingIds.has(email.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {email.error_message && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {email.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}