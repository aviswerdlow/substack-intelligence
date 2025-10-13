import { clerkClient } from '@clerk/nextjs/server';

// Clerk's server SDK currently exports `clerkClient` as an async factory function.
// When the runtime has already instantiated the singleton, the function is callable
// but also behaves like the resolved client. We need the latter behavior, so we cast
// it to the resolved client type without invoking it.
type ServerClerkClient = Awaited<ReturnType<typeof clerkClient>>;

export const serverClerkClient = clerkClient as unknown as ServerClerkClient;
