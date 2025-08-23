import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { ClaudeExtractor } from '@substack-intelligence/ai';

// Force Node.js runtime for Anthropic SDK
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get just ONE email for testing
    const { data: emails, error: fetchError } = await supabase
      .from('emails')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(1);
    
    if (fetchError || !emails || emails.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No emails found'
      });
    }
    
    const email = emails[0];
    console.log(`\n=== SINGLE EMAIL EXTRACTION TEST ===`);
    console.log(`Email: ${email.subject}`);
    console.log(`Content length: ${email.clean_text?.length || 0} chars`);
    
    // Extract companies using Claude
    const extractor = new ClaudeExtractor();
    const result = await extractor.extractCompanies(
      email.clean_text || email.raw_html || '',
      email.newsletter_name || 'Unknown'
    );
    
    console.log(`\n=== EXTRACTION RESULT ===`);
    console.log(`Companies found: ${result.companies.length}`);
    console.log(`Company names:`, result.companies.map(c => c.name));
    
    // Check what's in the database now
    const { data: dbCompanies } = await supabase
      .from('companies')
      .select('name, description')
      .order('created_at', { ascending: false })
      .limit(10);
    
    return NextResponse.json({
      success: true,
      email: {
        id: email.id,
        subject: email.subject,
        newsletter: email.newsletter_name
      },
      extraction: {
        companiesFound: result.companies.length,
        companies: result.companies.map(c => ({
          name: c.name,
          description: c.description
        }))
      },
      databaseState: {
        recentCompanies: dbCompanies
      }
    });
    
  } catch (error: any) {
    console.error('Single extraction test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}