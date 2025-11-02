'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MediaUploader } from '@/components/editor/MediaUploader';
import { CodeBlock } from '@/components/editor/CodeBlock';
import {
  PostWithRelations,
  PostAnalytics,
  PostCommentList,
} from '@substack-intelligence/database';
import { EditorContent, PostDraft, buildExcerpt, estimateReadingTime, slugify } from '@/lib/content';
import { formatDateTime } from '@/lib/utils';
import { Loader2, Plus, RefreshCw, Save, Send, Trash2 } from 'lucide-react';

interface MediaAsset {
  id: string;
  filename?: string | null;
  url: string;
  mime_type?: string | null;
  size_bytes?: number | null;
}

const createEmptyDraft = (): PostDraft => ({
  title: '',
  slug: '',
  excerpt: '',
  status: 'draft',
  allowComments: true,
  subscriptionRequired: false,
  content: { html: '', text: '' },
  categories: [],
  tags: [],
  mediaAssetIds: [],
});

async function fetchJson<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json() as Promise<T>;
}

export default function ContentManagementPage() {
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithRelations[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PostDraft>(createEmptyDraft);
  const [analytics, setAnalytics] = useState<PostAnalytics | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [comments, setComments] = useState<PostCommentList>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const loadAnalytics = useCallback(async () => {
    try {
      const { data } = await fetchJson<{ data: PostAnalytics }>('/api/posts/analytics');
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, []);

  const loadMediaAssets = useCallback(async () => {
    try {
      const { data } = await fetchJson<{ data: { assets: MediaAsset[] } }>('/api/posts/media');
      setMediaAssets(data.assets);
    } catch (error) {
      console.error('Failed to load media assets:', error);
    }
  }, []);

  const loadComments = useCallback(
    async (postId: string) => {
      try {
        const { data } = await fetchJson<{ data: { comments: PostCommentList } }>(
          `/api/posts/${postId}/comments`
        );
        setComments(data.comments);
      } catch (error) {
        console.error('Failed to load comments:', error);
        setComments([]);
      }
    },
    []
  );

  const loadRevisions = useCallback(
    async (postId: string) => {
      try {
        const { data } = await fetchJson<{ data: { revisions: any[] } }>(
          `/api/posts/${postId}/revisions`
        );
        setRevisions(data.revisions);
      } catch (error) {
        console.error('Failed to load revisions:', error);
        setRevisions([]);
      }
    },
    []
  );

  const handleSelectPost = useCallback(
    (post: PostWithRelations | null) => {
      if (!post) {
        setSelectedPostId(null);
        setDraft(createEmptyDraft());
        setComments([]);
        setRevisions([]);
        return;
      }

      setSelectedPostId(post.id);
      setDraft({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        status: post.status,
        allowComments: post.allow_comments ?? true,
        subscriptionRequired: post.subscription_required ?? false,
        content: {
          html: typeof post.content === 'object' && post.content !== null ? (post.content as any).html || '' : '',
          text: typeof post.content === 'object' && post.content !== null ? (post.content as any).text || '' : '',
        },
        categories: post.categories?.map(category => ({ name: category.name, slug: category.slug })) ?? [],
        tags: post.tags?.map(tag => ({ name: tag.name, slug: tag.slug })) ?? [],
        mediaAssetIds: post.media_asset_ids ?? [],
        featuredMediaId: post.featured_media_id ?? undefined,
        seoTitle: post.seo_title ?? undefined,
        seoDescription: post.seo_description ?? undefined,
        seoKeywords: post.seo_keywords ?? undefined,
        publishedAt: post.published_at ?? undefined,
        scheduledFor: post.scheduled_for ?? undefined,
      });
      setScheduleDate(post.scheduled_for || '');
      void loadComments(post.id);
      void loadRevisions(post.id);
    },
    [loadComments, loadRevisions]
  );

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await fetchJson<{ data: { posts: PostWithRelations[] } }>('/api/posts');
      setPosts(data.posts);
      setFilteredPosts(data.posts);
      if (!selectedPostId && data.posts.length > 0) {
        handleSelectPost(data.posts[0]);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [handleSelectPost, selectedPostId]);

  useEffect(() => {
    void loadPosts();
    void loadAnalytics();
    void loadMediaAssets();
  }, [loadPosts, loadAnalytics, loadMediaAssets]);

  useEffect(() => {
    if (!search) {
      setFilteredPosts(posts);
      return;
    }
    const searchLower = search.toLowerCase();
    setFilteredPosts(
      posts.filter(post =>
        [post.title, post.excerpt, post.slug]
          .filter(Boolean)
          .some(field => field?.toLowerCase().includes(searchLower))
      )
    );
  }, [posts, search]);

  const handleCreateNew = () => {
    setSelectedPostId(null);
    setDraft(createEmptyDraft());
    setComments([]);
    setRevisions([]);
  };

  const handleDraftChange = (key: keyof PostDraft, value: unknown) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleContentChange = (content: EditorContent) => {
    setDraft(prev => {
      const excerpt = buildExcerpt(content, prev.title || '');
      return { ...prev, content, excerpt };
    });
  };

  const toggleMediaAttachment = (assetId: string) => {
    setDraft(prev => {
      const ids = new Set(prev.mediaAssetIds || []);
      if (ids.has(assetId)) {
        ids.delete(assetId);
      } else {
        ids.add(assetId);
      }
      return { ...prev, mediaAssetIds: Array.from(ids) };
    });
  };

  const handleSaveDraft = async () => {
    if (!draft.title) {
      toast.error('Title is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...draft,
        slug: draft.slug ? slugify(draft.slug) : slugify(draft.title),
        content: draft.content,
      };

      const response = await fetch(draft.id ? `/api/posts/${draft.id}` : '/api/posts', {
        method: draft.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save post' }));
        throw new Error(error.error || 'Failed to save post');
      }

      const { data } = await response.json();
      toast.success('Post saved');
      await loadPosts();
      if (data?.post) {
        handleSelectPost(data.post);
      }
    } catch (error) {
      console.error('Failed to save post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save post');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draft.id) {
      toast.error('Save the post before publishing');
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch(`/api/posts/${draft.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to publish post' }));
        throw new Error(error.error || 'Failed to publish post');
      }
      toast.success('Post published');
      await Promise.all([loadPosts(), loadAnalytics()]);
    } catch (error) {
      console.error('Failed to publish post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish post');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!draft.id) {
      toast.error('Save the post before scheduling');
      return;
    }
    if (!scheduleDate) {
      toast.error('Select a schedule date');
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch(`/api/posts/${draft.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: scheduleDate }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to schedule post' }));
        throw new Error(error.error || 'Failed to schedule post');
      }
      toast.success('Post scheduled');
      await loadPosts();
    } catch (error) {
      console.error('Failed to schedule post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to schedule post');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    if (!confirm('Delete this post?')) return;
    try {
      await fetchJson(`/api/posts/${draft.id}`, { method: 'DELETE' });
      toast.success('Post deleted');
      await loadPosts();
      handleCreateNew();
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    }
  };

  const postStats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter(post => post.status === 'published').length;
    const draftsCount = posts.filter(post => post.status === 'draft').length;
    const scheduled = posts.filter(post => post.status === 'scheduled').length;
    return { total, published, drafts: draftsCount, scheduled };
  }, [posts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Management</h1>
          <p className="text-sm text-muted-foreground">Create, organize, and publish newsletter content.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" /> New Draft
          </Button>
          <Button variant="outline" onClick={() => loadPosts()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Posts</CardDescription>
            <CardTitle>{postStats.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Views tracked: {analytics?.totals.views ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Published</CardDescription>
            <CardTitle>{postStats.published}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Unique views: {analytics?.totals.uniqueViews ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drafts</CardDescription>
            <CardTitle>{postStats.drafts}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Scheduled: {postStats.scheduled}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comments</CardDescription>
            <CardTitle>{analytics?.totals.comments ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Manage engagement & moderation
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Posts</CardTitle>
            <CardDescription>Manage drafts, scheduled, and published posts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search posts"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            <div className="space-y-2">
              {isLoading ? (
                <SkeletonLoader count={6} />
              ) : filteredPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No posts found.</p>
              ) : (
                filteredPosts.map(post => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => handleSelectPost(post)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition hover:bg-muted ${
                      selectedPostId === post.id ? 'border-primary bg-primary/10' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{post.title}</p>
                        <p className="text-xs text-muted-foreground">{post.slug}</p>
                      </div>
                      <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>{post.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDateTime(post.updated_at)}</span>
                      <span>{post.view_count ?? 0} views</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{draft.id ? 'Edit Post' : 'New Post'}</CardTitle>
              <CardDescription>Update content, metadata, and scheduling.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={draft.title}
                    onChange={event => handleDraftChange('title', event.target.value)}
                    placeholder="Post title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    value={draft.slug}
                    onChange={event => handleDraftChange('slug', event.target.value)}
                    placeholder="auto-generated"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Excerpt</label>
                <Textarea
                  value={draft.excerpt || ''}
                  onChange={event => handleDraftChange('excerpt', event.target.value)}
                  placeholder="Brief summary for feeds and previews"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <RichTextEditor value={draft.content} onChange={handleContentChange} />
                <p className="text-xs text-muted-foreground">
                  Estimated reading time: {estimateReadingTime(draft.content?.text || '')} minutes
                </p>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={draft.status || 'draft'}
                    onValueChange={value => handleDraftChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Schedule</label>
                  <Input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={event => setScheduleDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    value={(draft.tags as any[] | undefined)?.map(tag => tag.name || tag).join(', ') || ''}
                    onChange={event =>
                      handleDraftChange(
                        'tags',
                        event.target.value.split(',').map(value => value.trim()).filter(Boolean)
                      )
                    }
                    placeholder="comma separated"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categories</label>
                  <Input
                    value={(draft.categories as any[] | undefined)?.map(category => category.name || category).join(', ') || ''}
                    onChange={event =>
                      handleDraftChange(
                        'categories',
                        event.target.value.split(',').map(value => value.trim()).filter(Boolean)
                      )
                    }
                    placeholder="comma separated"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">SEO Title</label>
                  <Input
                    value={draft.seoTitle || ''}
                    onChange={event => handleDraftChange('seoTitle', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SEO Description</label>
                  <Input
                    value={draft.seoDescription || ''}
                    onChange={event => handleDraftChange('seoDescription', event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Media Library</label>
                <MediaUploader
                  assets={mediaAssets}
                  onUpload={asset => setMediaAssets(prev => [asset, ...prev])}
                  onDelete={id => setMediaAssets(prev => prev.filter(asset => asset.id !== id))}
                />
              </div>
              {mediaAssets.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Attach Media Assets</label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {mediaAssets.map(asset => {
                      const attached = draft.mediaAssetIds?.includes(asset.id);
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => toggleMediaAttachment(asset.id)}
                          className={`overflow-hidden rounded-md border text-left transition ${
                            attached ? 'border-primary ring-2 ring-primary/40' : 'border-muted'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.url} alt={asset.filename || 'Asset'} className="h-32 w-full object-cover" />
                          <div className="p-2 text-xs">
                            <p className="truncate font-medium">{asset.filename || asset.url}</p>
                            <p className="text-muted-foreground">{attached ? 'Attached' : 'Click to attach'}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {mediaAssets.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Featured Media</label>
                  <Select
                    value={draft.featuredMediaId ?? 'none'}
                    onValueChange={value =>
                      handleDraftChange('featuredMediaId', value === 'none' ? undefined : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select media" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No featured media</SelectItem>
                      {mediaAssets.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.filename || asset.url}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleSaveDraft} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Draft
                </Button>
                <Button type="button" variant="secondary" onClick={handleSchedule} disabled={!draft.id || isPublishing}>
                  {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Schedule
                </Button>
                <Button type="button" variant="default" onClick={handlePublish} disabled={!draft.id || isPublishing}>
                  {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Publish
                </Button>
                {draft.id && (
                  <Button type="button" variant="destructive" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {draft.id && (
            <Tabs defaultValue="comments" className="space-y-4">
              <TabsList>
                <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                <TabsTrigger value="revisions">Revisions</TabsTrigger>
                <TabsTrigger value="preview">Preview HTML</TabsTrigger>
              </TabsList>
              <TabsContent value="comments">
                <Card>
                  <CardHeader>
                    <CardTitle>Comments</CardTitle>
                    <CardDescription>Moderate reader feedback.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No comments yet.</p>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatDateTime(comment.created_at)}</span>
                            <Badge variant="outline">{comment.status}</Badge>
                          </div>
                          <p className="mt-2 text-sm">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="revisions">
                <Card>
                  <CardHeader>
                    <CardTitle>Revision History</CardTitle>
                    <CardDescription>Track changes over time.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {revisions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No revisions recorded.</p>
                    ) : (
                      revisions.map(revision => (
                        <div key={revision.id} className="space-y-2 rounded-md border p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatDateTime(revision.created_at)}</span>
                            <span>{revision.summary || 'Updated content'}</span>
                          </div>
                          <p className="text-sm font-medium">{revision.title}</p>
                          <CodeBlock value={revision.content?.text || ''} language="markdown" />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="preview">
                <Card>
                  <CardHeader>
                    <CardTitle>HTML Preview</CardTitle>
                    <CardDescription>Rendered HTML output of the editor content.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: draft.content?.html || '<p>No content</p>' }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Posts</CardTitle>
          <CardDescription>View engagement metrics across recent content.</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.posts.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {analytics.posts.slice(0, 6).map(post => (
                <Card key={post.post_id} className="border">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{post.title}</p>
                      <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>{post.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{post.slug}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{post.total_views ?? 0} views</span>
                      <span>{post.total_comments ?? 0} comments</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Analytics will appear once posts receive engagement.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
