'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, ExternalLink, Search, Filter, TrendingUp } from 'lucide-react';
import { formatDateTime, getSentimentColor, getConfidenceColor } from '@/lib/utils';
import Link from 'next/link';
import { NoCompaniesEmptyState, NoSearchResultsEmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-loader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { useRouter } from 'next/navigation';

interface CompanyMention {
  id: string;
  context: string;
  sentiment: string;
  confidence: number;
  newsletter_name: string;
  received_at: string;
}

interface Company {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  funding_status: string | null;
  mentions: CompanyMention[];
  totalMentions: number;
  newsletterDiversity: number;
}

interface IntelligenceData {
  companies: Company[];
  summary: {
    totalCompanies: number;
    totalMentions: number;
    averageMentionsPerCompany: string;
    timeRange: string;
  };
}

export default function IntelligencePage() {
  const router = useRouter();
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fundingFilter, setFundingFilter] = useState('all');
  const [days, setDays] = useState('1');

  useEffect(() => {
    fetchIntelligence();
  }, [days]);

  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/intelligence?days=${days}&limit=100`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        console.error('Failed to fetch intelligence:', result.error);
      }
    } catch (error) {
      console.error('Error fetching intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = data?.companies.filter(company => {
    const matchesSearch = searchTerm === '' || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFunding = fundingFilter === 'all' || 
      company.funding_status === fundingFilter;
    
    return matchesSearch && matchesFunding;
  }) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs />
        <div className="flex items-center justify-between">
          <div className="animate-pulse bg-muted h-8 w-48 rounded" />
          <div className="animate-pulse bg-muted h-10 w-32 rounded" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-muted h-24 rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Daily Intelligence
          </h1>
          <p className="text-muted-foreground">
            Latest company mentions from your curated newsletters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Today</SelectItem>
              <SelectItem value="3">3 Days</SelectItem>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchIntelligence} variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {data?.summary && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{data.summary.totalCompanies}</div>
              <p className="text-sm text-muted-foreground">Companies Found</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{data.summary.totalMentions}</div>
              <p className="text-sm text-muted-foreground">Total Mentions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{data.summary.averageMentionsPerCompany}</div>
              <p className="text-sm text-muted-foreground">Avg per Company</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{data.summary.timeRange}</div>
              <p className="text-sm text-muted-foreground">Time Range</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-search-input
          />
        </div>
        <Select value={fundingFilter} onValueChange={setFundingFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Funding Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Funding</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
            <SelectItem value="bootstrapped">Bootstrapped</SelectItem>
            <SelectItem value="seed">Seed</SelectItem>
            <SelectItem value="series-a">Series A</SelectItem>
            <SelectItem value="series-b">Series B</SelectItem>
            <SelectItem value="later-stage">Later Stage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Companies List */}
      {filteredCompanies.length === 0 ? (
        searchTerm ? (
          <NoSearchResultsEmptyState
            searchTerm={searchTerm}
            onClearSearch={() => setSearchTerm('')}
          />
        ) : (
          <NoCompaniesEmptyState
            onRunPipeline={() => {
              router.push('/dashboard');
              setTimeout(() => {
                document.querySelector('[data-pipeline-trigger]')?.dispatchEvent(new Event('click'));
              }, 500);
            }}
            onAddCompany={() => router.push('/settings?tab=companies')}
          />
        )
      ) : (
        <div className="space-y-6">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{company.name}</CardTitle>
                      {company.website && (
                        <Link 
                          href={company.website} 
                          target="_blank"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                    {company.description && (
                      <CardDescription className="mt-2">
                        {company.description}
                      </CardDescription>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {company.funding_status && (
                        <Badge variant="outline">
                          {company.funding_status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {company.totalMentions} mention{company.totalMentions !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="secondary">
                        {company.newsletterDiversity} newsletter{company.newsletterDiversity !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {company.mentions.slice(0, 3).map((mention) => (
                    <div key={mention.id} className="border-l-2 border-muted pl-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={getSentimentColor(mention.sentiment as any)}
                          >
                            {mention.sentiment}
                          </Badge>
                          <span className={`text-xs ${getConfidenceColor(mention.confidence)}`}>
                            {Math.round(mention.confidence * 100)}% confidence
                          </span>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{mention.newsletter_name}</div>
                          <div>{formatDateTime(mention.received_at)}</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                        "{mention.context}"
                      </p>
                    </div>
                  ))}
                  
                  {company.mentions.length > 3 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm">
                        View {company.mentions.length - 3} more mentions
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}