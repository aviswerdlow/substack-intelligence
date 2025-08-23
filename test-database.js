#!/usr/bin/env node

/**
 * Database Connection Test Suite
 * Tests Supabase database connectivity and table operations
 */

const { createClient } = require('@supabase/supabase-js');
const { getLogger, logStep } = require('./libs/test-utils/logger');
require('dotenv').config({ path: 'apps/web/.env.local' });

const logger = getLogger();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

logger.group('Database Connection Test');
logger.debug('Configuration', {
  url: supabaseUrl,
  hasKey: !!supabaseKey
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  const results = {
    passed: [],
    failed: [],
    skipped: []
  };
  
  try {
    // Test 1: Check if tables exist
    logStep('Checking companies table');
    const { data: tables, error: tableError } = await supabase
      .from('companies')
      .select('count', { count: 'exact', head: true });
    
    if (tableError) {
      logger.failure('Error accessing companies table', { error: tableError.message });
      results.failed.push({
        name: 'Companies table access',
        error: tableError.message
      });
    } else {
      logger.success('Companies table exists', { count: tables });
      results.passed.push('Companies table access');
    }

    // Test 2: Try to insert test data
    logStep('Inserting test company');
    const { data: company, error: insertError } = await supabase
      .from('companies')
      .insert({
        name: 'Test Company',
        normalized_name: 'test-company-' + Date.now(),
        description: 'A test company for database verification',
        website: 'https://test.com',
        funding_status: 'seed'
      })
      .select()
      .single();

    if (insertError) {
      logger.failure('Error inserting company', { error: insertError.message });
      results.failed.push({
        name: 'Company insertion',
        error: insertError.message
      });
    } else {
      logger.success('Test company created', { 
        name: company.name,
        id: company.id 
      });
      results.passed.push('Company insertion');
    }

    // Test 3: Query the data
    logStep('Querying companies');
    const { data: companies, error: queryError } = await supabase
      .from('companies')
      .select('id, name, funding_status')
      .limit(5);

    if (queryError) {
      logger.failure('Error querying companies', { error: queryError.message });
      results.failed.push({
        name: 'Company query',
        error: queryError.message
      });
    } else {
      logger.success(`Found ${companies.length} companies`);
      if (logger.isVerbose) {
        companies.forEach(c => {
          logger.verbose(`Company: ${c.name}`, { funding_status: c.funding_status });
        });
      }
      results.passed.push('Company query');
    }

    // Test 4: Check other tables
    const tablesToCheck = ['emails', 'company_mentions', 'report_history'];
    logStep('Checking other tables');
    
    for (const table of tablesToCheck) {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        logger.failure(`Table ${table} not accessible`, { error: error.message });
        results.failed.push({
          name: `Table ${table} access`,
          error: error.message
        });
      } else {
        logger.success(`Table ${table} accessible`);
        results.passed.push(`Table ${table} access`);
      }
    }

    if (results.failed.length === 0) {
      logger.success('Database connection successful!');
      logger.info('All tables are created and accessible');
      
      if (logger.isVerbose) {
        logger.verbose('Next steps:', {
          step1: 'The database is ready for use',
          step2: 'You may need to seed more test data',
          step3: 'Check if API endpoints are properly configured'
        });
      }
    }

  } catch (err) {
    logger.error('Unexpected error', { error: err.message });
    results.failed.push({
      name: 'Database connection',
      error: err.message
    });
  }
  
  logger.summary(results);
  process.exit(results.failed.length > 0 ? 1 : 0);
}

testConnection();