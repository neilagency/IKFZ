"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  FileText, BookOpen, Search, LogOut, LayoutDashboard,
  Plus, Pencil, Trash2, Save, X, Eye, Settings, Globe,
  ShoppingCart, Users, CreditCard, Receipt, Package,
  TrendingUp, DollarSign, ChevronLeft, ChevronRight,
  Download, Filter, RefreshCw, Zap, Shield, Wallet, Clock,
  ExternalLink, Image as ImageIcon, AlertCircle, FileQuestion,
} from "lucide-react";
import { MediaLibraryTab, ImageField } from "@/components/admin/MediaLibrary";
import { ToastProvider, useToast } from "@/components/admin/Toast";

const API = "/api/admin";

// ─── Types ──────────────────────────────────────────────────
interface SEOData { id?: string; metaTitle?: string; metaDescription?: string; canonicalUrl?: string; ogTitle?: string; ogDescription?: string; ogImage?: string; robots?: string; schemaJson?: string; }
interface PageData { id: string; title: string; slug: string; content: string; excerpt: string; status: string; pageType: string; featuredImage: string | null; seo: SEOData | null; }
interface PostData { id: string; title: string; slug: string; content: string; excerpt: string; status: string; author: string | null; featuredImage: string | null; readingTime: number | null; publishedAt: string | null; scheduledAt: string | null; seo: SEOData | null; categories?: { category: { id: string; name: string; slug: string } }[]; }
interface PaginationInfo { page: number; totalPages: number; total: number; limit: number; }

type Tab = "dashboard" | "pages" | "posts" | "seo" | "products" | "orders" | "customers" | "payments" | "invoices" | "gateways" | "settings" | "media";

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
  return fetch(url, { credentials: "include" }).then(r => {
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
      const res = await fetch(`${API}/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
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
// ORDERS TAB — with SWR + Pagination
// ═══════════════════════════════════════════════════════════
function OrdersTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (statusFilter) params.set("status", statusFilter);
  const swrKey = `${API}/orders?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  async function updateStatus(id: string, status: string) {
    await fetch(`${API}/orders`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, status }) });
    mutate(); if (selectedOrder?.id === id) setSelectedOrder(null);
  }

  if (selectedOrder) {
    const o = selectedOrder;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-lg hover:bg-white/5 text-white/40"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-xl font-bold text-white">Bestellung #{o.orderNumber}</h2>
          <Badge status={o.status} />
        </div>

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
          </div>
        </div>

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
              {o.shippingTotal > 0 && <p className="text-white/50 text-sm">Versand: {formatEuro(o.shippingTotal)}</p>}
              {o.totalTax > 0 && <p className="text-white/50 text-sm">MwSt: {formatEuro(o.totalTax)}</p>}
              <p className="text-white font-bold text-lg">Gesamt: {formatEuro(o.total)}</p>
            </div>
          </div>
        </div>

        {/* Service Data (from forms) */}
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

        <div className="flex gap-2">
          <span className="text-white/50 text-sm self-center mr-2">Status ändern:</span>
          {["processing", "completed", "cancelled", "refunded"].map(s => (
            <button key={s} onClick={() => updateStatus(o.id, s)} disabled={o.status === s} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${o.status === s ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5"} ${statusColors[s] || ""}`}>{s}</button>
          ))}
        </div>
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
// BLOG TAB — Full Blog Management with SWR + Pagination
// ═══════════════════════════════════════════════════════════
function BlogTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PostData | null | undefined>(undefined);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (debouncedSearch) params.set("search", debouncedSearch);
  const swrKey = `${API}/posts?${params}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true });

  const posts: PostData[] = data?.posts || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  // Load categories from first page of posts (for editor)
  useEffect(() => {
    fetch(`${API}/posts?limit=100`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        const cats = new Map<string, { id: string; name: string; slug: string }>();
        (d.posts || []).forEach((p: any) =>
          p.categories?.forEach((c: any) => {
            if (c.category) cats.set(c.category.id, c.category);
          })
        );
        setCategories(Array.from(cats.values()));
      })
      .catch(() => {});
  }, []);

  // Count by status from current data (approximate from total when filtered)
  const statusCounts = useMemo(() => {
    const counts = { all: total, published: 0, draft: 0, scheduled: 0 };
    if (statusFilter === "all") {
      posts.forEach(p => {
        if (p.status === "published") counts.published++;
        else if (p.status === "draft") counts.draft++;
        else if (p.status === "scheduled") counts.scheduled++;
      });
    }
    return counts;
  }, [posts, total, statusFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Diesen Beitrag wirklich löschen?")) return;
    try {
      await fetch(`${API}/posts?id=${id}`, { method: "DELETE", credentials: "include" });
      toast("Beitrag gelöscht");
      mutate();
    } catch { toast("Fehler beim Löschen", "error"); }
  }

  if (editing !== undefined) {
    return <BlogEditor post={editing} token={token} categories={categories} onSave={() => { setEditing(undefined); mutate(); }} onCancel={() => setEditing(undefined)} />;
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
          {(["all", "published", "draft", "scheduled"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary/10 text-primary border border-primary/20" : "bg-dark-900/60 text-white/40 border border-white/[0.06] hover:text-white"}`}>
              {s === "all" ? "Alle" : s === "published" ? "Veröffentlicht" : s === "draft" ? "Entwurf" : "Geplant"}
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
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-white/30 text-xs">/{post.slug}/</span>
                    {post.publishedAt && <span className="text-white/30 text-xs">{formatDate(post.publishedAt)}</span>}
                    {post.status === "scheduled" && post.scheduledAt && (
                      <span className="text-yellow-400/70 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Geplant: {new Date(post.scheduledAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} {new Date(post.scheduledAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {post.categories?.map(c => (
                      <span key={c.category.id} className="text-primary/70 text-xs">{c.category.name}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge status={post.status} />
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"><Eye className="w-4 h-4" /></a>
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
// BLOG EDITOR — Create/Edit with Scheduling & SEO
// ═══════════════════════════════════════════════════════════
function BlogEditor({
  post,
  token,
  categories,
  onSave,
  onCancel,
}: {
  post: PostData | null;
  token: string;
  categories: { id: string; name: string; slug: string }[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const isNew = !post?.id;
  const { toast } = useToast();

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [content, setContent] = useState(post?.content || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [author, setAuthor] = useState(post?.author || "");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || "");

  const [publishMode, setPublishMode] = useState<"draft" | "publish" | "schedule">(
    post?.status === "scheduled" ? "schedule" : post?.status === "published" ? "publish" : "draft"
  );
  const [scheduleDate, setScheduleDate] = useState(
    post?.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ""
  );

  const [activeTab, setActiveTab] = useState<"content" | "seo">("content");
  const [metaTitle, setMetaTitle] = useState(post?.seo?.metaTitle || "");
  const [metaDesc, setMetaDesc] = useState(post?.seo?.metaDescription || "");
  const [ogTitle, setOgTitle] = useState(post?.seo?.ogTitle || "");
  const [ogDesc, setOgDesc] = useState(post?.seo?.ogDescription || "");
  const [ogImage, setOgImage] = useState(post?.seo?.ogImage || "");
  const [canonical, setCanonical] = useState(post?.seo?.canonicalUrl || "");

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
    setSlug(s);
  }

  async function handleSave() {
    if (!title.trim()) { setError("Titel ist erforderlich"); return; }
    const finalSlug = slug.trim() || generateSlug(title);
    if (!finalSlug) { setError("Slug ist erforderlich"); return; }
    if (!slug) setSlug(finalSlug);
    if (publishMode === "schedule" && !scheduleDate) { setError("Bitte Datum und Uhrzeit für die geplante Veröffentlichung angeben"); return; }

    setSaving(true); setError("");

    const status = publishMode === "publish" ? "published" : publishMode === "schedule" ? "scheduled" : "draft";
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const body: any = {
      title, slug: finalSlug, content, excerpt, status, author: author || null,
      featuredImage: featuredImage || null, readingTime,
      seo: {
        metaTitle: metaTitle || title,
        metaDescription: metaDesc || excerpt || "",
        canonicalUrl: canonical || `https://ikfzdigitalzulassung.de/blog/${finalSlug}/`,
        ogTitle: ogTitle || null,
        ogDescription: ogDesc || null,
        ogImage: ogImage || featuredImage || null,
      },
    };

    if (status === "scheduled") body.scheduledAt = scheduleDate;
    if (post?.id) body.id = post.id;

    try {
      const res = await fetch(`${API}/posts`, {
        method: post?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Speichern");
      toast("Beitrag erfolgreich gespeichert");
      onSave();
    } catch (err: any) {
      setError(err.message);
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

      <div className="flex gap-2">
        <button onClick={() => setActiveTab("content")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "content" ? "bg-primary text-white" : "bg-dark-800 text-white/60 hover:text-white"}`}>Inhalt</button>
        <button onClick={() => setActiveTab("seo")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "seo" ? "bg-primary text-white" : "bg-dark-800 text-white/60 hover:text-white"}`}>SEO</button>
      </div>

      {activeTab === "content" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Titel</label>
              <input value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="Beitragstitel..." className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-lg font-semibold focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Slug</label>
              <input value={slug} onChange={e => handleSlugChange(e.target.value)} placeholder="beitrag-slug" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white/60 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Inhalt (HTML)</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={20} placeholder="Schreibe deinen Beitrag..." className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-sm font-mono leading-relaxed focus:border-primary focus:outline-none resize-y" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Auszug / Zusammenfassung</label>
              <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} placeholder="Kurze Zusammenfassung des Beitrags..." className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none resize-y" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-4">
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
                <div className="pt-2">
                  <label className="block text-xs text-white/40 mb-1.5">Datum & Uhrzeit</label>
                  <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none [color-scheme:dark]" />
                  {scheduleDate && (
                    <p className="text-xs text-yellow-400/70 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Wird am {new Date(scheduleDate).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} um {new Date(scheduleDate).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr veröffentlicht
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
              <h3 className="text-white font-semibold text-sm">Beitragsbild</h3>
              <ImageField label="" value={featuredImage} onChange={setFeaturedImage} token={token} />
            </div>

            <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
              <h3 className="text-white font-semibold text-sm">Autor</h3>
              <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Autorname..." className="w-full px-3 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
            </div>

            {!isNew && post && (
              <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-2">
                <h3 className="text-white font-semibold text-sm mb-3">Info</h3>
                {post.publishedAt && <div className="flex justify-between text-xs"><span className="text-white/30">Veröffentlicht</span><span className="text-white/60">{formatDate(post.publishedAt)}</span></div>}
                <div className="flex justify-between text-xs"><span className="text-white/30">Status</span><Badge status={post.status} /></div>
                <div className="flex justify-between text-xs"><span className="text-white/30">Lesezeit</span><span className="text-white/60">{post.readingTime || "—"} Min.</span></div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Meta Title <span className="text-white/20">({metaTitle.length}/60)</span></label>
              <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder={title || "Meta Title"} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">OG Title</label>
              <input value={ogTitle} onChange={e => setOgTitle(e.target.value)} placeholder={metaTitle || title || "OG Title"} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Meta Description <span className="text-white/20">({metaDesc.length}/160)</span></label>
            <textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={3} placeholder="Beschreibung für Suchmaschinen..." className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">OG Description</label>
            <textarea value={ogDesc} onChange={e => setOgDesc(e.target.value)} rows={2} placeholder={metaDesc || "OG Description"} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <ImageField label="OG Image" value={ogImage} onChange={setOgImage} token={token} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Canonical URL</label>
              <input value={canonical} onChange={e => setCanonical(e.target.value)} placeholder={`https://ikfzdigitalzulassung.de/blog/${slug}/`} className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white/60 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-dark-950 border border-white/10">
            <p className="text-xs text-white/30 mb-3 font-medium uppercase tracking-wider">Google-Vorschau</p>
            <p className="text-blue-400 text-lg hover:underline cursor-default">{metaTitle || title || "Titel"}</p>
            <p className="text-green-400 text-sm mt-0.5">ikfzdigitalzulassung.de/blog/{slug || "slug"}/</p>
            <p className="text-white/50 text-sm mt-1 line-clamp-2">{metaDesc || excerpt || "Beschreibung..."}</p>
          </div>
        </div>
      )}
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
    fetch(`${API}/auth`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (d.authenticated) setToken(d.user?.email || "session"); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401 && token) {
        const url = typeof args[0] === "string" ? args[0] : "";
        if (url.startsWith("/api/admin/") && !url.endsWith("/auth")) {
          setToken(null);
          toast("Sitzung abgelaufen. Bitte erneut anmelden.", "error");
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
          {tab === "media" && <MediaLibraryTab token={token} />}
          {tab === "settings" && <SettingsTab token={token} />}
        </div>
      </main>
    </div>
  );
}
