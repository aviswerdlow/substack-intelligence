"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = exports.searchCompanies = exports.getTopNewsletters = exports.getRecentEmails = exports.getEmailById = exports.getDailyIntelligence = exports.getCompanies = exports.getCompanyById = void 0;
const react_1 = require("react");
// Cached queries for React Server Components
exports.getCompanyById = (0, react_1.cache)(async (supabase, id) => {
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
    if (error)
        throw error;
    return data;
});
exports.getCompanies = (0, react_1.cache)(async (supabase, options = {}) => {
    const { limit = 20, offset = 0, search, fundingStatus, orderBy = 'mention_count', orderDirection = 'desc' } = options;
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
    if (error)
        throw error;
    return {
        companies: data,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
    };
});
exports.getDailyIntelligence = (0, react_1.cache)(async (supabase, options = {}) => {
    const { limit = 50, days = 1 } = options;
    const { data, error } = await supabase
        .from('daily_intelligence')
        .select('*')
        .gte('received_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('mention_count', { ascending: false })
        .order('confidence', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data;
});
exports.getEmailById = (0, react_1.cache)(async (supabase, id) => {
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
    if (error)
        throw error;
    return data;
});
exports.getRecentEmails = (0, react_1.cache)(async (supabase, options = {}) => {
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
    if (error)
        throw error;
    return data;
});
exports.getTopNewsletters = (0, react_1.cache)(async (supabase) => {
    // Supabase JS client doesn't support GROUP BY directly, so we'll fetch and group in JS
    const { data: emails, error } = await supabase
        .from('emails')
        .select('newsletter_name')
        .gte('received_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100);
    if (error)
        throw error;
    // Manual grouping in JavaScript
    const grouped = emails?.reduce((acc, email) => {
        acc[email.newsletter_name] = (acc[email.newsletter_name] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(grouped || {})
        .map(([newsletter_name, count]) => ({ newsletter_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
});
const searchCompanies = async (supabase, query, limit = 10) => {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('mention_count', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data;
};
exports.searchCompanies = searchCompanies;
// Analytics queries
exports.getAnalytics = (0, react_1.cache)(async (supabase, days = 7) => {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const [{ count: totalEmails }, { count: totalCompanies }, { count: totalMentions }, { data: topCompanies }] = await Promise.all([
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
//# sourceMappingURL=queries.js.map