import { NextRequest, NextResponse } from 'next/server';
import { UserSettingsService } from '@/lib/user-settings';
import { z } from 'zod';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

const CreateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long')
});

const DeleteApiKeySchema = z.object({
  keyId: z.string().uuid('Invalid key ID')
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { name } = CreateApiKeySchema.parse(body);

    const settingsService = new UserSettingsService();
    const result = await settingsService.generateApiKey(session.user.id, name);
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate API key'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        key: result.key,
        name,
        createdAt: new Date().toISOString()
      },
      message: `API key "${name}" generated successfully`
    });
  } catch (error) {
    console.error('API key generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSecuritySession();
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { keyId } = DeleteApiKeySchema.parse(body);

    const settingsService = new UserSettingsService();
    const success = await settingsService.deleteApiKey(session.user.id, keyId);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete API key'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('API key deletion error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}