'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { EditorToolbar } from './EditorToolbar';
import type { EditorContent } from '@/lib/content';

interface RichTextEditorProps {
  value?: EditorContent;
  placeholder?: string;
  onChange: (value: EditorContent) => void;
  onMediaRequest?: () => void;
  className?: string;
}

const execCommand = (command: string, value?: string) => {
  document.execCommand(command, false, value);
};

const getSelectionRange = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  return selection.getRangeAt(0);
};

export function RichTextEditor({ value, placeholder, onChange, onMediaRequest, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentHtml = editor.innerHTML;
    const nextHtml = value?.html || '';
    if (currentHtml !== nextHtml) {
      editor.innerHTML = nextHtml || '<p><br/></p>';
    }
  }, [value?.html]);

  const persistSelection = useCallback(() => {
    const range = getSelectionRange();
    selectionRef.current = range ? range.cloneRange() : null;
  }, []);

  const restoreSelection = useCallback(() => {
    const range = selectionRef.current;
    if (!range) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const handleCommand = useCallback(
    (command: string, value?: string) => {
      restoreSelection();
      execCommand(command, value);
      persistSelection();
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        const text = editorRef.current.innerText;
        onChange({ html, text });
      }
    },
    [onChange, persistSelection, restoreSelection]
  );

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText;
    onChange({ html, text });
  }, [onChange]);

  const handleLink = useCallback(() => {
    const url = prompt('Enter a URL');
    if (!url) return;
    handleCommand('createLink', url);
  }, [handleCommand]);

  const handleImage = useCallback(() => {
    if (onMediaRequest) {
      onMediaRequest();
    } else {
      const url = prompt('Enter image URL');
      if (url) {
        handleCommand('insertImage', url);
      }
    }
  }, [handleCommand, onMediaRequest]);

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <EditorToolbar
        onBold={() => handleCommand('bold')}
        onItalic={() => handleCommand('italic')}
        onUnderline={() => handleCommand('underline')}
        onQuote={() => handleCommand('formatBlock', 'blockquote')}
        onBulletList={() => handleCommand('insertUnorderedList')}
        onOrderedList={() => handleCommand('insertOrderedList')}
        onCode={() => handleCommand('formatBlock', 'pre')}
        onLink={handleLink}
        onImage={handleImage}
      />
      <div
        ref={editorRef}
        className="min-h-[200px] w-full rounded-md border bg-background p-3 text-sm focus-within:ring"
        contentEditable
        data-placeholder={placeholder || 'Write something insightful...'}
        onInput={handleInput}
        onBlur={persistSelection}
        onKeyUp={persistSelection}
        onMouseUp={persistSelection}
        suppressContentEditableWarning
      />
    </div>
  );
}
