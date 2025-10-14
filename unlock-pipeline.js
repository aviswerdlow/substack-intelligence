// Run this script in your browser console while on the Substack Intelligence dashboard page
// This will unlock the stuck pipeline

async function unlockPipeline() {
  try {
    console.log('Attempting to unlock pipeline...');

    const response = await fetch('/api/pipeline/unlock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Pipeline unlocked successfully!', data);
      console.log('You can now run the pipeline again.');
    } else {
      console.error('❌ Failed to unlock pipeline:', data);
    }

    return data;
  } catch (error) {
    console.error('❌ Error unlocking pipeline:', error);
  }
}

// Execute the unlock
unlockPipeline();