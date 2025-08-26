"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderTodos = exports.getTodoStats = exports.toggleTodoCompletion = exports.deleteTodo = exports.updateTodo = exports.createTodo = exports.getTodoById = exports.getTodos = exports.getAnalytics = exports.searchCompanies = exports.getTopNewsletters = exports.getRecentEmails = exports.getEmailById = exports.getDailyIntelligence = exports.getCompanies = exports.getCompanyById = void 0;
// Conditional cache import - use identity function in test/non-React environments
let cache;
try {
    // Try to import React cache
    const react = require('react');
    cache = react.cache;
    // Fallback if cache doesn't exist (older React versions or test environment)
    if (!cache || typeof cache !== 'function') {
        cache = (fn) => fn;
    }
}
catch {
    // Fallback for non-React environments or tests
    cache = (fn) => fn;
}
// Cached queries for React Server Components
exports.getCompanyById = cache(async (supabase, id) => {
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
exports.getCompanies = cache(async (supabase, options = {}) => {
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
exports.getDailyIntelligence = cache(async (supabase, options = {}) => {
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
exports.getEmailById = cache(async (supabase, id) => {
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
exports.getRecentEmails = cache(async (supabase, options = {}) => {
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
exports.getTopNewsletters = cache(async (supabase) => {
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
exports.getAnalytics = cache(async (supabase, days = 7) => {
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
exports.getTodos = cache(async (supabase, userId, options = {}) => {
    const { limit = 50, offset = 0, orderBy = 'position', orderDirection = 'asc', filters = {} } = options;
    let query = supabase
        .from('user_todos')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .range(offset, offset + limit - 1);
    // Apply filters
    if (filters.completed !== undefined) {
        query = query.eq('completed', filters.completed);
    }
    if (filters.priority) {
        query = query.eq('priority', filters.priority);
    }
    if (filters.category) {
        query = query.eq('category', filters.category);
    }
    if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
    }
    if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters.dueDateStart) {
        query = query.gte('due_date', filters.dueDateStart);
    }
    if (filters.dueDateEnd) {
        query = query.lte('due_date', filters.dueDateEnd);
    }
    if (filters.overdue) {
        query = query.lt('due_date', new Date().toISOString()).eq('completed', false);
    }
    // Apply ordering
    if (orderBy === 'priority') {
        // Custom priority ordering
        query = query.order('priority', {
            ascending: orderDirection === 'asc',
            nullsFirst: false
        });
    }
    else {
        query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    }
    const { data, error, count } = await query;
    if (error)
        throw error;
    return {
        todos: data || [],
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
    };
});
exports.getTodoById = cache(async (supabase, userId, todoId) => {
    const { data, error } = await supabase
        .from('user_todos')
        .select('*')
        .eq('id', todoId)
        .eq('user_id', userId)
        .single();
    if (error)
        throw error;
    return data;
});
const createTodo = async (supabase, userId, todo) => {
    // Get the next position
    const { count } = await supabase
        .from('user_todos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', false);
    const { data, error } = await supabase
        .from('user_todos')
        .insert({
        user_id: userId,
        position: count || 0,
        ...todo
    })
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.createTodo = createTodo;
const updateTodo = async (supabase, userId, todoId, updates) => {
    const { data, error } = await supabase
        .from('user_todos')
        .update(updates)
        .eq('id', todoId)
        .eq('user_id', userId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.updateTodo = updateTodo;
const deleteTodo = async (supabase, userId, todoId) => {
    const { error } = await supabase
        .from('user_todos')
        .delete()
        .eq('id', todoId)
        .eq('user_id', userId);
    if (error)
        throw error;
};
exports.deleteTodo = deleteTodo;
const toggleTodoCompletion = async (supabase, userId, todoId) => {
    // First get the current state
    const { data: currentTodo, error: fetchError } = await supabase
        .from('user_todos')
        .select('completed')
        .eq('id', todoId)
        .eq('user_id', userId)
        .single();
    if (fetchError)
        throw fetchError;
    // Toggle completion
    const { data, error } = await supabase
        .from('user_todos')
        .update({ completed: !currentTodo.completed })
        .eq('id', todoId)
        .eq('user_id', userId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.toggleTodoCompletion = toggleTodoCompletion;
exports.getTodoStats = cache(async (supabase, userId) => {
    const { data, error } = await supabase
        .rpc('get_user_todo_stats', { p_user_id: userId })
        .single();
    if (error)
        throw error;
    return data;
});
const reorderTodos = async (supabase, userId, todoUpdates) => {
    const updates = todoUpdates.map(({ id, position }) => supabase
        .from('user_todos')
        .update({ position })
        .eq('id', id)
        .eq('user_id', userId));
    const results = await Promise.all(updates);
    for (const result of results) {
        if (result.error)
            throw result.error;
    }
    return true;
};
exports.reorderTodos = reorderTodos;
//# sourceMappingURL=queries.js.map