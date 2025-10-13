import { clerkClient } from '@clerk/nextjs/server';

// In Clerk v6+, clerkClient() returns a Promise that resolves to the client
// We need to call it as a function to get the client instance
export async function getServerClerkClient() {
  // clerkClient() is callable and returns the client
  return await clerkClient();
}

// For synchronous contexts, we export the factory directly
// Callers should await clerkClient() when they need the actual client
export { clerkClient as serverClerkClient };
