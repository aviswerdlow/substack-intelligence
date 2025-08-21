#!/usr/bin/env node

async function testExtraction() {
  console.log('🏢 Testing Company Extraction from Newsletter Content\n');
  
  // Sample content that mentions some companies
  const testContent = `
    In today's newsletter:
    
    YouTube and TikTok are battling for music video dominance. Universal Music Group 
    recently signed a new deal with YouTube, while Sony Music is exploring partnerships 
    with TikTok for exclusive content. Meanwhile, Warner Music has been investing heavily 
    in AI-powered music creation tools.
    
    In other news, Spotify announced their latest podcast acquisition, and Apple Music 
    continues to expand their spatial audio offerings. Amazon Music is also making moves 
    with their new HD streaming tier.
    
    The streaming wars continue as Netflix faces competition from Disney+, HBO Max, 
    and newcomer Paramount+. Each platform is investing billions in original content.
  `;
  
  try {
    console.log('📧 Sending test newsletter content to extraction API...\n');
    
    const response = await fetch('http://localhost:3000/api/test/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: testContent,
        newsletterName: 'Test Newsletter - Mike Shields'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Extraction successful!\n');
      console.log('📊 Results:');
      console.log(`  Companies found: ${data.data.companies.length}`);
      console.log(`  Processing time: ${data.data.metadata.processingTime}ms`);
      console.log(`  Token count: ${data.data.metadata.tokenCount}`);
      console.log(`  Model: ${data.data.metadata.modelVersion}\n`);
      
      if (data.data.companies.length > 0) {
        console.log('🏢 Extracted Companies:');
        data.data.companies.forEach((company, index) => {
          console.log(`\n${index + 1}. ${company.name}`);
          console.log(`   Description: ${company.description || 'N/A'}`);
          console.log(`   Context: ${company.context.substring(0, 100)}...`);
          console.log(`   Sentiment: ${company.sentiment}`);
          console.log(`   Confidence: ${company.confidence}`);
        });
      }
    } else {
      console.log('❌ Extraction failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testExtraction();