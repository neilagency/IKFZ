'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import {
  Plus, ArrowLeft, ExternalLink, Loader2, Save, Trash2, X, Package,
  FileText, MessageSquare, Search as SearchIcon, AlertCircle,
} from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaLibrary';

/* ── Types ──────────────────────────────────────── */
interface ProductOption {
  name: string;
  price: number;
  key: string;
}

interface FaqItem {
  q: string;
  a: string;
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  price: 0,
  description: '',
  serviceType: '',
  formType: '',
  isActive: true,
  options: [] as ProductOption[],
  content: '',
  heroTitle: '',
  heroSubtitle: '',
  featuredImage: '',
  faqItems: [] as FaqItem[],
  metaTitle: '',
  metaDescription: '',
  canonical: '',
  robots: 'index, follow',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
};

type FormState = typeof EMPTY_FORM & { id?: string };

const API = '/api/admin';

/* ── Product Row ───────────────────────────────── */
const ProductRow = memo(function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: any;
  onEdit: (p: any) => void;
  onDelete: (p: any) => void;
}) {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="px-6 py-3.5">
        <span className="font-medium text-gray-900">{product.name}</span>
      </td>
      <td className="px-6 py-3.5">
        <a
          href={`/product/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-xs hover:underline flex items-center gap-1"
        >
          /product/{product.slug} <ExternalLink className="w-3 h-3" />
        </a>
      </td>
      <td className="px-6 py-3.5 font-medium text-gray-900">
        {'\u20AC'}
        {product.price.toFixed(2)}
      </td>
      <td className="px-6 py-3.5 text-gray-500 capitalize">
        {product.serviceType || '-'}
      </td>
      <td className="px-6 py-3.5">
        <span
          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${
            product.isActive
              ? 'bg-green-100 text-green-700 border-green-300'
              : 'bg-gray-100 text-gray-600 border-gray-300'
          }`}
        >
          {product.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      </td>
      <td className="px-6 py-3.5">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onEdit(product)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-primary-600 transition font-medium"
          >
            Bearbeiten
          </button>
          <button
            onClick={() => onDelete(product)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

/* ── Confirm Modal ─────────────────────────────── */
function ConfirmModal({
  title,
  description,
  loading,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Toast ──────────────────────────────────────── */
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
        type === 'success'
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────── */
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 animate-pulse"
        >
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/5" />
          </div>
          <div className="h-6 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── Pagination ─────────────────────────────────── */
function Pagination({
  page,
  pages,
  total,
  onPageChange,
}: {
  page: number;
  pages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">{total} Produkte</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-xs rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
        >
          ←
        </button>
        <span className="text-xs text-gray-500">
          {page} / {pages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="px-3 py-1.5 text-xs rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
        >
          →
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PRODUCTS MANAGER (main export)
   ══════════════════════════════════════════════════ */
export default function ProductsManager({ token }: { token?: string }) {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [editProduct, setEditProduct] = useState<FormState | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'seo' | 'faq'>(
    'basic',
  );
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerField, setMediaPickerField] = useState<
    'featuredImage' | 'ogImage'
  >('featuredImage');

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  /* ── Fetch product list ── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set('search', search);
      const res = await fetch(`${API}/products?${params}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setProducts(data.products || []);
      setPagination(
        data.pagination || { page: 1, pages: 1, total: data.products?.length || 0 },
      );
    } catch {
      setToast({ message: 'Fehler beim Laden', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ── JSON parser ── */
  const parseJson = (val: string | null | undefined, fallback: any) => {
    if (!val) return fallback;
    try {
      const parsed = JSON.parse(val);
      // Ensure arrays when fallback is an array (e.g. options stored as object in legacy data)
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      return parsed;
    } catch {
      return fallback;
    }
  };

  /* ── Open edit (full fetch) ── */
  const openEdit = async (product: any) => {
    setLoadingProduct(true);
    try {
      const res = await fetch(`${API}/products?id=${product.id}`, {
        credentials: 'include',
      });
      const full = await res.json();
      setIsNew(false);
      setActiveTab('basic');
      setEditProduct({
        id: full.id,
        name: full.name,
        slug: full.slug,
        price: full.price,
        description: full.description || '',
        serviceType: full.serviceType || '',
        formType: full.formType || '',
        isActive: full.isActive,
        options: parseJson(full.options, []),
        content: full.content || '',
        heroTitle: full.heroTitle || '',
        heroSubtitle: full.heroSubtitle || '',
        featuredImage: full.featuredImage || '',
        faqItems: parseJson(full.faqItems, []),
        metaTitle: full.metaTitle || '',
        metaDescription: full.metaDescription || '',
        canonical: full.canonical || '',
        robots: full.robots || 'index, follow',
        ogTitle: full.ogTitle || '',
        ogDescription: full.ogDescription || '',
        ogImage: full.ogImage || '',
      });
    } catch {
      setToast({ message: 'Fehler beim Laden', type: 'error' });
    } finally {
      setLoadingProduct(false);
    }
  };

  const openCreate = () => {
    setIsNew(true);
    setActiveTab('basic');
    setEditProduct({ ...EMPTY_FORM });
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

  const saveProduct = async () => {
    if (!editProduct || !editProduct.name) return;
    setSaving(true);
    try {
      const payload = {
        ...editProduct,
        slug: editProduct.slug || generateSlug(editProduct.name),
        options: JSON.stringify(editProduct.options),
        faqItems: JSON.stringify(editProduct.faqItems),
      };
      const res = await fetch(`${API}/products`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditProduct(null);
        setToast({
          message: isNew ? 'Produkt erstellt!' : 'Produkt gespeichert!',
          type: 'success',
        });
        fetchProducts();
      } else {
        const err = await res.json().catch(() => null);
        setToast({
          message: err?.error || 'Fehler beim Speichern',
          type: 'error',
        });
      }
    } catch {
      setToast({ message: 'Fehler beim Speichern', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/products?id=${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setToast({ message: 'Produkt gelöscht', type: 'success' });
        fetchProducts();
      }
    } catch {
      setToast({ message: 'Fehler beim Löschen', type: 'error' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const setField = (key: string, value: any) => {
    if (!editProduct) return;
    setEditProduct({ ...editProduct, [key]: value });
  };

  /* ── Options helpers ── */
  const addOption = () => {
    if (editProduct)
      setField('options', [
        ...editProduct.options,
        { name: '', price: 0, key: '' },
      ]);
  };
  const updateOption = (i: number, key: string, val: any) => {
    if (!editProduct) return;
    const opts = [...editProduct.options];
    opts[i] = {
      ...opts[i],
      [key]: key === 'price' ? parseFloat(val) || 0 : val,
    };
    setField('options', opts);
  };
  const removeOption = (i: number) => {
    if (editProduct)
      setField(
        'options',
        editProduct.options.filter((_, idx) => idx !== i),
      );
  };

  /* ── FAQ helpers ── */
  const addFaq = () => {
    if (editProduct)
      setField('faqItems', [...editProduct.faqItems, { q: '', a: '' }]);
  };
  const updateFaq = (i: number, key: 'q' | 'a', val: string) => {
    if (!editProduct) return;
    const faqs = [...editProduct.faqItems];
    faqs[i] = { ...faqs[i], [key]: val };
    setField('faqItems', faqs);
  };
  const removeFaq = (i: number) => {
    if (editProduct)
      setField(
        'faqItems',
        editProduct.faqItems.filter((_, idx) => idx !== i),
      );
  };

  /* ── Loading Skeleton ── */
  if (loading && !editProduct) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-52 bg-gray-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100/80">
          <TableSkeleton rows={6} />
        </div>
      </div>
    );
  }

  if (loadingProduct) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-52 bg-gray-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100/80 p-8">
          <div className="flex items-center justify-center gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Produkt wird geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Edit / Create Form ── */
  if (editProduct) {
    const TABS = [
      {
        key: 'basic' as const,
        label: 'Grunddaten',
        icon: <Package className="w-4 h-4" />,
      },
      {
        key: 'content' as const,
        label: 'Inhalt',
        icon: <FileText className="w-4 h-4" />,
      },
      {
        key: 'seo' as const,
        label: 'SEO',
        icon: <SearchIcon className="w-4 h-4" />,
      },
      {
        key: 'faq' as const,
        label: 'FAQ',
        icon: <MessageSquare className="w-4 h-4" />,
      },
    ];

    return (
      <div className="space-y-6">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setEditProduct(null)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isNew ? 'Neues Produkt' : editProduct.name}
            </h1>
          </div>
          <div className="flex gap-2">
            {!isNew && editProduct.slug && (
              <a
                href={`/product/${editProduct.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition items-center gap-1.5 border border-gray-200/80"
              >
                <ExternalLink className="w-4 h-4" />
                Seite ansehen
              </a>
            )}
            <button
              onClick={saveProduct}
              disabled={saving || !editProduct.name}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm hover:bg-primary-600 transition disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Basic Tab */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-2xl border border-gray-100/80 p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  value={editProduct.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200/80 rounded-xl text-sm focus:ring-2 focus:ring-primary/15 focus:border-primary/40 outline-none transition"
                  placeholder="z.B. Fahrzeugummeldung"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={editProduct.slug}
                  onChange={(e) => setField('slug', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder="auto-generiert"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Grundpreis (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editProduct.price}
                  onChange={(e) =>
                    setField('price', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Service-Typ
                </label>
                <input
                  type="text"
                  value={editProduct.serviceType}
                  onChange={(e) => setField('serviceType', e.target.value)}
                  placeholder="abmeldung, anmeldung..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Formular-Typ
                </label>
                <select
                  value={editProduct.formType}
                  onChange={(e) => setField('formType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                >
                  <option value="">Kein Formular</option>
                  <option value="abmeldung">Abmeldeformular</option>
                  <option value="anmeldung">Anmeldeformular</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Beschreibung
              </label>
              <textarea
                value={editProduct.description}
                onChange={(e) => setField('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-20 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="Kurze Produktbeschreibung..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editProduct.isActive}
                onChange={(e) => setField('isActive', e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label className="text-sm text-gray-700">Aktiv</label>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-700">
                  Preis-Optionen
                </label>
                <button
                  onClick={addOption}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Option hinzufügen
                </button>
              </div>
              {editProduct.options.length === 0 && (
                <p className="text-xs text-gray-400">Keine Optionen.</p>
              )}
              <div className="space-y-2">
                {editProduct.options.map((opt, i) => (
                  <div
                    key={i}
                    className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-100"
                  >
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => updateOption(i, 'name', e.target.value)}
                      placeholder="Name"
                      className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={opt.price}
                      onChange={(e) => updateOption(i, 'price', e.target.value)}
                      placeholder="Preis"
                      className="w-24 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    <input
                      type="text"
                      value={opt.key}
                      onChange={(e) => updateOption(i, 'key', e.target.value)}
                      placeholder="Key"
                      className="w-28 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    <button
                      onClick={() => removeOption(i)}
                      className="text-red-400 hover:text-red-600 p-1 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="bg-white rounded-2xl border border-gray-100/80 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hero-Titel
              </label>
              <input
                type="text"
                value={editProduct.heroTitle}
                onChange={(e) => setField('heroTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="Überschrift auf der Produktseite (h1)"
              />
              <p className="text-xs text-gray-400 mt-1">
                Falls leer, wird der Produktname verwendet.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hero-Untertitel
              </label>
              <input
                type="text"
                value={editProduct.heroSubtitle}
                onChange={(e) => setField('heroSubtitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="Kurzer Text unter der Überschrift"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Featured Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editProduct.featuredImage}
                  onChange={(e) => setField('featuredImage', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => {
                    setMediaPickerField('featuredImage');
                    setMediaPickerOpen(true);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-primary hover:bg-primary/5 transition whitespace-nowrap"
                >
                  Mediathek
                </button>
              </div>
              {editProduct.featuredImage && (
                <img
                  src={editProduct.featuredImage}
                  alt="Preview"
                  className="mt-2 rounded-lg max-h-40 object-cover border border-gray-100"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Seiteninhalt (HTML)
              </label>
              <textarea
                value={editProduct.content}
                onChange={(e) => setField('content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono h-64 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="<h2>Überschrift</h2><p>Beschreibungstext...</p>"
              />
              <p className="text-xs text-gray-400 mt-1">
                HTML-Inhalt der Produktseite. Wird zwischen Preise und
                Zahlungsmethoden angezeigt.
              </p>
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="bg-white rounded-2xl border border-gray-100/80 p-6 space-y-5">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[11px] text-gray-400 mb-2 font-medium uppercase tracking-wider">
                Google-Vorschau
              </p>
              <p className="text-[#1a0dab] text-base font-medium truncate">
                {editProduct.metaTitle || editProduct.name || 'Seitentitel'}
              </p>
              <p className="text-[#006621] text-sm truncate">
                {editProduct.canonical ||
                  `/product/${editProduct.slug || '...'}`}
              </p>
              <p className="text-sm text-gray-600 line-clamp-2">
                {editProduct.metaDescription ||
                  editProduct.description ||
                  'Meta-Beschreibung...'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Meta-Titel{' '}
                <span className="text-gray-400 font-normal ml-2">
                  {(editProduct.metaTitle || '').length}/60
                </span>
              </label>
              <input
                type="text"
                value={editProduct.metaTitle}
                onChange={(e) => setField('metaTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="SEO-Titel (max. 60 Zeichen)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Meta-Beschreibung{' '}
                <span className="text-gray-400 font-normal ml-2">
                  {(editProduct.metaDescription || '').length}/160
                </span>
              </label>
              <textarea
                value={editProduct.metaDescription}
                onChange={(e) => setField('metaDescription', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-20 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="SEO-Beschreibung (max. 160 Zeichen)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Canonical URL
              </label>
              <input
                type="text"
                value={editProduct.canonical}
                onChange={(e) => setField('canonical', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="Falls leer: automatisch generiert"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Robots
              </label>
              <select
                value={editProduct.robots}
                onChange={(e) => setField('robots', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              >
                <option value="index, follow">index, follow</option>
                <option value="noindex, follow">noindex, follow</option>
                <option value="index, nofollow">index, nofollow</option>
                <option value="noindex, nofollow">noindex, nofollow</option>
              </select>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                OpenGraph / Social Media
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    OG Titel
                  </label>
                  <input
                    type="text"
                    value={editProduct.ogTitle}
                    onChange={(e) => setField('ogTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    placeholder="Falls leer: Meta-Titel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    OG Beschreibung
                  </label>
                  <textarea
                    value={editProduct.ogDescription}
                    onChange={(e) => setField('ogDescription', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-16 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    placeholder="Falls leer: Meta-Beschreibung"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    OG Bild URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editProduct.ogImage}
                      onChange={(e) => setField('ogImage', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                      placeholder="https://... (1200×630px empfohlen)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMediaPickerField('ogImage');
                        setMediaPickerOpen(true);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-primary hover:bg-primary/5 transition whitespace-nowrap"
                    >
                      Mediathek
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                Dynamische Seiten-URL
              </h3>
              <div className="bg-primary-50 rounded-xl p-3 flex items-center justify-between border border-primary-100">
                <code className="text-sm text-primary font-mono">
                  /product/{editProduct.slug || '...'}
                </code>
                {editProduct.slug && (
                  <a
                    href={`/product/${editProduct.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                  >
                    Öffnen <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="bg-white rounded-2xl border border-gray-100/80 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-700">
                  FAQ-Einträge
                </h3>
                <p className="text-xs text-gray-400">
                  Werden auf der Produktseite als FAQ-Accordion und als JSON-LD
                  Schema angezeigt.
                </p>
              </div>
              <button
                onClick={addFaq}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> FAQ hinzufügen
              </button>
            </div>
            {editProduct.faqItems.length === 0 && (
              <div className="text-center py-10">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Keine FAQ-Einträge.</p>
              </div>
            )}
            <div className="space-y-4">
              {editProduct.faqItems.map((faq, i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-xl p-4 relative border border-gray-100"
                >
                  <button
                    onClick={() => removeFaq(i)}
                    className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="space-y-3 pr-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Frage {i + 1}
                      </label>
                      <input
                        type="text"
                        value={faq.q}
                        onChange={(e) => updateFaq(i, 'q', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        placeholder="Häufig gestellte Frage..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Antwort
                      </label>
                      <textarea
                        value={faq.a}
                        onChange={(e) => updateFaq(i, 'a', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-20 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        placeholder="Ausführliche Antwort..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media Picker */}
        <MediaPicker
          open={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          onSelect={(url) => {
            if (editProduct) setField(mediaPickerField, url);
          }}
          token={token || ''}
        />
      </div>
    );
  }

  /* ── Product List ── */
  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Produkt löschen?"
          description={`"${deleteTarget.name}" wird unwiderruflich gelöscht.`}
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Produkte & Dienste
          </h1>
          <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
            {pagination.total}
          </span>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm hover:bg-primary-600 transition flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          Neues Produkt
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100/80">
        <div className="w-full max-w-sm relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Produkt suchen..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:border-primary focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-700 font-medium mb-1">
              {search ? 'Kein Ergebnis' : 'Keine Produkte vorhanden'}
            </h3>
            <p className="text-xs text-gray-400">
              {search
                ? 'Kein Ergebnis für diese Suche.'
                : 'Erstelle dein erstes Produkt, um loszulegen.'}
            </p>
            {!search && (
              <button
                onClick={openCreate}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-600 transition font-medium"
              >
                Erstes Produkt erstellen
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Produkt
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Preis
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
