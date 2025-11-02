import { CollectionConfig } from 'payload'

export const Mentions: CollectionConfig = {
  slug: 'mentions',

  admin: {
    useAsTitle: 'id',
    defaultColumns: ['company', 'email', 'sentiment', 'confidence', 'extractedAt'],
    group: 'Analytics'
  },

  fields: [
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      required: true,
      index: true,
      admin: {
        description: 'The company being mentioned'
      }
    },
    {
      name: 'email',
      type: 'relationship',
      relationTo: 'emails',
      required: true,
      index: true,
      admin: {
        description: 'The email containing the mention'
      }
    },
    {
      name: 'context',
      type: 'textarea',
      admin: {
        description: 'Text snippet showing the mention in context'
      }
    },
    {
      name: 'sentiment',
      type: 'select',
      options: [
        { label: 'Positive', value: 'positive' },
        { label: 'Neutral', value: 'neutral' },
        { label: 'Negative', value: 'negative' },
        { label: 'Mixed', value: 'mixed' }
      ],
      defaultValue: 'neutral',
      admin: {
        description: 'Sentiment of the mention'
      }
    },
    {
      name: 'confidence',
      type: 'number',
      min: 0,
      max: 1,
      required: true,
      admin: {
        description: 'Confidence score (0-1) from AI extraction',
        step: 0.01
      }
    },
    {
      name: 'extractedAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true
      },
      hooks: {
        beforeChange: [
          ({ value }) => value || new Date()
        ]
      }
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'User who owns this mention (inherited from email)'
      }
    }
  ],

  // Hooks to update company analytics
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        // Trigger company analytics update
        if (operation === 'create' || operation === 'delete') {
          const company = await req.payload.findByID({
            collection: 'companies',
            id: doc.company
          })

          if (company) {
            // The Companies collection hook will handle the analytics update
            await req.payload.update({
              collection: 'companies',
              id: company.id,
              data: {
                lastUpdatedAt: new Date()
              }
            })
          }
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

  // Prevent duplicate mentions
  indexes: [
    {
      fields: ['company', 'email'],
      unique: true
    }
  ]
}
