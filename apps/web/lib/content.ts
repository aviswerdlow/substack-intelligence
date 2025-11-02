import { PostInput } from '@substack-intelligence/database';

export interface EditorContent {
  html?: string;
  text?: string;
  json?: unknown;
}

export interface PostDraft extends Partial<PostInput> {
  id?: string;
  content?: EditorContent;
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export const estimateReadingTime = (text: string) => {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

export const extractPlainText = (content?: EditorContent | null) => {
  if (!content) return '';
  if (content.text) return content.text;
  if (content.html) {
    return content.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (typeof content.json === 'string') {
    return content.json;
  }
  return '';
};

export const buildExcerpt = (content?: EditorContent | null, fallback = '') => {
  const text = extractPlainText(content) || fallback;
  if (!text) return '';
  return text.length > 260 ? `${text.slice(0, 260)}…` : text;
};

export const normalizeEditorContent = (content?: EditorContent | null) => {
  if (!content) return undefined;
  return {
    html: content.html ?? '',
    text: content.text ?? extractPlainText(content),
    json: content.json ?? null,
  } satisfies EditorContent;
};

export const parseTaxonomyInput = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

export const toPostInput = (draft: PostDraft): PostInput => ({
  title: draft.title || 'Untitled Post',
  slug: draft.slug || slugify(draft.title || 'untitled-post'),
  excerpt: draft.excerpt ?? buildExcerpt(draft.content, draft.title || ''),
  content: normalizeEditorContent(draft.content),
  status: draft.status,
  subscriptionRequired: draft.subscriptionRequired,
  allowComments: draft.allowComments,
  seoTitle: draft.seoTitle,
  seoDescription: draft.seoDescription,
  seoKeywords: draft.seoKeywords,
  categories: draft.categories,
  tags: draft.tags,
  mediaAssetIds: draft.mediaAssetIds,
  featuredMediaId: draft.featuredMediaId,
  publishedAt: draft.publishedAt,
  scheduledFor: draft.scheduledFor,
});

export const formatScheduleLabel = (isoDate?: string | null) => {
  if (!isoDate) return 'Not scheduled';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
};
