"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientComponentClient = createClientComponentClient;
exports.createServerComponentClient = createServerComponentClient;
exports.createRouteHandlerClient = createRouteHandlerClient;
exports.createServiceRoleClient = createServiceRoleClient;
const supabase_js_1 = require("@supabase/supabase-js");
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
// Client-side Supabase client
function createClientComponentClient() {
    return (0, ssr_1.createBrowserClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
// Server-side Supabase client for Server Components
function createServerComponentClient() {
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
    if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing env.SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
    }
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('Creating Supabase client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service key first 20 chars:', serviceKey?.substring(0, 20));
    return (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        },
        db: {
            schema: 'public'
        },
        global: {
            fetch: (...args) => {
                console.log('Supabase fetch called with URL:', args[0]);
                return fetch(...args);
            }
        }
    });
}
//# sourceMappingURL=client.js.map