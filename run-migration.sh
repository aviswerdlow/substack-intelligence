#!/bin/bash

# Run the missing pipeline_updates migration in Supabase

echo "This script will help you run the missing pipeline_updates migration in Supabase"
echo ""
echo "Option 1: Using Supabase Dashboard (Recommended)"
echo "========================================="
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the contents of: supabase/migrations/008_pipeline_updates.sql"
echo "4. Click 'Run' to execute the migration"
echo ""
echo "Option 2: Using Supabase CLI"
echo "============================="
echo "If you have Supabase CLI installed and linked to your project:"
echo ""
echo "npx supabase db push"
echo ""
echo "Option 3: Direct SQL"
echo "===================="
echo "Copy this SQL and run it in your Supabase SQL editor:"
echo ""
cat supabase/migrations/008_pipeline_updates.sql