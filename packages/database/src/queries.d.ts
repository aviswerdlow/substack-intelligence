import type { Database } from './types/supabase';
import type { SupabaseClient } from './client';
type Tables = Database['public']['Tables'];
type Email = Tables['emails']['Row'];
type Company = Tables['companies']['Row'];
type CompanyMention = Tables['company_mentions']['Row'];
type DailyIntelligence = Database['public']['Views']['daily_intelligence']['Row'];
export declare const getCompanyById: (supabase: SupabaseClient, id: string) => Promise<{
    id: string;
    name: string;
    normalized_name: string;
    description: string | null;
    website: string | null;
    funding_status: string | null;
    industry: string[];
    embedding: number[] | null;
    first_seen_at: string;
    last_updated_at: string;
    enrichment_status: string;
    mention_count: number;
    newsletter_diversity: number;
    created_at: string;
    updated_at: string;
    mentions: {
        id: string;
        company_id: string;
        email_id: string;
        context: string;
        sentiment: string;
        confidence: number;
        extracted_at: string;
        created_at: string;
        email: {
            newsletter_name: string;
            received_at: string;
            subject: string;
        };
    }[];
}>;
export declare const getCompanies: (supabase: SupabaseClient, options?: {
    limit?: number;
    offset?: number;
    search?: string;
    fundingStatus?: string;
    orderBy?: "mention_count" | "created_at" | "name";
    orderDirection?: "asc" | "desc";
}) => Promise<{
    companies: {
        id: string;
        name: string;
        normalized_name: string;
        description: string | null;
        website: string | null;
        funding_status: string | null;
        industry: string[];
        embedding: number[] | null;
        first_seen_at: string;
        last_updated_at: string;
        enrichment_status: string;
        mention_count: number;
        newsletter_diversity: number;
        created_at: string;
        updated_at: string;
    }[];
    total: number;
    hasMore: boolean;
}>;
export declare const getDailyIntelligence: (supabase: SupabaseClient, options?: {
    limit?: number;
    days?: number;
}) => Promise<{
    company_id: string;
    name: string;
    description: string | null;
    website: string | null;
    funding_status: string | null;
    mention_id: string;
    context: string;
    sentiment: string;
    confidence: number;
    newsletter_name: string;
    received_at: string;
    mention_count: number;
    newsletter_diversity: number;
}[]>;
export declare const getEmailById: (supabase: SupabaseClient, id: string) => Promise<{
    id: string;
    message_id: string;
    subject: string;
    sender: string;
    newsletter_name: string;
    received_at: string;
    processed_at: string;
    raw_html: string | null;
    clean_text: string | null;
    processing_status: string;
    error_message: string | null;
    search_vector: unknown | null;
    created_at: string;
    updated_at: string;
    mentions: {
        id: string;
        company_id: string;
        email_id: string;
        context: string;
        sentiment: string;
        confidence: number;
        extracted_at: string;
        created_at: string;
        company: {
            id: string;
            name: string;
            normalized_name: string;
            description: string | null;
            website: string | null;
            funding_status: string | null;
            industry: string[];
            embedding: number[] | null;
            first_seen_at: string;
            last_updated_at: string;
            enrichment_status: string;
            mention_count: number;
            newsletter_diversity: number;
            created_at: string;
            updated_at: string;
        };
    }[];
}>;
export declare const getRecentEmails: (supabase: SupabaseClient, options?: {
    limit?: number;
    newsletterName?: string;
    status?: string;
}) => Promise<{
    id: string;
    message_id: string;
    subject: string;
    sender: string;
    newsletter_name: string;
    received_at: string;
    processed_at: string;
    raw_html: string | null;
    clean_text: string | null;
    processing_status: string;
    error_message: string | null;
    search_vector: unknown | null;
    created_at: string;
    updated_at: string;
}[]>;
export declare const getTopNewsletters: (supabase: SupabaseClient) => Promise<{
    newsletter_name: string;
    count: unknown;
}[]>;
export declare const searchCompanies: (supabase: SupabaseClient, query: string, limit?: number) => Promise<{
    id: string;
    name: string;
    normalized_name: string;
    description: string | null;
    website: string | null;
    funding_status: string | null;
    industry: string[];
    embedding: number[] | null;
    first_seen_at: string;
    last_updated_at: string;
    enrichment_status: string;
    mention_count: number;
    newsletter_diversity: number;
    created_at: string;
    updated_at: string;
}[]>;
export declare const getAnalytics: (supabase: SupabaseClient, days?: number) => Promise<{
    totalEmails: number;
    totalCompanies: number;
    totalMentions: number;
    topCompanies: {
        name: string;
        mention_count: number;
    }[];
}>;
export type CompanyWithMentions = Awaited<ReturnType<typeof getCompanyById>>;
export type CompaniesResponse = Awaited<ReturnType<typeof getCompanies>>;
export type EmailWithMentions = Awaited<ReturnType<typeof getEmailById>>;
export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
export type { Email, Company, CompanyMention, DailyIntelligence };
//# sourceMappingURL=queries.d.ts.map