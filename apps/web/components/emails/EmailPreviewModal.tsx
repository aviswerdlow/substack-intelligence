'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { 
  Mail, 
  Building2, 
  Calendar, 
  Hash,
  Globe,
  TrendingUp,
  FileText,
  Copy,
  ExternalLink,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatDateTime, getSentimentColor } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  context: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  website?: string;
  industry?: string;
}

interface EmailDetails {
  id: string;
  message_id: string;
  subject: string;
  sender: string;
  newsletter_name: string;
  received_at: string;
  processed_at: string | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  raw_content?: string;
  extracted_content?: string;
  companies?: Company[];
  metadata?: {
    word_count?: number;
    language?: string;
    topics?: string[];
  };
}

interface EmailPreviewModalProps {
  emailId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReprocess?: (emailId: string) => void;
}

export function EmailPreviewModal({ 
  emailId, 
  isOpen, 
  onClose,
  onReprocess 
}: EmailPreviewModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState<EmailDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isReprocessing, setIsReprocessing] = useState(false);

  useEffect(() => {
    if (emailId && isOpen) {
      fetchEmailDetails();
    }
  }, [emailId, isOpen]);

  const fetchEmailDetails = async () => {
    if (!emailId) return;
    
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockEmail: EmailDetails = {
        id: emailId,
        message_id: `msg_${emailId}`,
        subject: 'Weekly Tech Digest: AI Innovations and Market Trends',
        sender: 'newsletter@techdigest.com',
        newsletter_name: 'Tech Digest Weekly',
        received_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        processed_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        processing_status: 'completed',
        error_message: null,
        raw_content: 'This week in tech: OpenAI announces new features, Apple Vision Pro gains traction...',
        extracted_content: 'Key companies mentioned: OpenAI, Apple, Microsoft, Google...',
        companies: [
          {
            id: '1',
            name: 'OpenAI',
            context: 'OpenAI announces GPT-5 with revolutionary capabilities',
            sentiment: 'positive',
            confidence: 0.95,
            website: 'https://openai.com',
            industry: 'AI/ML'
          },
          {
            id: '2',
            name: 'Apple',
            context: 'Apple Vision Pro sees strong adoption in enterprise',
            sentiment: 'positive',
            confidence: 0.88,
            website: 'https://apple.com',
            industry: 'Technology'
          },
          {
            id: '3',
            name: 'Microsoft',
            context: 'Microsoft integrates AI across entire product suite',
            sentiment: 'neutral',
            confidence: 0.82,
            website: 'https://microsoft.com',
            industry: 'Technology'
          }
        ],
        metadata: {
          word_count: 1250,
          language: 'en',
          topics: ['AI', 'Technology', 'Innovation', 'Market Trends']
        }
      };
      
      setEmail(mockEmail);
    } catch (error) {
      console.error('Failed to fetch email details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async () => {
    if (!email) return;
    
    setIsReprocessing(true);
    try {
      if (onReprocess) {
        onReprocess(email.id);
      }
      
      // Update local state
      setEmail(prev => prev ? {
        ...prev,
        processing_status: 'processing' as const
      } : null);
      
      toast({
        title: 'Reprocessing Started',
        description: 'Email is being reprocessed. This may take a moment.'
      });
      
      // Close modal after starting reprocess
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reprocess email',
        variant: 'destructive'
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleCopyId = () => {
    if (email) {
      navigator.clipboard.writeText(email.message_id);
      toast({
        title: 'Copied',
        description: 'Message ID copied to clipboard'
      });
    }
  };

  const handleExport = () => {
    if (!email) return;
    
    const exportData = {
      email: {
        id: email.id,
        subject: email.subject,
        sender: email.sender,
        received_at: email.received_at,
        processed_at: email.processed_at
      },
      companies: email.companies,
      metadata: email.metadata
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-${email.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported',
      description: 'Email data exported successfully'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processing': return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : email ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <DialogTitle className="text-xl">{email.subject}</DialogTitle>
                  <DialogDescription className="mt-2 space-y-1">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {email.newsletter_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(email.received_at)}
                      </span>
                    </div>
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(email.processing_status)}
                  <Badge variant={
                    email.processing_status === 'completed' ? 'default' :
                    email.processing_status === 'failed' ? 'destructive' :
                    'secondary'
                  }>
                    {email.processing_status}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="companies">
                  Companies {email.companies && `(${email.companies.length})`}
                </TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="overview" className="space-y-4 p-4">
                  {/* Processing Info */}
                  <Card className="p-4">
                    <h3 className="font-medium mb-3">Processing Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Message ID:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {email.message_id}
                          </code>
                          <Button size="sm" variant="ghost" onClick={handleCopyId}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Processed:</span>
                        <p className="font-medium">
                          {email.processed_at ? formatDateTime(email.processed_at) : 'Not processed'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Summary Stats */}
                  {email.companies && (
                    <Card className="p-4">
                      <h3 className="font-medium mb-3">Extraction Summary</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{email.companies.length}</p>
                          <p className="text-sm text-muted-foreground">Companies Found</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {(email.companies.reduce((acc, c) => acc + c.confidence, 0) / email.companies.length * 100).toFixed(0)}%
                          </p>
                          <p className="text-sm text-muted-foreground">Avg Confidence</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {email.metadata?.word_count || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Word Count</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Error Message */}
                  {email.error_message && (
                    <Card className="p-4 border-red-200 bg-red-50">
                      <h3 className="font-medium text-red-900 mb-2">Processing Error</h3>
                      <p className="text-sm text-red-700">{email.error_message}</p>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="companies" className="p-4">
                  {email.companies && email.companies.length > 0 ? (
                    <div className="space-y-3">
                      {email.companies.map((company) => (
                        <Card key={company.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Building2 className="h-4 w-4" />
                                <h4 className="font-medium">{company.name}</h4>
                                {company.website && (
                                  <a 
                                    href={company.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                "{company.context}"
                              </p>
                              <div className="flex items-center gap-3">
                                <Badge className={getSentimentColor(company.sentiment)}>
                                  {company.sentiment}
                                </Badge>
                                <span className="text-sm">
                                  {(company.confidence * 100).toFixed(0)}% confidence
                                </span>
                                {company.industry && (
                                  <Badge variant="outline">{company.industry}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2" />
                      <p>No companies extracted from this email</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="content" className="p-4">
                  <div className="space-y-4">
                    {email.extracted_content && (
                      <Card className="p-4">
                        <h3 className="font-medium mb-2">Extracted Content</h3>
                        <p className="text-sm whitespace-pre-wrap">{email.extracted_content}</p>
                      </Card>
                    )}
                    {email.raw_content && (
                      <Card className="p-4">
                        <h3 className="font-medium mb-2">Raw Content</h3>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {email.raw_content}
                        </p>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="metadata" className="p-4">
                  <Card className="p-4">
                    <h3 className="font-medium mb-3">Email Metadata</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sender:</span>
                        <span>{email.sender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Newsletter:</span>
                        <span>{email.newsletter_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Received:</span>
                        <span>{formatDateTime(email.received_at)}</span>
                      </div>
                      {email.processed_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processed:</span>
                          <span>{formatDateTime(email.processed_at)}</span>
                        </div>
                      )}
                      {email.metadata?.language && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Language:</span>
                          <span>{email.metadata.language}</span>
                        </div>
                      )}
                      {email.metadata?.topics && (
                        <div>
                          <span className="text-muted-foreground">Topics:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {email.metadata.topics.map((topic, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReprocess}
                  disabled={isReprocessing || email.processing_status === 'processing'}
                  className="gap-2"
                >
                  {isReprocessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Reprocess
                </Button>
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Email not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}