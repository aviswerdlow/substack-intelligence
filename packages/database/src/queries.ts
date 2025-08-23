// Conditional cache import - use identity function in test/non-React environments
let cache: <T extends (...args: any[]) => any>(fn: T) => T;
try {
  // Try to import React cache
  const react = require('react');
  cache = react.cache;
  // Fallback if cache doesn't exist (older React versions or test environment)
  if (!cache || typeof cache !== 'function') {
    cache = <T extends (...args: any[]) => any>(fn: T): T => fn;
  }
} catch {
  // Fallback for non-React environments or tests
  cache = <T extends (...args: any[]) => any>(fn: T): T => fn;
}

import type { Database } from './types/supabase';
import type { SupabaseClient } from './client';

type Tables = Database['public']['Tables'];
type Email = Tables['emails']['Row'];
type Company = Tables['companies']['Row'];
type CompanyMention = Tables['company_mentions']['Row'];
type DailyIntelligence = Database['public']['Views']['daily_intelligence']['Row'];

// Cached queries for React Server Components
export const getCompanyById = cache(async (supabase: SupabaseClient, id: string) => {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      mentions:company_mentions(
        *,
        email:emails(
          newsletter_name,
          received_at,
          subject
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
});

export const getCompanies = cache(async (
  supabase: SupabaseClient,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    fundingStatus?: string;
    orderBy?: 'mention_count' | 'created_at' | 'name';
    orderDirection?: 'asc' | 'desc';
  } = {}
) => {
  const {
    limit = 20,
    offset = 0,
    search,
    fundingStatus,
    orderBy = 'mention_count',
    orderDirection = 'desc'
  } = options;

  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order(orderBy, { ascending: orderDirection === 'asc' });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (fundingStatus && fundingStatus !== 'all') {
    query = query.eq('funding_status', fundingStatus);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    companies: data,
    total: count || 0,
    hasMore: (offset + limit) < (count || 0)
  };
});

export const getDailyIntelligence = cache(async (
  supabase: SupabaseClient,
  options: {
    limit?: number;
    days?: number;
  } = {}
) => {
  const { limit = 50, days = 1 } = options;

  const { data, error } = await supabase
    .from('daily_intelligence')
    .select('*')
    .gte('received_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('mention_count', { ascending: false })
    .order('confidence', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
});

export const getEmailById = cache(async (supabase: SupabaseClient, id: string) => {
  const { data, error } = await supabase
    .from('emails')
    .select(`
      *,
      mentions:company_mentions(
        *,
        company:companies(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
});

export const getRecentEmails = cache(async (
  supabase: SupabaseClient,
  options: {
    limit?: number;
    newsletterName?: string;
    status?: string;
  } = {}
) => {
  const { limit = 20, newsletterName, status } = options;

  let query = supabase
    .from('emails')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(limit);

  if (newsletterName) {
    query = query.eq('newsletter_name', newsletterName);
  }

  if (status) {
    query = query.eq('processing_status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
});

export const getTopNewsletters = cache(async (supabase: SupabaseClient) => {
  // Supabase JS client doesn't support GROUP BY directly, so we'll fetch and group in JS
  const { data: emails, error } = await supabase
    .from('emails')
    .select('newsletter_name')
    .gte('received_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(100);

  if (error) throw error;
  
  // Manual grouping in JavaScript
  const grouped = emails?.reduce((acc: any, email: any) => {
    acc[email.newsletter_name] = (acc[email.newsletter_name] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(grouped || {})
    .map(([newsletter_name, count]) => ({ newsletter_name, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);
});

export const searchCompanies = async (
  supabase: SupabaseClient,
  query: string,
  limit = 10
) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('mention_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

// Analytics queries
export const getAnalytics = cache(async (supabase: SupabaseClient, days = 7) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalEmails },
    { count: totalCompanies },
    { count: totalMentions },
    { data: topCompanies }
  ] = await Promise.all([
    supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .gte('received_at', startDate),
    
    supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .gte('first_seen_at', startDate),
    
    supabase
      .from('company_mentions')
      .select('*', { count: 'exact', head: true })
      .gte('extracted_at', startDate),
    
    supabase
      .from('companies')
      .select('name, mention_count')
      .order('mention_count', { ascending: false })
      .limit(5)
  ]);

  return {
    totalEmails: totalEmails || 0,
    totalCompanies: totalCompanies || 0,
    totalMentions: totalMentions || 0,
    topCompanies: topCompanies || []
  };
});

// Types for query responses
export type CompanyWithMentions = Awaited<ReturnType<typeof getCompanyById>>;
export type CompaniesResponse = Awaited<ReturnType<typeof getCompanies>>;
export type EmailWithMentions = Awaited<ReturnType<typeof getEmailById>>;
export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;

// Export row types
export type { Email, Company, CompanyMention, DailyIntelligence };