import { NextRequest, NextResponse } from 'next/server';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSecuritySession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { provider, apiKey } = await request.json();
    
    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Provider and API key are required' },
        { status: 400 }
      );
    }
    
    let result;
    
    if (provider === 'anthropic') {
      result = await validateAnthropicKey(apiKey);
    } else if (provider === 'openai') {
      result = await validateOpenAIKey(apiKey);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }
    
    if (!result.isValid) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid API key' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      ...result,
    });
    
  } catch (error) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate API key' },
      { status: 500 }
    );
  }
}

async function validateAnthropicKey(apiKey: string) {
  try {
    // Make a minimal API call to validate the key
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });
    
    if (response.status === 401) {
      return {
        isValid: false,
        error: 'Invalid API key',
      };
    }
    
    if (response.status === 400) {
      // This is actually good - it means the key is valid but the request is incomplete
      // We're intentionally sending a minimal request
    }
    
    // Get rate limit information from headers
    const rateLimit = {
      limit: parseInt(response.headers.get('anthropic-ratelimit-requests-limit') || '1000'),
      remaining: parseInt(response.headers.get('anthropic-ratelimit-requests-remaining') || '999'),
      reset: new Date(response.headers.get('anthropic-ratelimit-requests-reset') || new Date()),
    };
    
    // Available models for Anthropic
    const models = [
      'claude-sonnet-4-5',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
    
    return {
      isValid: true,
      models,
      rateLimit,
      usage: {
        credits: 10000, // Placeholder
        spent: 0, // Would need to track this separately
      },
    };
  } catch (error: any) {
    console.error('Anthropic validation error:', error);
    return {
      isValid: false,
      error: error.message || 'Failed to validate API key',
    };
  }
}

async function validateOpenAIKey(apiKey: string) {
  try {
    // Check models endpoint to validate the key
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (response.status === 401) {
      return {
        isValid: false,
        error: 'Invalid API key',
      };
    }
    
    if (!response.ok) {
      return {
        isValid: false,
        error: `API returned status ${response.status}`,
      };
    }
    
    const data = await response.json();
    
    // Filter for commonly used models
    const availableModels = data.data
      .filter((model: any) => 
        model.id.includes('gpt-4') || 
        model.id.includes('gpt-3.5')
      )
      .map((model: any) => model.id);
    
    // Get rate limit information from headers
    const rateLimit = {
      limit: parseInt(response.headers.get('x-ratelimit-limit-requests') || '10000'),
      remaining: parseInt(response.headers.get('x-ratelimit-remaining-requests') || '9999'),
      reset: new Date(parseInt(response.headers.get('x-ratelimit-reset-requests') || '0') * 1000),
    };
    
    return {
      isValid: true,
      models: availableModels.slice(0, 5), // Return top 5 models
      rateLimit,
      usage: {
        credits: 10000, // Placeholder - would need to call usage endpoint
        spent: 0, // Would need to track this separately
      },
    };
  } catch (error: any) {
    console.error('OpenAI validation error:', error);
    return {
      isValid: false,
      error: error.message || 'Failed to validate API key',
    };
  }
}