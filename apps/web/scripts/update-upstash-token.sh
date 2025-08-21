#!/bin/bash

echo "📋 Upstash Redis Token Update Helper"
echo "===================================="
echo ""
echo "Your Upstash Redis URL is already configured:"
echo "✅ URL: https://moved-phoenix-9691.upstash.io"
echo ""
echo "Now you need to add the REST token."
echo ""
echo "To get your token:"
echo "1. Go to your Upstash dashboard"
echo "2. Click the 'REST' tab (as shown in your screenshot)"
echo "3. Find the 'Read-Only Token' section"
echo "4. Click the copy button next to the token (it starts with the hidden ******** text)"
echo ""
read -p "Paste your UPSTASH_REDIS_REST_TOKEN here: " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Update the .env.local file
if grep -q "UPSTASH_REDIS_REST_TOKEN=" .env.local; then
    # On macOS, use -i '' for in-place editing
    sed -i '' "s|UPSTASH_REDIS_REST_TOKEN=.*|UPSTASH_REDIS_REST_TOKEN=$TOKEN|" .env.local
    echo "✅ Updated UPSTASH_REDIS_REST_TOKEN in .env.local"
else
    echo "❌ UPSTASH_REDIS_REST_TOKEN not found in .env.local"
    echo "Adding it now..."
    echo "UPSTASH_REDIS_REST_TOKEN=$TOKEN" >> .env.local
    echo "✅ Added UPSTASH_REDIS_REST_TOKEN to .env.local"
fi

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Test the API: curl http://localhost:3000/api/test/gmail"
echo "3. Run tests: npm run test:puppeteer"