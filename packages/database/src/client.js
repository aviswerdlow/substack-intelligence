"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientComponentClient = createClientComponentClient;
exports.createServerComponentClient = createServerComponentClient;
exports.createRouteHandlerClient = createRouteHandlerClient;
exports.createServiceRoleClient = createServiceRoleClient;
exports.createServiceRoleClientSafe = createServiceRoleClientSafe;
const supabase_js_1 = require("@supabase/supabase-js");
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
// Validate environment variables at runtime, not module load
function validateSupabaseEnv() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
}
// Client-side Supabase client
function createClientComponentClient() {
    validateSupabaseEnv();
    return (0, ssr_1.createBrowserClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
// Server-side Supabase client for Server Components
function createServerComponentClient() {
    validateSupabaseEnv();
    const cookieStore = (0, headers_1.cookies)();
    return (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            get(name) {
                return cookieStore.get(name)?.value;
            },
        },
    });
}
// Server-side Supabase client for Route Handlers
function createRouteHandlerClient(request, response) {
    validateSupabaseEnv();
    return (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            get(name) {
                return request.headers.get('cookie')?.split(';')
                    .find(c => c.trim().startsWith(`${name}=`))
                    ?.split('=')[1];
            },
            set(name, value, options) {
                response.headers.set('Set-Cookie', `${name}=${value}; ${Object.entries(options).map(([k, v]) => `${k}=${v}`).join('; ')}`);
            },
            remove(name, options) {
                response.headers.set('Set-Cookie', `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${Object.entries(options).map(([k, v]) => `${k}=${v}`).join('; ')}`);
            },
        },
    });
}
// Service role client for server-side operations
function createServiceRoleClient() {
    // Validate base Supabase env vars first
    validateSupabaseEnv();
    if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing env.SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
    }
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    return (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        },
        db: {
            schema: 'public'
        }
    });
}
// Safe service role client that returns null if env vars are missing
function createServiceRoleClientSafe() {
    try {
        return createServiceRoleClient();
    }
    catch (error) {
        // Return null if environment is not configured
        // This allows health checks to report degraded state instead of crashing
        return null;
    }
}
//# sourceMappingURL=client.js.map