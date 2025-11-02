'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LinkSelectorProps {
  onSubmit: (url: string) => void;
  trigger?: React.ReactNode;
}

export function LinkSelector({ onSubmit, trigger }: LinkSelectorProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (!url) return;
    onSubmit(url);
    setOpen(false);
    setUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button variant="outline">Insert Link</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={event => setUrl(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Insert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
