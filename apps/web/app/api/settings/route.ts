import { NextRequest, NextResponse } from 'next/server';

// MOCK API ROUTE FOR TESTING SETTINGS UI

// Mock default settings data matching the Settings interface
const mockSettings = {
  account: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin',
    timezone: 'America/New_York'
  },
  newsletters: {
    sources: [
      {
        id: '1',
        name: 'TechCrunch',
        email: 'newsletter@techcrunch.com',
        enabled: true,
        frequency: 'daily'
      },
      {
        id: '2',
        name: 'The Verge',
        email: 'newsletter@theverge.com',
        enabled: true,
        frequency: 'weekly'
      }
    ],
    autoSubscribe: true,
    digestFrequency: 'weekly'
  },
  companies: {
    tracking: [
      {
        id: '1',
        name: 'OpenAI',
        domain: 'openai.com',
        keywords: ['ChatGPT', 'GPT-4', 'AI'],
        enabled: true
      },
      {
        id: '2',
        name: 'Anthropic',
        domain: 'anthropic.com',
        keywords: ['Claude', 'Constitutional AI'],
        enabled: true
      }
    ],
    autoDetect: true,
    minimumMentions: 3
  },
  ai: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: '',
    anthropicApiKey: '',
    openaiApiKey: '',
    temperature: 0.7,
    maxTokens: 4096,
    enableEnrichment: true
  },
  email: {
    provider: 'gmail',
    connected: false,
    syncFrequency: '15min',
    lastSync: new Date().toISOString(),
    autoProcess: true,
    retentionDays: 90
  },
  reports: {
    defaultFormat: 'pdf',
    includeCharts: true,
    includeSentiment: true,
    autoGenerate: {
      daily: false,
      weekly: true,
      monthly: false
    },
    deliveryTime: '09:00',
    recipients: ['john@example.com']
  },
  notifications: {
    email: {
      enabled: true,
      criticalOnly: false,
      dailyDigest: true
    },
    inApp: {
      enabled: true,
      soundEnabled: false
    },
    thresholds: {
      negativeSentiment: -0.5,
      mentionVolume: 10,
      competitorMentions: true
    }
  },
  api: {
    keys: [],
    webhooks: []
  },
  privacy: {
    dataRetention: 365,
    shareAnalytics: true,
    allowExport: true
  },
  appearance: {
    theme: 'system' as const,
    accentColor: 'blue',
    fontSize: 'medium' as const,
    compactMode: false,
    showTips: true
  }
};

export async function GET() {
  try {
    // Return mock settings
    return NextResponse.json({
      success: true,
      settings: mockSettings
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // In a real app, this would save to database
    // For testing, just return success
    console.log('Settings update received:', body);
    
    return NextResponse.json({
      success: true,
      settings: body,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}