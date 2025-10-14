// Complete Pipeline Fix Script
// Run this in your browser console to fix the stuck pipeline

async function fixStuckPipeline() {
  console.log('🔧 Starting Pipeline Fix Process...\n');

  // Step 1: Close any existing SSE connections
  console.log('Step 1: Closing existing SSE connections...');
  if (typeof window.eventSource !== 'undefined' && window.eventSource) {
    window.eventSource.close();
    console.log('✅ Closed existing SSE connection');
  }

  // Find and close any EventSource objects
  const allEventSources = performance.getEntriesByType('resource')
    .filter(r => r.name.includes('/api/pipeline/sync/stream'));
  if (allEventSources.length > 0) {
    console.log(`Found ${allEventSources.length} SSE connections in resources`);
  }

  console.log('\n-------------------\n');

  // Step 2: Check and clear pipeline lock
  console.log('Step 2: Checking pipeline lock status...');
  try {
    const lockCheckResponse = await fetch('/api/pipeline/unlock', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const lockStatus = await lockCheckResponse.json();
    console.log('Current lock status:', lockStatus.locked ? '🔒 LOCKED' : '✅ Unlocked');

    if (lockStatus.locked) {
      console.log('Forcefully unlocking pipeline...');
      const unlockResponse = await fetch('/api/pipeline/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const unlockResult = await unlockResponse.json();
      if (unlockResult.success) {
        console.log('✅ Pipeline unlocked successfully!');
      } else {
        console.error('❌ Failed to unlock:', unlockResult);
        return false;
      }
    } else {
      console.log('✅ Pipeline is already unlocked');
    }
  } catch (error) {
    console.error('❌ Lock check/unlock failed:', error);
    return false;
  }

  console.log('\n-------------------\n');

  // Step 3: Wait a moment for things to settle
  console.log('Step 3: Waiting for system to stabilize...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✅ System stabilized');

  console.log('\n-------------------\n');

  // Step 4: Start a fresh pipeline run
  console.log('Step 4: Starting fresh pipeline run...');
  console.log('⏳ This will fetch emails from the last 7 days...');

  try {
    const startTime = Date.now();

    // Create a promise that will resolve when we get pipeline completion
    const pipelinePromise = new Promise((resolve, reject) => {
      // Set up SSE listener BEFORE starting the pipeline
      const eventSource = new EventSource('/api/pipeline/sync/stream');
      let hasReceivedUpdate = false;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          hasReceivedUpdate = true;

          // Log progress updates
          if (data.type === 'progress') {
            console.log(`📊 Progress: ${data.progress}% - ${data.message || 'Processing...'}`);
          } else if (data.type === 'complete') {
            console.log('✅ Pipeline completed!', data);
            eventSource.close();
            resolve(data);
          } else if (data.type === 'error') {
            console.error('❌ Pipeline error:', data);
            eventSource.close();
            reject(new Error(data.message || 'Pipeline error'));
          } else if (data.type === 'heartbeat') {
            // Heartbeats are normal, just ignore them
          } else {
            console.log('📡 Update:', data);
          }
        } catch (e) {
          // Ignore parsing errors for heartbeats
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE Error:', error);
        eventSource.close();
        if (!hasReceivedUpdate) {
          reject(new Error('SSE connection failed'));
        }
      };

      // Now start the actual pipeline
      fetch('/api/pipeline/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceRefresh: true,
          daysBack: 7 // Only fetch last 7 days for testing
        })
      }).then(response => response.json()).then(result => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (result.success) {
          console.log(`✅ Pipeline API returned success in ${duration}s`);
          console.log('Results:', result.data);

          // If the pipeline completes immediately (cached), resolve
          if (!hasReceivedUpdate) {
            setTimeout(() => {
              eventSource.close();
              resolve(result);
            }, 1000);
          }
        } else if (result.error?.includes('already running')) {
          console.log('⚠️  Pipeline already running, waiting for completion...');
          // Keep listening to SSE for updates
        } else {
          console.error(`❌ Pipeline failed:`, result);
          eventSource.close();
          reject(new Error(result.error || 'Pipeline failed'));
        }
      }).catch(error => {
        console.error('❌ Pipeline request failed:', error);
        eventSource.close();
        reject(error);
      });
    });

    // Wait for pipeline to complete (with timeout)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Pipeline timeout after 60 seconds')), 60000);
    });

    const result = await Promise.race([pipelinePromise, timeoutPromise]);
    console.log('🎉 Pipeline completed successfully!', result);
    return true;

  } catch (error) {
    console.error('❌ Pipeline execution failed:', error);

    // Try to unlock if it failed
    console.log('Attempting to unlock after failure...');
    try {
      await fetch('/api/pipeline/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('✅ Unlocked pipeline after failure');
    } catch (e) {
      console.error('Could not unlock:', e);
    }

    return false;
  }
}

// Run the fix
console.log('=================================');
console.log('🚀 PIPELINE FIX SCRIPT v2.0');
console.log('=================================\n');
console.log('This script will:');
console.log('1. Close stuck SSE connections');
console.log('2. Unlock the pipeline');
console.log('3. Start a fresh pipeline run');
console.log('4. Monitor it for completion\n');

fixStuckPipeline().then(success => {
  if (success) {
    console.log('\n=================================');
    console.log('✅ PIPELINE FIX COMPLETE!');
    console.log('=================================');
    console.log('Your pipeline should now be working properly.');
    console.log('Try refreshing the page to see the updated data.');
  } else {
    console.log('\n=================================');
    console.log('⚠️  PIPELINE FIX INCOMPLETE');
    console.log('=================================');
    console.log('Some issues remain. Please check the errors above.');
    console.log('You may need to refresh the page and try again.');
  }
}).catch(error => {
  console.error('\n❌ Fix script failed:', error);
  console.log('Please refresh the page and try again.');
});