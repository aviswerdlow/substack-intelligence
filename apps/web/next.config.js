/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@substack-intelligence/database', 
    '@substack-intelligence/ingestion',
    '@substack-intelligence/ai',
    '@substack-intelligence/shared'
  ],
}

module.exports = nextConfig
