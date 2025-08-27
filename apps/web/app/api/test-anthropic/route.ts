import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY not found in environment variables'
      });
    }
    
    // Check API key format
    if (!apiKey.startsWith('sk-ant-')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key format',
        keyPrefix: apiKey.substring(0, 10) + '...'
      });
    }
    
    // Try to initialize the client
    let client;
    try {
      client = new Anthropic({
        apiKey,
        maxRetries: 0,
        timeout: 30000,
      });
    } catch (initError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize Anthropic client',
        details: initError instanceof Error ? initError.message : 'Unknown error'
      });
    }
    
    // Try a simple API call
    try {
      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Say "test successful" and nothing else'
          }
        ]
      });
      
      return NextResponse.json({
        success: true,
        message: 'Anthropic API key is valid and working',
        apiKeyPrefix: apiKey.substring(0, 20) + '...',
        testResponse: response.content[0].type === 'text' ? response.content[0].text : 'Response received'
      });
    } catch (apiError: any) {
      // Check for specific error types
      if (apiError?.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Invalid API key - authentication failed',
          details: 'The API key is not valid. Please check your Anthropic API key.'
        });
      } else if (apiError?.status === 429) {
        return NextResponse.json({
          success: false,
          error: 'Rate limit exceeded',
          details: 'The API key is valid but rate limited. Try again later.'
        });
      } else if (apiError?.status === 400) {
        return NextResponse.json({
          success: false,
          error: 'Invalid request',
          details: apiError?.message || 'The API request was invalid'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'API call failed',
          details: apiError?.message || 'Unknown error',
          status: apiError?.status
        });
      }
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}