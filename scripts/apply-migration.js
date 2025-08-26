const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_user_settings.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration to create user settings tables...');
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    }).single();

    if (error) {
      // Try direct execution as fallback
      console.log('RPC failed, trying direct execution...');
      
      // Split the SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s + ';');

      for (const statement of statements) {
        if (statement.includes('CREATE TABLE') || 
            statement.includes('CREATE INDEX') || 
            statement.includes('CREATE TRIGGER') ||
            statement.includes('CREATE POLICY') ||
            statement.includes('CREATE OR REPLACE FUNCTION') ||
            statement.includes('ALTER TABLE')) {
          
          console.log('Executing:', statement.substring(0, 50) + '...');
          
          // We'll need to use the Supabase SQL editor for this
          // For now, let's output the SQL for manual execution
        }
      }
      
      console.log('\nMigration SQL has been generated. Please execute it manually in your Supabase SQL editor:');
      console.log('1. Go to https://supabase.com/dashboard/project/' + process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID + '/sql/new');
      console.log('2. Copy and paste the contents of supabase/migrations/001_user_settings.sql');
      console.log('3. Click "Run" to execute the migration');
      
      return;
    }

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
    console.log('\nPlease execute the migration manually in your Supabase SQL editor:');
    console.log('1. Go to https://supabase.com/dashboard/project/' + process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID + '/sql/new');
    console.log('2. Copy and paste the contents of supabase/migrations/001_user_settings.sql');
    console.log('3. Click "Run" to execute the migration');
  }
}

applyMigration();