'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Company {
  id: string;
  name: string;
  description: string | null;
  mention_count: number;
  created_at: string;
}

export default function TestCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/test/companies?_t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success) {
        setCompanies(data.data.companies);
      } else {
        setError(data.error || 'Failed to fetch companies');
      }
    } catch (err) {
      setError('Failed to fetch companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Companies View</h1>
          <p className="text-muted-foreground">
            Direct view of all companies in the database
          </p>
        </div>
        <Button onClick={fetchCompanies} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies ({companies.length})
          </CardTitle>
          <CardDescription>
            All companies extracted from your Substack newsletters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No companies found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Run the email ingestion and extraction pipeline to see companies here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
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
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {company.mention_count} mention{company.mention_count !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(company.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}