// Test script to verify the pipeline fixes
// Run this in the browser console after unlocking the pipeline

async function testPipeline() {
  console.log('🧪 Starting pipeline test suite...\n');

  // Test 1: Check if pipeline is locked
  console.log('Test 1: Checking pipeline lock status...');
  try {
    const lockResponse = await fetch('/api/pipeline/unlock', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const lockData = await lockResponse.json();
    console.log('Lock status:', lockData.locked ? '🔒 Locked' : '✅ Unlocked');
    console.log('Cache stats:', lockData.cacheStats);

    if (lockData.locked) {
      console.log('⚠️  Pipeline is locked. Unlocking...');
      const unlockResponse = await fetch('/api/pipeline/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const unlockData = await unlockResponse.json();
      console.log('Unlock result:', unlockData);
    }
  } catch (error) {
    console.error('❌ Lock check failed:', error);
  }

  console.log('\n-------------------\n');

  // Test 2: Check pipeline status
  console.log('Test 2: Checking pipeline status...');
  try {
    const statusResponse = await fetch('/api/pipeline/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const statusData = await statusResponse.json();
    console.log('Pipeline status:', statusData);
  } catch (error) {
    console.error('❌ Status check failed:', error);
  }

  console.log('\n-------------------\n');

  // Test 3: Try to run the pipeline
  console.log('Test 3: Running pipeline (this may take a while)...');
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
      console.log('Results:', syncData.data);
      console.log('Monitoring:', syncData.monitoring);
    } else if (syncResponse.status === 429) {
      console.log('⚠️  Pipeline is already running (concurrent run blocked)');
      console.log('Details:', syncData.details);
    } else {
      console.error(`❌ Pipeline failed with status ${syncResponse.status}:`, syncData);
    }
  } catch (error) {
    console.error('❌ Pipeline sync failed:', error);
  }

  console.log('\n-------------------\n');

  // Test 4: Check final lock status
  console.log('Test 4: Verifying lock was released...');
  try {
    const finalLockResponse = await fetch('/api/pipeline/unlock', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const finalLockData = await finalLockResponse.json();
    console.log('Final lock status:', finalLockData.locked ? '🔒 Still locked (PROBLEM!)' : '✅ Unlocked (Good!)');

    if (finalLockData.locked) {
      console.error('⚠️  WARNING: Lock was not properly released. This indicates a problem with the fix.');
    } else {
      console.log('✅ Lock was properly released!');
    }
  } catch (error) {
    console.error('❌ Final lock check failed:', error);
  }

  console.log('\n🎉 Test suite complete!');
}

// Run the test
testPipeline();