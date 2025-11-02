import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerComponentClient, getPosts, PostFilters } from '@substack-intelligence/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createServerComponentClient();
    const { posts } = await getPosts(supabase, userId, {
      limit: 100,
      sortBy: 'published_at',
      sortDirection: 'desc',
      filters: {
        status: 'published' as PostFilters['status'],
      },
    });

    const items = posts
      .filter(post => post.published_at)
      .map(post => {
        const link = `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/posts/${post.slug}`;
        const pubDate = new Date(post.published_at as string).toUTCString();
        const description = post.excerpt || (typeof post.content === 'object' && (post.content as any).text) || '';
        return `\n    <item>\n      <title>${escapeXml(post.title)}</title>\n      <link>${escapeXml(link)}</link>\n      <guid isPermaLink="false">${escapeXml(post.id)}</guid>\n      <pubDate>${pubDate}</pubDate>\n      <description><![CDATA[${description || ''}]]></description>\n    </item>`;
      })
      .join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Substack Intelligence Posts</title>\n    <link>${escapeXml(process.env.NEXT_PUBLIC_APP_URL || 'https://example.com')}</link>\n    <description>Latest published insights from Substack Intelligence</description>${items}\n  </channel>\n</rss>`;

    return new NextResponse(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Failed to generate RSS feed', { status: 500 });
  }
}
