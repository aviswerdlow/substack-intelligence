import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // Create user_settings table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create user_settings table if it doesn't exist
        CREATE TABLE IF NOT EXISTS public.user_settings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          gmail_connected BOOLEAN DEFAULT false,
          gmail_refresh_token TEXT,
          gmail_email TEXT,
          notifications_enabled BOOLEAN DEFAULT true,
          digest_frequency TEXT DEFAULT 'daily',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );

        -- Create index if it doesn't exist
        CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
      `
    });

    if (error) {
      // Try a simpler approach
      const { error: createError } = await supabase
        .from('user_settings')
        .select('id')
        .limit(1);
      
      // If table doesn't exist, this will error but that's ok
      if (createError?.message?.includes('relation') || createError?.message?.includes('does not exist')) {
        // Table doesn't exist, we need to create it through Supabase dashboard
        return NextResponse.json({
          success: false,
          message: 'Table needs to be created in Supabase dashboard',
          sql: `
CREATE TABLE public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  gmail_connected BOOLEAN DEFAULT false,
  gmail_refresh_token TEXT,
  gmail_email TEXT,
  notifications_enabled BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);
          `
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'User settings table already exists'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'User settings table created successfully'
    });

  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}