import { NextRequest, NextResponse } from 'next/server';
import { ClaudeExtractor } from '@substack-intelligence/ai';
import { z } from 'zod';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TestExtractionSchema = z.object({
  content: z.string().min(1),
  newsletterName: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, newsletterName } = TestExtractionSchema.parse(body);
    
    // Initialize Claude extractor
    const extractor = new ClaudeExtractor();
    
    // Extract companies from content
    const result = await extractor.extractCompanies(content, newsletterName);
    
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Test extraction failed:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for testing with sample data
export async function GET() {
  const sampleContent = `
    Glossier just announced their Series E funding round, raising $80M to expand into European markets. 
    The beauty brand has seen tremendous growth with their minimalist approach to skincare and makeup.
    
    Meanwhile, AllBirds continues to innovate in sustainable footwear, with their new Tree Runner collection 
    made from eucalyptus fiber. The company recently went public but maintains their eco-friendly mission.
    
    Warby Parker also made headlines this week with their virtual try-on technology update, 
    making it easier for customers to find the perfect frame from home.
  `;
  
  try {
    const extractor = new ClaudeExtractor();
    const result = await extractor.extractCompanies(sampleContent, 'Sample Newsletter');
    
    return NextResponse.json({
      success: true,
      data: result,
      sample: true,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Sample extraction failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      sample: true
    }, { status: 500 });
  }
}