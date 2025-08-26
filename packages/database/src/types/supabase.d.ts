export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export interface Database {
    public: {
        Tables: {
            emails: {
                Row: {
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
                };
                Insert: {
                    id?: string;
                    message_id: string;
                    subject: string;
                    sender: string;
                    newsletter_name: string;
                    received_at: string;
                    processed_at?: string;
                    raw_html?: string | null;
                    clean_text?: string | null;
                    processing_status?: string;
                    error_message?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    message_id?: string;
                    subject?: string;
                    sender?: string;
                    newsletter_name?: string;
                    received_at?: string;
                    processed_at?: string;
                    raw_html?: string | null;
                    clean_text?: string | null;
                    processing_status?: string;
                    error_message?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            companies: {
                Row: {
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
                Insert: {
                    id?: string;
                    name: string;
                    normalized_name: string;
                    description?: string | null;
                    website?: string | null;
                    funding_status?: string | null;
                    industry?: string[];
                    embedding?: number[] | null;
                    first_seen_at?: string;
                    last_updated_at?: string;
                    enrichment_status?: string;
                    mention_count?: number;
                    newsletter_diversity?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    normalized_name?: string;
                    description?: string | null;
                    website?: string | null;
                    funding_status?: string | null;
                    industry?: string[];
                    embedding?: number[] | null;
                    first_seen_at?: string;
                    last_updated_at?: string;
                    enrichment_status?: string;
                    mention_count?: number;
                    newsletter_diversity?: number;
                    updated_at?: string;
                };
                Relationships: [];
            };
            company_mentions: {
                Row: {
                    id: string;
                    company_id: string;
                    email_id: string;
                    context: string;
                    sentiment: string;
                    confidence: number;
                    extracted_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    company_id: string;
                    email_id: string;
                    context: string;
                    sentiment: string;
                    confidence: number;
                    extracted_at?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    company_id?: string;
                    email_id?: string;
                    context?: string;
                    sentiment?: string;
                    confidence?: number;
                    extracted_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "company_mentions_company_id_fkey";
                        columns: ["company_id"];
                        referencedRelation: "companies";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "company_mentions_email_id_fkey";
                        columns: ["email_id"];
                        referencedRelation: "emails";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_todos: {
                Row: {
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
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title: string;
                    description?: string | null;
                    completed?: boolean;
                    priority?: "low" | "medium" | "high" | "urgent";
                    due_date?: string | null;
                    category?: string | null;
                    tags?: string[];
                    position?: number;
                    completed_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string;
                    description?: string | null;
                    completed?: boolean;
                    priority?: "low" | "medium" | "high" | "urgent";
                    due_date?: string | null;
                    category?: string | null;
                    tags?: string[];
                    position?: number;
                    completed_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            daily_intelligence: {
                Row: {
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
                };
                Relationships: [];
            };
        };
        Functions: {
            match_companies: {
                Args: {
                    query_company_id: string;
                    match_threshold?: number;
                    match_count?: number;
                };
                Returns: {
                    id: string;
                    name: string;
                    description: string | null;
                    similarity: number;
                }[];
            };
            get_user_todo_stats: {
                Args: {
                    p_user_id: string;
                };
                Returns: {
                    total_todos: number;
                    completed_todos: number;
                    active_todos: number;
                    overdue_todos: number;
                    due_today: number;
                    due_this_week: number;
                    completion_rate: number;
                };
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
}
//# sourceMappingURL=supabase.d.ts.map