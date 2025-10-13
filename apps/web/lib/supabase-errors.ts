import { NextResponse } from 'next/server';

/**
 * Narrow Supabase/PostgREST errors that indicate the new multi-tenant security
 * schema has not been applied yet (missing `user_id` columns or policies).
 */
export function isMissingUserIdColumnError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const normalizedMessages: string[] = [];

  const maybeAdd = (value: unknown) => {
    if (typeof value === 'string' && value.length > 0) {
      normalizedMessages.push(value.toLowerCase());
    }
  };

  if (error instanceof Error) {
    maybeAdd(error.message);
  }

  if (typeof (error as any)?.message === 'string') {
    maybeAdd((error as any).message);
  }

  if (typeof (error as any)?.details === 'string') {
    maybeAdd((error as any).details);
  }

  if (typeof (error as any)?.hint === 'string') {
    maybeAdd((error as any).hint);
  }

  const code = typeof (error as any)?.code === 'string' ? (error as any).code : '';
  if (code === '42703') {
    return true;
  }

  return normalizedMessages.some((message) =>
    message.includes('user_id') &&
    message.includes('column') &&
    message.includes('does not exist')
  );
}

export class MissingUserIdColumnError extends Error {
  public readonly table?: string;
  public readonly originalError?: unknown;

  constructor(table?: string, originalError?: unknown) {
    super(
      table
        ? `Table "${table}" is missing the required user_id column for data isolation`
        : 'Database schema is missing the required user_id column for data isolation'
    );
    this.name = 'MissingUserIdColumnError';
    this.table = table;
    this.originalError = originalError;
  }
}

export function mapToMissingUserIdColumnError(table: string, error: unknown) {
  if (isMissingUserIdColumnError(error)) {
    return new MissingUserIdColumnError(table, error);
  }
  return null;
}

export function buildMissingUserIdColumnResponse(
  context: string,
  table?: string
) {
  return NextResponse.json(
    {
      success: false,
      error: 'Database schema out of date',
      details: {
        context,
        missingColumn: 'user_id',
        table,
        resolution:
          'Apply the latest migrations (pnpm run db:migrate) to add the user_id column and RLS policies.',
        documentation: '/CRITICAL_SECURITY_FIX.md'
      }
    },
    { status: 503 }
  );
}
