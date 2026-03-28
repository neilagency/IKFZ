'use client';

import { sanitizeWPContent } from '@/lib/wordpress';

interface WPContentRendererProps {
  html: string;
  className?: string;
  variant?: 'dark' | 'light';
}

export default function WPContentRenderer({ html, className = '', variant = 'dark' }: WPContentRendererProps) {
  const cleanHTML = sanitizeWPContent(html);

  const variantClasses =
    variant === 'light'
      ? 'prose-headings:text-dark-900 prose-p:text-dark-600 prose-strong:text-dark-800 prose-li:text-dark-600 prose-a:text-primary hover:prose-a:text-primary-600'
      : 'prose-invert prose-headings:text-white prose-p:text-white/60 prose-strong:text-white/80 prose-li:text-white/60 prose-a:text-primary hover:prose-a:text-primary-400';

  return (
    <div
      className={`wp-content prose prose-lg ${variantClasses} max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHTML }}
    />
  );
}
