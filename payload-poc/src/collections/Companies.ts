import { CollectionConfig } from 'payload'

export const Companies: CollectionConfig = {
  slug: 'companies',

  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'normalizedName', 'mentionCount', 'fundingStatus', 'user'],
    listSearchableFields: ['name', 'normalizedName', 'description', 'website']
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true
    },
    {
      name: 'normalizedName',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Lowercase, trimmed version for deduplication'
      },
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => {
            // Auto-generate from name if not provided
            return value || siblingData.name?.toLowerCase().trim()
          }
        ]
      }
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'AI-generated description of the company'
      }
    },
    {
      name: 'website',
      type: 'text',
      admin: {
        description: 'Company website URL'
      }
    },
    {
      name: 'fundingStatus',
      type: 'select',
      options: [
        { label: 'Unknown', value: 'unknown' },
        { label: 'Bootstrapped', value: 'bootstrapped' },
        { label: 'Seed', value: 'seed' },
        { label: 'Series A', value: 'series_a' },
        { label: 'Series B', value: 'series_b' },
        { label: 'Series C+', value: 'series_c_plus' },
        { label: 'Public', value: 'public' },
        { label: 'Acquired', value: 'acquired' }
      ],
      defaultValue: 'unknown'
    },
    {
      name: 'industry',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text'
        }
      ],
      admin: {
        description: 'Industry tags/sectors'
      }
    },
    {
      name: 'mentionCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Total number of mentions across all emails',
        readOnly: true
      }
    },
    {
      name: 'newsletterDiversity',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of unique newsletters mentioning this company',
        readOnly: true
      }
    },
    {
      name: 'enrichmentStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' }
      ],
      defaultValue: 'pending',
      admin: {
        description: 'Status of AI enrichment process'
      }
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'User who owns this company record'
      }
    },
    // Vector embedding (handled by payloadcms-vectorize plugin)
    // The plugin will add an 'embedding' field automatically

    // Metadata
    {
      name: 'lastUpdatedAt',
      type: 'date',
      admin: {
        readOnly: true
      },
      hooks: {
        beforeChange: [
          () => new Date()
        ]
      }
    }
  ],

  // Hooks for analytics
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        // Update mention count and diversity when mentions change
        if (operation === 'update') {
          const mentions = await req.payload.find({
            collection: 'mentions',
            where: {
              company: {
                equals: doc.id
              }
            }
          })

          // Count unique newsletters
          const uniqueNewsletters = new Set(
            mentions.docs.map(m => m.email?.newsletterName).filter(Boolean)
          )

          await req.payload.update({
            collection: 'companies',
            id: doc.id,
            data: {
              mentionCount: mentions.totalDocs,
              newsletterDiversity: uniqueNewsletters.size
            }
          })
        }
      }
    ]
  },

  // Access control (user isolation)
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        user: {
          equals: user.id
        }
      }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        user: {
          equals: user.id
        }
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        user: {
          equals: user.id
        }
      }
    }
  },

  // Indexes (in addition to field-level indexes)
  // PostgreSQL indexes will be created automatically by Payload
  // For custom indexes, use db migrations
}
