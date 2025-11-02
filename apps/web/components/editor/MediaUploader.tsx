'use client';

import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, UploadCloud } from 'lucide-react';

interface MediaAsset {
  id: string;
  filename?: string | null;
  url: string;
  mime_type?: string | null;
  size_bytes?: number | null;
}

interface MediaUploaderProps {
  assets: MediaAsset[];
  onUpload: (asset: MediaAsset) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export function MediaUploader({ assets, onUpload, onDelete, className }: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          const dataUrl = await readFileAsDataUrl(file);
          const response = await fetch('/api/posts/media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              url: dataUrl,
              mimeType: file.type,
              sizeBytes: file.size,
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(error.error || 'Failed to upload media asset');
          }

          const { data } = await response.json();
          onUpload(data.asset);
        }
        toast.success('Media uploaded successfully');
      } catch (error) {
        console.error('Media upload failed:', error);
        toast.error('Failed to upload media');
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  const handleExternalAdd = useCallback(async () => {
    if (!externalUrl) return;
    try {
      const response = await fetch('/api/posts/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: externalUrl.split('/').pop(),
          url: externalUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Failed to add media');
      }

      const { data } = await response.json();
      onUpload(data.asset);
      setExternalUrl('');
      toast.success('Media added');
    } catch (error) {
      console.error('External media add failed:', error);
      toast.error('Failed to add media link');
    }
  }, [externalUrl, onUpload]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!onDelete) return;
      try {
        const response = await fetch(`/api/posts/media?id=${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Delete failed' }));
          throw new Error(error.error || 'Failed to delete media');
        }
        onDelete(id);
        toast.success('Media removed');
      } catch (error) {
        console.error('Failed to delete media asset:', error);
        toast.error('Failed to delete media');
      }
    },
    [onDelete]
  );

  return (
    <Card className={className}>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Upload media</label>
          <Button type="button" variant="outline" disabled={isUploading} className="gap-2" asChild>
            <label className="flex cursor-pointer items-center gap-2">
              <UploadCloud className="h-4 w-4" />
              {isUploading ? 'Uploading…' : 'Select files'}
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={event => handleUpload(event.target.files)}
              />
            </label>
          </Button>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/image.png"
              value={externalUrl}
              onChange={event => setExternalUrl(event.target.value)}
            />
            <Button type="button" onClick={handleExternalAdd} disabled={!externalUrl}>
              Add URL
            </Button>
          </div>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No media assets uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {assets.map(asset => (
                <div key={asset.id} className="space-y-2 rounded-md border p-2">
                  <div className="aspect-video overflow-hidden rounded bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.filename || 'Media asset'} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate" title={asset.filename || asset.url}>
                      {asset.filename || asset.url}
                    </span>
                    {onDelete && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(asset.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
