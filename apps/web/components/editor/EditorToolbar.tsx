'use client';

import { Bold, Italic, List, ListOrdered, Quote, Underline, Code, Link, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

const ToolbarButton = ({ icon: Icon, label, onClick, isActive }: ToolbarButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        size="icon"
        variant={isActive ? 'secondary' : 'ghost'}
        className="h-8 w-8"
        onClick={onClick}
      >
        <Icon className="h-4 w-4" />
        <span className="sr-only">{label}</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onQuote: () => void;
  onBulletList: () => void;
  onOrderedList: () => void;
  onCode: () => void;
  onLink: () => void;
  onImage: () => void;
  className?: string;
}

export function EditorToolbar({
  onBold,
  onItalic,
  onUnderline,
  onQuote,
  onBulletList,
  onOrderedList,
  onCode,
  onLink,
  onImage,
  className,
}: EditorToolbarProps) {
  return (
    <TooltipProvider>
      <div className={`flex flex-wrap items-center gap-2 rounded-md border bg-background p-2 ${className || ''}`}>
        <ToolbarButton icon={Bold} label="Bold" onClick={onBold} />
        <ToolbarButton icon={Italic} label="Italic" onClick={onItalic} />
        <ToolbarButton icon={Underline} label="Underline" onClick={onUnderline} />
        <ToolbarButton icon={Quote} label="Quote" onClick={onQuote} />
        <ToolbarButton icon={List} label="Bullet List" onClick={onBulletList} />
        <ToolbarButton icon={ListOrdered} label="Numbered List" onClick={onOrderedList} />
        <ToolbarButton icon={Code} label="Code" onClick={onCode} />
        <ToolbarButton icon={Link} label="Link" onClick={onLink} />
        <ToolbarButton icon={ImageIcon} label="Insert Media" onClick={onImage} />
      </div>
    </TooltipProvider>
  );
}
