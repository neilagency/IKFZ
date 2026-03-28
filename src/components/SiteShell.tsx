'use client';

import { usePathname } from 'next/navigation';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return null;
  return <>{children}</>;
}
