import { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',

  // Enable authentication on this collection
  auth: {
    tokenExpiration: 7200, // 2 hours
    verify: true,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000, // 10 minutes
    useAPIKey: true,
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  },

  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'createdAt']
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: false
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
        { label: 'Analyst', value: 'analyst' }
      ],
      access: {
        // Only admins can change roles
        update: ({ req }) => req.user?.role === 'admin'
      }
    },
    {
      name: 'timezone',
      type: 'text',
      defaultValue: 'America/New_York'
    },
    {
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'gmailConnected',
          type: 'checkbox',
          defaultValue: false
        },
        {
          name: 'accountSettings',
          type: 'json',
          admin: {
            description: 'Account-level settings (name, email, timezone)'
          }
        },
        {
          name: 'newsletterSettings',
          type: 'json',
          admin: {
            description: 'Newsletter preferences and filters'
          }
        },
        {
          name: 'aiSettings',
          type: 'json',
          admin: {
            description: 'AI model preferences (Anthropic, OpenAI)'
          }
        },
        {
          name: 'reportSettings',
          type: 'json',
          admin: {
            description: 'Report generation and delivery settings'
          }
        },
        {
          name: 'notificationSettings',
          type: 'json',
          admin: {
            description: 'Notification thresholds and channels'
          }
        }
      ]
    }
  ],

  // Access control
  access: {
    // Users can only read their own data
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        id: {
          equals: user.id
        }
      }
    },
    // Users can only update their own data
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        id: {
          equals: user.id
        }
      }
    },
    // Only admins can delete users
    delete: ({ req: { user } }) => user?.role === 'admin'
  }
}
