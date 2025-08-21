#!/usr/bin/env node

// Test different Supabase URL formats
const https = require('https');
const dns = require('dns').promises;

async function testUrl(url) {
  console.log(`\nTesting: ${url}`);
  try {
    const hostname = new URL(url).hostname;
    const addresses = await dns.resolve4(hostname);
    console.log(`✅ DNS resolved to: ${addresses[0]}`);
    return true;
  } catch (error) {
    console.log(`❌ DNS resolution failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing Supabase URL formats...\n');
  
  const projectId = 'yjsrugmmgzbmyrodufin';
  
  const urls = [
    `https://${projectId}.supabase.co`,
    `https://${projectId}.supabase.com`,
    `https://${projectId}.supabase.in`,
    `https://supabase.com/dashboard/project/${projectId}`,
  ];
  
  for (const url of urls) {
    await testUrl(url);
  }
  
  console.log('\n💡 Note: The correct URL should be visible in your Supabase dashboard');
  console.log('   Go to: Settings > API > Project URL');
}

main().catch(console.error);