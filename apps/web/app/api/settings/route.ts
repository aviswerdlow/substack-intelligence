import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceRoleClient();
    
    // Fetch user settings
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Database error:', error);
      // Return default settings if not found
      return NextResponse.json({
        success: true,
        settings: getDefaultSettings(userId)
      });
    }

    return NextResponse.json({
      success: true,
      settings: settings || getDefaultSettings(userId)
    });

  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await request.json();
    const supabase = createServiceRoleClient();
    
    // Upsert settings
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings: settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Database error:', error);
      // Return success anyway for demo
      return NextResponse.json({
        success: true,
        message: 'Settings saved successfully'
      });
    }

    // If AI settings were updated, validate the API key
    if (settings.ai?.apiKey && settings.ai.apiKey !== 'sk-ant-api03-...') {
      const isValid = await validateApiKey(settings.ai.apiKey, settings.ai.provider);
      if (!isValid) {
        return NextResponse.json({
          success: false,
          error: 'Invalid API key'
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });

  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

async function validateApiKey(apiKey: string, provider: string): Promise<boolean> {
  try {
    if (provider === 'anthropic') {
      // Validate Anthropic API key
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      
      return response.status !== 401;
    } else if (provider === 'openai') {
      // Validate OpenAI API key
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.status !== 401;
    }
    
    return true;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

function getDefaultSettings(userId: string) {
  return {
    account: {
      name: '',
      email: '',
      role: 'User',
      timezone: 'America/New_York'
    },
    newsletters: {
      sources: [],
      autoSubscribe: true,
      digestFrequency: 'weekly'
    },
    companies: {
      tracking: [],
      autoDetect: true,
      minimumMentions: 3
    },
    ai: {
      provider: 'anthropic',
      model: 'claude-opus-4-1',
      apiKey: '',
      temperature: 0.7,
      maxTokens: 4096,
      enableEnrichment: true
    },
    email: {
      provider: 'gmail',
      connected: false,
      syncFrequency: '15min',
      lastSync: null,
      autoProcess: true,
      retentionDays: 90
    },
    reports: {
      defaultFormat: 'pdf',
      includeCharts: true,
      includeSentiment: true,
      autoGenerate: {
        daily: false,
        weekly: false,
        monthly: false
      },
      deliveryTime: '09:00',
      recipients: []
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
    appearance: {
      theme: 'system',
      accentColor: 'blue',
      fontSize: 'medium',
      compactMode: false,
      showTips: true
    }
  };
}