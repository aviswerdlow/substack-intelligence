'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CodeBlockProps {
  value: string;
  language?: string;
}

export function CodeBlock({ value, language = 'text' }: CodeBlockProps) {
  const code = useMemo(() => value.trim(), [value]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied');
    } catch (error) {
      console.error('Failed to copy code', error);
      toast.error('Failed to copy');
    }
  };

  return (
    <Card className="relative">
      <CardContent className="overflow-x-auto bg-muted p-4 font-mono text-sm">
        <pre className="whitespace-pre">
          <code className={`language-${language}`}>{code}</code>
        </pre>
        <Button type="button" size="icon" variant="ghost" className="absolute right-2 top-2" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
