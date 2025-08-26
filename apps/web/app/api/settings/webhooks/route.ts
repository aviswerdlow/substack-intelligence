import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserSettingsService } from '@/lib/user-settings';
import { z } from 'zod';

const CreateWebhookSchema = z.object({
  url: z.string().url('Invalid URL format'),
  events: z.array(z.string()).min(1, 'At least one event is required').default(['email.processed'])
});

const DeleteWebhookSchema = z.object({
  webhookId: z.string().uuid('Invalid webhook ID')
});

const ToggleWebhookSchema = z.object({
  webhookId: z.string().uuid('Invalid webhook ID'),
  enabled: z.boolean()
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
    const { url, events } = CreateWebhookSchema.parse(body);

    const settingsService = new UserSettingsService();
    const webhookId = await settingsService.createWebhook(userId, url, events);
    
    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create webhook'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: webhookId,
        url,
        events,
        enabled: true,
        createdAt: new Date().toISOString()
      },
      message: `Webhook "${url}" created successfully`
    });
  } catch (error) {
    console.error('Webhook creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create webhook' },
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
    const { webhookId } = DeleteWebhookSchema.parse(body);

    const settingsService = new UserSettingsService();
    const success = await settingsService.deleteWebhook(userId, webhookId);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete webhook'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('Webhook deletion error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { webhookId, enabled } = ToggleWebhookSchema.parse(body);

    const settingsService = new UserSettingsService();
    const success = await settingsService.toggleWebhook(userId, webhookId, enabled);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update webhook'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Webhook ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Webhook toggle error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}