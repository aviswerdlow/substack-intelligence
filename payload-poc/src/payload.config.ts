import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vectorize } from 'payloadcms-vectorize'
import path from 'path'

// Collections
import { Users } from './collections/Users'
import { Companies } from './collections/Companies'
import { Emails } from './collections/Emails'
import { Mentions } from './collections/Mentions'

export default buildConfig({
  serverURL: process.env.SERVER_URL || 'http://localhost:3000',

  // Collections (equivalent to Supabase tables)
  collections: [
    Users,
    Companies,
    Emails,
    Mentions
  ],

  // Database adapter (PostgreSQL)
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI
    },
    // Enable pgvector support
    prodMigrations: async ({ payload }) => {
      await payload.db.drizzle.execute('CREATE EXTENSION IF NOT EXISTS vector')
    }
  }),

  // Rich text editor
  editor: lexicalEditor({}),

  // Email adapter (Resend)
  email: resendAdapter({
    apiKey: process.env.RESEND_API_KEY!,
    defaultFromAddress: 'reports@substackintel.com',
    defaultFromName: 'Substack Intelligence'
  }),

  // Admin UI configuration
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '- Substack Intelligence POC',
      favicon: '/favicon.ico'
    }
  },

  // Plugins
  plugins: [
    // Vector embeddings plugin
    vectorize({
      collections: {
        companies: {
          fields: ['name', 'description'],
          // Custom embedder using OpenAI
          embedder: async (text: string) => {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
              },
              body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: text,
                dimensions: 1536
              })
            })
            const data = await response.json()
            return data.data[0].embedding
          },
          dimensions: 1536,
          // Background processing using Payload jobs
          backgroundProcessing: true
        }
      }
    })
  ],

  // TypeScript configuration
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts')
  },

  // CORS
  cors: [
    process.env.SERVER_URL || 'http://localhost:3000'
  ],

  // Rate limiting
  rateLimit: {
    trustProxy: true,
    window: 15 * 60 * 1000, // 15 minutes
    max: 100
  },

  // GraphQL
  graphQL: {
    disable: false,
    maxComplexity: 1000
  }
})
