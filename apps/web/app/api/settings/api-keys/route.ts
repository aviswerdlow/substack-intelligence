import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserSettingsService } from '@/lib/user-settings';
import { z } from 'zod';

const CreateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long')
});

const DeleteApiKeySchema = z.object({
  keyId: z.string().uuid('Invalid key ID')
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { name } = CreateApiKeySchema.parse(body);

    const settingsService = new UserSettingsService();
    const result = await settingsService.generateApiKey(userId, name);
    
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { keyId } = DeleteApiKeySchema.parse(body);

    const settingsService = new UserSettingsService();
    const success = await settingsService.deleteApiKey(userId, keyId);
    
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