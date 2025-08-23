#!/usr/bin/env node

/**
 * Test different Supabase URL formats
 * Tests DNS resolution for various Supabase URL patterns
 */

const https = require('https');
const dns = require('dns').promises;
const { getLogger } = require('./libs/test-utils/logger');

const logger = getLogger();

async function testUrl(url) {
  logger.debug(`Testing URL: ${url}`);
  try {
    const hostname = new URL(url).hostname;
    const addresses = await dns.resolve4(hostname);
    logger.success(`DNS resolved ${hostname}`, { ip: addresses[0] });
    return true;
  } catch (error) {
    logger.failure(`DNS resolution failed for ${url}`, { error: error.message });
    return false;
  }
}

async function main() {
  logger.group('Testing Supabase URL formats');
  
  const projectId = 'yjsrugmmgzbmyrodufin';
  
  const urls = [
    `https://${projectId}.supabase.co`,
    `https://${projectId}.supabase.com`,
    `https://${projectId}.supabase.in`,
    `https://supabase.com/dashboard/project/${projectId}`,
  ];
  
  const results = {
    passed: [],
    failed: []
  };
  
  for (const url of urls) {
    const success = await testUrl(url);
    if (success) {
      results.passed.push(url);
    } else {
      results.failed.push({ name: url, error: 'DNS resolution failed' });
    }
  }
  
  logger.summary(results);
  
  logger.info('Note: The correct URL should be visible in your Supabase dashboard');
  logger.info('Go to: Settings > API > Project URL');
}

main().catch(error => {
  logger.error('Test failed', error);
  process.exit(1);
});