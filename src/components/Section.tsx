'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  variant?: 'white' | 'light' | 'green' | 'dark' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
}

const bgVariants = {
  white: 'bg-white',
  light: 'bg-gradient-to-br from-gray-50 via-white to-primary-50/30',
  green: 'gradient-green text-white',
  dark: 'bg-dark-950 text-white',
  gradient: 'bg-gradient-to-br from-primary-50 via-white to-accent-50',
};

const sizeVariants = {
  sm: 'py-12 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
};

export default function Section({
  children,
  className = '',
  id,
  variant = 'white',
  size = 'md',
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(bgVariants[variant], sizeVariants[size], 'relative overflow-hidden', className)}
    >
      <div className="container-main relative z-10">{children}</div>
    </section>
  );
}
