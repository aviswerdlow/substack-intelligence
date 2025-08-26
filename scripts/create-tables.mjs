import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTables() {
  console.log('Creating database tables...');
  
  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('emails')
      .select('id')
      .limit(1);
    
    if (testError && !testError.message.includes('no rows')) {
      console.error('Database connection test failed:', testError);
      console.log('\nPlease manually create the tables using the Supabase SQL editor.');
      console.log('Go to: https://supabase.com/dashboard/project/yjsrugmmpzbmyrodufin/sql/new');
      console.log('Copy and paste the SQL from: supabase/migrations/001_user_settings.sql');
      return;
    }
    
    console.log('Database connection successful!');
    
    // Check if user_settings table exists
    const { data: existingSettings, error: checkError } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1);
    
    if (!checkError || checkError.code !== '42P01') {
      console.log('Tables might already exist or there was an error:', checkError?.message);
      console.log('Please check your Supabase dashboard.');
      return;
    }
    
    console.log('\n⚠️  Tables do not exist yet.');
    console.log('\nTo create the required tables:');
    console.log('1. Go to your Supabase SQL editor:');
    console.log('   https://supabase.com/dashboard/project/yjsrugmmpzbmyrodufin/sql/new');
    console.log('\n2. Copy the entire SQL from this file:');
    console.log('   supabase/migrations/001_user_settings.sql');
    console.log('\n3. Paste it into the SQL editor and click "Run"');
    console.log('\n4. After running the SQL, refresh your settings page');
    
  } catch (error) {
    console.error('Error:', error);
    console.log('\nPlease create the tables manually in Supabase.');
  }
}

createTables();