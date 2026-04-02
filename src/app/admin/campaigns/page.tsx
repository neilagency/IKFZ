'use client';

import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Mail,
  Send,
  Clock,
  AlertCircle,
  ChevronRight,
  Search,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Campaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

const STATUS_TABS = [
  { key: 'all', label: 'Alle' },
  { key: 'draft', label: 'Entwurf' },
  { key: 'scheduled', label: 'Geplant' },
  { key: 'sent', label: 'Gesendet' },
  { key: 'failed', label: 'Fehlgeschlagen' },
] as const;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  draft: { label: 'Entwurf', bg: 'bg-gray-100', text: 'text-gray-700', icon: <Mail className="w-3 h-3" /> },
  scheduled: { label: 'Geplant', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  sending: { label: 'Wird gesendet', bg: 'bg-blue-50', text: 'text-blue-700', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  sent: { label: 'Gesendet', bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: 'Fehlgeschlagen', bg: 'bg-red-50', text: 'text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-40 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-20 bg-gray-200 rounded-full" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-10 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-10 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-10 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-6 w-6 bg-gray-200 rounded" /></td>
    </tr>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const params = new URLSearchParams();
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (search.trim()) params.set('search', search.trim());
  params.set('limit', '50');

  const { data, error, isLoading } = useSWR(
    `/api/admin/email-campaigns?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const campaigns: Campaign[] = data?.campaigns || [];

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/email-campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error || 'Fehler beim Löschen');
        return;
      }
      setDeleteId(null);
      mutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/email-campaigns'));
    } catch {
      alert('Netzwerkfehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Back link */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Admin
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">E-Mail Kampagnen</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kampagnen erstellen, verwalten und versenden
            </p>
          </div>
          <Link
            href="/admin/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neue Kampagne
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
            placeholder="Kampagne suchen..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Fehler beim Laden der Kampagnen
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Betreff</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 hidden lg:table-cell">Empfänger</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 hidden lg:table-cell">Öffnungen</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 hidden lg:table-cell">Klicks</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Datum</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

              {!isLoading && campaigns.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Keine Kampagnen gefunden</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Erstellen Sie Ihre erste E-Mail-Kampagne
                    </p>
                    <Link
                      href="/admin/campaigns/new"
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Neue Kampagne
                    </Link>
                  </td>
                </tr>
              )}

              {!isLoading &&
                campaigns.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {c.name || '(Ohne Name)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell truncate max-w-[200px]">
                      {c.subject || '–'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell tabular-nums">
                      {c.totalRecipients || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell tabular-nums">
                      {c.openCount || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell tabular-nums">
                      {c.clickCount || 0}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(c.sentAt || c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(c.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-28 bg-gray-200 rounded mb-3" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
            ))}

          {!isLoading && campaigns.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">Keine Kampagnen gefunden</p>
              <Link
                href="/admin/campaigns/new"
                className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg"
              >
                <Plus className="w-3 h-3" />
                Neue Kampagne
              </Link>
            </div>
          )}

          {!isLoading &&
            campaigns.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.name || '(Ohne Name)'}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.subject || '–'}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-gray-400">{formatDate(c.sentAt || c.createdAt)}</span>
                </div>
                {c.totalRecipients > 0 && (
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>{c.totalRecipients} Empfänger</span>
                    <span>{c.openCount} Öffn.</span>
                    <span>{c.clickCount} Klicks</span>
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(c.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Pagination info */}
        {data?.pagination && data.pagination.total > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            {campaigns.length} von {data.pagination.total} Kampagnen
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Kampagne löschen?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten dieser Kampagne werden dauerhaft gelöscht.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
