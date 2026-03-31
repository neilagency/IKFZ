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
  white: 'bg-gradient-to-b from-white via-white to-gray-50/80',
  light: 'bg-gradient-to-br from-gray-50/80 via-white to-primary-50/20',
  green: 'gradient-green text-white',
  dark: 'bg-dark-950 text-white',
  gradient: 'bg-gradient-to-br from-primary-50 via-white to-accent-50',
};

const sizeVariants = {
  sm: 'py-10 md:py-14',
  md: 'py-14 md:py-20',
  lg: 'py-16 md:py-24',
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
