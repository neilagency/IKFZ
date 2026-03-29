'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Package, ChevronLeft, ChevronRight, Eye, AlertCircle,
  RefreshCw, Calendar, CreditCard,
} from 'lucide-react';

interface OrderItem {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  productName: string;
  paymentMethodTitle: string;
  createdAt: string;
  datePaid: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'Ausstehend', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  processing: { label: 'In Bearbeitung', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  completed: { label: 'Abgeschlossen', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-400' },
  cancelled: { label: 'Storniert', color: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
  failed: { label: 'Fehlgeschlagen', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
  refunded: { label: 'Erstattet', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatPrice(amount: number) {
  return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <div className="flex items-start sm:items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-20 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PaginationControls({
  pagination,
  page,
  onPageChange,
}: {
  pagination: Pagination;
  page: number;
  onPageChange: (p: number) => void;
}) {
  if (pagination.pages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  const { pages: totalPages } = pagination;

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-gray-400 hidden sm:block">
        {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} von {pagination.total}
      </p>
      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
          aria-label="Vorherige Seite"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="w-8 text-center text-gray-300 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                p === page
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
          aria-label="Nächste Seite"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(); return r.json(); });

export default function BestellungenPage() {
  const [page, setPage] = useState(1);
  const { data, error, isLoading: loading, mutate } = useSWR(
    `/api/customer/orders?page=${page}&limit=10`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  const orders: OrderItem[] = data?.orders ?? [];
  const pagination: Pagination | null = data?.pagination ?? null;

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error && !loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Meine Bestellungen</h2>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-800 mb-4">
            Bestellungen konnten nicht geladen werden.
          </p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-600 font-medium px-5 py-2 rounded-xl hover:bg-red-50 transition text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Meine Bestellungen</h2>
          <Skeleton className="h-4 w-24" />
        </div>
        <OrdersSkeleton />
      </div>
    );
  }

  if (orders.length === 0 && !error) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Meine Bestellungen</h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Keine Bestellungen</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Sie haben noch keine Bestellungen aufgegeben. Starten Sie jetzt Ihren ersten KFZ-Service.
          </p>
          <Link
            href="/product/auto-online-anmelden"
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary-700 transition"
          >
            Jetzt bestellen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Meine Bestellungen</h2>
        {pagination && (
          <span className="text-xs text-gray-400">{pagination.total} Bestellung{pagination.total !== 1 ? 'en' : ''}</span>
        )}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((order) => {
          const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
          return (
            <Link
              key={order.id}
              href={`/konto/bestellungen/${order.id}`}
              className="block bg-white rounded-xl border border-gray-100 p-4 sm:p-5 hover:border-primary/20 hover:shadow-md transition-all group"
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-primary/60" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">
                      #{order.orderNumber}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border ${st.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{order.productName}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(order.createdAt)}
                    </span>
                    {order.paymentMethodTitle && (
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {order.paymentMethodTitle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-base font-bold text-gray-900">
                    {formatPrice(order.total)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 group-hover:text-primary transition">
                    <Eye className="w-3 h-3" />
                    <span className="hidden sm:inline">Details</span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination && (
        <PaginationControls
          pagination={pagination}
          page={page}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
