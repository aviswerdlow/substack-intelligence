/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@substack-intelligence/database', 
    '@substack-intelligence/ingestion',
    '@substack-intelligence/ai',
    '@substack-intelligence/shared'
  ],
  env: {
    // SECURITY: Force APP_DEBUG_MODE=false in production builds
    APP_DEBUG_MODE: process.env.NODE_ENV === 'production' ? 'false' : process.env.APP_DEBUG_MODE || 'false'
  },
  webpack: (config, { isServer, dev }) => {
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
