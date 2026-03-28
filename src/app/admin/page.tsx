"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, BookOpen, Search, LogOut, LayoutDashboard,
  Plus, Pencil, Trash2, Save, X, Eye, Settings, Globe,
  ShoppingCart, Users, CreditCard, Receipt, Package,
  TrendingUp, DollarSign, ChevronLeft, ChevronRight,
  Download, Filter, RefreshCw, Zap, Shield, Wallet, Clock,
  ExternalLink, Image as ImageIcon,
} from "lucide-react";
import { MediaLibraryTab, ImageField } from "@/components/admin/MediaLibrary";
import { ToastProvider, useToast } from "@/components/admin/Toast";

const API = "/api/admin";

// ─── Types ──────────────────────────────────────────────────
interface SEOData { id?: string; metaTitle?: string; metaDescription?: string; canonicalUrl?: string; ogTitle?: string; ogDescription?: string; ogImage?: string; robots?: string; schemaJson?: string; }
interface PageData { id: string; title: string; slug: string; content: string; excerpt: string; status: string; pageType: string; featuredImage: string | null; seo: SEOData | null; }
interface PostData { id: string; title: string; slug: string; content: string; excerpt: string; status: string; author: string | null; featuredImage: string | null; readingTime: number | null; publishedAt: string | null; scheduledAt: string | null; seo: SEOData | null; categories?: { category: { id: string; name: string; slug: string } }[]; }

type Tab = "dashboard" | "pages" | "posts" | "seo" | "products" | "orders" | "customers" | "payments" | "invoices" | "gateways" | "settings" | "media";

// ─── Helper ─────────────────────────────────────────────────
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
  instock: "bg-green-500/10 text-green-400 border-green-500/20",
  outofstock: "bg-red-500/10 text-red-400 border-red-500/20",
};

function Badge({ status }: { status: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${statusColors[status] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>{status}</span>;
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
      const res = await fetch(`${API}/${type}`, { method: item?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 text-white/40 animate-spin" /></div>;
  if (!data) return <p className="text-red-400">Fehler beim Laden</p>;

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
// CMS LIST TAB (Pages/Posts reuse)
// ═══════════════════════════════════════════════════════════
function CMSListTab({ type, token }: { type: "pages" | "posts"; token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(undefined);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/${type}?search=${search}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { setItems(Array.isArray(d) ? d : d[type] || []); }).catch(() => {}).finally(() => setLoading(false));
  }, [type, search, token]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Wirklich löschen?")) return;
    await fetch(`${API}/${type}?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  }

  if (editing !== undefined) {
    return <ContentEditor item={editing} type={type} token={token} onSave={() => { setEditing(undefined); load(); }} onCancel={() => setEditing(undefined)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" /></div>
        <button onClick={() => setEditing(null)} className="px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Neu</button>
      </div>
      {loading ? <div className="text-center py-10"><RefreshCw className="w-5 h-5 text-white/40 animate-spin mx-auto" /></div> : (
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
          {items.length === 0 && <p className="text-white/30 text-center py-10">Keine Einträge gefunden</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SEO TAB
// ═══════════════════════════════════════════════════════════
function SEOTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/seo`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => setRecords(d.seo || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

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
      await fetch(`${API}/seo`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: editing.id, metaTitle, metaDescription: metaDesc, canonicalUrl: canonical, robots, ogTitle, ogDescription: ogDesc, ogImage }) });
      toast("SEO erfolgreich aktualisiert");
      setEditing(null); load();
    } catch { toast("Fehler beim Speichern", "error"); } finally { setSaving(false); }
  }

  const filtered = records.filter(r => {
    const title = (r.page?.title || r.post?.title || "").toLowerCase();
    const slug = (r.page?.slug || r.post?.slug || "").toLowerCase();
    return title.includes(search.toLowerCase()) || slug.includes(search.toLowerCase());
  });

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

        {/* Google SERP Preview */}
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
      <div className="flex items-center gap-4">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Seiten oder Beiträge suchen..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" /></div>
        <span className="text-white/40 text-sm whitespace-nowrap">{filtered.length} Einträge</span>
      </div>
      {loading ? <div className="text-center py-10"><RefreshCw className="w-5 h-5 text-white/40 animate-spin mx-auto" /></div> : (
        <div className="space-y-2">
          {filtered.map((r: any) => {
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
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════
function ProductsTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(undefined);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/products`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

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
      await fetch(`${API}/products`, { method: editing?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      toast("Produkt erfolgreich gespeichert");
      setEditing(undefined); load();
    } catch { toast("Fehler beim Speichern", "error"); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Produkt löschen?")) return;
    await fetch(`${API}/products?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Produkte ({products.length})</h2>
        <button onClick={() => startEdit(null)} className="px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Neu</button>
      </div>
      {loading ? <div className="text-center py-10"><RefreshCw className="w-5 h-5 text-white/40 animate-spin mx-auto" /></div> : (
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
          {products.length === 0 && <p className="text-white/30 text-center py-10">Keine Produkte</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ORDERS TAB
// ═══════════════════════════════════════════════════════════
function OrdersTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({ orders: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`${API}/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [token, page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    await fetch(`${API}/orders`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, status }) });
    load(); if (selectedOrder?.id === id) setSelectedOrder(null);
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 relative min-w-[200px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Suche nach Name, Email, Nummer..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" /></div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none">
          <option value="">Alle Status</option>
          {["completed", "processing", "on-hold", "pending", "cancelled", "refunded", "failed"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-10"><RefreshCw className="w-5 h-5 text-white/40 animate-spin mx-auto" /></div> : (
        <>
          <div className="text-sm text-white/40">{data.total} Bestellungen gesamt</div>
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

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-white/50 text-sm">Seite {page} von {data.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CUSTOMERS TAB
// ═══════════════════════════════════════════════════════════
function CustomersTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({ customers: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (search) params.set("search", search);
    fetch(`${API}/customers?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [token, page, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Suche nach Name, Email, Firma..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" /></div>
      </div>
      <div className="text-sm text-white/40">{data.total} Kunden gesamt</div>
      {loading ? <div className="text-center py-10"><RefreshCw className="w-5 h-5 text-white/40 animate-spin mx-auto" /></div> : (
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
      )}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-white/50 text-sm">Seite {page} von {data.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAYMENTS TAB
// ═══════════════════════════════════════════════════════════
function PaymentsTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({ payments: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (statusFilter) params.set("status", statusFilter);
    fetch(`${API}/payments?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [token, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm"><option value="">Alle Status</option><option value="completed">Bezahlt</option><option value="pending">Ausstehend</option><option value="failed">Fehlgeschlagen</option><option value="refunded">Erstattet</option></select>
        <span className="text-white/40 text-sm">{data.total} Zahlungen</span>
      </div>
      {loading ? <div className="text-center py-10"><RefreshCw className="w-5 h-5 text-white/40 animate-spin mx-auto" /></div> : (
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
      )}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-white/50 text-sm">Seite {page} von {data.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INVOICES TAB
// ═══════════════════════════════════════════════════════════
function InvoicesTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({ invoices: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (statusFilter) params.set("status", statusFilter);
    fetch(`${API}/invoices?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [token, page, statusFilter]);

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
        <span className="text-white/40 text-sm">{data.total} Rechnungen</span>
      </div>
      {loading ? <div className="text-center py-10"><RefreshCw className="w-5 h-5 text-white/40 animate-spin mx-auto" /></div> : (
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
      )}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-white/50 text-sm">Seite {page} von {data.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="p-2 rounded-lg hover:bg-white/5 text-white/40 disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAYMENT GATEWAYS TAB
// ═══════════════════════════════════════════════════════════
function GatewaysTab({ token }: { token: string }) {
  const [gateways, setGateways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentStats, setPaymentStats] = useState<any[]>([]);

  useEffect(() => {
    // Load payment gateways from saved audit file or from settings
    setLoading(true);
    Promise.all([
      fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ]).then(([settingsData, dashData]) => {
      // Build gateway list from payment method stats + saved settings
      const methods = dashData.paymentMethods || [];
      setPaymentStats(methods);

      // Load gateway configs from settings
      const settings = settingsData.settings || [];
      const gwSettings = settings.filter((s: any) => s.key.startsWith("gateway_"));
      
      // Build known gateways list
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

      // Merge settings
      for (const gw of knownGateways) {
        const setting = gwSettings.find((s: any) => s.key === `gateway_${gw.id}_enabled`);
        if (setting) gw.enabled = setting.value === "true";
      }

      setGateways(knownGateways);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function toggleGateway(id: string, enabled: boolean) {
    setGateways(prev => prev.map(g => g.id === id ? { ...g, enabled } : g));
    await fetch(`${API}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key: `gateway_${id}_enabled`, value: String(enabled) }),
    });
  }

  if (loading) return <div className="text-center py-20"><RefreshCw className="w-6 h-6 text-white/40 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Zahlungs-Gateways</h2>
        <p className="text-white/40 text-sm">Konfiguration der aktiven Zahlungsmethoden (migriert von WooCommerce)</p>
      </div>

      {/* Gateway Usage Stats */}
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

      {/* Gateway List */}
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
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => setSettings(d.settings || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Group settings by prefix
  const grouped = settings.reduce((acc: Record<string, any[]>, s: any) => {
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
    await fetch(`${API}/settings`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ key, value }) });
  }

  async function addSetting() {
    if (!newKey.trim()) return;
    setSaving(true);
    await fetch(`${API}/settings`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ key: newKey.trim(), value: newValue }) });
    setNewKey(""); setNewValue("");
    load();
    setSaving(false);
  }

  async function deleteSetting(key: string) {
    if (!confirm(`"${key}" löschen?`)) return;
    await fetch(`${API}/settings?key=${encodeURIComponent(key)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  }

  if (loading) return <div className="text-center py-20"><RefreshCw className="w-6 h-6 text-white/40 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Einstellungen</h2>
        <p className="text-white/40 text-sm">{settings.length} Einstellungen gespeichert</p>
      </div>

      {/* Add new setting */}
      <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06]">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Neue Einstellung</h3>
        <div className="flex gap-3">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Schlüssel (z.B. site_name)" className="flex-1 px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
          <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Wert" className="flex-1 px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
          <button onClick={addSetting} disabled={saving || !newKey.trim()} className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm disabled:opacity-40 flex items-center gap-2"><Plus className="w-4 h-4" /> Hinzufügen</button>
        </div>
      </div>

      {/* Grouped settings */}
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
// BLOG TAB — Full Blog Management with Scheduling
// ═══════════════════════════════════════════════════════════
function BlogTab({ token }: { token: string }) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<PostData | null | undefined>(undefined); // undefined = list, null = new, PostData = edit
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(() => {
    setLoading(true);
    const q = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    fetch(`${API}/posts${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setPosts(d.posts || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, statusFilter]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Load categories for the editor
  useEffect(() => {
    fetch(`${API}/posts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        const cats = new Map<string, { id: string; name: string; slug: string }>();
        (d.posts || []).forEach((p: any) =>
          p.categories?.forEach((c: any) => {
            if (c.category) cats.set(c.category.id, c.category);
          })
        );
        setCategories(Array.from(cats.values()));
      });
  }, [token]);

  async function handleDelete(id: string) {
    if (!confirm("Diesen Beitrag wirklich löschen?")) return;
    await fetch(`${API}/posts?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadPosts();
  }

  // Filtered list
  const filtered = posts.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  // Show editor
  if (editing !== undefined) {
    return <BlogEditor post={editing} token={token} categories={categories} onSave={() => { setEditing(undefined); loadPosts(); }} onCancel={() => setEditing(undefined)} />;
  }

  const counts = {
    all: posts.length,
    published: posts.filter(p => p.status === "published").length,
    draft: posts.filter(p => p.status === "draft").length,
    scheduled: posts.filter(p => p.status === "scheduled").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Blog-Beiträge</h2>
          <p className="text-white/40 text-sm mt-1">{counts.all} Beiträge insgesamt</p>
        </div>
        <button onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Neuer Beitrag
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Beiträge suchen..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "published", "draft", "scheduled"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary/10 text-primary border border-primary/20" : "bg-dark-900/60 text-white/40 border border-white/[0.06] hover:text-white"}`}>
              {s === "all" ? "Alle" : s === "published" ? "Veröffentlicht" : s === "draft" ? "Entwurf" : "Geplant"} ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="text-center py-10"><RefreshCw className="w-5 h-5 text-white/40 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(post => (
            <div key={post.id} className="flex items-center gap-4 p-4 rounded-xl bg-dark-900/60 border border-white/[0.04] hover:border-white/10 transition-colors group">
              {/* Thumbnail */}
              {post.featuredImage ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/[0.06]">
                  <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-dark-800 border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-white/20" />
                </div>
              )}

              {/* Info */}
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

              {/* Status + Actions */}
              <div className="flex items-center gap-2">
                <Badge status={post.status} />
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"><Eye className="w-4 h-4" /></a>
                <button onClick={() => setEditing(post)} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30">Keine Beiträge gefunden</p>
            </div>
          )}
        </div>
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

  // Content fields
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [content, setContent] = useState(post?.content || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [author, setAuthor] = useState(post?.author || "");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || "");

  // Status & Scheduling
  const [publishMode, setPublishMode] = useState<"draft" | "publish" | "schedule">(
    post?.status === "scheduled" ? "schedule" : post?.status === "published" ? "publish" : "draft"
  );
  const [scheduleDate, setScheduleDate] = useState(
    post?.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ""
  );

  // SEO
  const [activeTab, setActiveTab] = useState<"content" | "seo">("content");
  const [metaTitle, setMetaTitle] = useState(post?.seo?.metaTitle || "");
  const [metaDesc, setMetaDesc] = useState(post?.seo?.metaDescription || "");
  const [ogTitle, setOgTitle] = useState(post?.seo?.ogTitle || "");
  const [ogDesc, setOgDesc] = useState(post?.seo?.ogDescription || "");
  const [ogImage, setOgImage] = useState(post?.seo?.ogImage || "");
  const [canonical, setCanonical] = useState(post?.seo?.canonicalUrl || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate slug from title
  function autoSlug() {
    const s = title
      .toLowerCase()
      .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setSlug(s);
  }

  async function handleSave() {
    if (!title.trim()) { setError("Titel ist erforderlich"); return; }
    if (!slug.trim()) { setError("Slug ist erforderlich"); return; }
    if (publishMode === "schedule" && !scheduleDate) { setError("Bitte Datum und Uhrzeit für die geplante Veröffentlichung angeben"); return; }

    setSaving(true); setError("");

    const status = publishMode === "publish" ? "published" : publishMode === "schedule" ? "scheduled" : "draft";
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const body: any = {
      title, slug, content, excerpt, status, author: author || null,
      featuredImage: featuredImage || null, readingTime,
      seo: {
        metaTitle: metaTitle || title,
        metaDescription: metaDesc || excerpt || "",
        canonicalUrl: canonical || `https://ikfzdigitalzulassung.de/blog/${slug}/`,
        ogTitle: ogTitle || null,
        ogDescription: ogDesc || null,
        ogImage: ogImage || featuredImage || null,
      },
    };

    if (status === "scheduled") {
      body.scheduledAt = scheduleDate;
    }
    if (post?.id) body.id = post.id;

    try {
      const res = await fetch(`${API}/posts`, {
        method: post?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      {/* Header */}
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

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("content")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "content" ? "bg-primary text-white" : "bg-dark-800 text-white/60 hover:text-white"}`}>Inhalt</button>
        <button onClick={() => setActiveTab("seo")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "seo" ? "bg-primary text-white" : "bg-dark-800 text-white/60 hover:text-white"}`}>SEO</button>
      </div>

      {activeTab === "content" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Titel</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Beitragstitel..." className="w-full px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white text-lg font-semibold focus:border-primary focus:outline-none" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs text-white/40">Slug</label>
                {title && !slug && <button onClick={autoSlug} className="text-xs text-primary hover:underline">Auto-generieren</button>}
              </div>
              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="beitrag-slug" className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white/60 text-sm focus:border-primary focus:outline-none" />
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

          {/* Sidebar (1/3) */}
          <div className="space-y-4">
            {/* Publish Settings */}
            <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-4">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Veröffentlichung</h3>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${publishMode === 'draft' ? 'border-white/20 bg-white/[0.03]' : 'border-white/[0.06]'}">
                  <input type="radio" name="publishMode" checked={publishMode === "draft"} onChange={() => setPublishMode("draft")} className="accent-primary" />
                  <div>
                    <span className="text-white text-sm font-medium">Entwurf</span>
                    <p className="text-white/30 text-xs">Nicht veröffentlicht</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${publishMode === 'publish' ? 'border-primary/30 bg-primary/[0.05]' : 'border-white/[0.06]'}">
                  <input type="radio" name="publishMode" checked={publishMode === "publish"} onChange={() => setPublishMode("publish")} className="accent-primary" />
                  <div>
                    <span className="text-white text-sm font-medium">Sofort veröffentlichen</span>
                    <p className="text-white/30 text-xs">Wird sofort live</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${publishMode === 'schedule' ? 'border-yellow-500/30 bg-yellow-500/[0.05]' : 'border-white/[0.06]'}">
                  <input type="radio" name="publishMode" checked={publishMode === "schedule"} onChange={() => setPublishMode("schedule")} className="accent-primary" />
                  <div>
                    <span className="text-white text-sm font-medium">Zeitgesteuert</span>
                    <p className="text-white/30 text-xs">Automatisch veröffentlichen</p>
                  </div>
                </label>
              </div>

              {publishMode === "schedule" && (
                <div className="pt-2">
                  <label className="block text-xs text-white/40 mb-1.5">Datum & Uhrzeit</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none [color-scheme:dark]"
                  />
                  {scheduleDate && (
                    <p className="text-xs text-yellow-400/70 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Wird am {new Date(scheduleDate).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} um {new Date(scheduleDate).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr veröffentlicht
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Featured Image */}
            <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
              <h3 className="text-white font-semibold text-sm">Beitragsbild</h3>
              <ImageField label="" value={featuredImage} onChange={setFeaturedImage} token={token} />
            </div>

            {/* Author */}
            <div className="p-5 rounded-2xl bg-dark-900/80 border border-white/[0.06] space-y-3">
              <h3 className="text-white font-semibold text-sm">Autor</h3>
              <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Autorname..." className="w-full px-3 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none" />
            </div>

            {/* Post Info (edit only) */}
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
        /* SEO Tab */
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

          {/* Google Preview */}
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

  // Check session via httpOnly cookie on mount
  useEffect(() => {
    fetch(`${API}/auth`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (d.authenticated) setToken(d.user?.email || "session"); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // Intercept 401 responses globally for session expiry
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
      {/* Sidebar */}
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

      {/* Main Content */}
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
