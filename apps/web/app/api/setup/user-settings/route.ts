import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // First, check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1);
    
    if (!checkError || !checkError.message?.includes('relation')) {
      return NextResponse.json({
        success: true,
        message: 'User settings table already exists',
        exists: true
      });
    }
    
    // Table doesn't exist, create it
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.user_settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        gmail_connected BOOLEAN DEFAULT false,
        gmail_refresh_token TEXT,
        gmail_access_token TEXT,
        gmail_token_expiry TIMESTAMPTZ,
        gmail_email TEXT,
        notifications_enabled BOOLEAN DEFAULT true,
        digest_frequency TEXT DEFAULT 'daily',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `;
    
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id 
      ON public.user_settings(user_id);
    `;
    
    const createUpdateTriggerSQL = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
      
      CREATE TRIGGER update_user_settings_updated_at 
      BEFORE UPDATE ON public.user_settings 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `;
    
    // Enable RLS (Row Level Security)
    const enableRLSSQL = `
      ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
      
      -- Policy for users to read their own settings
      CREATE POLICY "Users can view own settings" 
      ON public.user_settings FOR SELECT 
      USING (auth.uid()::text = user_id);
      
      -- Policy for users to insert their own settings
      CREATE POLICY "Users can insert own settings" 
      ON public.user_settings FOR INSERT 
      WITH CHECK (auth.uid()::text = user_id);
      
      -- Policy for users to update their own settings
      CREATE POLICY "Users can update own settings" 
      ON public.user_settings FOR UPDATE 
      USING (auth.uid()::text = user_id);
      
      -- Policy for service role to manage all settings
      CREATE POLICY "Service role can manage all settings" 
      ON public.user_settings FOR ALL 
      USING (auth.role() = 'service_role');
    `;
    
    // Note: We can't directly execute SQL from here without proper Supabase admin access
    // Instead, return the SQL for manual execution or use Supabase migrations
    
    return NextResponse.json({
      success: false,
      message: 'Table needs to be created through Supabase dashboard',
      instructions: 'Please run the following SQL in your Supabase SQL editor:',
      sql: {
        createTable: createTableSQL,
        createIndex: createIndexSQL,
        createTrigger: createUpdateTriggerSQL,
        enableRLS: enableRLSSQL
      }
    });
    
  } catch (error: any) {
    console.error('Setup failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint to check if table exists
export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1);
    
    if (error && error.message?.includes('relation')) {
      return NextResponse.json({
        exists: false,
        message: 'User settings table does not exist'
      });
    }
    
    return NextResponse.json({
      exists: true,
      message: 'User settings table exists'
    });
    
  } catch (error: any) {
    console.error('Check failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}