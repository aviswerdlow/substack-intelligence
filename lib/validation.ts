import { z } from 'zod';

const ALLOWED_HTML_TAGS = new Set(['p', 'br', 'strong', 'em', 'u']);

const taxonomySchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
  }),
]);

const contentSchema = z.object({
  html: z.string().optional(),
  text: z.string().optional(),
  json: z.unknown().optional(),
});

export const postCreationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional().nullable(),
  content: contentSchema.optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
  subscriptionRequired: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.array(z.string()).optional(),
  categories: z.array(taxonomySchema).optional(),
  tags: z.array(taxonomySchema).optional(),
  mediaAssetIds: z.array(z.string()).optional(),
  featuredMediaId: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  scheduledFor: z.string().optional().nullable(),
});

export type PostCreationInput = z.infer<typeof postCreationSchema>;

export function sanitizeText(value: string, maxLength = 1000): string {
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, Math.max(0, maxLength));
}

export function sanitizeOptionalText(
  value: unknown,
  maxLength = 1000
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const sanitized = sanitizeText(value, maxLength);
  return sanitized.length > 0 ? sanitized : undefined;
}

export function sanitizeSlug(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return normalized.length > 0 ? normalized : undefined;
}

function stripEventHandlers(input: string): string {
  return input
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '');
}

export function sanitizeHtml(value: unknown, maxLength = 20000): string {
  if (typeof value !== 'string') {
    return '';
  }

  let sanitized = value;

  sanitized = sanitized.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  sanitized = sanitized.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');
  sanitized = sanitized.replace(/<!--([\s\S]*?)-->/g, '');
  sanitized = stripEventHandlers(sanitized);

  sanitized = sanitized.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag) => {
    const normalized = String(tag).toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(normalized)) {
      return '';
    }

    if (match.startsWith('</')) {
      return `</${normalized}>`;
    }

    if (normalized === 'br') {
      return '<br />';
    }

    return `<${normalized}>`;
  });

  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F]/g, '');
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  if (sanitized.length > maxLength) {
    return `${sanitized.slice(0, maxLength)}...`;
  }

  return sanitized;
}

function sanitizeTaxonomyValue(value: unknown) {
  if (typeof value === 'string') {
    const sanitized = sanitizeOptionalText(value, 100);
    return sanitized ? sanitized : undefined;
  }

  if (value && typeof value === 'object') {
    const record = value as { name?: unknown; slug?: unknown; description?: unknown };
    const name = sanitizeOptionalText(record.name, 100);
    if (!name) {
      return undefined;
    }

    const slug = sanitizeSlug(record.slug);
    const description = sanitizeOptionalText(record.description, 300);

    return {
      name,
      ...(slug ? { slug } : {}),
      ...(description ? { description } : {}),
    };
  }

  return undefined;
}

function sanitizeDate(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function sanitizePostPayload(payload: PostCreationInput): PostCreationInput {
  const sanitizedCategories = payload.categories
    ?.map(sanitizeTaxonomyValue)
    .filter((value): value is NonNullable<ReturnType<typeof sanitizeTaxonomyValue>> => Boolean(value));

  const sanitizedTags = payload.tags
    ?.map(sanitizeTaxonomyValue)
    .filter((value): value is NonNullable<ReturnType<typeof sanitizeTaxonomyValue>> => Boolean(value));

  const sanitizedKeywords = payload.seoKeywords
    ?.filter((keyword): keyword is string => typeof keyword === 'string')
    .map(keyword => sanitizeText(keyword, 50))
    .filter(keyword => keyword.length > 0);

  const sanitizedMediaAssetIds = Array.isArray(payload.mediaAssetIds)
    ? payload.mediaAssetIds
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map(id => id.trim())
    : undefined;

  const sanitizedContent = payload.content
    ? {
        ...payload.content,
        ...(payload.content.html ? { html: sanitizeHtml(payload.content.html) } : {}),
        ...(payload.content.text ? { text: sanitizeText(payload.content.text, 20000) } : {}),
      }
    : undefined;

  const sanitized: PostCreationInput = {
    ...payload,
    title: sanitizeText(payload.title, 200),
    slug: sanitizeSlug(payload.slug),
    excerpt:
      payload.excerpt === null
        ? null
        : sanitizeOptionalText(payload.excerpt ?? undefined, 500) ?? undefined,
    content: sanitizedContent,
    seoTitle:
      payload.seoTitle === null
        ? null
        : sanitizeOptionalText(payload.seoTitle ?? undefined, 120) ?? undefined,
    seoDescription:
      payload.seoDescription === null
        ? null
        : sanitizeOptionalText(payload.seoDescription ?? undefined, 300) ?? undefined,
    seoKeywords: sanitizedKeywords && sanitizedKeywords.length > 0 ? sanitizedKeywords : undefined,
    categories: sanitizedCategories && sanitizedCategories.length > 0 ? sanitizedCategories : undefined,
    tags: sanitizedTags && sanitizedTags.length > 0 ? sanitizedTags : undefined,
    mediaAssetIds:
      sanitizedMediaAssetIds && sanitizedMediaAssetIds.length > 0
        ? sanitizedMediaAssetIds
        : undefined,
    featuredMediaId:
      payload.featuredMediaId === null
        ? null
        : typeof payload.featuredMediaId === 'string'
          ? sanitizeOptionalText(payload.featuredMediaId, 120)
          : undefined,
    publishedAt: sanitizeDate(payload.publishedAt),
    scheduledFor: sanitizeDate(payload.scheduledFor),
  };

  return postCreationSchema.parse(sanitized);
}
