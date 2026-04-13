'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { Package, User, LogOut, Loader2 } from 'lucide-react';

const kontoNav = [
  { label: 'Übersicht', href: '/konto', icon: User },
  { label: 'Bestellungen', href: '/konto/bestellungen', icon: Package },
];

function KontoLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { customer, loading, logout } = useCustomerAuth();

  // Show spinner while auth is loading — prevents flash
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // After loading, if not authenticated, redirect to login
  if (!customer) {
    router.replace(`/anmelden?redirect=${encodeURIComponent(pathname)}`);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dark Hero Header */}
      <div className="bg-gradient-to-br from-dark-900 via-dark-950 to-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-radial from-primary/15 to-transparent rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-radial from-primary/8 to-transparent rounded-full" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 sm:pt-36 pb-8 sm:pb-10 relative z-10">
          <nav className="flex items-center gap-2 text-sm mb-4">
            <Link href="/" className="text-white/40 hover:text-white/70 transition">Startseite</Link>
            <span className="text-white/20">/</span>
            <span className="text-white/70">Mein Konto</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Mein Konto</h1>
              {customer && (
                <p className="text-white/50 mt-1 text-sm">
                  Willkommen, {customer.firstName || customer.email}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-red-400 transition bg-white/[0.06] hover:bg-white/[0.1] px-4 py-2 rounded-xl border border-white/[0.08]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile horizontal tabs */}
      <div className="md:hidden border-b border-gray-200 bg-white sticky top-16 z-30">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {kontoNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/konto' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar Nav (desktop only) */}
          <nav className="hidden md:flex flex-col gap-1.5">
            {kontoNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/konto' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Content */}
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function KontoLayout({ children }: { children: React.ReactNode }) {
  return <KontoLayoutInner>{children}</KontoLayoutInner>;
}
