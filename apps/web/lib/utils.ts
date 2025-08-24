import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Invalid Date';
  const d = typeof date === 'string' ? new Date(date) : 
           typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'Invalid Date';
  const d = typeof date === 'string' ? new Date(date) : 
           typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function capitalizeFirst(str: any): string {
  if (str === null || str === undefined) return '';
  const text = String(str);
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function truncateText(text: any, maxLength: number): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  if (maxLength <= 0) return '...';
  if (str.length <= maxLength) return str;
  
  // Handle unicode characters properly
  const chars = Array.from(str);
  if (chars.length <= maxLength) return str;
  return chars.slice(0, maxLength).join('') + '...';
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
}

export function getSentimentColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-600 bg-green-50';
    case 'negative':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}