'use client';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  dark?: boolean;
}

export default function SectionHeader({
  badge,
  title,
  subtitle,
  align = 'center',
  dark = false,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-12 md:mb-16',
        align === 'center' && 'text-center',
        align === 'left' && 'max-w-2xl'
      )}
    >
      {badge && (
        <span
          className={cn(
            'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4',
            dark
              ? 'bg-white/15 text-white/90 backdrop-blur-sm'
              : 'bg-primary/10 text-primary'
          )}
        >
          {badge}
        </span>
      )}
      <h2
        className={cn(
          'text-section-mobile md:text-section mb-4',
          dark ? 'text-white' : 'text-dark-900'
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'text-lg md:text-xl max-w-3xl leading-relaxed',
            align === 'center' && 'mx-auto',
            dark ? 'text-white/70' : 'text-dark-500'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
