'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Tag,
  Percent,
  Calendar,
  ShieldCheck,
  BarChart3,
  Package,
  Settings2,
  Megaphone,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Code Generator ─────────────────────────────────────────
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Toast Component ────────────────────────────────────────
type ToastData = { message: string; type: 'success' | 'error' } | null;

function Toast({ toast, onClose }: { toast: NonNullable<ToastData>; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}
      >
        {toast.type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 shrink-0" />
        )}
        {toast.message}
        <button onClick={onClose} className="ml-2 p-0.5 hover:opacity-70">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────
type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
};

type Usage = {
  id: string;
  email: string;
  orderId: string;
  usedAt: string;
};

// ─── Main Page ──────────────────────────────────────────────
export default function CouponEditorPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';

  // Form state
  const [code, setCode] = useState(isNew ? generateCode() : '');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxUsageTotal, setMaxUsageTotal] = useState('');
  const [maxUsagePerUser, setMaxUsagePerUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // ── Fetch existing coupon ─────────────────────────────────
  const { data: couponData, isLoading } = useSWR(
    !isNew && id ? `/api/admin/coupons/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // ── Fetch products ────────────────────────────────────────
  const { data: productsData } = useSWR(
    '/api/admin/products?limit=100',
    fetcher,
    { revalidateOnFocus: false }
  );

  const allProducts: Product[] = productsData?.products || [];
  const filteredProducts = productSearch
    ? allProducts.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.slug.toLowerCase().includes(productSearch.toLowerCase())
      )
    : allProducts;

  // ── Populate form from fetched data ───────────────────────
  useEffect(() => {
    if (couponData && !couponData.error && !loaded) {
      setCode(couponData.code || '');
      setDescription(couponData.description || '');
      setDiscountType(couponData.discountType || 'percentage');
      setDiscountValue(String(couponData.discountValue ?? ''));
      setMinOrderValue(String(couponData.minOrderValue ?? ''));
      setMaxUsageTotal(String(couponData.maxUsageTotal ?? ''));
      setMaxUsagePerUser(String(couponData.maxUsagePerUser ?? ''));
      setIsActive(couponData.isActive ?? true);
      setShowBanner(couponData.showBanner ?? false);
      setBannerText(couponData.bannerText || '');
      setStartDate(
        couponData.startDate
          ? new Date(couponData.startDate).toISOString().slice(0, 16)
          : ''
      );
      setEndDate(
        couponData.endDate
          ? new Date(couponData.endDate).toISOString().slice(0, 16)
          : ''
      );
      if (couponData.productSlugs) {
        setSelectedProducts(
          couponData.productSlugs
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        );
      }
      setLoaded(true);
    }
  }, [couponData, loaded]);

  const usages: Usage[] = couponData?.usages || [];

  // ── Toast helper ──────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // ── Copy code ─────────────────────────────────────────────
  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [code]);

  // ── Product toggle ────────────────────────────────────────
  const toggleProduct = useCallback((slug: string) => {
    setSelectedProducts((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }, []);

  // ── Save ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!code.trim()) {
      showToast('Bitte geben Sie einen Gutschein-Code ein.', 'error');
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      showToast('Bitte geben Sie einen gültigen Rabattwert ein.', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        discountType,
        discountValue: Number(discountValue),
        productSlugs: selectedProducts.length > 0 ? selectedProducts.join(',') : null,
        minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
        maxUsageTotal: maxUsageTotal ? Number(maxUsageTotal) : 0,
        maxUsagePerUser: maxUsagePerUser ? Number(maxUsagePerUser) : 0,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        isActive,
        showBanner,
        bannerText: showBanner ? bannerText.trim() || null : null,
      };

      const url = isNew ? '/api/admin/coupons' : `/api/admin/coupons/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast(json.error || 'Fehler beim Speichern', 'error');
        return;
      }

      const saved = await res.json();
      showToast(isNew ? 'Gutschein erstellt!' : 'Gutschein gespeichert!');

      if (isNew && saved.id) {
        router.push(`/admin/coupons/${saved.id}`);
      }
    } catch {
      showToast('Netzwerkfehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    code, description, discountType, discountValue, selectedProducts,
    minOrderValue, maxUsageTotal, maxUsagePerUser, startDate, endDate,
    isActive, showBanner, bannerText, isNew, id, router, showToast,
  ]);

  // ── Loading state ─────────────────────────────────────────
  if (!isNew && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isNew && couponData?.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Gutschein nicht gefunden</p>
          <Link href="/admin/coupons" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/admin/coupons"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isNew ? 'Neuer Gutschein' : code}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ══════ Main Content (2 cols) ══════ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Section: Gutschein-Details ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-5">
                <Tag className="w-5 h-5 text-blue-600" />
                Gutschein-Details
              </h2>

              {/* Code */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gutschein-Code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="z.B. SOMMER20"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono font-bold uppercase tracking-wider text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Code kopieren"
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCode(generateCode())}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Code generieren"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="z.B. Sommeraktion 2026"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Discount Type + Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rabatt-Typ
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="percentage">Prozent (%)</option>
                    <option value="fixed">Fester Betrag (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rabattwert
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                      min="0"
                      step={discountType === 'percentage' ? '1' : '0.01'}
                      className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      {discountType === 'percentage' ? '%' : '€'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section: Produkt-Zuordnung ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <Package className="w-5 h-5 text-blue-600" />
                Produkt-Zuordnung
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Wählen Sie Produkte aus, für die der Gutschein gilt. Ohne Auswahl gilt er für alle Produkte.
              </p>

              {/* Product search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Produkte durchsuchen…"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedProducts.map((slug) => {
                    const prod = allProducts.find((p) => p.slug === slug);
                    return (
                      <span
                        key={slug}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md"
                      >
                        {prod?.name || slug}
                        <button
                          type="button"
                          onClick={() => toggleProduct(slug)}
                          className="p-0.5 hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedProducts([])}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                  >
                    Alle entfernen
                  </button>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-gray-400">
                    Keine Produkte gefunden
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.slug)}
                        onChange={() => toggleProduct(product.slug)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{product.slug}</p>
                      </div>
                      <span className="text-sm text-gray-500 tabular-nums">
                        {product.price?.toFixed(2).replace('.', ',')} €
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* ── Section: Nutzungsverlauf (editing only) ── */}
            {!isNew && usages.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Nutzungsverlauf
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-3 py-2 text-left font-medium text-gray-500">E-Mail</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Bestellung</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Datum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {usages.map((usage) => (
                        <tr key={usage.id} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 text-gray-700">{usage.email}</td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/admin/orders/${usage.orderId}`}
                              className="text-blue-600 hover:underline font-mono text-xs"
                            >
                              {usage.orderId.slice(0, 8)}…
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-gray-500 text-xs">
                            {format(new Date(usage.usedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ══════ Sidebar (1 col) ══════ */}
          <div className="space-y-6">
            {/* ── Einschränkungen ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Einschränkungen
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mindestbestellwert (€)
                  </label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max. Nutzungen gesamt
                  </label>
                  <input
                    type="number"
                    value={maxUsageTotal}
                    onChange={(e) => setMaxUsageTotal(e.target.value)}
                    placeholder="0 = Unbegrenzt"
                    min="0"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max. Nutzungen pro Kunde
                  </label>
                  <input
                    type="number"
                    value={maxUsagePerUser}
                    onChange={(e) => setMaxUsagePerUser(e.target.value)}
                    placeholder="0 = Unbegrenzt"
                    min="0"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* ── Zeitraum ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                Zeitraum
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Startdatum
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enddatum
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* ── Status & Banner ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                <Settings2 className="w-5 h-5 text-blue-600" />
                Status &amp; Banner
              </h2>

              <div className="space-y-4">
                {/* Active toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">Aktiv</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isActive ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>

                {/* Banner toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">Banner anzeigen</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showBanner}
                    onClick={() => setShowBanner(!showBanner)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      showBanner ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${
                        showBanner ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>

                {/* Banner text */}
                {showBanner && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Megaphone className="w-3.5 h-3.5 inline-block mr-1 text-yellow-500" />
                      Banner-Text
                    </label>
                    <input
                      type="text"
                      value={bannerText}
                      onChange={(e) => setBannerText(e.target.value)}
                      placeholder="z.B. 🎉 20% Rabatt mit Code SOMMER20"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Statistiken (editing only) ── */}
            {!isNew && couponData && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Statistiken
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Einlösungen</span>
                    <span className="text-lg font-bold text-gray-900">
                      {couponData.usageCount || 0}
                    </span>
                  </div>
                  {couponData.maxUsageTotal > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Fortschritt</span>
                        <span>
                          {couponData.usageCount || 0} / {couponData.maxUsageTotal}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((couponData.usageCount || 0) / couponData.maxUsageTotal) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Erstellt am</span>
                    <span className="text-sm text-gray-700">
                      {couponData.createdAt
                        ? format(new Date(couponData.createdAt), 'dd.MM.yyyy', { locale: de })
                        : '–'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
