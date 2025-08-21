#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: 'apps/web/.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase URL or Service Key in environment variables');
  process.exit(1);
}

// Migration files in order
const migrations = [
  '001_initial_schema.sql',
  '002_reports_schema.sql',
  '003_add_enrichment_columns.sql',
  '004_semantic_search_function.sql'
];

async function runMigration(filename) {
  const filePath = path.join(__dirname, 'infrastructure/supabase/migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n📦 Running migration: ${filename}`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Try alternative approach - direct SQL execution
      const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ sql })
      });
      
      if (!altResponse.ok) {
        throw new Error(`Failed to run migration: ${altResponse.statusText}`);
      }
    }
    
    console.log(`✅ Successfully ran ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Error running ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database migrations...');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
      console.log('⚠️  Continuing with next migration...');
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  if (failCount > 0) {
    console.log('\n💡 Some migrations failed. You may need to run them manually in the Supabase SQL Editor.');
    console.log('   Visit: https://supabase.com/dashboard/project/yjsrugmmgzbmyrodufin/sql/new');
  } else {
    console.log('\n🎉 All migrations completed successfully!');
  }
}

main().catch(console.error);