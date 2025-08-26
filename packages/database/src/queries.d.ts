import type { Database } from './types/supabase';
import type { SupabaseClient } from './client';
type Tables = Database['public']['Tables'];
type Email = Tables['emails']['Row'];
type Company = Tables['companies']['Row'];
type CompanyMention = Tables['company_mentions']['Row'];
type UserTodo = Tables['user_todos']['Row'];
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
export declare const getAnalytics: (supabase: SupabaseClient, days?: any) => Promise<{
    totalEmails: number;
    totalCompanies: number;
    totalMentions: number;
    topCompanies: {
        name: string;
        mention_count: number;
    }[];
}>;
export interface TodoFilters {
    completed?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: string;
    tags?: string[];
    search?: string;
    dueDateStart?: string;
    dueDateEnd?: string;
    overdue?: boolean;
}
export declare const getTodos: (supabase: SupabaseClient, userId: string, options?: {
    limit?: number;
    offset?: number;
    orderBy?: "created_at" | "updated_at" | "due_date" | "priority" | "position";
    orderDirection?: "asc" | "desc";
    filters?: TodoFilters;
}) => Promise<{
    todos: {
        id: string;
        user_id: string;
        title: string;
        description: string | null;
        completed: boolean;
        priority: "low" | "medium" | "high" | "urgent";
        due_date: string | null;
        category: string | null;
        tags: string[];
        position: number;
        completed_at: string | null;
        created_at: string;
        updated_at: string;
    }[];
    total: number;
    hasMore: boolean;
}>;
export declare const getTodoById: (supabase: SupabaseClient, userId: string, todoId: string) => Promise<{
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    completed: boolean;
    priority: "low" | "medium" | "high" | "urgent";
    due_date: string | null;
    category: string | null;
    tags: string[];
    position: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}>;
export declare const createTodo: (supabase: SupabaseClient, userId: string, todo: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    due_date?: string;
    category?: string;
    tags?: string[];
}) => Promise<{
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    completed: boolean;
    priority: "low" | "medium" | "high" | "urgent";
    due_date: string | null;
    category: string | null;
    tags: string[];
    position: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}>;
export declare const updateTodo: (supabase: SupabaseClient, userId: string, todoId: string, updates: {
    title?: string;
    description?: string;
    completed?: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    due_date?: string;
    category?: string;
    tags?: string[];
    position?: number;
}) => Promise<{
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    completed: boolean;
    priority: "low" | "medium" | "high" | "urgent";
    due_date: string | null;
    category: string | null;
    tags: string[];
    position: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}>;
export declare const deleteTodo: (supabase: SupabaseClient, userId: string, todoId: string) => Promise<void>;
export declare const toggleTodoCompletion: (supabase: SupabaseClient, userId: string, todoId: string) => Promise<{
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    completed: boolean;
    priority: "low" | "medium" | "high" | "urgent";
    due_date: string | null;
    category: string | null;
    tags: string[];
    position: number;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}>;
export declare const getTodoStats: (supabase: SupabaseClient, userId: string) => Promise<never>;
export declare const reorderTodos: (supabase: SupabaseClient, userId: string, todoUpdates: {
    id: string;
    position: number;
}[]) => Promise<boolean>;
export type CompanyWithMentions = Awaited<ReturnType<typeof getCompanyById>>;
export type CompaniesResponse = Awaited<ReturnType<typeof getCompanies>>;
export type EmailWithMentions = Awaited<ReturnType<typeof getEmailById>>;
export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
export type TodosResponse = Awaited<ReturnType<typeof getTodos>>;
export type TodoStats = Awaited<ReturnType<typeof getTodoStats>>;
export type Todo = UserTodo;
export type { Email, Company, CompanyMention, UserTodo, DailyIntelligence };
//# sourceMappingURL=queries.d.ts.map