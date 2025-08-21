'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Building2, Calendar, RefreshCw, Sparkles } from 'lucide-react';

interface DailyIntelligence {
  company_id: string;
  company_name: string;
  company_description: string | null;
  total_mentions: number;
  latest_mention_date: string;
  latest_context: string;
  latest_newsletter: string;
  latest_sentiment: string;
  latest_confidence: number;
}

export default function TestIntelligencePage() {
  const [intelligence, setIntelligence] = useState<DailyIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligence = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/test/intelligence?_t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success) {
        setIntelligence(data.data.intelligence);
      } else {
        setError(data.error || 'Failed to fetch intelligence');
      }
    } catch (err) {
      setError('Failed to fetch intelligence');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, []);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Daily Intelligence
          </h1>
          <p className="text-muted-foreground">
            Latest insights from your Substack newsletters
          </p>
        </div>
        <Button onClick={fetchIntelligence} disabled={loading}>
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

      {/* Main Intelligence Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Company Intelligence ({intelligence.length})
          </CardTitle>
          <CardDescription>
            Companies mentioned in your recent newsletters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : intelligence.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No intelligence data available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Run the pipeline to extract insights from your newsletters
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {intelligence.map((item) => (
                <div
                  key={item.company_id}
                  className="border rounded-lg p-5 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-4">
                    {/* Company Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-lg">{item.company_name}</h3>
                          <Badge variant="secondary">
                            {item.total_mentions} mention{item.total_mentions !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {item.company_description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.company_description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Latest Mention */}
                    <div className="bg-muted/30 p-3 rounded-md space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Latest mention: </span>
                        <span className="text-muted-foreground">
                          "{item.latest_context?.slice(0, 200)}..."
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            From: <span className="font-medium">{item.latest_newsletter}</span>
                          </span>
                          <span className={`font-medium ${getSentimentColor(item.latest_sentiment)}`}>
                            {item.latest_sentiment}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(item.latest_confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.latest_mention_date).toLocaleDateString()}
                        </div>
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