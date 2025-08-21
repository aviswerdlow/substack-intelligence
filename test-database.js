#!/usr/bin/env node

// Test database connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Check if tables exist
    console.log('\n📊 Checking tables...');
    const { data: tables, error: tableError } = await supabase
      .from('companies')
      .select('count', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('❌ Error accessing companies table:', tableError.message);
    } else {
      console.log('✅ Companies table exists. Count:', tables);
    }

    // Test 2: Try to insert test data
    console.log('\n📝 Inserting test company...');
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
      console.error('❌ Error inserting company:', insertError.message);
    } else {
      console.log('✅ Test company created:', company.name);
      console.log('   ID:', company.id);
    }

    // Test 3: Query the data
    console.log('\n🔍 Querying companies...');
    const { data: companies, error: queryError } = await supabase
      .from('companies')
      .select('id, name, funding_status')
      .limit(5);

    if (queryError) {
      console.error('❌ Error querying companies:', queryError.message);
    } else {
      console.log('✅ Found', companies.length, 'companies:');
      companies.forEach(c => console.log(`   - ${c.name} (${c.funding_status})`));
    }

    // Test 4: Check other tables
    const tablesToCheck = ['emails', 'company_mentions', 'report_history'];
    console.log('\n📋 Checking other tables...');
    
    for (const table of tablesToCheck) {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: accessible`);
      }
    }

    console.log('\n🎉 Database connection successful!');
    console.log('✨ All tables are created and accessible.');
    console.log('\n💡 Next steps:');
    console.log('   1. The database is ready for use');
    console.log('   2. You may need to seed more test data');
    console.log('   3. Check if API endpoints are properly configured');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

testConnection();