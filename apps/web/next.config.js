const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@substack-intelligence/database',
    '@substack-intelligence/ingestion',
    '@substack-intelligence/ai',
    '@substack-intelligence/shared'
  ],
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  env: {
    // SECURITY: Force APP_DEBUG_MODE=false in production builds
    APP_DEBUG_MODE: process.env.NODE_ENV === 'production' ? 'false' : process.env.APP_DEBUG_MODE || 'false'
  },
  webpack: (config, { isServer, dev }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
      '@substack-intelligence/database': path.resolve(__dirname, '../../packages/database/src'),
      '@substack-intelligence/ingestion': path.resolve(__dirname, '../../services/ingestion/src'),
      '@substack-intelligence/ingestion/src': path.resolve(__dirname, '../../services/ingestion/src'),
      '@substack-intelligence/ingestion/src/utils/html-parser': path.resolve(
        __dirname,
        '../../services/ingestion/src/utils/html-parser'
      ),
      '@substack-intelligence/ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@substack-intelligence/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@substack-intelligence/email': path.resolve(__dirname, '../../apps/email/src'),
      '@substack-intelligence/lib': path.resolve(__dirname, '../../lib'),
    };

    // Additional security: Strip debug code in production builds
    if (!dev && !isServer) {
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            compress: {
              ...minimizer.options.terserOptions?.compress,
              drop_console: process.env.NODE_ENV === 'production',
              drop_debugger: true,
              pure_funcs: ['console.debug', 'console.trace']
            }
          };
        }
      });
    }
    return config;
  }
}

module.exports = nextConfig
