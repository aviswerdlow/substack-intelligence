import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/monitoring/(.*)',
  '/api/analytics/(.*)',
  '/api/test-metrics',
  '/api/test/(.*)',
  '/api/emails/(.*)',
  '/api/admin/(.*)',
  '/api/setup/(.*)',
  '/api/auth/gmail',
  '/api/auth/gmail/(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
};