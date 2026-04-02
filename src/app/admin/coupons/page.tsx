'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Copy,
  Check,
  Tag,
  Percent,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Types ──────────────────────────────────────────────────
type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  productSlugs: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  usageCount: number;
  maxUsageTotal: number;
  maxUsagePerUser: number;
  minOrderValue: number;
  showBanner: boolean;
  bannerText: string | null;
  createdAt: string;
};

// ─── Status helpers ─────────────────────────────────────────
const STATUS_TABS = [
  { key: 'all', label: 'Alle' },
  { key: 'active', label: 'Aktiv' },
  { key: 'inactive', label: 'Inaktiv' },
  { key: 'expired', label: 'Abgelaufen' },
] as const;

function getCouponStatus(c: Coupon): string {
  if (!c.isActive) return 'inactive';
  if (c.endDate && new Date(c.endDate) < new Date()) return 'expired';
  if (c.startDate && new Date(c.startDate) > new Date()) return 'scheduled';
  return 'active';
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Aktiv', bg: 'bg-green-50', text: 'text-green-700' },
  inactive: { label: 'Inaktiv', bg: 'bg-gray-100', text: 'text-gray-600' },
  expired: { label: 'Abgelaufen', bg: 'bg-red-50', text: 'text-red-700' },
  scheduled: { label: 'Geplant', bg: 'bg-yellow-50', text: 'text-yellow-700' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_STYLES[status] || STATUS_STYLES.inactive;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ─── Skeleton / Empty ───────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-14 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-12 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-28 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-6 w-14 bg-gray-200 rounded" /></td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="h-5 w-28 bg-gray-200 rounded" />
      <div className="h-4 w-16 bg-gray-200 rounded" />
      <div className="h-5 w-20 bg-gray-200 rounded-full" />
      <div className="h-4 w-32 bg-gray-200 rounded" />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function CouponsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const limit = 20;

  // Reset page on filter/search change
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (search.trim()) params.set('search', search.trim());

  const { data, error, isLoading } = useSWR(
    `/api/admin/coupons?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const coupons: Coupon[] = data?.coupons || [];
  const totalPages: number = data?.totalPages || 1;
  const total: number = data?.total || 0;

  // ── Copy Code ───────────────────────────────────────────
  const handleCopy = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error || 'Fehler beim Löschen');
        return;
      }
      setDeleteTarget(null);
      mutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/coupons'));
    } catch {
      alert('Netzwerkfehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  // ── Format helpers ──────────────────────────────────────
  function fmtDate(d: string | null) {
    if (!d) return null;
    return format(new Date(d), 'dd.MM.yy', { locale: de });
  }

  function fmtDiscount(c: Coupon) {
    if (c.discountType === 'percentage') {
      return <span className="text-purple-600 font-semibold">{c.discountValue}%</span>;
    }
    return (
      <span className="text-green-600 font-semibold">
        {c.discountValue.toFixed(2).replace('.', ',')} €
      </span>
    );
  }

  function fmtDateRange(c: Coupon) {
    const s = fmtDate(c.startDate);
    const e = fmtDate(c.endDate);
    if (!s && !e) return 'Unbegrenzt';
    return [s, e].filter(Boolean).join(' – ');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Admin
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Gutscheine &amp; Rabatte</h1>
            {!isLoading && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {total}
              </span>
            )}
          </div>
          <Link
            href="/admin/coupons/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neuer Gutschein
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 mb-4 bg-white rounded-lg border border-gray-200 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Gutschein-Code suchen…"
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Fehler beim Laden der Gutscheine
          </div>
        )}

        {/* ──── Desktop Table ──── */}
        <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Rabatt</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Produkte</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Nutzung</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Zeitraum</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Tag className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Keine Gutscheine gefunden</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {search
                        ? 'Versuchen Sie einen anderen Suchbegriff'
                        : 'Erstellen Sie Ihren ersten Gutschein'}
                    </p>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const st = getCouponStatus(coupon);
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors group">
                      {/* Code */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/coupons/${coupon.id}`}
                            className="font-mono font-bold text-blue-600 hover:underline"
                          >
                            {coupon.code}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCopy(coupon.code)}
                            className="p-1 rounded text-gray-300 hover:text-blue-600 transition opacity-0 group-hover:opacity-100"
                            title="Code kopieren"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                            {coupon.description}
                          </p>
                        )}
                      </td>
                      {/* Rabatt */}
                      <td className="px-4 py-3">{fmtDiscount(coupon)}</td>
                      {/* Produkte */}
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs truncate max-w-[160px]">
                        {coupon.productSlugs || 'Alle Produkte'}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={st} />
                      </td>
                      {/* Nutzung */}
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                        <span className="font-medium">{coupon.usageCount}</span>
                        {coupon.maxUsageTotal > 0 && (
                          <span className="text-gray-400"> / {coupon.maxUsageTotal}</span>
                        )}
                      </td>
                      {/* Zeitraum */}
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                        {fmtDateRange(coupon)}
                      </td>
                      {/* Aktionen */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/admin/coupons/${coupon.id}`}
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Bearbeiten"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(coupon)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ──── Mobile Cards ──── */}
        <div className="sm:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : coupons.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-12 text-center">
              <Tag className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Keine Gutscheine gefunden</p>
              <p className="text-gray-400 text-sm mt-1">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Erstellen Sie Ihren ersten Gutschein'}
              </p>
            </div>
          ) : (
            coupons.map((coupon) => {
              const st = getCouponStatus(coupon);
              return (
                <div
                  key={coupon.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/coupons/${coupon.id}`}
                        className="font-mono font-bold text-blue-600 hover:underline text-base"
                      >
                        {coupon.code}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleCopy(coupon.code)}
                        className="p-1 rounded text-gray-400 hover:text-blue-600 transition"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <StatusBadge status={st} />
                  </div>

                  {coupon.description && (
                    <p className="text-xs text-gray-400 mb-2 truncate">{coupon.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      {coupon.discountType === 'percentage' ? (
                        <Percent className="w-3.5 h-3.5 text-purple-500" />
                      ) : (
                        <Tag className="w-3.5 h-3.5 text-green-500" />
                      )}
                      {fmtDiscount(coupon)}
                    </div>
                    <span className="text-gray-400">
                      Nutzung: <span className="font-medium text-gray-600">{coupon.usageCount}</span>
                      {coupon.maxUsageTotal > 0 && ` / ${coupon.maxUsageTotal}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{fmtDateRange(coupon)}</span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/coupons/${coupon.id}`}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(coupon)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ──── Pagination ──── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Seite {page} von {totalPages} ({total} Gutscheine)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──── Delete Confirmation Modal ──── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Gutschein löschen</h3>
                <p className="text-sm text-gray-500">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Möchten Sie den Gutschein{' '}
              <span className="font-mono font-bold text-gray-900">{deleteTarget.code}</span>{' '}
              wirklich löschen?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Wird gelöscht…' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
