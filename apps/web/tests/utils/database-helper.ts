import { createServiceRoleClient } from '@substack-intelligence/database';

export class DatabaseHelper {
  private supabase = createServiceRoleClient();

  async cleanTestData() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanTestData should only be called in test environment');
    }

    console.log('Cleaning test data...');

    // Clean in reverse dependency order
    await this.supabase.from('reports').delete().like('recipients', '%test%');
    await this.supabase.from('email_companies').delete().eq('is_test', true);
    await this.supabase.from('companies').delete().like('name', '%Test%');
    await this.supabase.from('emails').delete().like('sender_email', '%test%');
    await this.supabase.from('user_settings').delete().like('user_id', '%test%');

    console.log('Test data cleaned');
  }

  async seedTestData(userId: string) {
    console.log(`Seeding test data for user: ${userId}`);

    // Create test companies
    const testCompanies = [
      {
        name: 'Test Company Alpha',
        domain: 'testalpha.com',
        description: 'Test company for E2E testing',
        user_id: userId,
        is_test: true
      },
      {
        name: 'Test Company Beta',
        domain: 'testbeta.com', 
        description: 'Another test company for E2E testing',
        user_id: userId,
        is_test: true
      }
    ];

    const { data: companies } = await this.supabase
      .from('companies')
      .insert(testCompanies)
      .select();

    // Create test emails
    const testEmails = [
      {
        message_id: 'test-email-1',
        subject: 'Test Newsletter from Alpha',
        sender_email: 'newsletter@testalpha.com',
        sender_name: 'Test Alpha Newsletter',
        received_at: new Date().toISOString(),
        body_text: 'This is a test newsletter from Alpha Company',
        user_id: userId,
        is_test: true
      },
      {
        message_id: 'test-email-2',
        subject: 'Beta Company Update',
        sender_email: 'updates@testbeta.com',
        sender_name: 'Beta Updates',
        received_at: new Date().toISOString(),
        body_text: 'This is a test update from Beta Company',
        user_id: userId,
        is_test: true
      }
    ];

    const { data: emails } = await this.supabase
      .from('emails')
      .insert(testEmails)
      .select();

    // Create test user settings
    const testSettings = {
      user_id: userId,
      gmail_connected: true,
      newsletters_enabled: true,
      pipeline_auto_run: false,
      notification_preferences: {
        email_reports: true,
        pipeline_updates: true,
        company_alerts: false
      },
      is_test: true
    };

    await this.supabase
      .from('user_settings')
      .upsert(testSettings);

    console.log('Test data seeded successfully');
    
    return {
      companies,
      emails,
      settings: testSettings
    };
  }

  async createTestReport(userId: string, type: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const testReport = {
      user_id: userId,
      report_type: type,
      report_date: new Date().toISOString().split('T')[0],
      generated_at: new Date().toISOString(),
      recipients_count: 1,
      companies_count: 2,
      mentions_count: 5,
      status: 'sent',
      recipients: [`test.user@terragon.test`],
      is_test: true
    };

    const { data } = await this.supabase
      .from('reports')
      .insert(testReport)
      .select()
      .single();

    return data;
  }

  async verifyDataIntegrity(userId: string) {
    console.log('Verifying data integrity...');

    // Check for dummy data indicators
    const dummyPatterns = [
      'example.com',
      'dummy',
      'placeholder',
      'lorem ipsum',
      'sample data',
      'fake',
      'mock'
    ];

    // Check companies
    const { data: companies } = await this.supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId);

    const dummyCompanies = companies?.filter(company => 
      dummyPatterns.some(pattern => 
        company.name?.toLowerCase().includes(pattern) ||
        company.domain?.toLowerCase().includes(pattern) ||
        company.description?.toLowerCase().includes(pattern)
      )
    ) || [];

    // Check emails
    const { data: emails } = await this.supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId);

    const dummyEmails = emails?.filter(email =>
      dummyPatterns.some(pattern =>
        email.sender_email?.toLowerCase().includes(pattern) ||
        email.subject?.toLowerCase().includes(pattern) ||
        email.body_text?.toLowerCase().includes(pattern)
      )
    ) || [];

    if (dummyCompanies.length > 0 || dummyEmails.length > 0) {
      throw new Error(`Found dummy data: ${dummyCompanies.length} companies, ${dummyEmails.length} emails`);
    }

    console.log('Data integrity check passed - no dummy data found');

    return {
      companies: companies?.length || 0,
      emails: emails?.length || 0,
      hasDummyData: false
    };
  }

  async waitForPipelineCompletion(userId: string, timeoutMs = 30000) {
    console.log('Waiting for pipeline completion...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const { data: pipelineStatus } = await this.supabase
        .from('pipeline_status')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (pipelineStatus?.status === 'completed') {
        console.log('Pipeline completed successfully');
        return pipelineStatus;
      }

      if (pipelineStatus?.status === 'failed') {
        throw new Error(`Pipeline failed: ${pipelineStatus.error_message}`);
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Pipeline did not complete within timeout');
  }

  async getEmailStats(userId: string) {
    const { data: stats } = await this.supabase
      .from('email_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    return stats;
  }

  async getCompanyStats(userId: string) {
    const { data: stats } = await this.supabase
      .from('company_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    return stats;
  }
}