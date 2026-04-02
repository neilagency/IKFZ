"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  X, Upload, Search, Trash2, Copy, Image as ImageIcon, Check, Loader2,
  Grid, List, Edit3, ChevronLeft, ChevronRight, Replace, AlertTriangle,
  CheckSquare, Square, Scan, BarChart3,
} from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  // extended fields
  fileName?: string;
  originalName?: string;
  title?: string;
  altText?: string;
  sourceUrl?: string;
  localPath?: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  webpUrl?: string;
  avifUrl?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  folder?: string;
  usedIn?: string;
  useCount?: number;
}

interface Pagination { page: number; limit: number; total: number; pages: number; }
interface Stats { totalFiles: number; totalStorage: number; topUsed: any[]; byType: any[]; }

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function ensureSlash(p: string): string {
  return p.startsWith('/') || p.startsWith('http') ? p : `/${p}`;
}

function getImageUrl(item: MediaItem): string {
  const url = item.thumbnailUrl || item.localPath || item.sourceUrl || item.url;
  return url ? ensureSlash(url) : '';
}

function getMediumUrl(item: MediaItem): string {
  const url = item.mediumUrl || item.localPath || item.sourceUrl || item.url;
  return url ? ensureSlash(url) : '';
}

const MediaThumb = memo(function MediaThumb({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className={`${className || ''} bg-gray-100 flex items-center justify-center`}>
        <ImageIcon className="w-6 h-6 text-gray-300" />
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setError(true)} />
  );
});

// ─── Media Picker Modal ─────────────────────────────────
export function MediaPicker({
  open,
  onClose,
  onSelect,
  token,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  token: string;
}) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "24", type: "image" });
    if (search) params.set("search", search);
    fetch(`/api/admin/media?${params}`, { headers: { Authorization: `Bearer ${token}` }, credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setMedia(d.media || []);
        setTotalPages(d.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [token, page, search]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleUpload(files: FileList | File[]) {
    if (!files.length) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setMedia((prev) => [...(data.media || []), ...prev]);
        // Auto-select first uploaded
        if (data.media?.[0]) {
          setSelected(data.media[0].url);
        }
      }
    } catch { /* ignore */ }
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-white">Medienbibliothek</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Suchen..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-gray-200 text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-primary text-white font-medium text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Hochladen
          </button>
        </div>

        {/* Grid */}
        <div
          ref={dropRef}
          className={`flex-1 overflow-y-auto p-4 ${dragOver ? "bg-primary/5 ring-2 ring-primary/30 ring-inset" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-20">
              <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Keine Medien gefunden</p>
              <p className="text-gray-300 text-sm mt-1">Bilder per Drag & Drop hierher ziehen</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {media.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.url)}
                  className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selected === m.url
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {m.mimeType.startsWith("image/") ? (
                    <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  {selected === m.url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] truncate">{m.filename}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-gray-100">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-lg text-xs text-gray-400 hover:bg-gray-50 disabled:opacity-20">
              Zurück
            </button>
            <span className="text-gray-400 text-xs">Seite {page} von {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-lg text-xs text-gray-400 hover:bg-gray-50 disabled:opacity-20">
              Weiter
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">
            Abbrechen
          </button>
          <button
            onClick={() => {
              if (selected) {
                onSelect(selected);
                onClose();
              }
            }}
            disabled={!selected}
            className="px-5 py-2 rounded-xl bg-primary text-white font-medium text-sm disabled:opacity-40 hover:bg-primary/90"
          >
            Auswählen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Media Library Full Page Tab ─────────────────────────
export function MediaLibraryTab({ token }: { token: string }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout>();
  const [imagesOnly, setImagesOnly] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 24, total: 0, pages: 0 });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fileName: "", altText: "", title: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; done: boolean }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ item: MediaItem; usedIn: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (!imagesOnly) params.set("imagesOnly", "false");
    fetch(`/api/admin/media?${params}`, { headers: authHeaders, credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setMedia(d.media || []);
        if (d.pagination) setPagination(d.pagination);
        else setPagination({ page: d.page || 1, limit, total: d.total || 0, pages: d.totalPages || 1 });
      })
      .finally(() => setLoading(false));
  }, [token, page, limit, search, imagesOnly]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/media?stats=true", { headers: authHeaders, credentials: "include" });
      const data = await res.json();
      setStats(data);
      setShowStats(true);
    } catch { /* silent */ }
  };

  const handleUpload = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    const fileArray = Array.from(files);
    setUploadProgress(fileArray.map((f) => ({ name: f.name, done: false })));

    for (let i = 0; i < fileArray.length; i++) {
      const formData = new FormData();
      formData.append("files", fileArray[i]);
      try {
        await fetch("/api/admin/media", { method: "POST", headers: authHeaders, credentials: "include", body: formData });
        setUploadProgress((prev) => prev.map((p, j) => j === i ? { ...p, done: true } : p));
      } catch { /* continue */ }
    }
    setUploading(false);
    setUploadProgress([]);
    setPage(1);
    load();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  };

  const selectMedia = (item: MediaItem) => {
    if (multiSelect) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(item.id) ? next.delete(item.id) : next.add(item.id);
        return next;
      });
      return;
    }
    setSelected(item);
    setEditing(false);
    setEditForm({ fileName: item.fileName || "", altText: item.altText || "", title: item.title || "" });
  };

  const startEdit = () => {
    if (!selected) return;
    setEditing(true);
    setEditForm({ fileName: selected.fileName || "", altText: selected.altText || "", title: selected.title || "" });
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: selected.id, ...editForm }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelected((prev) => prev ? { ...prev, ...updated } : prev);
        setEditing(false);
        load();
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const deleteMedia = async (item?: MediaItem, force = false) => {
    const target = item || selected;
    if (!target) return;

    setDeleting(true);
    try {
      const params = new URLSearchParams({ id: target.id });
      if (force) params.set("force", "true");

      const res = await fetch(`/api/admin/media?${params}`, { method: "DELETE", headers: authHeaders, credentials: "include" });
      const data = await res.json();

      if (res.status === 409 && data.requireForce) {
        setDeleteWarning({ item: target, usedIn: data.usedIn });
        setDeleting(false);
        return;
      }

      if (res.ok) {
        if (selected?.id === target.id) setSelected(null);
        setDeleteWarning(null);
        load();
      }
    } catch { /* silent */ } finally { setDeleting(false); }
  };

  const bulkDelete = async () => {
    if (!selectedIds.size || !confirm(`${selectedIds.size} Bilder wirklich löschen?`)) return;
    for (const id of Array.from(selectedIds)) {
      await fetch(`/api/admin/media?id=${id}&force=true`, { method: "DELETE", headers: authHeaders, credentials: "include" });
    }
    setSelectedIds(new Set());
    setMultiSelect(false);
    load();
  };

  const replaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setReplacing(true);
    try {
      const formData = new FormData();
      formData.append("id", selected.id);
      formData.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", headers: authHeaders, credentials: "include", body: formData });
      if (res.ok) {
        const updated = await res.json();
        setSelected((prev) => prev ? { ...prev, ...updated } : prev);
        load();
      }
    } catch { /* silent */ } finally { setReplacing(false); }
  };

  const scanUsage = async () => {
    setScanning(true);
    try {
      await fetch("/api/admin/media", { method: "PUT", headers: authHeaders, credentials: "include" });
      load();
    } catch { /* silent */ } finally { setScanning(false); }
  };

  const copyUrl = () => {
    if (!selected) return;
    const url = selected.sourceUrl || selected.url;
    navigator.clipboard.writeText(window.location.origin + ensureSlash(url));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const usedInParsed = selected?.usedIn ? (() => { try { return JSON.parse(selected.usedIn); } catch { return []; } })() : [];

  return (
    <div className="flex h-[calc(100vh-160px)] -mx-6 -mt-2">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Media Library</h2>
              <p className="text-sm text-gray-500">{pagination.total} Dateien</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchStats} className="p-2 rounded-lg border hover:bg-gray-50 transition" title="Analytics">
                <BarChart3 className="w-4 h-4 text-gray-600" />
              </button>
              <button onClick={scanUsage} disabled={scanning} className="p-2 rounded-lg border hover:bg-gray-50 transition" title="Nutzung scannen">
                {scanning ? <Loader2 className="w-4 h-4 animate-spin text-gray-600" /> : <Scan className="w-4 h-4 text-gray-600" />}
              </button>
              <button
                onClick={() => { setMultiSelect(!multiSelect); setSelectedIds(new Set()); }}
                className={`p-2 rounded-lg border transition ${multiSelect ? "bg-primary/10 border-primary text-primary" : "hover:bg-gray-50"}`}
                title="Mehrfachauswahl"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="p-2 rounded-lg border hover:bg-gray-50 transition">
                {viewMode === "grid" ? <List className="w-4 h-4 text-gray-600" /> : <Grid className="w-4 h-4 text-gray-600" />}
              </button>
              <button
                onClick={() => { setImagesOnly(!imagesOnly); setPage(1); }}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${imagesOnly ? "hover:bg-gray-50 text-gray-600" : "bg-primary/10 border-primary text-primary"}`}
              >
                {imagesOnly ? "Nur Bilder" : "Alle Dateien"}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium text-sm transition">
                <Upload className="w-4 h-4" /> Hochladen
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf,video/*" multiple className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)} />
            </div>
          </div>

          {/* Multi-select actions bar */}
          {multiSelect && selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
              <span className="text-sm font-medium text-primary">{selectedIds.size} ausgewählt</span>
              <button onClick={bulkDelete} className="text-xs px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                Alle löschen
              </button>
              <button onClick={() => { setSelectedIds(new Set()); setMultiSelect(false); }} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">
                Abbrechen
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchInput} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Bilder suchen..." className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-primary/15 focus:border-primary/40 outline-none" />
          </div>
        </div>

        {/* Analytics Panel */}
        {showStats && stats && (
          <div className="bg-gradient-to-r from-primary/5 to-blue-50 border-b px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">Media Analytics</h3>
              <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-3 border">
                <div className="text-2xl font-bold text-gray-900">{stats.totalFiles}</div>
                <div className="text-xs text-gray-500">Dateien gesamt</div>
              </div>
              <div className="bg-white rounded-xl p-3 border">
                <div className="text-2xl font-bold text-gray-900">{formatBytes(stats.totalStorage)}</div>
                <div className="text-xs text-gray-500">Speicher belegt</div>
              </div>
              <div className="bg-white rounded-xl p-3 border col-span-2">
                <div className="text-xs text-gray-500 mb-2">Dateitypen</div>
                <div className="flex flex-wrap gap-2">
                  {stats.byType.map((t: any, i: number) => (
                    <span key={i} className="text-xs bg-gray-100 rounded px-2 py-0.5 text-gray-700">
                      {t.type.split("/")[1]}: {t.count} ({formatBytes(t.size)})
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {stats.topUsed.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium text-gray-500 mb-1">Meistverwendet</div>
                <div className="flex gap-2 overflow-x-auto">
                  {stats.topUsed.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2 bg-white rounded-lg border px-2 py-1 shrink-0">
                      <MediaThumb src={m.thumbnailUrl || m.sourceUrl || ""} alt="" className="w-6 h-6 rounded object-cover" />
                      <span className="text-xs text-gray-700 truncate max-w-[100px]">{m.fileName}</span>
                      <span className="text-xs font-mono text-primary">{m.useCount}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
            <p className="text-sm font-medium text-blue-700 mb-2">Wird hochgeladen...</p>
            <div className="space-y-1">
              {uploadProgress.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {p.done ? <Check className="w-3 h-3 text-green-600" /> : <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />}
                  <span className={p.done ? "text-green-700" : "text-blue-700"}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drop Zone + Content */}
        <div
          className={`flex-1 overflow-y-auto p-6 ${dragOver ? "bg-primary/5 border-2 border-dashed border-primary" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {dragOver && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Upload className="w-12 h-12 text-primary mx-auto mb-3" />
                <p className="text-lg font-semibold text-primary">Dateien hier ablegen</p>
              </div>
            </div>
          )}

          {!dragOver && loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          {!dragOver && !loading && media.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <ImageIcon className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Keine Bilder gefunden</p>
              <p className="text-sm mt-1">Laden Sie Bilder hoch oder ändern Sie den Suchbegriff</p>
            </div>
          )}

          {/* Grid View */}
          {!dragOver && !loading && media.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectMedia(item)}
                  className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    (selected?.id === item.id || selectedIds.has(item.id))
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <MediaThumb src={getImageUrl(item)} alt={item.altText || item.title || ""} className="w-full h-full object-cover" />
                  {multiSelect && (
                    <div className="absolute top-2 left-2">
                      {selectedIds.has(item.id)
                        ? <CheckSquare className="w-5 h-5 text-primary bg-white rounded" />
                        : <Square className="w-5 h-5 text-gray-400 bg-white/80 rounded" />}
                    </div>
                  )}
                  {(item.useCount ?? 0) > 0 && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {item.useCount}
                    </div>
                  )}
                  {!item.altText && (
                    <div className="absolute bottom-2 right-2 bg-orange-400 text-white rounded-full p-0.5" title="Alt-Text fehlt">
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                    <p className="text-white text-xs truncate">{item.fileName || item.title || item.filename}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* List View */}
          {!dragOver && !loading && media.length > 0 && viewMode === "list" && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 w-16">Bild</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Dateiname</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Alt-Text</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Größe</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Varianten</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Verwendet</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {media.map((item) => (
                    <tr key={item.id} onClick={() => selectMedia(item)}
                      className={`cursor-pointer border-b last:border-0 transition ${
                        (selected?.id === item.id || selectedIds.has(item.id)) ? "bg-primary/5" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-2">
                        <MediaThumb src={getImageUrl(item)} alt="" className="w-10 h-10 rounded object-cover" />
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900 truncate max-w-[200px]">{item.fileName || item.originalName || item.filename}</td>
                      <td className="px-4 py-2 text-gray-500 hidden md:table-cell">
                        {item.altText ? <span className="truncate max-w-[150px] block">{item.altText}</span> : <span className="text-orange-400 text-xs">fehlt</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-500 hidden lg:table-cell">{formatBytes(item.fileSize || item.size)}</td>
                      <td className="px-4 py-2 hidden lg:table-cell">
                        <div className="flex gap-0.5">
                          {item.webpUrl && <span className="text-[10px] bg-green-100 text-green-700 rounded px-1">WebP</span>}
                          {item.avifUrl && <span className="text-[10px] bg-blue-100 text-blue-700 rounded px-1">AVIF</span>}
                          {item.mediumUrl && <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1">3×</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-500 hidden lg:table-cell">
                        {(item.useCount ?? 0) > 0 ? <span className="text-green-600 font-medium">{item.useCount}×</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-500 hidden lg:table-cell">{format(new Date(item.createdAt), "dd.MM.yy", { locale: de })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
              <div className="text-sm text-gray-500">
                {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} von {pagination.total} Dateien
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={pagination.page <= 1}
                  className="px-2 py-1 rounded border text-xs hover:bg-gray-50 disabled:opacity-30 transition text-gray-600">«</button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1}
                  className="p-1.5 rounded border hover:bg-gray-50 disabled:opacity-30 transition">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                  let p: number;
                  if (pagination.pages <= 7) {
                    p = i + 1;
                  } else if (pagination.page <= 4) {
                    p = i + 1;
                  } else if (pagination.page >= pagination.pages - 3) {
                    p = pagination.pages - 6 + i;
                  } else {
                    p = pagination.page - 3 + i;
                  }
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded text-sm font-medium transition ${
                        p === pagination.page ? "bg-primary text-white" : "border hover:bg-gray-50 text-gray-600"
                      }`}>{p}</button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={pagination.page >= pagination.pages}
                  className="p-1.5 rounded border hover:bg-gray-50 disabled:opacity-30 transition">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={() => setPage(pagination.pages)} disabled={pagination.page >= pagination.pages}
                  className="px-2 py-1 rounded border text-xs hover:bg-gray-50 disabled:opacity-30 transition text-gray-600">»</button>
              </div>
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                className="text-sm border rounded-lg px-2 py-1 text-gray-600 outline-none"
              >
                <option value={12}>12 / Seite</option>
                <option value={24}>24 / Seite</option>
                <option value={48}>48 / Seite</option>
                <option value={96}>96 / Seite</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Delete Warning Modal */}
      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteWarning(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Bild wird verwendet!</h3>
                <p className="text-sm text-gray-500">Dieses Bild wird an {deleteWarning.usedIn.length} Stelle(n) verwendet:</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
              {deleteWarning.usedIn.map((ref: any, i: number) => (
                <div key={i} className="text-sm py-1 border-b last:border-0">
                  <span className="font-medium text-gray-700">{ref.type}</span>
                  <span className="text-gray-400 mx-1">·</span>
                  <span className="text-gray-600">{ref.title}</span>
                  <span className="text-gray-400 mx-1">·</span>
                  <span className="text-xs text-gray-400">{ref.field}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteWarning(null)} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition text-gray-700">Abbrechen</button>
              <button onClick={() => { deleteMedia(deleteWarning.item, true); setDeleteWarning(null); }} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">Trotzdem löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel (Sidebar) */}
      {selected && !multiSelect && (
        <div className="w-80 xl:w-96 bg-white border-l flex flex-col overflow-y-auto">
          {/* Preview */}
          <div className="relative bg-gray-50 aspect-video flex items-center justify-center">
            <MediaThumb src={getMediumUrl(selected)} alt={selected.altText || selected.title || ""} className="max-w-full max-h-full object-contain" />
            <button onClick={() => setSelected(null)} className="absolute top-2 right-2 p-1 bg-white rounded-full hover:bg-gray-100 transition">
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="p-4 space-y-4 flex-1">
            {/* Variant badges */}
            <div className="flex flex-wrap gap-1">
              {selected.webpUrl && <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">WebP</span>}
              {selected.avifUrl && <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">AVIF</span>}
              {selected.thumbnailUrl && selected.thumbnailUrl !== (selected.sourceUrl || selected.url) && <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">150px</span>}
              {selected.mediumUrl && <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">500px</span>}
              {selected.largeUrl && <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">1200px</span>}
            </div>

            {/* Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Typ</span>
                <span className="text-gray-900">{selected.mimeType}</span>
              </div>
              {(selected.width ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Abmessungen</span>
                  <span className="text-gray-900">{selected.width} × {selected.height} px</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Größe</span>
                <span className="text-gray-900">{formatBytes(selected.fileSize || selected.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hochgeladen</span>
                <span className="text-gray-900">{format(new Date(selected.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verwendet</span>
                <span className={(selected.useCount ?? 0) > 0 ? "text-green-600 font-medium" : "text-gray-300"}>
                  {(selected.useCount ?? 0) > 0 ? `${selected.useCount}× verwendet` : "Nicht verwendet"}
                </span>
              </div>
            </div>

            {/* Usage list */}
            {usedInParsed.length > 0 && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="text-xs font-medium text-green-700 mb-1">Verwendet in:</div>
                {usedInParsed.map((ref: any, i: number) => (
                  <div key={i} className="text-xs text-green-600 py-0.5">
                    {ref.type}: {ref.title} ({ref.field})
                  </div>
                ))}
              </div>
            )}

            {/* URL Copy */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">URL</label>
              <div className="flex gap-1">
                <input type="text" readOnly value={selected.sourceUrl || selected.url || ""}
                  className="flex-1 text-xs bg-gray-50 border rounded px-2 py-1.5 truncate text-gray-600" />
                <button onClick={copyUrl} className="p-1.5 border rounded hover:bg-gray-50 transition" title="URL kopieren">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Edit Form */}
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Dateiname (SEO)</label>
                  <input type="text" value={editForm.fileName} onChange={(e) => setEditForm({ ...editForm, fileName: e.target.value })}
                    className="w-full text-sm border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    placeholder="auto-abmeldung-berlin.jpg" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Titel</label>
                  <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full text-sm border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Alt-Text (SEO)</label>
                  <textarea value={editForm.altText} onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })} rows={2}
                    className="w-full text-sm border rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
                    placeholder="Beschreibung des Bildes für Suchmaschinen" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving}
                    className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition">
                    {saving ? "Speichern..." : "Speichern"}
                  </button>
                  <button onClick={() => setEditing(false)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-gray-500">Dateiname</span>
                  <p className="text-sm text-gray-900 break-all">{selected.fileName || selected.originalName || selected.filename || "—"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Titel</span>
                  <p className="text-sm text-gray-900">{selected.title || "—"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Alt-Text</span>
                  {selected.altText
                    ? <p className="text-sm text-gray-900">{selected.altText}</p>
                    : <p className="text-sm text-orange-500">fehlt (schlecht für SEO)</p>}
                </div>
              </div>
            )}

            {/* Actions */}
            {!editing && (
              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <button onClick={startEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                    <Edit3 className="w-3.5 h-3.5" /> Bearbeiten
                  </button>
                  <button onClick={() => replaceInputRef.current?.click()} disabled={replacing}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                    <Replace className="w-3.5 h-3.5" /> {replacing ? "..." : "Ersetzen"}
                  </button>
                  <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={replaceImage} />
                </div>
                <button onClick={() => deleteMedia()} disabled={deleting}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition">
                  <Trash2 className="w-3.5 h-3.5" /> {deleting ? "Löschen..." : "Löschen"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Image Field with Media Picker ───────────────────────
export function ImageField({
  label,
  value,
  onChange,
  token,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  token: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange("")}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : null}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-400 text-sm hover:border-primary/30 hover:text-gray-600 transition-colors flex items-center gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          {value ? "Bild ändern" : "Bild auswählen"}
        </button>
      </div>
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => { onChange(url); setPickerOpen(false); }}
        token={token}
      />
    </div>
  );
}
