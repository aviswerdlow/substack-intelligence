import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { createServerComponentClient, getDailyIntelligence } from '@substack-intelligence/database';
import { formatDateTime, getSentimentColor, getConfidenceColor } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

export async function RecentCompanies() {
  const supabase = createServerComponentClient();
  
  try {
    const companies = await getDailyIntelligence(supabase, { limit: 10 });
    
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
              
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant="secondary" 
                  className={getSentimentColor(company.sentiment as any)}
                >
                  {company.sentiment}
                </Badge>
                <span className={`text-xs ${getConfidenceColor(company.confidence)}`}>
                  {Math.round(company.confidence * 100)}% confidence
                </span>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              "{company.context.slice(0, 150)}..."
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{company.newsletter_name}</span>
              <div className="flex items-center gap-2">
                {company.mention_count > 1 && (
                  <Badge variant="outline" className="text-xs">
                    {company.mention_count} mentions
                  </Badge>
                )}
                <span>{formatDateTime(company.received_at)}</span>
              </div>
            </div>
          </div>
        ))}
        
        {companies.length > 5 && (
          <div className="text-center pt-4">
            <Link 
              href="/intelligence" 
              className="text-sm text-primary hover:underline"
            >
              View all {companies.length} companies →
            </Link>
          </div>
        )}
      </div>
    );
    
  } catch (error) {
    console.error('Failed to load recent companies:', error);
    
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Unable to load companies</p>
        <p className="text-sm text-muted-foreground mt-1">
          Please check your database connection
        </p>
      </div>
    );
  }
}