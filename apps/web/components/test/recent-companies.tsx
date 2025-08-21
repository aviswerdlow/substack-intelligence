import { createServiceRoleClient } from '@substack-intelligence/database';
import { Badge } from '@/components/ui/badge';

export async function TestRecentCompanies() {
  const supabase = createServiceRoleClient();
  
  try {
    // Get companies with their mentions
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        *,
        company_mentions(
          context,
          sentiment,
          confidence,
          emails(
            subject,
            newsletter_name,
            received_at
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (!companies || companies.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No companies found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run the pipeline to extract companies from emails
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {companies.slice(0, 5).map((company) => (
          <div
            key={company.id}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold">{company.name}</h3>
                {company.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {company.description}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary">
                  {company.mention_count} mention{company.mention_count !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            
            {company.company_mentions && company.company_mentions.length > 0 && (
              <>
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  "{company.company_mentions[0].context?.slice(0, 150)}..."
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{company.company_mentions[0].emails?.newsletter_name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round((company.company_mentions[0].confidence || 0) * 100)}% confidence
                    </Badge>
                    <span>
                      {company.company_mentions[0].emails?.received_at 
                        ? new Date(company.company_mentions[0].emails.received_at).toLocaleDateString()
                        : 'Recently'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        
        {companies.length > 5 && (
          <div className="text-center pt-4">
            <a 
              href="/test/companies" 
              className="text-sm text-primary hover:underline"
            >
              View all {companies.length} companies →
            </a>
          </div>
        )}
      </div>
    );
    
  } catch (error) {
    console.error('Failed to load companies:', error);
    
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Unable to load companies</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Please check your database connection'}
        </p>
      </div>
    );
  }
}