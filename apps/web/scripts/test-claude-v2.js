#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function testClaude() {
  console.log('🤖 Testing Claude AI Integration (v0.9.1)\n');
  
  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(`API Key: ${apiKey ? '✅ Found' : '❌ Missing'}`);
  
  if (!apiKey) {
    console.log('Please set ANTHROPIC_API_KEY in .env.local');
    return;
  }
  
  try {
    // Import Anthropic SDK
    const { Anthropic } = require('@anthropic-ai/sdk');
    console.log('SDK imported successfully');
    
    // Initialize client
    const client = new Anthropic({
      apiKey: apiKey
    });
    console.log('Client initialized');
    
    // Check what methods are available
    console.log('\nAvailable client methods:', Object.keys(client));
    
    // Test API call using the correct method for v0.9.1
    console.log('\n📝 Sending test request to Claude...\n');
    
    // In v0.9.1, the method might be different
    const response = await client.completions.create({
      model: 'claude-3-opus-20240229',
      prompt: '\n\nHuman: Extract company names from this text: Apple announced new products. Google is working on AI. Microsoft released Windows updates.\n\nAssistant:',
      max_tokens_to_sample: 1000,
      temperature: 0.2
    });
    
    console.log('✅ Claude API Response:');
    console.log(response);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Try another approach
    console.log('\n🔄 Trying alternative API approach...\n');
    
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.Anthropic({
        apiKey: apiKey
      });
      
      // Check available methods
      console.log('Client properties:', Object.keys(client));
      
      if (client.messages) {
        const response = await client.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: 'List companies: Apple announced products. Google works on AI.'
          }]
        });
        console.log('Success:', response);
      } else if (client.complete) {
        const response = await client.complete({
          prompt: 'Extract companies: Apple, Google, Microsoft',
          model: 'claude-3-opus-20240229',
          max_tokens_to_sample: 100
        });
        console.log('Success:', response);
      } else {
        console.log('No recognized API methods found');
      }
    } catch (err) {
      console.error('Alternative approach failed:', err.message);
    }
  }
}

testClaude();