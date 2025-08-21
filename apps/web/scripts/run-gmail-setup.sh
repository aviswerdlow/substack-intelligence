#!/bin/bash

echo "🔐 Gmail OAuth Setup for aviswerdlow@gmail.com"
echo "================================================"
echo ""
echo "This script will help you authenticate with your Gmail account"
echo "and generate a refresh token for automated email processing."
echo ""
echo "Prerequisites:"
echo "1. You need a Google Cloud Project with Gmail API enabled"
echo "2. You need OAuth 2.0 credentials (Client ID and Secret)"
echo ""
echo "If you don't have these yet:"
echo "1. Go to https://console.cloud.google.com/"
echo "2. Create a new project or select existing"
echo "3. Enable Gmail API"
echo "4. Create OAuth 2.0 credentials"
echo "5. Add http://localhost:8080/oauth/callback to redirect URIs"
echo ""
read -p "Do you have your Client ID and Client Secret ready? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Please get your credentials first from Google Cloud Console"
    exit 1
fi

echo ""
read -p "Enter your Google Client ID: " CLIENT_ID
read -p "Enter your Google Client Secret: " CLIENT_SECRET

echo ""
echo "Starting OAuth flow..."
echo "A browser window will open for you to authenticate with aviswerdlow@gmail.com"
echo ""

node scripts/gmail-oauth-setup.js "$CLIENT_ID" "$CLIENT_SECRET"