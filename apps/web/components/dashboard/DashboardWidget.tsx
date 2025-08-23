'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Move, 
  Settings, 
  Maximize2, 
  Minimize2,
  MoreVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetConfig, useDashboard } from './DashboardWidgetProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardWidgetProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  className?: string;
}

export function DashboardWidget({ widget, children, className }: DashboardWidgetProps) {
  const { isEditing, removeWidget, updateWidget, moveWidget } = useDashboard();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Size classes based on widget size
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-2',
    large: 'col-span-3',
    full: 'col-span-4'
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isEditing) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (widget.position.x * 250), // Assuming 250px grid cell width
      y: e.clientY - (widget.position.y * 250)
    });
    
    e.preventDefault();
  };

  // Handle drag
  const handleDrag = (e: MouseEvent) => {
    if (!isDragging || !isEditing) return;
    
    const newX = Math.round((e.clientX - dragStart.x) / 250);
    const newY = Math.round((e.clientY - dragStart.y) / 250);
    
    // Ensure widget stays within bounds
    const boundedX = Math.max(0, Math.min(3, newX)); // 4 column grid
    const boundedY = Math.max(0, newY);
    
    moveWidget(widget.id, { x: boundedX, y: boundedY });
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Set up drag listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, dragStart]);

  const handleToggleVisibility = () => {
    updateWidget(widget.id, { isVisible: !widget.isVisible });
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleRemove = () => {
    if (confirm('Remove this widget from your dashboard?')) {
      removeWidget(widget.id);
    }
  };

  return (
    <div
      ref={widgetRef}
      className={cn(
        sizeClasses[widget.size],
        'transition-all duration-200',
        isDragging && 'opacity-50 cursor-move',
        isEditing && 'ring-2 ring-primary/20',
        !widget.isVisible && 'opacity-50',
        className
      )}
      style={{
        gridColumnStart: widget.position.x + 1,
        gridRowStart: widget.position.y + 1
      }}
    >
      <Card className={cn(
        'h-full relative group',
        isEditing && 'shadow-lg'
      )}>
        {/* Edit Mode Controls */}
        {isEditing && (
          <div className="absolute -top-2 -right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 rounded-full shadow-md"
              onMouseDown={handleDragStart}
            >
              <Move className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 rounded-full shadow-md"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleToggleVisibility}>
                  {widget.isVisible ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Widget
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Widget
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleMinimize}>
                  {isMinimized ? (
                    <>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Expand
                    </>
                  ) : (
                    <>
                      <Minimize2 className="h-4 w-4 mr-2" />
                      Minimize
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => alert('Widget settings coming soon!')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Widget Content */}
        <CardHeader className={cn(
          isMinimized && 'pb-3'
        )}>
          <CardTitle className="text-base">{widget.title}</CardTitle>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent>
            {children}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Widget wrapper for consistent styling
export function WidgetContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {children}
    </div>
  );
}