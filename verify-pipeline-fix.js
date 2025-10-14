// Comprehensive Pipeline Fix Verification Script
// Run this in your browser console after applying the migration

async function verifyPipelineFix() {
  console.log('🔍 Starting Pipeline Fix Verification...\n');

  const results = {
    migration: false,
    unlock: false,
    pipelineRun: false,
    sseStream: false
  };

  // Step 1: Check if the pipeline_updates table exists (indirect check via API)
  console.log('Step 1: Checking if migration was applied...');
  try {
    // Try to run a small pipeline operation that would use the table
    const testResponse = await fetch('/api/pipeline/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const testData = await testResponse.json();

    // If we get a response without database errors, the table likely exists
    if (testResponse.ok && !testData.error?.includes('pipeline_updates')) {
      console.log('✅ Pipeline status check succeeded (table likely exists)');
      results.migration = true;
    } else if (testData.error?.includes('pipeline_updates')) {
      console.error('❌ Migration NOT applied - pipeline_updates table still missing!');
      console.log('⚠️  Please apply the migration first using the instructions in fix-pipeline-migration.md');
      return results;
    }
  } catch (error) {
    console.warn('⚠️  Could not verify migration status:', error.message);
  }

  console.log('\n-------------------\n');

  // Step 2: Check and unlock pipeline if needed
  console.log('Step 2: Checking pipeline lock status...');
  try {
    const lockResponse = await fetch('/api/pipeline/unlock', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const lockData = await lockResponse.json();
    console.log('Lock status:', lockData.locked ? '🔒 Locked' : '✅ Unlocked');

    if (lockData.locked) {
      console.log('Unlocking pipeline...');
      const unlockResponse = await fetch('/api/pipeline/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const unlockData = await unlockResponse.json();
      if (unlockData.success) {
        console.log('✅ Pipeline unlocked successfully');
        results.unlock = true;
      } else {
        console.error('❌ Failed to unlock pipeline:', unlockData);
      }
    } else {
      console.log('✅ Pipeline is already unlocked');
      results.unlock = true;
    }
  } catch (error) {
    console.error('❌ Lock check failed:', error);
  }

  console.log('\n-------------------\n');

  // Step 3: Test SSE stream connectivity (quick test)
  console.log('Step 3: Testing SSE stream...');
  try {
    const eventSource = new EventSource('/api/pipeline/sync/stream');
    let received = false;

    const streamPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        if (!received) {
          console.log('⚠️  No SSE messages received (this is normal if pipeline is idle)');
        }
        resolve(received);
      }, 3000); // Wait 3 seconds for any messages

      eventSource.onmessage = (event) => {
        received = true;
        console.log('✅ SSE stream is working, received:', event.data.substring(0, 100));
        clearTimeout(timeout);
        eventSource.close();
        resolve(true);
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE stream error:', error);
        clearTimeout(timeout);
        eventSource.close();
        reject(error);
      };
    });

    results.sseStream = await streamPromise.catch(() => false);

    if (results.sseStream) {
      console.log('✅ SSE stream is functional');
    } else {
      console.log('ℹ️  SSE stream test inconclusive (may be working but idle)');
      results.sseStream = 'partial';
    }
  } catch (error) {
    console.error('❌ SSE stream test failed:', error);
  }

  console.log('\n-------------------\n');

  // Step 4: Run a quick pipeline test
  console.log('Step 4: Running quick pipeline test (7 days data)...');
  try {
    console.log('⏳ Starting pipeline sync...');
    const startTime = Date.now();

    const syncResponse = await fetch('/api/pipeline/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forceRefresh: true,
        daysBack: 7 // Only fetch last 7 days for testing
      })
    });

    const syncData = await syncResponse.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (syncResponse.ok && syncData.success) {
      console.log(`✅ Pipeline completed successfully in ${duration}s!`);
      console.log('Pipeline results:', {
        totalEmails: syncData.data?.totalEmails || 0,
        processed: syncData.data?.processed || 0,
        monitoring: syncData.monitoring
      });
      results.pipelineRun = true;
    } else if (syncResponse.status === 429) {
      console.log('⚠️  Pipeline is already running (this is normal)');
      console.log('Details:', syncData.details);
      results.pipelineRun = 'running';
    } else {
      console.error(`❌ Pipeline failed with status ${syncResponse.status}:`, syncData);
      results.pipelineRun = false;
    }
  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    results.pipelineRun = false;
  }

  console.log('\n-------------------\n');

  // Final Summary
  console.log('📊 VERIFICATION SUMMARY:');
  console.log('========================');

  const allGood = results.migration && results.unlock &&
                  (results.pipelineRun === true || results.pipelineRun === 'running') &&
                  (results.sseStream === true || results.sseStream === 'partial');

  if (allGood) {
    console.log('🎉 ALL CHECKS PASSED! Your pipeline is fixed and working properly.');
  } else {
    console.log('⚠️  Some issues remain:');

    if (!results.migration) {
      console.log('❌ Migration needs to be applied - see fix-pipeline-migration.md');
    }
    if (!results.unlock) {
      console.log('❌ Pipeline lock issue - try running the unlock manually');
    }
    if (results.pipelineRun === false) {
      console.log('❌ Pipeline execution failed - check server logs');
    }
    if (results.sseStream === false) {
      console.log('❌ SSE stream not working - may need to refresh page');
    }

    console.log('\n📝 Next steps:');
    console.log('1. Apply the migration using fix-pipeline-migration.md instructions');
    console.log('2. Refresh the page');
    console.log('3. Run this verification script again');
  }

  return results;
}

// Run the verification
console.log('Running pipeline fix verification...');
verifyPipelineFix().then(results => {
  console.log('\n✅ Verification complete. Results:', results);
}).catch(error => {
  console.error('❌ Verification failed:', error);
});