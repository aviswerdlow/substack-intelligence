// Global store for pipeline updates (in production, use Redis)
// Store array of updates per user to queue multiple updates
export const pipelineUpdates = new Map<string, any[]>();

// Helper function to push updates (called from sync route)
export function pushPipelineUpdate(userId: string, update: any) {
  // Get existing queue or create new one
  const updateQueue = pipelineUpdates.get(userId) || [];
  
  // Add new update to queue
  updateQueue.push({
    ...update,
    timestamp: new Date().toISOString()
  });
  
  // Store updated queue
  pipelineUpdates.set(userId, updateQueue);
}