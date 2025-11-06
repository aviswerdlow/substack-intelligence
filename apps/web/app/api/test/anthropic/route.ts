import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Force Node.js runtime for Anthropic SDK compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  const results: any = {
    timestamp: new Date().toISOString(),
    runtime: process.env.NODE_ENV,
    checks: {}
  };

  try {
    // 1. Check environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    results.checks.apiKeyPresent = !!apiKey;
    results.checks.apiKeyPrefix = apiKey ? apiKey.substring(0, 10) + '...' : 'NOT_FOUND';
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }

    // 2. Initialize client
    let client: Anthropic;
    try {
      client = new Anthropic({
        apiKey,
        maxRetries: 2,
        timeout: 15000,
      });
      results.checks.clientInitialized = true;
    } catch (error: any) {
      results.checks.clientInitialized = false;
      results.checks.clientError = error.message;
      throw new Error(`Failed to initialize Anthropic client: ${error.message}`);
    }

    // 3. Make a simple test API call
    try {
      console.log('[Test] Making test API call to Claude...');
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        temperature: 0,
        system: 'You are a helpful assistant. Respond with exactly: "API connection successful"',
        messages: [{
          role: 'user',
          content: 'Test connection'
        }]
      });

      results.checks.apiCallSuccess = true;
      const firstContent = response.content[0];
      results.checks.apiResponse = (firstContent && 'text' in firstContent) ? firstContent.text : 'No response text';
      results.checks.apiUsage = response.usage;
      results.checks.apiModel = response.model;
      
      console.log('[Test] API call successful:', (firstContent && 'text' in firstContent) ? firstContent.text : 'No response');
    } catch (apiError: any) {
      console.error('[Test] API call failed:', apiError);
      results.checks.apiCallSuccess = false;
      results.checks.apiError = {
        message: apiError.message,
        type: apiError.constructor.name,
        status: apiError.status,
        code: apiError.code,
        headers: apiError.headers
      };
      
      // Specific error diagnosis
      if (apiError.status === 401) {
        results.checks.diagnosis = 'Invalid API key - check ANTHROPIC_API_KEY';
      } else if (apiError.status === 429) {
        results.checks.diagnosis = 'Rate limit exceeded';
      } else if (apiError.message?.includes('fetch')) {
        results.checks.diagnosis = 'Network/fetch error - possible runtime issue';
      } else {
        results.checks.diagnosis = 'Unknown API error';
      }
    }

    // 4. Test with extraction-like content
    if (results.checks.apiCallSuccess) {
      try {
        const testContent = `
          Today we're excited to announce that TechStartup Inc has raised $50M in Series B funding.
          The company, known for its innovative AI products, will use the funding to expand globally.
        `;
        
        const extractionResponse = await client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 500,
          temperature: 0.2,
          system: 'Extract company names from the text and return as JSON array.',
          messages: [{
            role: 'user',
            content: testContent
          }]
        });

        results.checks.extractionTest = true;
        const extractContent = extractionResponse.content[0];
        results.checks.extractionResponse = (extractContent && 'text' in extractContent) ? extractContent.text : 'No response';
        console.log('[Test] Extraction test successful');
      } catch (extractError: any) {
        results.checks.extractionTest = false;
        results.checks.extractionError = extractError.message;
        console.error('[Test] Extraction test failed:', extractError);
      }
    }

    // 5. Runtime checks
    results.checks.nodeVersion = process.version;
    results.checks.nextjsRuntime = (globalThis as any).EdgeRuntime ? 'edge' : 'nodejs';
    
    const processingTime = Date.now() - startTime;
    results.processingTime = `${processingTime}ms`;
    
    // Determine overall status
    const allPassed = results.checks.apiKeyPresent && 
                     results.checks.clientInitialized && 
                     results.checks.apiCallSuccess;
    
    return NextResponse.json({
      success: allPassed,
      message: allPassed ? 'All Anthropic API checks passed' : 'Some checks failed',
      ...results
    }, { status: allPassed ? 200 : 500 });

  } catch (error: any) {
    console.error('[Test] Overall test failed:', error);
    
    const processingTime = Date.now() - startTime;
    results.processingTime = `${processingTime}ms`;
    results.error = error.message;
    
    return NextResponse.json({
      success: false,
      message: 'Anthropic API validation failed',
      ...results
    }, { status: 500 });
  }
}

// POST endpoint to test with custom content
export async function POST(request: Request) {
  try {
    const { content, newsletterName = 'Test Newsletter' } = await request.json();
    
    if (!content) {
      return NextResponse.json({
        success: false,
        error: 'Content is required'
      }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY not configured'
      }, { status: 500 });
    }

    const client = new Anthropic({
      apiKey,
      maxRetries: 2,
      timeout: 20000,
    });

    console.log(`[Test] Testing extraction with content length: ${content.length}`);
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      temperature: 0.2,
      system: `Extract company names from newsletter content. Return as JSON with this structure:
      {
        "companies": [
          {
            "name": "Company Name",
            "description": "Brief description",
            "context": "Where it was mentioned"
          }
        ]
      }`,
      messages: [{
        role: 'user',
        content: `Newsletter: ${newsletterName}\nContent: ${content.slice(0, 5000)}`
      }]
    });

    const responseContent = response.content[0];
    const responseText = (responseContent && 'text' in responseContent) ? responseContent.text : undefined;
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(responseText || '{}');
    } catch {
      // Try to extract from markdown
      const jsonMatch = responseText?.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1]);
      } else {
        parsedResponse = { companies: [], raw: responseText };
      }
    }

    return NextResponse.json({
      success: true,
      newsletterName,
      contentLength: content.length,
      usage: response.usage,
      ...parsedResponse
    });

  } catch (error: any) {
    console.error('[Test] POST test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      status: error.status
    }, { status: 500 });
  }
}