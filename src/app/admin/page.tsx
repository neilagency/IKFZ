"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import dynamic from "next/dynamic";
import {
  FileText, BookOpen, Search, LogOut, LayoutDashboard,
  Plus, Pencil, Trash2, Save, X, Eye, Settings, Globe,
  ShoppingCart, Users, CreditCard, Receipt, Package,
  TrendingUp, DollarSign, ChevronLeft, ChevronRight,
  Download, Filter, RefreshCw, Zap, Shield, Wallet, Clock,
  ExternalLink, Image as ImageIcon, AlertCircle, FileQuestion,
  Tag, Calendar, Mail, Copy, Send, Percent, ToggleLeft, ToggleRight,
  Upload, MessageSquare, StickyNote, Paperclip, RotateCcw, FileUp,
} from "lucide-react";
import { MediaLibraryTab, ImageField, MediaPicker } from "@/components/admin/MediaLibrary";
import { ToastProvider, useToast } from "@/components/admin/Toast";

const TiptapEditor = dynamic(() => import("@/components/admin/TiptapEditor"), { ssr: false });

const API = "/api/admin";

// ─── Types ──────────────────────────────────────────────────
interface SEOData { id?: string; metaTitle?: string; metaDescription?: string; canonicalUrl?: string; ogTitle?: string; ogDescription?: string; ogImage?: string; robots?: string; schemaJson?: string; }
interface PageData { id: string; title: string; slug: string; content: string; excerpt: string; status: string; pageType: string; featuredImage: string | null; seo: SEOData | null; }
interface PostData { id: string; title: string; slug: string; content: string; excerpt: string; status: string; author: string | null; featuredImage: string | null; readingTime: number | null; publishedAt: string | null; scheduledAt: string | null; seo: SEOData | null; categories?: { category: { id: string; name: string; slug: string } }[]; }
interface PaginationInfo { page: number; totalPages: number; total: number; limit: number; }

type Tab = "dashboard" | "pages" | "posts" | "seo" | "products" | "orders" | "customers" | "payments" | "invoices" | "gateways" | "coupons" | "campaigns" | "settings" | "media";

// ─── Helpers ────────────────────────────────────────────────
function formatEuro(n: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n); }
function formatDate(d: string | null) { if (!d) return "-"; return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); }

const statusColors: Record<string, string> = {
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "on-hold": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  refunded: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  paid: "bg-green-500/10 text-green-400 border-green-500/20",
  issued: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  publish: "bg-green-500/10 text-green-400 border-green-500/20",
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  published: "bg-green-500/10 text-green-400 border-green-500/20",
  scheduled: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  instock: "bg-green-500/10 text-green-400 border-green-500/20",
  outofstock: "bg-red-500/10 text-red-400 border-red-500/20",
};

function Badge({ status }: { status: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${statusColors[status] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>{status}</span>;
}

// ─── Debounce Hook ──────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── SWR Fetcher ────────────────────────────────────────────
function fetcher(url: string) {
  const normalizedUrl = url.endsWith('/') ? url : `${url}/`;
  return fetch(normalizedUrl, { credentials: "include" }).then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });
}

// ═══════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-900/40 border border-white/[0.03] animate-pulse">
      <div className="w-12 h-12 rounded-lg bg-white/[0.05]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/[0.05] rounded w-1/3" />
        <div className="h-3 bg-white/[0.04] rounded w-1/5" />
      </div>
      <div className="h-6 w-16 bg-white/[0.05] rounded" />
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return <div className="space-y-2">{Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}</div>;
}

// ═══════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════
function EmptyState({ icon: Icon = FileQuestion, title = "Keine Einträge gefunden", description }: { icon?: any; title?: string; description?: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="w-10 h-10 text-white/10 mx-auto mb-3" />
      <p className="text-white/30 text-sm">{title}</p>
      {description && <p className="text-white/20 text-xs mt-1">{description}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════
function ErrorState({ message = "Fehler beim Laden", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-16">
      <AlertCircle className="w-10 h-10 text-red-400/30 mx-auto mb-3" />
      <p className="text-red-400/70 text-sm">{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-3 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors">Erneut versuchen</button>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGINATION COMPONENT
// ═══════════════════════════════════════════════════════════
function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationInfo & { onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generate page numbers with ellipsis
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
      <span className="text-white/40 text-sm">{start}–{end} von {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-2 text-white/20 text-sm">...</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)} className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${page === p ? "bg-primary text-white" : "text-white/40 hover:bg-white/5 hover:text-white"}`}>{p}</button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SEARCH BAR
// ═══════════════════════════════════════════════════════════
function SearchBar({ value, onChange, placeholder = "Suchen...", count, suffix }: { value: string; onChange: (v: string) => void; placeholder?: string; count?: number; suffix?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex-1 relative min-w-[200px]">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
      </div>
      {count !== undefined && <span className="text-white/40 text-sm whitespace-nowrap">{count} Einträge</span>}
      {suffix}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/auth/`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      onLogin(data.token);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-white/40 mt-2">iKFZ Digital Zulassung</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-8 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">E-Mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Passwort</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {loading ? "Wird angemeldet..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CONTENT EDITOR (Pages/Posts)
// ═══════════════════════════════════════════════════════════
function ContentEditor({ item, type, token, onSave, onCancel }: { item: PageData | PostData | null; type: "pages" | "posts"; token: string; onSave: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(item?.title || "");
  const [slug, setSlug] = useState(item?.slug || "");
  const [content, setContent] = useState(item?.content || "");
  const [status, setStatus] = useState(item?.status || "published");
  const [seoTab, setSeoTab] = useState(false);
  const [metaTitle, setMetaTitle] = useState(item?.seo?.metaTitle || "");
  const [metaDesc, setMetaDesc] = useState(item?.seo?.metaDescription || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const body: any = { title, slug, content, status };
      if (item?.id) body.id = item.id;
      if (metaTitle || metaDesc) { body.seo = { metaTitle, metaDescription: metaDesc }; }
      const res = await fetch(`${API}/${type}`, { method: item?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Save failed");
      toast("Erfolgreich gespeichert");
      onSave();
    } catch { toast("Fehler beim Speichern", "error"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{item?.id ? "Bearbeiten" : "Neu erstellen"}</h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5"><X className="w-4 h-4" /></button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" />{saving ? "..." : "Speichern"}</button>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSeoTab(false)} className={`px-4 py-2 rounded-lg text-sm ${!seoTab ? "bg-primary text-white" : "bg-dark-800 text-white/60"}`}>Inhalt</button>
        <button onClick={() => setSeoTab(true)} className={`px-4 py-2 rounded-lg text-sm ${seoTab ? "bg-primary text-white" : "bg-dark-800 text-white/60"}`}>SEO</button>
      </div>
      {!seoTab ? (
        <div className="space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel" className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" />
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="Slug" className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white/60 text-sm focus:border-primary focus:outline-none" />
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none">
            <option value="published">Published</option><option value="draft">Draft</option>
          </select>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={20} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-sm font-mono focus:border-primary focus:outline-none" />
        </div>
      ) : (
        <div className="space-y-4">
          <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Meta Title" className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" />
          <div className="text-xs text-white/40">{metaTitle.length}/60 Zeichen</div>
          <textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} placeholder="Meta Description" rows={3} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" />
          <div className="text-xs text-white/40">{metaDesc.length}/160 Zeichen</div>
          <div className="p-4 rounded-xl bg-dark-950 border border-white/10">
            <p className="text-xs text-white/40 mb-2">Google-Vorschau</p>
            <p className="text-blue-400 text-base">{metaTitle || title || "Titel"}</p>
            <p className="text-green-400 text-xs">ikfzdigitalzulassung.de/{slug}</p>
            <p className="text-white/50 text-sm mt-1">{metaDesc || "Beschreibung..."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════
function DashboardTab({ token }: { token: string }) {
  const { data, error, mutate } = useSWR(`${API}/dashboard`, fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });

  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (!data) return <SkeletonTable rows={4} />;

  const { stats, recentOrders, paymentMethods, monthlyRevenue, statusBreakdown } = data;
  const maxRevenue = Math.max(...monthlyRevenue.map((m: any) => m.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Umsatz", value: formatEuro(stats.totalRevenue), icon: DollarSign, color: "text-green-400" },
          { label: "Bestellungen", value: stats.totalOrders, icon: ShoppingCart, color: "text-blue-400" },
          { label: "Kunden", value: stats.totalCustomers, icon: Users, color: "text-purple-400" },
          { label: "Produkte", value: stats.totalProducts, icon: Package, color: "text-orange-400" },
        ].map((s, i) => (
          <div key={i} className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className="text-white/50 text-sm">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Monatlicher Umsatz</h3>
        <div className="flex items-end gap-2 h-48">
          {monthlyRevenue.map((m: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-white/40">{m.revenue > 0 ? formatEuro(m.revenue) : ""}</span>
              <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max((m.revenue / maxRevenue) * 140, 2)}px` }}>
                <div className="w-full h-full bg-primary/60 rounded-t" />
              </div>
              <span className="text-[10px] text-white/40">{m.month.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
          <h3 className="text-lg font-semibold text-white mb-4">Bestellstatus</h3>
          <div className="space-y-3">
            {statusBreakdown.map((s: any) => (
              <div key={s.status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-white/70 text-sm capitalize">{s.status}</span>
                </div>
                <span className="text-white font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
          <h3 className="text-lg font-semibold text-white mb-4">Zahlungsmethoden</h3>
          <div className="space-y-3">
            {paymentMethods.map((pm: any) => (
              <div key={pm.method} className="flex items-center justify-between">
                <span className="text-white/70 text-sm">{pm.method || "Sonstige"}</span>
                <div className="text-right">
                  <span className="text-white font-medium">{pm.count}x</span>
                  <span className="text-white/40 text-xs ml-2">{formatEuro(pm.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
        <h3 className="text-lg font-semibold text-white mb-4">Letzte Bestellungen</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-white/40 text-xs uppercase">
              <th className="text-left py-2 px-3">#</th><th className="text-left py-2 px-3">Kunde</th>
              <th className="text-left py-2 px-3">Status</th><th className="text-left py-2 px-3">Zahlung</th>
              <th className="text-right py-2 px-3">Betrag</th><th className="text-left py-2 px-3">Datum</th>
            </tr></thead>
            <tbody>{recentOrders.map((o: any) => (
              <tr key={o.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 px-3 text-white/70">{o.orderNumber}</td>
                <td className="py-3 px-3"><span className="text-white">{o.billingFirstName} {o.billingLastName}</span><br /><span className="text-white/40 text-xs">{o.billingEmail}</span></td>
                <td className="py-3 px-3"><Badge status={o.status} /></td>
                <td className="py-3 px-3 text-white/50">{o.paymentMethodTitle || "-"}</td>
                <td className="py-3 px-3 text-right text-white font-medium">{formatEuro(o.total)}</td>
                <td className="py-3 px-3 text-white/40">{formatDate(o.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CMS LIST TAB (Pages) — with SWR + Pagination
// ═══════════════════════════════════════════════════════════
function CMSListTab({ type, token }: { type: "pages" | "posts"; token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any | null>(undefined);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  const swrKey = `${API}/${type}?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  const items = data?.[type] || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  async function handleDelete(id: string) {
    if (!confirm("Wirklich löschen?")) return;
    try {
      await fetch(`${API}/${type}?id=${id}`, { method: "DELETE", credentials: "include" });
      toast("Erfolgreich gelöscht");
      mutate();
    } catch { toast("Fehler beim Löschen", "error"); }
  }

  if (editing !== undefined) {
    return <ContentEditor item={editing} type={type} token={token} onSave={() => { setEditing(undefined); mutate(); }} onCancel={() => setEditing(undefined)} />;
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={search}
        onChange={setSearch}
        count={total}
        suffix={<button onClick={() => setEditing(null)} className="px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Neu</button>}
      />

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : items.length === 0 ? (
        <EmptyState icon={FileText} title={debouncedSearch ? "Keine Ergebnisse" : "Keine Einträge"} description={debouncedSearch ? `Keine Ergebnisse für "${debouncedSearch}"` : undefined} />
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-900/60 border border-white/[0.04] hover:border-white/10 transition-colors">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{item.title}</h3>
                  <p className="text-white/40 text-xs mt-0.5">/{item.slug}/</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Badge status={item.status} />
                  <button onClick={() => setEditing(item)} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SEO TAB — with SWR + Pagination
// ═══════════════════════════════════════════════════════════
function SEOTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  const swrKey = `${API}/seo?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  const records = data?.seo || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [canonical, setCanonical] = useState("");
  const [robots, setRobots] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDesc, setOgDesc] = useState("");
  const [ogImage, setOgImage] = useState("");

  function startEdit(r: any) {
    setEditing(r);
    setMetaTitle(r.metaTitle || "");
    setMetaDesc(r.metaDescription || "");
    setCanonical(r.canonicalUrl || "");
    setRobots(r.robots || "");
    setOgTitle(r.ogTitle || "");
    setOgDesc(r.ogDescription || "");
    setOgImage(r.ogImage || "");
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await fetch(`${API}/seo`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: editing.id, metaTitle, metaDescription: metaDesc, canonicalUrl: canonical, robots, ogTitle, ogDescription: ogDesc, ogImage }) });
      toast("SEO erfolgreich aktualisiert");
      setEditing(null); mutate();
    } catch { toast("Fehler beim Speichern", "error"); } finally { setSaving(false); }
  }

  if (editing) {
    const pageTitle = editing.page?.title || editing.post?.title || "Unbekannt";
    const pageSlug = editing.page?.slug || editing.post?.slug || "";
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">SEO bearbeiten</h2>
            <p className="text-white/40 text-sm">{pageTitle} — /{pageSlug}/</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5"><X className="w-4 h-4" /></button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-primary text-white font-medium flex items-center gap-2"><Save className="w-4 h-4" />{saving ? "..." : "Speichern"}</button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div><label className="block text-xs text-white/40 mb-1">Meta Title <span className="text-white/20">({metaTitle.length}/60)</span></label><input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
            <div><label className="block text-xs text-white/40 mb-1">Meta Description <span className="text-white/20">({metaDesc.length}/160)</span></label><textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
            <div><label className="block text-xs text-white/40 mb-1">Canonical URL</label><input value={canonical} onChange={e => setCanonical(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white/60 text-sm focus:border-primary focus:outline-none" /></div>
            <div><label className="block text-xs text-white/40 mb-1">Robots</label><input value={robots} onChange={e => setRobots(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white/60 text-sm focus:border-primary focus:outline-none" /></div>
          </div>
          <div className="space-y-4">
            <div><label className="block text-xs text-white/40 mb-1">OG Title</label><input value={ogTitle} onChange={e => setOgTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
            <div><label className="block text-xs text-white/40 mb-1">OG Description</label><textarea value={ogDesc} onChange={e => setOgDesc(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
            <ImageField label="OG Image" value={ogImage} onChange={setOgImage} token={token} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Google-Vorschau</p>
          <p className="text-blue-400 text-lg hover:underline cursor-pointer">{metaTitle || pageTitle}</p>
          <p className="text-green-500 text-sm">https://ikfzdigitalzulassung.de/{pageSlug}/</p>
          <p className="text-white/50 text-sm mt-1 line-clamp-2">{metaDesc || "Keine Beschreibung vorhanden..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Seiten oder Beiträge suchen..." count={total} />

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : records.length === 0 ? (
        <EmptyState icon={Globe} title={debouncedSearch ? "Keine Ergebnisse" : "Keine SEO-Einträge"} />
      ) : (
        <>
          <div className="space-y-2">
            {records.map((r: any) => {
              const pageTitle = r.page?.title || r.post?.title || "—";
              const pageSlug = r.page?.slug || r.post?.slug || "";
              const type = r.page ? "Seite" : "Beitrag";
              const hasIssues = !r.metaTitle || !r.metaDescription || (r.metaTitle && r.metaTitle.length > 60) || (r.metaDescription && r.metaDescription.length > 160);
              return (
                <div key={r.id} onClick={() => startEdit(r)} className="flex items-center justify-between p-4 rounded-xl bg-dark-900/60 border border-white/[0.04] hover:border-white/10 transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium truncate">{pageTitle}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{type}</span>
                      {hasIssues && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">⚠ Issues</span>}
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">/{pageSlug}/ — {r.metaTitle ? `"${r.metaTitle.slice(0, 50)}..."` : "Kein Title"}</p>
                  </div>
                  <Pencil className="w-4 h-4 text-white/20 ml-4" />
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCTS TAB — with SWR + Pagination
// ═══════════════════════════════════════════════════════════
function ProductsTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(undefined);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  const swrKey = `${API}/products?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  const products = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
  const total = data?.total || products.length;
  const totalPages = data?.totalPages || 1;

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState("publish");
  const [stockStatus, setStockStatus] = useState("instock");
  const [saving, setSaving] = useState(false);

  function startEdit(p: any) {
    setEditing(p); setName(p?.name || ""); setSlug(p?.slug || ""); setPrice(String(p?.price || "")); setDesc(p?.description || ""); setStatus(p?.status || "publish"); setStockStatus(p?.stockStatus || "instock");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: any = { name, slug: slug || name.toLowerCase().replace(/\s+/g, "-"), price, regularPrice: price, description: desc, status, stockStatus };
      if (editing?.id) body.id = editing.id;
      await fetch(`${API}/products`, { method: editing?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      toast("Produkt erfolgreich gespeichert");
      setEditing(undefined); mutate();
    } catch { toast("Fehler beim Speichern", "error"); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Produkt löschen?")) return;
    try {
      await fetch(`${API}/products?id=${id}`, { method: "DELETE", credentials: "include" });
      toast("Produkt gelöscht");
      mutate();
    } catch { toast("Fehler beim Löschen", "error"); }
  }

  if (editing !== undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{editing?.id ? "Produkt bearbeiten" : "Neues Produkt"}</h2>
          <div className="flex gap-2">
            <button onClick={() => setEditing(undefined)} className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5"><X className="w-4 h-4" /></button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-primary text-white font-medium flex items-center gap-2"><Save className="w-4 h-4" />{saving ? "..." : "Speichern"}</button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="block text-xs text-white/40 mb-1">Name</label><input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
          <div><label className="block text-xs text-white/40 mb-1">Slug</label><input value={slug} onChange={e => setSlug(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white/60 text-sm focus:border-primary focus:outline-none" /></div>
          <div><label className="block text-xs text-white/40 mb-1">Preis (EUR)</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
          <div><label className="block text-xs text-white/40 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none"><option value="publish">Publish</option><option value="draft">Draft</option></select>
          </div>
          <div><label className="block text-xs text-white/40 mb-1">Bestand</label>
            <select value={stockStatus} onChange={e => setStockStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none"><option value="instock">Auf Lager</option><option value="outofstock">Ausverkauft</option></select>
          </div>
        </div>
        <div><label className="block text-xs text-white/40 mb-1">Beschreibung</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={8} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Produkte suchen..."
        count={total}
        suffix={<button onClick={() => startEdit(null)} className="px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Neu</button>}
      />

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : products.length === 0 ? (
        <EmptyState icon={Package} title={debouncedSearch ? "Keine Ergebnisse" : "Keine Produkte"} />
      ) : (
        <>
          <div className="space-y-2">
            {products.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-900/60 border border-white/[0.04] hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  {p.images?.[0] && <img src={p.images[0].src} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/10" />}
                  <div className="min-w-0">
                    <h3 className="text-white font-medium">{p.name}</h3>
                    <p className="text-white/40 text-xs">SKU: {p.sku || "-"} | Bestellt: {p._count?.orderItems || 0}x</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-white font-semibold">{formatEuro(p.price)}</span>
                  <Badge status={p.stockStatus} />
                  <button onClick={() => startEdit(p)} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ORDERS TAB — with SWR + Pagination + Full Order Details
// ═══════════════════════════════════════════════════════════
function OrdersTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "documents" | "messages" | "notes" | "refund">("overview");
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (statusFilter) params.set("status", statusFilter);
  const swrKey = `${API}/orders?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  // Detail data SWR (fetches full order with relations when selected)
  const detailKey = selectedOrder ? `${API}/orders/${selectedOrder.id}` : null;
  const { data: detailData, mutate: mutateDetail } = useSWR(detailKey, fetcher, { revalidateOnFocus: false });
  const fullOrder = detailData?.order || selectedOrder;

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`${API}/orders/`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, status }) });
      const result = await res.json();
      mutate();
      mutateDetail();
      if (status === "completed" && result.emailResult) {
        if (result.emailResult.success) {
          toast("Abschluss-E-Mail gesendet", "success");
        } else {
          toast("Status aktualisiert, E-Mail konnte nicht gesendet werden", "error");
        }
      } else {
        toast(`Status → ${status}`, "success");
      }
    } catch {
      toast("Fehler beim Aktualisieren", "error");
    }
  }

  async function sendCompletionEmail(id: string) {
    try {
      const res = await fetch(`${API}/orders/${id}/send-completion-email/`, { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast("Abschluss-E-Mail gesendet", "success");
        mutateDetail();
      } else {
        toast(result.error || "E-Mail konnte nicht gesendet werden", "error");
      }
    } catch {
      toast("E-Mail-Fehler", "error");
    }
  }

  async function resendInvoice(id: string) {
    try {
      const res = await fetch(`${API}/orders/${id}/resend-invoice/`, { method: "POST", credentials: "include" });
      const result = await res.json();
      if (result.success) {
        toast("Rechnung erneut gesendet", "success");
      } else {
        toast(result.error || "Fehler beim Senden", "error");
      }
    } catch {
      toast("E-Mail-Fehler", "error");
    }
  }

  if (selectedOrder) {
    const o = fullOrder;
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { setSelectedOrder(null); setDetailTab("overview"); }} className="p-2 rounded-lg hover:bg-white/5 text-white/40"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-white">Bestellung #{o.orderNumber}</h2>
            <Badge status={o.status} />
          </div>
          <div className="flex items-center gap-2">
            {o.invoice && (
              <button onClick={() => resendInvoice(o.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                <Receipt className="w-3.5 h-3.5" /> Rechnung senden
              </button>
            )}
            <button onClick={() => sendCompletionEmail(o.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Abschluss-E-Mail
            </button>
          </div>
        </div>

        {/* Detail Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-dark-950/50 border border-white/[0.04]">
          {([
            ["overview", "Übersicht", Eye],
            ["documents", "Dokumente", FileUp],
            ["messages", "Nachrichten", MessageSquare],
            ["notes", "Notizen", StickyNote],
            ["refund", "Erstattung", RotateCcw],
          ] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setDetailTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${detailTab === key ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {detailTab === "overview" && (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
                <h3 className="text-white font-semibold">Rechnungsadresse</h3>
                <p className="text-white/70 text-sm">{o.billingFirstName} {o.billingLastName}</p>
                {o.billingCompany && <p className="text-white/50 text-sm">{o.billingCompany}</p>}
                <p className="text-white/50 text-sm">{o.billingAddress1}</p>
                <p className="text-white/50 text-sm">{o.billingPostcode} {o.billingCity}</p>
                <p className="text-white/50 text-sm">{o.billingEmail}</p>
                {o.billingPhone && <p className="text-white/50 text-sm">{o.billingPhone}</p>}
              </div>
              <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
                <h3 className="text-white font-semibold">Zahlungsdetails</h3>
                <p className="text-white/70 text-sm">Methode: {o.paymentMethodTitle || o.paymentMethod || "-"}</p>
                <p className="text-white/70 text-sm">Transaktion: {o.transactionId || "-"}</p>
                <p className="text-white/70 text-sm">Bezahlt am: {formatDate(o.datePaid)}</p>
                <p className="text-white/70 text-sm">Betrag: <span className="text-white font-bold">{formatEuro(o.total)}</span></p>
                {o.payment && <p className="text-white/50 text-sm">Zahlungsstatus: <Badge status={o.payment.status} /></p>}
              </div>
            </div>

            {/* Coupon / Discount */}
            {(o.couponCode || o.discountAmount > 0) && (
              <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                <div className="flex items-center gap-3">
                  <Percent className="w-5 h-5 text-orange-400" />
                  <div>
                    <span className="text-orange-300 font-semibold text-sm">Rabatt angewendet</span>
                    {o.couponCode && <span className="ml-2 px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-xs font-mono">{o.couponCode}</span>}
                    <span className="ml-2 text-orange-200 text-sm font-bold">-{formatEuro(o.discountAmount || o.discountTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
              <h3 className="text-white font-semibold mb-3">Positionen</h3>
              <table className="w-full text-sm"><thead><tr className="text-white/40 text-xs uppercase"><th className="text-left py-2">Produkt</th><th className="text-center py-2">Menge</th><th className="text-right py-2">Preis</th><th className="text-right py-2">Gesamt</th></tr></thead>
                <tbody>{(o.items || []).map((item: any) => (
                  <tr key={item.id} className="border-t border-white/[0.04]"><td className="py-3 text-white">{item.name}</td><td className="py-3 text-center text-white/60">{item.quantity}</td><td className="py-3 text-right text-white/60">{formatEuro(item.price)}</td><td className="py-3 text-right text-white font-medium">{formatEuro(item.total)}</td></tr>
                ))}</tbody>
              </table>
              <div className="flex justify-end mt-4 pt-4 border-t border-white/[0.06]">
                <div className="text-right space-y-1">
                  <p className="text-white/50 text-sm">Zwischensumme: {formatEuro(o.subtotal)}</p>
                  {(o.discountTotal > 0 || o.discountAmount > 0) && <p className="text-orange-400 text-sm">Rabatt: -{formatEuro(o.discountAmount || o.discountTotal)}</p>}
                  {o.shippingTotal > 0 && <p className="text-white/50 text-sm">Versand: {formatEuro(o.shippingTotal)}</p>}
                  {o.totalTax > 0 && <p className="text-white/50 text-sm">MwSt: {formatEuro(o.totalTax)}</p>}
                  {o.paymentFee > 0 && <p className="text-white/50 text-sm">Zahlungsgebühr: {formatEuro(o.paymentFee)}</p>}
                  <p className="text-white font-bold text-lg">Gesamt: {formatEuro(o.total)}</p>
                </div>
              </div>
            </div>

            {/* Invoice Info */}
            {o.invoice && (
              <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-2">
                <h3 className="text-white font-semibold">Rechnung</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-white/70">Nr: <span className="text-white font-medium">{o.invoice.invoiceNumber}</span></span>
                  <Badge status={o.invoice.status} />
                  <span className="text-white/50">Erstellt: {formatDate(o.invoice.issuedAt || o.invoice.createdAt)}</span>
                  <button onClick={() => resendInvoice(o.id)} className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Send className="w-3 h-3" /> Erneut senden</button>
                </div>
              </div>
            )}

            {/* Service Data */}
            {o.serviceData && (() => {
              try {
                const sd = typeof o.serviceData === 'string' ? JSON.parse(o.serviceData) : o.serviceData;
                return (
                  <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
                    <h3 className="text-white font-semibold">Formulardaten</h3>
                    {o.productName && <p className="text-white/50 text-xs mb-2">Produkt: {o.productName}</p>}
                    <div className="grid md:grid-cols-2 gap-2">
                      {Object.entries(sd).filter(([k]) => k !== 'uploadedFiles').map(([key, val]) => (
                        <div key={key} className="flex justify-between p-2 rounded-lg bg-white/[0.02]">
                          <span className="text-white/40 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-white/80 text-xs font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                        </div>
                      ))}
                    </div>
                    {sd.uploadedFiles && Object.keys(sd.uploadedFiles).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <h4 className="text-white/60 text-xs font-semibold mb-2 uppercase">Hochgeladene Dokumente</h4>
                        <div className="space-y-1">
                          {Object.entries(sd.uploadedFiles).map(([docKey, docUrl]) => (
                            <a key={docKey} href={String(docUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                              <span className="text-white/40 text-xs capitalize">{docKey}</span>
                              <span className="text-primary text-xs hover:underline ml-auto">Anzeigen →</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } catch { return null; }
            })()}

            {/* Status Actions */}
            <div className="flex flex-wrap gap-2">
              <span className="text-white/50 text-sm self-center mr-2">Status ändern:</span>
              {["processing", "completed", "cancelled", "refunded"].map(s => (
                <button key={s} onClick={() => updateStatus(o.id, s)} disabled={o.status === s} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${o.status === s ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5"} ${statusColors[s] || ""}`}>{s}</button>
              ))}
            </div>
          </>
        )}

        {/* Documents Tab */}
        {detailTab === "documents" && <OrderDocumentsPanel orderId={o.id} toast={toast} onUpdate={mutateDetail} />}

        {/* Messages Tab */}
        {detailTab === "messages" && <OrderMessagesPanel orderId={o.id} orderNumber={o.orderNumber} customerName={`${o.billingFirstName || ""} ${o.billingLastName || ""}`.trim()} toast={toast} />}

        {/* Notes Tab */}
        {detailTab === "notes" && <OrderNotesPanel orderId={o.id} toast={toast} />}

        {/* Refund Tab */}
        {detailTab === "refund" && <OrderRefundPanel orderId={o.id} orderTotal={o.total} orderStatus={o.status} toast={toast} onUpdate={() => { mutate(); mutateDetail(); }} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={search}
        onChange={v => { setSearch(v); }}
        placeholder="Suche nach Name, Email, Nummer..."
        count={data?.total}
        suffix={
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }} className="px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none">
            <option value="">Alle Status</option>
            {["completed", "processing", "on-hold", "pending", "cancelled", "refunded", "failed"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        }
      />

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : (data?.orders || []).length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Keine Bestellungen" />
      ) : (
        <>
          <div className="space-y-2">
            {(data.orders || []).map((o: any) => (
              <div key={o.id} onClick={() => setSelectedOrder(o)} className="flex items-center justify-between p-4 rounded-xl bg-dark-900/60 border border-white/[0.04] hover:border-white/10 transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3"><span className="text-white font-medium">#{o.orderNumber}</span><Badge status={o.status} /></div>
                  <p className="text-white/40 text-xs mt-1">{o.billingFirstName} {o.billingLastName} — {o.billingEmail}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-white font-semibold">{formatEuro(o.total)}</p>
                  <p className="text-white/40 text-xs">{o.paymentMethodTitle || "-"} | {formatDate(o.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={data.totalPages || 1} total={data.total || 0} limit={20} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ─── Order Documents Panel ──────────────────────────────────
function OrderDocumentsPanel({ orderId, toast, onUpdate }: { orderId: string; toast: (msg: string, type: "success" | "error" | "info") => void; onUpdate: () => void }) {
  const { data, mutate: mutateDocs } = useSWR(`${API}/orders/${orderId}/documents`, fetcher, { revalidateOnFocus: false });
  const [uploading, setUploading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sendEmail", sendEmail ? "true" : "false");
      const res = await fetch(`${API}/orders/${orderId}/documents/`, { method: "POST", credentials: "include", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload fehlgeschlagen");
      }
      toast(sendEmail ? "Dokument hochgeladen & E-Mail gesendet" : "Dokument hochgeladen", "success");
      mutateDocs();
      onUpdate();
    } catch (e: any) {
      toast(e.message || "Upload fehlgeschlagen", "error");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  const documents = data?.documents || [];

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`p-8 rounded-2xl border-2 border-dashed transition-colors text-center cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20 bg-dark-900/40"}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
        <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
        <p className="text-white/50 text-sm">{uploading ? "Wird hochgeladen..." : "PDF oder Bild hier ablegen oder klicken"}</p>
        <p className="text-white/30 text-xs mt-1">Max. 20MB – PDF, JPG, PNG, WebP</p>
      </div>

      {/* Email toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="rounded border-white/20 bg-dark-900 text-primary" />
        <span className="text-white/60 text-sm">Kunden per E-Mail benachrichtigen</span>
      </label>

      {/* Document List */}
      <div className="space-y-2">
        {documents.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">Keine Dokumente vorhanden</p>
        ) : documents.map((doc: any) => (
          <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-900/60 border border-white/[0.04]">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{doc.fileName}</p>
                <p className="text-white/30 text-xs">{(doc.fileSize / 1024).toFixed(0)} KB • {formatDate(doc.createdAt)}</p>
              </div>
            </div>
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white">
              <Download className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Order Messages Panel ───────────────────────────────────
function OrderMessagesPanel({ orderId, orderNumber, customerName, toast }: { orderId: string; orderNumber: string; customerName: string; toast: (msg: string, type: "success" | "error" | "info") => void }) {
  const { data, mutate: mutateMsgs } = useSWR(`${API}/orders/${orderId}/messages`, fetcher, { revalidateOnFocus: false });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TEMPLATES = [
    { label: "Dokumente fehlen", text: `Sehr geehrte/r ${customerName || "Kunde"},\n\nfür die Bearbeitung Ihrer Bestellung #${orderNumber} benötigen wir noch folgende Unterlagen:\n\n- \n\nBitte laden Sie die Dokumente in Ihrem Kundenkonto hoch oder antworten Sie auf diese E-Mail.\n\nMit freundlichen Grüßen,\niKFZ Digital Zulassung` },
    { label: "In Bearbeitung", text: `Sehr geehrte/r ${customerName || "Kunde"},\n\nIhre Bestellung #${orderNumber} wird aktuell bearbeitet. Wir melden uns, sobald alles erledigt ist.\n\nMit freundlichen Grüßen,\niKFZ Digital Zulassung` },
    { label: "Rückfrage", text: `Sehr geehrte/r ${customerName || "Kunde"},\n\nbezüglich Ihrer Bestellung #${orderNumber} haben wir eine Rückfrage:\n\n\n\nBitte antworten Sie uns schnellstmöglich.\n\nMit freundlichen Grüßen,\niKFZ Digital Zulassung` },
    { label: "Fertigstellung", text: `Sehr geehrte/r ${customerName || "Kunde"},\n\nIhre Bestellung #${orderNumber} wurde erfolgreich abgeschlossen. Die Unterlagen finden Sie in Ihrem Kundenkonto.\n\nVielen Dank für Ihr Vertrauen!\n\nMit freundlichen Grüßen,\niKFZ Digital Zulassung` },
  ];

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("message", message.trim());
      files.forEach(f => formData.append("files", f));
      const res = await fetch(`${API}/orders/${orderId}/messages/`, { method: "POST", credentials: "include", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Senden fehlgeschlagen");
      }
      toast("Nachricht gesendet", "success");
      setMessage("");
      setFiles([]);
      mutateMsgs();
    } catch (e: any) {
      toast(e.message || "Senden fehlgeschlagen", "error");
    } finally {
      setSending(false);
    }
  }

  const messages = data?.messages || [];

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
        <h3 className="text-white font-semibold text-sm">Nachricht senden</h3>
        {/* Templates */}
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map(t => (
            <button key={t.label} onClick={() => setMessage(t.text)} className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.04]">{t.label}</button>
          ))}
        </div>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Nachricht eingeben..." rows={5} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none resize-y" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] text-white/50 hover:text-white border border-white/[0.04]">
              <Paperclip className="w-3.5 h-3.5" /> Anhänge
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ""; }} />
            {files.length > 0 && <span className="text-white/30 text-xs">{files.length} Datei(en)</span>}
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] text-white/50 text-xs">
                {f.name} <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-white/30 hover:text-red-400"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <button onClick={handleSend} disabled={!message.trim() || sending} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/80 disabled:opacity-50 transition-colors">
            <Send className="w-3.5 h-3.5" /> {sending ? "Sende..." : "Senden"}
          </button>
        </div>
      </div>

      {/* Message History */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">Keine Nachrichten</p>
        ) : messages.map((msg: any) => {
          const attachments = msg.attachments ? (typeof msg.attachments === "string" ? (() => { try { return JSON.parse(msg.attachments); } catch { return []; } })() : msg.attachments) : [];
          return (
            <div key={msg.id} className={`p-4 rounded-2xl border ${msg.sentBy === "admin" ? "bg-primary/5 border-primary/10" : "bg-dark-900/60 border-white/[0.04]"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium ${msg.sentBy === "admin" ? "text-primary" : "text-white/60"}`}>{msg.sentBy === "admin" ? "Admin" : "Kunde"}</span>
                <span className="text-white/30 text-xs">{new Date(msg.createdAt).toLocaleString("de-DE")}</span>
              </div>
              <p className="text-white/80 text-sm whitespace-pre-wrap">{msg.message}</p>
              {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((att: any, i: number) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] text-white/50 text-xs hover:text-white">
                      <Paperclip className="w-3 h-3" /> {att.filename}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Order Notes Panel ──────────────────────────────────────
function OrderNotesPanel({ orderId, toast }: { orderId: string; toast: (msg: string, type: "success" | "error" | "info") => void }) {
  const { data, mutate: mutateNotes } = useSWR(`${API}/orders/${orderId}/notes`, fetcher, { revalidateOnFocus: false });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/orders/${orderId}/notes/`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ note: note.trim() }) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Speichern");
      }
      toast("Notiz hinzugefügt", "success");
      setNote("");
      mutateNotes();
    } catch (e: any) {
      toast(e.message || "Fehler", "error");
    } finally {
      setSaving(false);
    }
  }

  const notes = data?.notes || [];

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
        <h3 className="text-white font-semibold text-sm">Notiz hinzufügen</h3>
        <div className="flex gap-2">
          <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }} placeholder="Interne Notiz..." className="flex-1 px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
          <button onClick={handleAdd} disabled={!note.trim() || saving} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/80 disabled:opacity-50 transition-colors">
            {saving ? "..." : "Hinzufügen"}
          </button>
        </div>
      </div>

      {/* Notes History */}
      <div className="space-y-2">
        {notes.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">Keine Notizen vorhanden</p>
        ) : notes.map((n: any) => (
          <div key={n.id} className="p-3 rounded-xl bg-dark-900/60 border border-white/[0.04]">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium ${n.author === "System" ? "text-yellow-400" : "text-blue-400"}`}>{n.author}</span>
              <span className="text-white/30 text-xs">{new Date(n.createdAt).toLocaleString("de-DE")}</span>
            </div>
            <p className="text-white/70 text-sm">{n.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Order Refund Panel ─────────────────────────────────────
function OrderRefundPanel({ orderId, orderTotal, orderStatus, toast, onUpdate }: { orderId: string; orderTotal: number; orderStatus: string; toast: (msg: string, type: "success" | "error" | "info") => void; onUpdate: () => void }) {
  const { data: refundData, mutate: mutateRefunds } = useSWR(`${API}/orders/${orderId}/refund`, fetcher, { revalidateOnFocus: false });
  const [refundAmount, setRefundAmount] = useState("");
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [processing, setProcessing] = useState(false);

  async function handleRefund() {
    if (refundType === "partial" && (!refundAmount || parseFloat(refundAmount) <= 0)) {
      toast("Betrag eingeben", "error");
      return;
    }
    setProcessing(true);
    try {
      const body: any = {};
      if (refundType === "partial") {
        body.amount = parseFloat(refundAmount).toFixed(2);
      }
      const res = await fetch(`${API}/orders/${orderId}/refund/`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erstattung fehlgeschlagen");
      toast(`Erstattung erfolgreich: €${result.amount} (${result.provider})`, "success");
      setRefundAmount("");
      mutateRefunds();
      onUpdate();
    } catch (e: any) {
      toast(e.message || "Erstattung fehlgeschlagen", "error");
    } finally {
      setProcessing(false);
    }
  }

  const refunds = refundData?.refunds || [];
  const provider = refundData?.provider;
  const alreadyRefunded = orderStatus === "refunded";

  return (
    <div className="space-y-4">
      {/* Refund Form */}
      <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-4">
        <h3 className="text-white font-semibold text-sm">Erstattung durchführen</h3>

        {alreadyRefunded ? (
          <p className="text-orange-400 text-sm">Diese Bestellung wurde bereits erstattet.</p>
        ) : (
          <>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-white/50">Bestellsumme:</span>
              <span className="text-white font-bold">{formatEuro(orderTotal)}</span>
              {provider && <span className="px-2 py-0.5 rounded bg-white/[0.04] text-white/40 text-xs">{provider}</span>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setRefundType("full")} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${refundType === "full" ? "bg-red-500/10 text-red-400 border-red-500/20" : "text-white/40 border-white/10 hover:text-white/60"}`}>Volle Erstattung</button>
              <button onClick={() => setRefundType("partial")} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${refundType === "partial" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "text-white/40 border-white/10 hover:text-white/60"}`}>Teilerstattung</button>
            </div>

            {refundType === "partial" && (
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-sm">€</span>
                <input type="number" step="0.01" min="0.01" max={orderTotal} value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0.00" className="w-40 px-3 py-2 rounded-lg bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
              </div>
            )}

            <button onClick={handleRefund} disabled={processing} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> {processing ? "Wird verarbeitet..." : refundType === "full" ? `Voll erstatten (${formatEuro(orderTotal)})` : `Teilerstattung durchführen`}
            </button>
          </>
        )}
      </div>

      {/* Refund History */}
      {refunds.length > 0 && (
        <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
          <h3 className="text-white font-semibold text-sm">Erstattungsverlauf</h3>
          <div className="space-y-2">
            {refunds.map((r: any, i: number) => (
              <div key={r.id || i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div>
                  <p className="text-white text-sm font-medium">€{r.amount?.value || r.amount || "0.00"}</p>
                  <p className="text-white/30 text-xs">{r.id} • {r.createdAt ? new Date(r.createdAt).toLocaleString("de-DE") : "-"}</p>
                </div>
                <Badge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CUSTOMERS TAB — with SWR + Pagination
// ═══════════════════════════════════════════════════════════
function CustomersTab({ token }: { token: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "30" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  const swrKey = `${API}/customers?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Suche nach Name, Email, Firma..." count={data?.total} />

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : (data?.customers || []).length === 0 ? (
        <EmptyState icon={Users} title="Keine Kunden" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-white/40 text-xs uppercase"><th className="text-left py-2 px-3">Kunde</th><th className="text-left py-2 px-3">E-Mail</th><th className="text-left py-2 px-3">Ort</th><th className="text-center py-2 px-3">Bestellungen</th><th className="text-right py-2 px-3">Umsatz</th></tr></thead>
              <tbody>
                {(data.customers || []).map((c: any) => (
                  <tr key={c.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-3"><span className="text-white">{c.firstName} {c.lastName}</span>{c.company && <span className="text-white/40 text-xs block">{c.company}</span>}</td>
                    <td className="py-3 px-3 text-white/60">{c.email}</td>
                    <td className="py-3 px-3 text-white/50">{[c.billingPostcode, c.billingCity].filter(Boolean).join(" ")}</td>
                    <td className="py-3 px-3 text-center text-white/70">{c.orderCount}</td>
                    <td className="py-3 px-3 text-right text-white font-medium">{formatEuro(c.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.totalPages || 1} total={data.total || 0} limit={30} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAYMENTS TAB — with SWR + Pagination
// ═══════════════════════════════════════════════════════════
function PaymentsTab({ token }: { token: string }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "30" });
  if (statusFilter) params.set("status", statusFilter);
  const swrKey = `${API}/payments?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm"><option value="">Alle Status</option><option value="completed">Bezahlt</option><option value="pending">Ausstehend</option><option value="failed">Fehlgeschlagen</option><option value="refunded">Erstattet</option></select>
        <span className="text-white/40 text-sm">{data?.total || 0} Zahlungen</span>
      </div>

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : (data?.payments || []).length === 0 ? (
        <EmptyState icon={CreditCard} title="Keine Zahlungen" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-white/40 text-xs uppercase"><th className="text-left py-2 px-3">Bestellung</th><th className="text-left py-2 px-3">Kunde</th><th className="text-left py-2 px-3">Methode</th><th className="text-left py-2 px-3">Status</th><th className="text-right py-2 px-3">Betrag</th><th className="text-left py-2 px-3">Datum</th></tr></thead>
              <tbody>
                {(data.payments || []).map((p: any) => (
                  <tr key={p.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-3 text-white/70">#{p.order?.orderNumber}</td>
                    <td className="py-3 px-3"><span className="text-white">{p.order?.billingFirstName} {p.order?.billingLastName}</span></td>
                    <td className="py-3 px-3 text-white/60">{p.methodTitle || p.method}</td>
                    <td className="py-3 px-3"><Badge status={p.status} /></td>
                    <td className="py-3 px-3 text-right text-white font-medium">{formatEuro(p.amount)}</td>
                    <td className="py-3 px-3 text-white/40">{formatDate(p.paidAt || p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.totalPages || 1} total={data.total || 0} limit={30} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INVOICES TAB — with SWR + Pagination
// ═══════════════════════════════════════════════════════════
function InvoicesTab({ token }: { token: string }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "30" });
  if (statusFilter) params.set("status", statusFilter);
  const swrKey = `${API}/invoices?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  function printInvoice(inv: any) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Rechnung ${inv.invoiceNumber}</title><style>
      body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#333}
      h1{font-size:24px;margin-bottom:4px} .header{display:flex;justify-content:space-between;margin-bottom:30px}
      table{width:100%;border-collapse:collapse;margin:20px 0} th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #ddd}
      th{background:#f5f5f5;font-size:12px;text-transform:uppercase;color:#666}
      .total{font-size:20px;font-weight:bold;text-align:right;margin-top:20px}
      .footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;color:#888}
    </style></head><body>
    <div class="header"><div><h1>RECHNUNG</h1><p style="color:#666">${inv.invoiceNumber}</p></div><div style="text-align:right"><strong>iKFZ Digital Zulassung</strong><br>Datum: ${formatDate(inv.issuedAt)}</div></div>
    <div style="margin-bottom:20px"><strong>Rechnungsempfänger:</strong><br>${inv.billingName || "-"}<br>${inv.billingAddress || ""}<br>${inv.billingEmail || ""}</div>
    <table><thead><tr><th>Position</th><th style="text-align:right">Betrag</th></tr></thead>
    <tbody>${(inv.items || "").split("\n").map((line: string) => `<tr><td>${line}</td><td style="text-align:right"></td></tr>`).join("")}</tbody></table>
    <div class="total">Gesamtbetrag: ${formatEuro(inv.amount)}</div>
    <div class="footer">Status: ${inv.status === "paid" ? "Bezahlt" : "Offen"} ${inv.paidAt ? "| Bezahlt am: " + formatDate(inv.paidAt) : ""}</div>
    </body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm"><option value="">Alle</option><option value="paid">Bezahlt</option><option value="issued">Offen</option></select>
        <span className="text-white/40 text-sm">{data?.total || 0} Rechnungen</span>
      </div>

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : (data?.invoices || []).length === 0 ? (
        <EmptyState icon={Receipt} title="Keine Rechnungen" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-white/40 text-xs uppercase"><th className="text-left py-2 px-3">Nr.</th><th className="text-left py-2 px-3">Bestellung</th><th className="text-left py-2 px-3">Kunde</th><th className="text-left py-2 px-3">Status</th><th className="text-right py-2 px-3">Betrag</th><th className="text-left py-2 px-3">Datum</th><th className="py-2 px-3"></th></tr></thead>
              <tbody>
                {(data.invoices || []).map((inv: any) => (
                  <tr key={inv.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-3 text-white font-medium">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 text-white/60">#{inv.order?.orderNumber}</td>
                    <td className="py-3 px-3 text-white/70">{inv.billingName}</td>
                    <td className="py-3 px-3"><Badge status={inv.status} /></td>
                    <td className="py-3 px-3 text-right text-white font-medium">{formatEuro(inv.amount)}</td>
                    <td className="py-3 px-3 text-white/40">{formatDate(inv.issuedAt)}</td>
                    <td className="py-3 px-3"><button onClick={() => printInvoice(inv)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white" title="Drucken"><Download className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.totalPages || 1} total={data.total || 0} limit={30} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAYMENT GATEWAYS TAB
// ═══════════════════════════════════════════════════════════
function GatewaysTab({ token }: { token: string }) {
  const [gateways, setGateways] = useState<any[]>([]);
  const [paymentStats, setPaymentStats] = useState<any[]>([]);

  const { data: settingsData } = useSWR(`${API}/settings`, fetcher, { revalidateOnFocus: false });
  const { data: dashData } = useSWR(`${API}/dashboard`, fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });

  useEffect(() => {
    if (!settingsData || !dashData) return;
    const methods = dashData.paymentMethods || [];
    setPaymentStats(methods);

    const settings = settingsData.settings || [];
    const gwSettings = settings.filter((s: any) => s.key.startsWith("gateway_"));

    const knownGateways = [
      { id: "ppcp-gateway", name: "PayPal", icon: "💳", description: "PayPal Standard & Pay Later", enabled: true },
      { id: "mollie_wc_gateway_creditcard", name: "Kreditkarte (Mollie)", icon: "💳", description: "Visa, Mastercard via Mollie", enabled: true },
      { id: "mollie_wc_gateway_applepay", name: "Apple Pay (Mollie)", icon: "🍎", description: "Apple Pay via Mollie", enabled: true },
      { id: "mollie_wc_gateway_banktransfer", name: "Banküberweisung (Mollie)", icon: "🏦", description: "SEPA Banküberweisung via Mollie", enabled: true },
      { id: "mollie_wc_gateway_billie", name: "Billie (Mollie)", icon: "📄", description: "Rechnungskauf für Unternehmen", enabled: true },
      { id: "mollie_wc_gateway_trustly", name: "Trustly (Mollie)", icon: "🔒", description: "Sofortüberweisung via Trustly", enabled: true },
      { id: "mollie_wc_gateway_riverty", name: "Riverty (Mollie)", icon: "📋", description: "Riverty Rechnung", enabled: true },
      { id: "bacs", name: "Banküberweisung (Direkt)", icon: "🏦", description: "Direkte Banküberweisung (BACS)", enabled: true },
    ];

    for (const gw of knownGateways) {
      const setting = gwSettings.find((s: any) => s.key === `gateway_${gw.id}_enabled`);
      if (setting) gw.enabled = setting.value === "true";
    }

    setGateways(knownGateways);
  }, [settingsData, dashData]);

  async function toggleGateway(id: string, enabled: boolean) {
    setGateways(prev => prev.map(g => g.id === id ? { ...g, enabled } : g));
    await fetch(`${API}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key: `gateway_${id}_enabled`, value: String(enabled) }),
    });
  }

  if (!settingsData || !dashData) return <SkeletonTable rows={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Zahlungs-Gateways</h2>
        <p className="text-white/40 text-sm">Konfiguration der aktiven Zahlungsmethoden (migriert von WooCommerce)</p>
      </div>

      {paymentStats.length > 0 && (
        <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Nutzungsstatistiken</h3>
          <div className="space-y-3">
            {paymentStats.map((pm: any) => {
              const maxCount = Math.max(...paymentStats.map((p: any) => p.count));
              return (
                <div key={pm.method}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-sm">{pm.method || "Sonstige"}</span>
                    <span className="text-white text-sm font-medium">{pm.count}x — {formatEuro(pm.total)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${(pm.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {gateways.map(gw => (
          <div key={gw.id} className={`p-5 rounded-2xl border transition-colors ${gw.enabled ? "bg-dark-900/80 border-white/[0.06]" : "bg-dark-950/50 border-white/[0.03] opacity-60"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{gw.icon}</span>
                <div>
                  <h3 className="text-white font-medium">{gw.name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">{gw.description}</p>
                  <p className="text-white/20 text-[10px] font-mono mt-1">{gw.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={gw.enabled ? "completed" : "cancelled"} />
                <button onClick={() => toggleGateway(gw.id, !gw.enabled)} className={`relative w-12 h-6 rounded-full transition-colors ${gw.enabled ? "bg-green-500" : "bg-white/10"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${gw.enabled ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
        <p className="text-blue-400 text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Die tatsächliche Payment-Integration (Stripe, PayPal, Mollie) wird über Environment Variables und Webhooks konfiguriert.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COUPONS TAB
// ═══════════════════════════════════════════════════════════
function CouponsTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<any>(undefined);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (filter !== "all") params.set("status", filter);
  const { data, error, isLoading, mutate } = useSWR(`${API}/coupons?${params}`, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  useEffect(() => { setPage(1); }, [debouncedSearch, filter]);

  if (creating || editing !== undefined) {
    return <CouponEditor item={editing || null} onSave={() => { setEditing(undefined); setCreating(false); mutate(); }} onCancel={() => { setEditing(undefined); setCreating(false); }} toast={toast} />;
  }

  function couponStatus(c: any): { label: string; color: string } {
    if (!c.isActive) return { label: "Inaktiv", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
    if (c.endDate && new Date(c.endDate) < new Date()) return { label: "Abgelaufen", color: "bg-red-500/10 text-red-400 border-red-500/20" };
    if (c.startDate && new Date(c.startDate) > new Date()) return { label: "Geplant", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" };
    return { label: "Aktiv", color: "bg-green-500/10 text-green-400 border-green-500/20" };
  }

  async function handleDelete(id: string) {
    if (!confirm("Diesen Gutschein wirklich löschen?")) return;
    const res = await fetch(`${API}/coupons/${id}/`, { method: "DELETE", credentials: "include" });
    if (res.ok) { toast("Gutschein gelöscht"); mutate(); } else { toast("Fehler beim Löschen", "error"); }
  }

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Suche nach Code oder Beschreibung..." count={data?.pagination?.total}
        suffix={<button onClick={() => setCreating(true)} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"><Plus className="w-4 h-4" />Neu</button>}
      />
      <div className="flex gap-2">
        {[["all","Alle"],["active","Aktiv"],["inactive","Inaktiv"],["expired","Abgelaufen"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter===v?"bg-primary text-white":"bg-dark-900 text-white/40 hover:text-white/70"}`}>{l}</button>
        ))}
      </div>

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : (data?.coupons || []).length === 0 ? (
        <EmptyState icon={Tag} title="Keine Gutscheine" description="Erstellen Sie Ihren ersten Gutscheincode" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-white/40 text-xs uppercase"><th className="text-left py-2 px-3">Code</th><th className="text-left py-2 px-3">Rabatt</th><th className="text-center py-2 px-3">Nutzung</th><th className="text-left py-2 px-3">Status</th><th className="text-left py-2 px-3">Gültig</th><th className="text-right py-2 px-3">Aktionen</th></tr></thead>
              <tbody>
                {(data.coupons || []).map((c: any) => {
                  const st = couponStatus(c);
                  return (
                    <tr key={c.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-3 px-3"><span className="text-white font-mono font-bold">{c.code}</span>{c.description && <span className="text-white/40 text-xs block mt-0.5">{c.description}</span>}</td>
                      <td className="py-3 px-3 text-white/70">{c.discountType === "percentage" ? `${c.discountValue}%` : formatEuro(c.discountValue)}</td>
                      <td className="py-3 px-3 text-center text-white/60">{c._count?.usages ?? c.usageCount ?? 0}{c.maxUsageTotal > 0 ? `/${c.maxUsageTotal}` : ""}</td>
                      <td className="py-3 px-3"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${st.color}`}>{st.label}</span></td>
                      <td className="py-3 px-3 text-white/50 text-xs">{c.startDate ? formatDate(c.startDate) : "–"} – {c.endDate ? formatDate(c.endDate) : "∞"}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.pagination?.pages || 1} total={data.pagination?.total || 0} limit={20} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function CouponEditor({ item, onSave, onCancel, toast }: { item: any; onSave: () => void; onCancel: () => void; toast: (m: string, t?: "success" | "error" | "info") => void }) {
  const [code, setCode] = useState(item?.code || "");
  const [description, setDescription] = useState(item?.description || "");
  const [discountType, setDiscountType] = useState(item?.discountType || "fixed");
  const [discountValue, setDiscountValue] = useState(String(item?.discountValue || ""));
  const [minOrderValue, setMinOrderValue] = useState(String(item?.minOrderValue || "0"));
  const [maxUsageTotal, setMaxUsageTotal] = useState(String(item?.maxUsageTotal || "0"));
  const [maxUsagePerUser, setMaxUsagePerUser] = useState(String(item?.maxUsagePerUser || "1"));
  const [isActive, setIsActive] = useState(item?.isActive !== false);
  const [showBanner, setShowBanner] = useState(item?.showBanner === true);
  const [bannerText, setBannerText] = useState(item?.bannerText || "");
  const [startDate, setStartDate] = useState(item?.startDate ? new Date(item.startDate).toISOString().slice(0, 10) : "");
  const [endDate, setEndDate] = useState(item?.endDate ? new Date(item.endDate).toISOString().slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const body: any = { code, description, discountType, discountValue: parseFloat(discountValue), minOrderValue: parseFloat(minOrderValue), maxUsageTotal: parseInt(maxUsageTotal), maxUsagePerUser: parseInt(maxUsagePerUser), isActive, showBanner, bannerText, startDate: startDate || null, endDate: endDate || null };
    try {
      const url = item?.id ? `${API}/coupons/${item.id}/` : `${API}/coupons/`;
      const res = await fetch(url, { method: item?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Fehler"); }
      toast(item?.id ? "Gutschein aktualisiert" : "Gutschein erstellt");
      onSave();
    } catch (err: any) { toast(err.message, "error"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{item?.id ? "Gutschein bearbeiten" : "Neuer Gutschein"}</h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5"><X className="w-4 h-4" /></button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" />{saving ? "..." : "Speichern"}</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
        <div><label className="block text-xs font-medium text-white/50 mb-1">Code</label><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="z.B. SOMMER20 (leer = auto)" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white font-mono focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">Beschreibung</label><input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">Rabatt-Typ</label><select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none"><option value="fixed">Fester Betrag (€)</option><option value="percentage">Prozentsatz (%)</option></select></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">Rabattwert</label><input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} min="0" step="0.01" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">Mindestbestellwert (€)</label><input type="number" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)} min="0" step="0.01" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">Max. Nutzung gesamt (0 = unbegrenzt)</label><input type="number" value={maxUsageTotal} onChange={e => setMaxUsageTotal(e.target.value)} min="0" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">Max. pro Nutzer</label><input type="number" value={maxUsagePerUser} onChange={e => setMaxUsagePerUser(e.target.value)} min="1" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-primary" /><span className="text-sm text-white/70">Aktiv</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showBanner} onChange={e => setShowBanner(e.target.checked)} className="accent-primary" /><span className="text-sm text-white/70">Banner anzeigen</span></label>
        </div>
        {showBanner && <div className="md:col-span-2"><label className="block text-xs font-medium text-white/50 mb-1">Banner-Text</label><input value={bannerText} onChange={e => setBannerText(e.target.value)} placeholder="z.B. 20% Rabatt mit Code SOMMER20!" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>}
        <div><label className="block text-xs font-medium text-white/50 mb-1">Startdatum</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">Enddatum</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EMAIL CAMPAIGNS TAB
// ═══════════════════════════════════════════════════════════
function EmailCampaignsTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<any>(undefined);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (filter !== "all") params.set("status", filter);
  const { data, error, isLoading, mutate } = useSWR(`${API}/email-campaigns?${params}`, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  useEffect(() => { setPage(1); }, [debouncedSearch, filter]);

  if (creating || editing !== undefined) {
    return <CampaignEditor item={editing || null} onSave={() => { setEditing(undefined); setCreating(false); mutate(); }} onCancel={() => { setEditing(undefined); setCreating(false); }} toast={toast} />;
  }

  const campaignStatusColors: Record<string, string> = {
    draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    scheduled: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    sending: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    sent: "bg-green-500/10 text-green-400 border-green-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const campaignStatusLabels: Record<string, string> = {
    draft: "Entwurf", scheduled: "Geplant", sending: "Wird gesendet", sent: "Gesendet", failed: "Fehlgeschlagen",
  };

  async function handleDelete(id: string) {
    if (!confirm("Diese Kampagne wirklich löschen?")) return;
    const res = await fetch(`${API}/email-campaigns/${id}/`, { method: "DELETE", credentials: "include" });
    if (res.ok) { toast("Kampagne gelöscht"); mutate(); } else { const d = await res.json().catch(() => ({})); toast(d.error || "Fehler beim Löschen", "error"); }
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`${API}/email-campaigns/${id}/duplicate/`, { method: "POST", credentials: "include" });
    if (res.ok) { toast("Kampagne dupliziert"); mutate(); } else { toast("Fehler beim Duplizieren", "error"); }
  }

  async function handleSend(id: string) {
    if (!confirm("Kampagne jetzt an alle Empfänger senden?")) return;
    const res = await fetch(`${API}/email-campaigns/${id}/send/`, { method: "POST", credentials: "include" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { toast(d.message || "Kampagne wird gesendet"); mutate(); } else { toast(d.error || "Fehler beim Senden", "error"); }
  }

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Suche nach Name oder Betreff..." count={data?.pagination?.total}
        suffix={<button onClick={() => setCreating(true)} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"><Plus className="w-4 h-4" />Neue Kampagne</button>}
      />
      <div className="flex gap-2">
        {[["all","Alle"],["draft","Entwurf"],["scheduled","Geplant"],["sent","Gesendet"],["failed","Fehlgeschlagen"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter===v?"bg-primary text-white":"bg-dark-900 text-white/40 hover:text-white/70"}`}>{l}</button>
        ))}
      </div>

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : (data?.campaigns || []).length === 0 ? (
        <EmptyState icon={Mail} title="Keine Kampagnen" description="Erstellen Sie Ihre erste E-Mail-Kampagne" />
      ) : (
        <>
          <div className="space-y-2">
            {(data.campaigns || []).map((c: any) => (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-dark-900/40 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Mail className="w-5 h-5 text-primary/60" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-medium truncate">{c.name}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${campaignStatusColors[c.status] || campaignStatusColors.draft}`}>{campaignStatusLabels[c.status] || c.status}</span>
                  </div>
                  <p className="text-white/40 text-xs truncate">{c.subject || "Kein Betreff"}</p>
                  {c.status === "sent" && <p className="text-white/30 text-xs mt-0.5">✉ {c.sentCount}/{c.totalRecipients} gesendet{c.failedCount > 0 ? ` · ${c.failedCount} fehlgeschlagen` : ""}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(c.status === "draft" || c.status === "scheduled") && (
                    <>
                      <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors" title="Bearbeiten"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleSend(c.id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-white/40 hover:text-primary transition-colors" title="Senden"><Send className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                  <button onClick={() => handleDuplicate(c.id)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors" title="Duplizieren"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors" title="Löschen"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={data.pagination?.pages || 1} total={data.pagination?.total || 0} limit={20} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function CampaignEditor({ item, onSave, onCancel, toast }: { item: any; onSave: () => void; onCancel: () => void; toast: (m: string, t?: "success" | "error" | "info") => void }) {
  const [name, setName] = useState(item?.name || "");
  const [subject, setSubject] = useState(item?.subject || "");
  const [heading, setHeading] = useState(item?.heading || "");
  const [content, setContent] = useState(item?.content || "");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || "");
  const [ctaText, setCtaText] = useState(item?.ctaText || "");
  const [ctaUrl, setCtaUrl] = useState(item?.ctaUrl || "");
  const [targetMode, setTargetMode] = useState(item?.targetMode || "all");
  const [targetEmails, setTargetEmails] = useState(item?.targetEmails || "");
  const [testEmail, setTestEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  useEffect(() => {
    const body = { targetMode, targetEmails, targetSegment: "" };
    fetch(`${API}/email-campaigns/count-recipients/`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) })
      .then(r => r.json()).then(d => setRecipientCount(d.count ?? null)).catch(() => {});
  }, [targetMode, targetEmails]);

  async function handleSave() {
    setSaving(true);
    const body: any = { name, subject, heading, content, imageUrl, ctaText, ctaUrl, targetMode, targetEmails };
    try {
      const url = item?.id ? `${API}/email-campaigns/${item.id}/` : `${API}/email-campaigns/`;
      const res = await fetch(url, { method: item?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Fehler"); }
      toast(item?.id ? "Kampagne aktualisiert" : "Kampagne erstellt");
      onSave();
    } catch (err: any) { toast(err.message, "error"); } finally { setSaving(false); }
  }

  async function handleTest() {
    if (!testEmail) return;
    setTesting(true);
    try {
      const id = item?.id;
      if (!id) { toast("Speichern Sie zuerst die Kampagne", "error"); return; }
      const res = await fetch(`${API}/email-campaigns/${id}/test/`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email: testEmail }) });
      const d = await res.json();
      if (res.ok) { toast(d.message || "Test-E-Mail gesendet"); } else { toast(d.error || "Fehler", "error"); }
    } catch { toast("Fehler beim Senden", "error"); } finally { setTesting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{item?.id ? "Kampagne bearbeiten" : "Neue Kampagne"}</h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5"><X className="w-4 h-4" /></button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" />{saving ? "..." : "Speichern"}</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
        <div className="md:col-span-2"><label className="block text-xs font-medium text-white/50 mb-1">Kampagnen-Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Frühlings-Newsletter" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div className="md:col-span-2"><label className="block text-xs font-medium text-white/50 mb-1">Betreff *</label><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="E-Mail Betreffzeile" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div className="md:col-span-2"><label className="block text-xs font-medium text-white/50 mb-1">Überschrift</label><input value={heading} onChange={e => setHeading(e.target.value)} placeholder="Überschrift im E-Mail-Body" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div className="md:col-span-2"><label className="block text-xs font-medium text-white/50 mb-1">Inhalt *</label><textarea value={content} onChange={e => setContent(e.target.value)} rows={8} placeholder="<p>Ihr E-Mail-Inhalt...</p>" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm font-mono focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">Bild-URL</label><input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">CTA Text</label><input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Jetzt bestellen" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">CTA URL</label><input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-xs font-medium text-white/50 mb-1">Empfänger</label><select value={targetMode} onChange={e => setTargetMode(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none"><option value="all">Alle Abonnenten</option><option value="specific">Bestimmte E-Mails</option></select>{recipientCount !== null && <p className="text-xs text-white/40 mt-1">{recipientCount} Empfänger</p>}</div>
        {targetMode === "specific" && <div className="md:col-span-2"><label className="block text-xs font-medium text-white/50 mb-1">E-Mail-Adressen (kommagetrennt)</label><textarea value={targetEmails} onChange={e => setTargetEmails(e.target.value)} rows={3} placeholder="email1@test.de, email2@test.de" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" /></div>}
      </div>
      {item?.id && (
        <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
          <label className="block text-xs font-medium text-white/50 mb-2">Test-E-Mail senden</label>
          <div className="flex gap-2">
            <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@email.de" className="flex-1 px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" />
            <button onClick={handleTest} disabled={testing || !testEmail} className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors flex items-center gap-2"><Send className="w-4 h-4" />{testing ? "..." : "Test senden"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════
function SettingsTab({ token }: { token: string }) {
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const { data, error, isLoading, mutate } = useSWR(`${API}/settings`, fetcher, { revalidateOnFocus: false });

  const settings = data?.settings || [];

  const grouped: Record<string, any[]> = settings.reduce((acc: Record<string, any[]>, s: any) => {
    const prefix = s.key.includes("_") ? s.key.split("_")[0] : "general";
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const groupLabels: Record<string, string> = {
    site: "🌐 Website",
    payment: "💳 Zahlung",
    gateway: "🔌 Gateways",
    seo: "🔍 SEO",
    email: "📧 E-Mail",
    general: "⚙️ Allgemein",
    wp: "📦 WordPress",
  };

  async function updateSetting(key: string, value: string) {
    await fetch(`${API}/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ key, value }) });
  }

  async function addSetting() {
    if (!newKey.trim()) return;
    setSaving(true);
    await fetch(`${API}/settings`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ key: newKey.trim(), value: newValue }) });
    setNewKey(""); setNewValue("");
    mutate();
    setSaving(false);
  }

  async function deleteSetting(key: string) {
    if (!confirm(`"${key}" löschen?`)) return;
    await fetch(`${API}/settings?key=${encodeURIComponent(key)}`, { method: "DELETE", credentials: "include" });
    mutate();
  }

  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (isLoading) return <SkeletonTable rows={6} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Einstellungen</h2>
        <p className="text-white/40 text-sm">{settings.length} Einstellungen gespeichert</p>
      </div>

      <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Neue Einstellung</h3>
        <div className="flex gap-3">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Schlüssel (z.B. site_name)" className="flex-1 px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
          <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Wert" className="flex-1 px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
          <button onClick={addSetting} disabled={saving || !newKey.trim()} className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm disabled:opacity-40 flex items-center gap-2"><Plus className="w-4 h-4" /> Hinzufügen</button>
        </div>
      </div>

      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, items]) => (
        <div key={group} className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
          <h3 className="text-white font-semibold mb-4">{groupLabels[group] || `📁 ${group}`}</h3>
          <div className="space-y-3">
            {items.sort((a: any, b: any) => a.key.localeCompare(b.key)).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-white/50 text-xs font-mono min-w-[200px] shrink-0">{s.key}</span>
                <input
                  defaultValue={s.value}
                  onBlur={e => { if (e.target.value !== s.value) updateSetting(s.key, e.target.value); }}
                  className="flex-1 px-3 py-2 rounded-lg bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none"
                />
                <button onClick={() => deleteSetting(s.key)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BLOG — Types
// ═══════════════════════════════════════════════════════════
interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  author: string | null;
  featuredImage: string | null;
  featuredImageId: string | null;
  category: string | null;
  tags: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
}

// ═══════════════════════════════════════════════════════════
// BLOG TAB — Full Blog Management with SWR + Pagination
// ═══════════════════════════════════════════════════════════
function BlogTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<BlogPostData | null | undefined>(undefined);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (debouncedSearch) params.set("search", debouncedSearch);
  const swrKey = `${API}/blog?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  const posts: BlogPostData[] = data?.posts || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.pages || 1;

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: total, publish: 0, draft: 0, scheduled: 0 };
    if (statusFilter === "all") {
      posts.forEach(p => {
        if (p.status === "publish") counts.publish++;
        else if (p.status === "draft") counts.draft++;
        else if (p.status === "scheduled") counts.scheduled++;
      });
    }
    return counts;
  }, [posts, total, statusFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Diesen Beitrag wirklich löschen?")) return;
    try {
      await fetch(`${API}/blog/${id}`, { method: "DELETE", credentials: "include" });
      toast("Beitrag gelöscht");
      mutate();
    } catch { toast("Fehler beim Löschen", "error"); }
  }

  if (editing !== undefined) {
    return <BlogEditor post={editing} token={token} onSave={() => { setEditing(undefined); mutate(); }} onCancel={() => setEditing(undefined)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Blog-Beiträge</h2>
          <p className="text-white/40 text-sm mt-1">{total} Beiträge insgesamt</p>
        </div>
        <button onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Neuer Beitrag
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Beiträge suchen..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "publish", "draft", "scheduled"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary/10 text-primary border border-primary/20" : "bg-dark-900/60 text-white/40 border border-white/[0.06] hover:text-white"}`}>
              {s === "all" ? "Alle" : s === "publish" ? "Veröffentlicht" : s === "draft" ? "Entwurf" : "Geplant"}
            </button>
          ))}
        </div>
      </div>

      {error ? <ErrorState onRetry={() => mutate()} /> : isLoading ? <SkeletonTable /> : posts.length === 0 ? (
        <EmptyState icon={BookOpen} title={debouncedSearch ? "Keine Ergebnisse" : "Keine Beiträge"} description={debouncedSearch ? `Keine Ergebnisse für "${debouncedSearch}"` : undefined} />
      ) : (
        <>
          <div className="space-y-2">
            {posts.map(post => (
              <div key={post.id} className="flex items-center gap-4 p-4 rounded-xl bg-dark-900/60 border border-white/[0.04] hover:border-white/10 transition-colors group">
                {post.featuredImage ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/[0.06]">
                    <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-dark-800 border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{post.title}</h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-white/30 text-xs">/{post.slug}/</span>
                    {post.publishedAt && <span className="text-white/30 text-xs">{formatDate(post.publishedAt)}</span>}
                    {post.status === "scheduled" && post.scheduledAt && (
                      <span className="text-yellow-400/70 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Geplant: {new Date(post.scheduledAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} {new Date(post.scheduledAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {post.category && <span className="text-primary/70 text-xs">{post.category}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={post.status} />
                  <a href={`/${post.slug}/`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"><Eye className="w-4 h-4" /></a>
                  <button onClick={() => setEditing(post)} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BLOG EDITOR — Create/Edit with Tiptap, Scheduling & SEO
// ═══════════════════════════════════════════════════════════
function BlogEditor({
  post,
  token,
  onSave,
  onCancel,
}: {
  post: BlogPostData | null;
  token: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isNew = !post?.id;
  const { toast } = useToast();

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [content, setContent] = useState(post?.content || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [category, setCategory] = useState(post?.category || "");
  const [tags, setTags] = useState(post?.tags || "");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || "");
  const [useRichEditor, setUseRichEditor] = useState(true);

  const [publishMode, setPublishMode] = useState<"draft" | "publish" | "schedule">(
    post?.status === "scheduled" ? "schedule" : post?.status === "publish" ? "publish" : "draft"
  );
  const [scheduleDate, setScheduleDate] = useState(
    post?.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ""
  );

  const [metaTitle, setMetaTitle] = useState(post?.metaTitle || "");
  const [metaDesc, setMetaDesc] = useState(post?.metaDescription || "");
  const [focusKeyword, setFocusKeyword] = useState(post?.focusKeyword || "");
  const [canonical, setCanonical] = useState(post?.canonical || "");
  const [ogTitle, setOgTitle] = useState(post?.ogTitle || "");
  const [ogDesc, setOgDesc] = useState(post?.ogDescription || "");

  const [slugManual, setSlugManual] = useState(!!post?.slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function generateSlug(t: string) {
    return t
      .toLowerCase()
      .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleTitleChange(t: string) {
    setTitle(t);
    if (!slugManual) setSlug(generateSlug(t));
  }

  function handleSlugChange(s: string) {
    setSlugManual(true);
    setSlug(s.replace(/[^a-z0-9-]/g, ""));
  }

  async function handleSave() {
    if (!title.trim()) { setError("Titel ist erforderlich"); return; }
    const finalSlug = slug.trim() || generateSlug(title);
    if (!finalSlug) { setError("Slug ist erforderlich"); return; }
    if (!slug) setSlug(finalSlug);
    if (publishMode === "schedule" && !scheduleDate) { setError("Bitte Datum und Uhrzeit für die geplante Veröffentlichung angeben"); return; }

    setSaving(true); setError("");

    const status = publishMode === "publish" ? "publish" : publishMode === "schedule" ? "scheduled" : "draft";
    const body: Record<string, unknown> = {
      title, slug: finalSlug, content, excerpt, status,
      category: category || null,
      tags: tags || null,
      featuredImage: featuredImage || null,
      metaTitle: metaTitle || null,
      metaDescription: metaDesc || null,
      focusKeyword: focusKeyword || null,
      canonical: canonical || null,
      ogTitle: ogTitle || null,
      ogDescription: ogDesc || null,
    };

    if (status === "scheduled") body.scheduledAt = scheduleDate;
    if (post?.id) body.id = post.id;

    try {
      const url = post?.id ? `${API}/blog/${post.id}` : `${API}/blog`;
      const res = await fetch(url, {
        method: post?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Fehler beim Speichern");
      toast("Beitrag erfolgreich gespeichert");
      setTimeout(() => onSave(), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{isNew ? "Neuer Beitrag" : "Beitrag bearbeiten"}</h2>
          {!isNew && <p className="text-white/30 text-sm mt-0.5">/{post?.slug}/</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 transition-colors flex items-center gap-2"><X className="w-4 h-4" /> Abbrechen</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Content + SEO ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Titel *</label>
            <input value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="Beitragstitel..." className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-lg font-semibold focus:border-primary focus:outline-none" />
          </div>
          {/* Slug */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Slug (URL)</label>
            <div className="flex items-center">
              <span className="px-3 py-2.5 rounded-l-xl bg-dark-800 border border-r-0 border-white/10 text-white/30 text-xs select-none whitespace-nowrap">ikfzdigitalzulassung.de/</span>
              <input value={slug} onChange={e => handleSlugChange(e.target.value)} placeholder="beitrag-slug" className="flex-1 px-4 py-2.5 rounded-r-xl bg-dark-950 border border-white/10 text-white/70 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
          {/* Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/40">Inhalt</label>
              <button type="button" onClick={() => setUseRichEditor(v => !v)} className="text-xs text-primary/70 hover:text-primary transition-colors">
                {useRichEditor ? "HTML-Ansicht" : "Editor-Ansicht"}
              </button>
            </div>
            {useRichEditor ? (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <TiptapEditor content={content} onChange={setContent} placeholder="Schreibe deinen Beitrag..." />
              </div>
            ) : (
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={20} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-sm font-mono leading-relaxed focus:border-primary focus:outline-none resize-y" />
            )}
          </div>
          {/* Excerpt */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Auszug / Zusammenfassung</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} placeholder="Kurze Zusammenfassung für SEO und Karten..." className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none resize-y" />
          </div>
          {/* SEO Section */}
          <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-4">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> SEO</h3>
            <div className="p-4 rounded-xl bg-dark-950 border border-white/10">
              <p className="text-xs text-white/30 mb-2 font-medium uppercase tracking-wider">Google-Vorschau</p>
              <p className="text-blue-400 text-base hover:underline cursor-default truncate">{metaTitle || title || "Titel"}</p>
              <p className="text-green-400 text-xs mt-0.5">ikfzdigitalzulassung.de/{slug || "slug"}/</p>
              <p className="text-white/50 text-sm mt-1 line-clamp-2">{metaDesc || excerpt || "Beschreibung..."}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Meta Title <span className="text-white/20">({metaTitle.length}/60)</span></label>
                <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} maxLength={70} placeholder={title || "Meta Title"} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Focus-Keyword</label>
                <input value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} placeholder="Haupt-Keyword..." className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Meta Description <span className="text-white/20">({metaDesc.length}/160)</span></label>
              <textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={2} maxLength={170} placeholder="Beschreibung für Suchmaschinen..." className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Canonical URL</label>
              <input value={canonical} onChange={e => setCanonical(e.target.value)} placeholder={`https://ikfzdigitalzulassung.de/${slug || "beitrag-slug"}/`} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white/60 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">OG Title</label>
                <input value={ogTitle} onChange={e => setOgTitle(e.target.value)} placeholder={metaTitle || title || "OG Title"} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">OG Description</label>
                <input value={ogDesc} onChange={e => setOgDesc(e.target.value)} placeholder={metaDesc || "OG Description"} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="space-y-4">
          {/* Publish Mode */}
          <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Veröffentlichung</h3>
            <div className="space-y-2">
              {(["draft", "publish", "schedule"] as const).map(mode => (
                <label key={mode} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${publishMode === mode ? "border-primary/30 bg-primary/[0.05]" : "border-white/[0.06]"}`}>
                  <input type="radio" name="publishMode" checked={publishMode === mode} onChange={() => setPublishMode(mode)} className="accent-primary" />
                  <div>
                    <span className="text-white text-sm font-medium">{mode === "draft" ? "Entwurf" : mode === "publish" ? "Sofort veröffentlichen" : "Zeitgesteuert"}</span>
                    <p className="text-white/30 text-xs">{mode === "draft" ? "Nicht veröffentlicht" : mode === "publish" ? "Wird sofort live" : "Automatisch veröffentlichen"}</p>
                  </div>
                </label>
              ))}
            </div>
            {publishMode === "schedule" && (
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Datum & Uhrzeit</label>
                <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none [color-scheme:dark]" />
                {scheduleDate && (
                  <p className="text-xs text-yellow-400/70 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(scheduleDate).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · {new Date(scheduleDate).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                  </p>
                )}
              </div>
            )}
            <button onClick={handleSave} disabled={saving} className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {saving ? "Speichern..." : "Speichern"}
            </button>
          </div>
          {/* Category & Tags */}
          <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Kategorie & Tags</h3>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Kategorie</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder="z. B. Fahrzeugzulassung" className="w-full px-3 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Tags <span className="text-white/20">(kommagetrennt)</span></label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="kfz, zulassung, ummeldung" className="w-full px-3 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
          {/* Featured Image */}
          <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> Beitragsbild</h3>
            <ImageField label="" value={featuredImage} onChange={setFeaturedImage} token={token} />
          </div>
          {/* Post Info */}
          {!isNew && post && (
            <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-2">
              <h3 className="text-white font-semibold text-sm mb-3">Info</h3>
              {post.publishedAt && <div className="flex justify-between text-xs"><span className="text-white/30">Veröffentlicht</span><span className="text-white/60">{formatDate(post.publishedAt)}</span></div>}
              <div className="flex justify-between text-xs"><span className="text-white/30">Status</span><Badge status={post.status} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ═══════════════════════════════════════════════════════════
export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminPageInner />
    </ToastProvider>
  );
}

function AdminPageInner() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${API}/auth/`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (d.authenticated) setToken(d.user?.email || "session"); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401) {
        const url = typeof args[0] === "string" ? args[0] : "";
        // Only logout if a real admin API call failed (not the auth endpoint itself)
        if (url.startsWith("/api/admin/") && !url.includes("/auth")) {
          // Confirm session is truly invalid before logging out
          try {
            const check = await originalFetch(`${API}/auth/`, { credentials: "include" });
            if (!check.ok) {
              setToken(null);
              toast("Sitzung abgelaufen. Bitte erneut anmelden.", "error");
            }
          } catch {
            setToken(null);
            toast("Sitzung abgelaufen. Bitte erneut anmelden.", "error");
          }
        }
      }
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, [token, toast]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <RefreshCw className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!token) return <LoginScreen onLogin={setToken} />;

  const tabs: { id: Tab; label: string; icon: any; section?: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Übersicht" },
    { id: "orders", label: "Bestellungen", icon: ShoppingCart, section: "E-Commerce" },
    { id: "products", label: "Produkte", icon: Package },
    { id: "customers", label: "Kunden", icon: Users },
    { id: "payments", label: "Zahlungen", icon: CreditCard },
    { id: "invoices", label: "Rechnungen", icon: Receipt },
    { id: "gateways", label: "Zahlungs-Gateways", icon: Wallet },
    { id: "coupons", label: "Gutscheine", icon: Percent, section: "Marketing" },
    { id: "campaigns", label: "E-Mail Kampagnen", icon: Mail },
    { id: "pages", label: "Seiten", icon: FileText, section: "CMS" },
    { id: "posts", label: "Blog / Beiträge", icon: BookOpen },
    { id: "media", label: "Medien", icon: ImageIcon },
    { id: "seo", label: "SEO", icon: Globe },
    { id: "settings", label: "Einstellungen", icon: Settings, section: "System" },
  ];

  async function handleLogout() {
    await fetch(`${API}/auth`, { method: "DELETE", credentials: "include" });
    setToken(null);
    toast("Erfolgreich abgemeldet");
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <aside className="w-64 border-r border-white/[0.06] bg-dark-900/50 flex flex-col">
        <div className="p-6 border-b border-white/[0.06]">
          <h1 className="text-lg font-bold text-white">iKFZ Admin</h1>
          <p className="text-xs text-white/30 mt-1">E-Commerce & CMS</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {tabs.map((t) => (
            <div key={t.id}>
              {t.section && <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold mt-4 mb-2 px-3">{t.section}</p>}
              <button onClick={() => setTab(t.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${tab === t.id ? "bg-primary/10 text-primary" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
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

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {tab === "dashboard" && <DashboardTab token={token} />}
          {tab === "pages" && <CMSListTab type="pages" token={token} />}
          {tab === "posts" && <BlogTab token={token} />}
          {tab === "seo" && <SEOTab token={token} />}
          {tab === "products" && <ProductsTab token={token} />}
          {tab === "orders" && <OrdersTab token={token} />}
          {tab === "customers" && <CustomersTab token={token} />}
          {tab === "payments" && <PaymentsTab token={token} />}
          {tab === "invoices" && <InvoicesTab token={token} />}
          {tab === "gateways" && <GatewaysTab token={token} />}
          {tab === "coupons" && <CouponsTab token={token} />}
          {tab === "campaigns" && <EmailCampaignsTab token={token} />}
          {tab === "media" && <MediaLibraryTab token={token} />}
          {tab === "settings" && <SettingsTab token={token} />}
        </div>
      </main>
    </div>
  );
}
