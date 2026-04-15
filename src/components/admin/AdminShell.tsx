'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, Users, CreditCard, Receipt,
  Wallet, FileText, BookOpen, Globe, Settings, ExternalLink, LogOut,
  ImageIcon, Percent, Mail, Menu, X, MapPin,
} from 'lucide-react';

const API = '/api/admin';

const TABS: ReadonlyArray<{ id: string; label: string; icon: typeof LayoutDashboard; section?: string; href: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Übersicht', href: '/admin' },
  { id: 'orders', label: 'Bestellungen', icon: ShoppingCart, section: 'E-Commerce', href: '/admin?tab=orders' },
  { id: 'products', label: 'Produkte', icon: Package, href: '/admin?tab=products' },
  { id: 'customers', label: 'Kunden', icon: Users, href: '/admin?tab=customers' },
  { id: 'payments', label: 'Zahlungen', icon: CreditCard, href: '/admin?tab=payments' },
  { id: 'invoices', label: 'Rechnungen', icon: Receipt, href: '/admin?tab=invoices' },
  { id: 'gateways', label: 'Zahlungs-Gateways', icon: Wallet, href: '/admin?tab=gateways' },
  { id: 'coupons', label: 'Gutscheine', icon: Percent, section: 'Marketing', href: '/admin?tab=coupons' },
  { id: 'campaigns', label: 'E-Mail Kampagnen', icon: Mail, href: '/admin?tab=campaigns' },
  { id: 'pages', label: 'Seiten', icon: FileText, section: 'CMS', href: '/admin?tab=pages' },
  { id: 'posts', label: 'Blog / Beiträge', icon: BookOpen, href: '/admin?tab=posts' },
  { id: 'media', label: 'Medien', icon: ImageIcon, href: '/admin?tab=media' },
  { id: 'seo', label: 'SEO', icon: Globe, href: '/admin?tab=seo' },
  { id: 'cities', label: 'Städte', icon: MapPin, href: '/admin?tab=cities' },
  { id: 'settings', label: 'Einstellungen', icon: Settings, section: 'System', href: '/admin?tab=settings' },
];

/**
 * AdminShell wraps any admin sub-page with the sidebar + header.
 * Used for pages like /admin/orders/[id] that need the full admin chrome.
 */
export default function AdminShell({
  children,
  activeTab = 'orders',
  title,
}: {
  children: React.ReactNode;
  activeTab?: string;
  title?: string;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await fetch(`${API}/auth`, { method: 'DELETE', credentials: 'include' });
    router.push('/admin');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar w-64 border-r border-white/[0.06] bg-dark-900 flex flex-col${sidebarOpen ? ' admin-sidebar-open' : ''}`}>
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">iKFZ Admin</h1>
            <p className="text-xs text-white/30 mt-1">E-Commerce & CMS</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Menü schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {TABS.map((t) => (
            <div key={t.id}>
              {t.section && <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold mt-4 mb-2 px-3">{t.section}</p>}
              <a
                href={t.href}
                onClick={(e) => { e.preventDefault(); setSidebarOpen(false); router.push(t.href); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${activeTab === t.id ? 'bg-primary/10 text-primary' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
              >
                <t.icon className="w-4 h-4" />{t.label}
              </a>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.06] space-y-1">
          <a href="/" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:bg-primary/10 hover:text-primary transition-colors">
            <ExternalLink className="w-4 h-4" /> Website ansehen
          </a>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" /> Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-light flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Mobile top bar */}
        <div className="admin-mobile-header lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Menü öffnen"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-gray-900 text-sm font-semibold">iKFZ Admin</span>
          {title && <span className="ml-auto text-xs text-gray-400 font-medium">{title}</span>}
        </div>

        {/* Content */}
        <div className="admin-main-content flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
