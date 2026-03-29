'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import {
  Package, ArrowRight, CheckCircle2, TrendingUp, Clock,
  CheckCircle, AlertCircle, RefreshCw, Car, Mail, User as UserIcon,
} from 'lucide-react';

interface Stats {
  total: number;
  completed: number;
  pending: number;
  processing: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  productName: string;
  createdAt: string;
}

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  pending: { label: 'Ausstehend', dot: 'bg-amber-400' },
  processing: { label: 'In Bearbeitung', dot: 'bg-blue-400' },
  completed: { label: 'Abgeschlossen', dot: 'bg-green-400' },
  cancelled: { label: 'Storniert', dot: 'bg-gray-400' },
  failed: { label: 'Fehlgeschlagen', dot: 'bg-red-400' },
  refunded: { label: 'Erstattet', dot: 'bg-purple-400' },
};

function formatPrice(n: number) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `vor ${days} Tagen`;
  return new Date(iso).toLocaleDateString('de-DE');
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5"><Skeleton className="h-7 w-10 mb-2" /><Skeleton className="h-4 w-24" /></div>
      ))}
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

const fetcher = (url: string) => {
  const normalizedUrl = url.endsWith('/') ? url : `${url}/`;
  return fetch(normalizedUrl, { credentials: 'include' }).then((r) => { if (!r.ok) throw new Error(); return r.json(); });
};

export default function KontoPage() {
  const { customer, linkedOrders, clearLinkedOrders } = useCustomerAuth();
  const { data, error, isLoading: loading, mutate } = useSWR('/api/customer/stats', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const stats: Stats | null = data?.stats ?? null;
  const recent: RecentOrder[] = data?.recentOrders ?? [];
  const loadData = useCallback(() => mutate(), [mutate]);

  return (
    <div className="space-y-6">
      {/* Linked orders notification */}
      {linkedOrders > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {linkedOrders === 1
                ? '1 frühere Bestellung wurde Ihrem Konto zugeordnet.'
                : `${linkedOrders} frühere Bestellungen wurden Ihrem Konto zugeordnet.`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Ihre bisherigen Bestellungen sind jetzt unter &quot;Meine Bestellungen&quot; verfügbar.
            </p>
          </div>
          <button
            onClick={clearLinkedOrders}
            className="text-gray-400 hover:text-gray-600 text-xs font-medium flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Daten konnten nicht geladen werden.</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {loading ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Gesamt</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">{stats.completed}</p>
            <p className="text-xs text-gray-500 mt-0.5">Abgeschlossen</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">{stats.processing}</p>
            <p className="text-xs text-gray-500 mt-0.5">In Bearbeitung</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-500 mt-2">{stats.pending}</p>
            <p className="text-xs text-gray-500 mt-0.5">Ausstehend</p>
          </div>
        </div>
      ) : null}

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Letzte Bestellungen</h3>
          <Link href="/konto/bestellungen" className="text-xs text-primary hover:text-primary-700 font-medium transition">
            Alle anzeigen →
          </Link>
        </div>
        {loading ? (
          <RecentSkeleton />
        ) : recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((order) => {
              const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending;
              return (
                <Link
                  key={order.id}
                  href={`/konto/bestellungen/${order.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:border-primary/20 hover:shadow-sm transition group"
                >
                  <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-primary/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">#{order.orderNumber}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {order.productName} · {timeAgo(order.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                    {formatPrice(order.total)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition flex-shrink-0 hidden sm:block" />
                </Link>
              );
            })}
          </div>
        ) : !error ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Noch keine Bestellungen vorhanden.</p>
          </div>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/konto/bestellungen"
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Alle Bestellungen</p>
              <p className="text-xs text-gray-400">Bestellverlauf anzeigen</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition" />
        </Link>
        <Link
          href="/product/auto-online-anmelden"
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Neue Bestellung</p>
              <p className="text-xs text-gray-400">KFZ-Service bestellen</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition" />
        </Link>
      </div>

      {/* Account Info */}
      {customer && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Kontodaten</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Name</p>
                <p className="text-gray-900 font-medium">{customer.firstName} {customer.lastName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">E-Mail</p>
                <p className="text-gray-900 font-medium">{customer.email}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
