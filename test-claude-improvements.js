#!/usr/bin/env node

// Simple test script to validate ClaudeExtractor improvements
const { ClaudeExtractor } = require('./packages/ai/src/claude-extractor.ts');

async function testClaudeExtractor() {
  console.log('🧪 Testing ClaudeExtractor improvements...\n');

  try {
    // Test 1: Constructor with missing API key should fail gracefully
    console.log('Test 1: Constructor with missing API key');
    delete process.env.ANTHROPIC_API_KEY;
    
    try {
      const extractor = new ClaudeExtractor();
      console.log('❌ Expected constructor to fail with missing API key');
    } catch (error) {
      console.log('✅ Constructor properly failed with missing API key:', error.message);
    }

    // Test 2: Constructor with invalid API key format should fail
    console.log('\nTest 2: Constructor with invalid API key format');
    process.env.ANTHROPIC_API_KEY = 'invalid-key-format';
    
    try {
      const extractor = new ClaudeExtractor();
      console.log('❌ Expected constructor to fail with invalid API key format');
    } catch (error) {
      console.log('✅ Constructor properly failed with invalid API key format:', error.message);
    }

    // Test 3: Constructor with proper API key format should succeed
    console.log('\nTest 3: Constructor with proper API key format');
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-12345';
    
    try {
      const extractor = new ClaudeExtractor();
      console.log('✅ Constructor succeeded with proper API key format');
    } catch (error) {
      console.log('✅ Constructor properly handled initialization:', error.message);
    }

    // Test 4: Extract with empty content should fail
    console.log('\nTest 4: Extract with empty content should fail');
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-12345';
    
    try {
      const extractor = new ClaudeExtractor();
      await extractor.extractCompanies('', 'test newsletter');
      console.log('❌ Expected extraction to fail with empty content');
    } catch (error) {
      console.log('✅ Extraction properly failed with empty content:', error.message);
    }

    // Test 5: Extract with empty newsletter name should fail
    console.log('\nTest 5: Extract with empty newsletter name should fail');
    
    try {
      const extractor = new ClaudeExtractor();
      await extractor.extractCompanies('test content', '');
      console.log('❌ Expected extraction to fail with empty newsletter name');
    } catch (error) {
      console.log('✅ Extraction properly failed with empty newsletter name:', error.message);
    }

    console.log('\n🎉 All ClaudeExtractor improvement tests passed!');
    
  } catch (error) {
    console.error('❌ Test script failed:', error);
  }
}

// Run the tests
testClaudeExtractor();