/**
 * ESLint configuration specifically for API routes
 * This configuration prevents the use of problematic packages in serverless environments
 */

module.exports = {
  env: {
    node: true,
    es2022: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Ban problematic imports in API routes
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'jsdom',
            message: 'jsdom is not compatible with serverless environments. Use cheerio or other lightweight HTML parsers instead.'
          },
          {
            name: 'puppeteer',
            message: 'puppeteer is not compatible with serverless environments. Use playwright or other serverless-compatible automation tools.'
          },
          {
            name: 'selenium-webdriver',
            message: 'selenium-webdriver is not compatible with serverless environments. Use playwright or other serverless-compatible automation tools.'
          },
          {
            name: 'canvas',
            message: 'canvas requires native dependencies not available in serverless environments. Use a different image processing library or move to a separate service.'
          },
          {
            name: 'sharp',
            message: 'sharp may have compatibility issues in some serverless environments. Consider using @vercel/og or other serverless-optimized image libraries.'
          },
          {
            name: 'node-canvas',
            message: 'node-canvas requires native dependencies not available in serverless environments.'
          },
          {
            name: 'playwright',
            message: 'Full playwright may not work in serverless environments. Use @playwright/test for testing only, or playwright-core with custom browser management.'
          }
        ],
        patterns: [
          {
            group: ['**/jsdom/**'],
            message: 'jsdom and its submodules are not compatible with serverless environments.'
          },
          {
            group: ['**/puppeteer/**'],
            message: 'puppeteer and its submodules are not compatible with serverless environments.'
          },
          {
            group: ['**/selenium-webdriver/**'],
            message: 'selenium-webdriver and its submodules are not compatible with serverless environments.'
          }
        ]
      }
    ],

    // Require specific runtime configuration for heavy operations
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ExportNamedDeclaration[declaration.type="VariableDeclaration"] > VariableDeclaration > VariableDeclarator[id.name="runtime"][init.value="edge"]',
        message: 'Edge runtime may not support all Node.js APIs. Use "nodejs" runtime for complex operations involving HTML parsing, file system access, or external libraries.'
      }
    ],

    // Warn about dynamic imports that might cause issues
    'no-restricted-globals': [
      'error',
      {
        name: 'window',
        message: 'window is not available in serverless API routes. Use Node.js APIs instead.'
      },
      {
        name: 'document',
        message: 'document is not available in serverless API routes. Use server-side HTML parsing libraries like cheerio.'
      },
      {
        name: 'navigator',
        message: 'navigator is not available in serverless API routes.'
      }
    ]
  },

  overrides: [
    {
      // More specific rules for route.ts files
      files: ['**/api/**/route.ts', '**/api/**/route.js'],
      rules: {
        // Require explicit runtime configuration
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        
        // Custom rule to encourage proper error handling
        'prefer-const': 'error',
        'no-var': 'error',
        
        // Encourage proper async/await usage
        'require-await': 'error',
        'no-return-await': 'error'
      }
    },
    {
      // Allow jsdom in test files
      files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
      rules: {
        'no-restricted-imports': 'off'
      }
    }
  ]
};