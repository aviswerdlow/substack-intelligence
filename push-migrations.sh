#!/bin/bash

# This script will push migrations to your Supabase database
# You'll be prompted for your database password

echo "🚀 Pushing migrations to Supabase..."
echo ""
echo "You'll need your database password from:"
echo "https://supabase.com/dashboard/project/yjsrugmmgzbmyrodufin/settings/database"
echo ""

# Set the database URL (you'll be prompted for password)
export DATABASE_URL="postgresql://postgres.yjsrugmmgzbmyrodufin@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Push the migrations
supabase db push --db-url "$DATABASE_URL"

echo ""
echo "✅ Migrations complete! Check your Supabase dashboard to verify tables were created."