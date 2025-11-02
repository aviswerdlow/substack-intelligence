import { CollectionConfig } from 'payload'

export const Emails: CollectionConfig = {
  slug: 'emails',

  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'sender', 'newsletterName', 'receivedAt', 'processingStatus', 'user'],
    listSearchableFields: ['subject', 'sender', 'newsletterName', 'cleanText']
  },

  fields: [
    {
      name: 'messageId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Unique email message ID from Gmail'
      }
    },
    {
      name: 'subject',
      type: 'text',
      required: true
    },
    {
      name: 'sender',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Email address of sender'
      }
    },
    {
      name: 'newsletterName',
      type: 'text',
      index: true,
      admin: {
        description: 'Name of the newsletter/publication'
      }
    },
    {
      name: 'receivedAt',
      type: 'date',
      required: true,
      index: true
    },
    {
      name: 'rawHtml',
      type: 'textarea',
      admin: {
        description: 'Original HTML content from email'
      }
    },
    {
      name: 'cleanText',
      type: 'textarea',
      admin: {
        description: 'Cleaned text content (HTML stripped)'
      }
    },
    {
      name: 'processingStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' }
      ],
      defaultValue: 'pending',
      index: true,
      admin: {
        description: 'Status of email processing pipeline'
      }
    },
    {
      name: 'extractionStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' }
      ],
      defaultValue: 'pending',
      index: true,
      admin: {
        description: 'Status of company extraction'
      }
    },
    {
      name: 'companiesExtracted',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of companies extracted from this email',
        readOnly: true
      }
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'User who owns this email'
      }
    },
    // Error tracking
    {
      name: 'errorMessage',
      type: 'textarea',
      admin: {
        description: 'Error message if processing failed',
        condition: (data) => data.processingStatus === 'failed'
      }
    }
  ],

  // Hooks
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        // Update companiesExtracted count when mentions are added
        if (doc.extractionStatus === 'completed') {
          const mentions = await req.payload.find({
            collection: 'mentions',
            where: {
              email: {
                equals: doc.id
              }
            }
          })

          await req.payload.update({
            collection: 'emails',
            id: doc.id,
            data: {
              companiesExtracted: mentions.totalDocs
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
  }
}
