'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, getSentimentColor, getConfidenceColor } from '@/lib/utils';
import { ExternalLink, Loader2 } from 'lucide-react';

interface Company {
  company_id: string;
  mention_id: string;
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  funding_status?: string;
  total_funding?: number;
  sentiment?: string;
  confidence_score?: number;
  mentioned_at?: string;
  newsletter_name?: string;
}

export function RecentCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const response = await fetch('/api/analytics/recent-companies');
        if (!response.ok) {
          throw new Error('Failed to fetch companies');
        }
        const data = await response.json();
        setCompanies(data.companies || []);
      } catch (err) {
        console.error('Failed to load recent companies:', err);
        setError(err instanceof Error ? err.message : 'Failed to load companies');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCompanies();
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load companies</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }
  
  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No companies found today</p>
        <p className="text-sm text-muted-foreground mt-1">
          Companies will appear here after the daily processing runs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {companies.slice(0, 5).map((company) => (
        <div
          key={`${company.company_id}-${company.mention_id}`}
          className="border rounded-lg p-4 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{company.name}</h3>
                {company.website && (
                  <Link 
                    href={company.website} 
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
              {company.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {company.description}
                </p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            {company.industry && (
              <Badge variant="secondary" className="text-xs">
                {company.industry}
              </Badge>
            )}
            {company.funding_status && (
              <Badge variant="outline" className="text-xs">
                {company.funding_status}
              </Badge>
            )}
            {company.total_funding && (
              <Badge variant="outline" className="text-xs">
                ${(company.total_funding / 1000000).toFixed(1)}M
              </Badge>
            )}
          </div>

          {/* Mention Info */}
          {(company.sentiment || company.confidence_score || company.mentioned_at) && (
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center gap-2">
                {company.sentiment && (
                  <Badge 
                    className={cn(
                      'text-xs',
                      getSentimentColor(company.sentiment)
                    )}
                  >
                    {company.sentiment}
                  </Badge>
                )}
                {company.confidence_score !== undefined && (
                  <Badge 
                    className={cn(
                      'text-xs',
                      getConfidenceColor(company.confidence_score)
                    )}
                  >
                    {(company.confidence_score * 100).toFixed(0)}% confidence
                  </Badge>
                )}
              </div>
              
              {(company.newsletter_name || company.mentioned_at) && (
                <div className="text-xs text-muted-foreground">
                  {company.newsletter_name && (
                    <span>From {company.newsletter_name}</span>
                  )}
                  {company.newsletter_name && company.mentioned_at && ' • '}
                  {company.mentioned_at && (
                    <span>{formatDateTime(company.mentioned_at)}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Helper function for className concatenation
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}