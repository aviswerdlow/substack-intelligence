// Quick Pipeline Restart
// Simple script to unlock and restart the pipeline

(async () => {
  console.log('🔄 Quick Pipeline Restart\n');

  // 1. Unlock
  console.log('Unlocking pipeline...');
  await fetch('/api/pipeline/unlock', { method: 'POST' });

  // 2. Wait
  await new Promise(r => setTimeout(r, 1000));

  // 3. Start fresh
  console.log('Starting fresh pipeline...');
  const response = await fetch('/api/pipeline/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forceRefresh: true, daysBack: 7 })
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ Pipeline started successfully!');
    console.log('Refresh the page to see progress.');
  } else {
    console.log('❌ Error:', result.error);
    console.log('Try refreshing the page and clicking sync manually.');
  }
})();