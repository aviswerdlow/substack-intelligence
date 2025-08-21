#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function testClaude() {
  console.log('🤖 Testing Claude AI Integration\n');
  
  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(`API Key: ${apiKey ? '✅ Found' : '❌ Missing'}`);
  
  if (!apiKey) {
    console.log('Please set ANTHROPIC_API_KEY in .env.local');
    return;
  }
  
  try {
    // Import Anthropic SDK
    const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
    console.log('SDK imported successfully');
    
    // Initialize client
    const client = new Anthropic({
      apiKey: apiKey
    });
    console.log('Client initialized');
    
    // Test API call
    console.log('\n📝 Sending test request to Claude...\n');
    
    const response = await client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      temperature: 0.2,
      system: 'You are a helpful assistant that extracts company names from text.',
      messages: [{
        role: 'user',
        content: 'Extract company names from this text: Apple announced new products. Google is working on AI. Microsoft released Windows updates.'
      }]
    });
    
    console.log('✅ Claude API Response:');
    console.log(response.content[0].text);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

testClaude();