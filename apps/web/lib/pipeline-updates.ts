import { createServiceRoleClient } from '@substack-intelligence/database';

// Fallback in-memory store for local development
// In production, we use Supabase to share data across Lambda functions
const inMemoryUpdates = new Map<string, any[]>();
const isProduction = process.env.NODE_ENV === 'production';

// Helper function to push updates (called from sync route)
export async function pushPipelineUpdate(userId: string, update: any) {
  console.log('[PIPELINE-UPDATES:DEBUG] pushPipelineUpdate called', {
    userId,
    updateType: update.type,
    status: update.status,
    progress: update.progress,
    message: update.message?.substring(0, 100),
    usingDatabase: isProduction
  });

  const updateData = {
    ...update,
    timestamp: new Date().toISOString()
  };

  if (isProduction) {
    // Production: Use Supabase to share across Lambda functions
    try {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from('pipeline_updates')
        .insert({
          user_id: userId,
          update_data: updateData,
          consumed: false
        });

      if (error) {
        console.error('[PIPELINE-UPDATES:ERROR] Failed to store update in Supabase:', error);
        // Fallback to in-memory on error
        const queue = inMemoryUpdates.get(userId) || [];
        queue.push(updateData);
        inMemoryUpdates.set(userId, queue);
        console.log('[PIPELINE-UPDATES:DEBUG] Fell back to in-memory storage');
      } else {
        console.log('[PIPELINE-UPDATES:DEBUG] Update stored in Supabase successfully');
      }
    } catch (error) {
      console.error('[PIPELINE-UPDATES:ERROR] Exception storing update:', error);
      // Fallback to in-memory
      const queue = inMemoryUpdates.get(userId) || [];
      queue.push(updateData);
      inMemoryUpdates.set(userId, queue);
    }
  } else {
    // Development: Use in-memory Map
    const queue = inMemoryUpdates.get(userId) || [];
    console.log('[PIPELINE-UPDATES:DEBUG] Current queue size before push:', queue.length);
    queue.push(updateData);
    inMemoryUpdates.set(userId, queue);
    console.log('[PIPELINE-UPDATES:DEBUG] Update stored in queue. New queue size:', queue.length);
    console.log('[PIPELINE-UPDATES:DEBUG] Total users in store:', inMemoryUpdates.size);
  }
}

// Helper function to get updates for a user (called from SSE stream)
export async function getPipelineUpdates(userId: string): Promise<any[]> {
  if (isProduction) {
    // Production: Fetch from Supabase
    try {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from('pipeline_updates')
        .select('id, update_data')
        .eq('user_id', userId)
        .eq('consumed', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[PIPELINE-UPDATES:ERROR] Failed to fetch updates from Supabase:', error);
        return [];
      }

      console.log('[PIPELINE-UPDATES:DEBUG] Fetched', data?.length || 0, 'updates from Supabase for user:', userId);
      return data?.map(row => ({ ...(row.update_data as any), _dbId: row.id })) || [];
    } catch (error) {
      console.error('[PIPELINE-UPDATES:ERROR] Exception fetching updates:', error);
      return [];
    }
  } else {
    // Development: Return from in-memory Map and then clear them (consume on read)
    const updates = inMemoryUpdates.get(userId) || [];
    console.log('[PIPELINE-UPDATES:DEBUG] Fetched', updates.length, 'updates from memory for user:', userId);

    // In dev mode, immediately clear updates after fetching to simulate consumption
    // This prevents stale updates from being re-sent when EventSource reconnects
    if (updates.length > 0) {
      inMemoryUpdates.delete(userId);
      console.log('[PIPELINE-UPDATES:DEBUG] Cleared consumed updates from memory');
    }

    return updates;
  }
}

// Helper function to mark updates as consumed (called from SSE stream)
export async function markUpdatesConsumed(updateIds: string[]): Promise<void> {
  if (isProduction && updateIds.length > 0) {
    // Production: Mark as consumed in Supabase
    try {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from('pipeline_updates')
        .update({ consumed: true })
        .in('id', updateIds);

      if (error) {
        console.error('[PIPELINE-UPDATES:ERROR] Failed to mark updates as consumed:', error);
      } else {
        console.log('[PIPELINE-UPDATES:DEBUG] Marked', updateIds.length, 'updates as consumed');
      }
    } catch (error) {
      console.error('[PIPELINE-UPDATES:ERROR] Exception marking updates consumed:', error);
    }
  }
}

// Helper function to clear all updates for a user
export async function clearPipelineUpdates(userId: string): Promise<void> {
  console.log('[PIPELINE-UPDATES:DEBUG] Clearing all updates for user:', userId);

  if (isProduction) {
    // Production: Delete from Supabase
    try {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from('pipeline_updates')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('[PIPELINE-UPDATES:ERROR] Failed to clear updates from Supabase:', error);
      } else {
        console.log('[PIPELINE-UPDATES:DEBUG] Cleared updates from Supabase');
      }
    } catch (error) {
      console.error('[PIPELINE-UPDATES:ERROR] Exception clearing updates:', error);
    }
  } else {
    // Development: Clear from memory
    inMemoryUpdates.delete(userId);
    console.log('[PIPELINE-UPDATES:DEBUG] Cleared updates from memory');
  }
}

// For backwards compatibility
export const pipelineUpdates = inMemoryUpdates;