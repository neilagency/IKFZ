"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Upload, Search, Trash2, Copy, Image as ImageIcon, Check, Loader2 } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

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
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-dark-900 border border-white/[0.08] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-lg font-bold text-white">Medienbibliothek</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.04]">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Suchen..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none"
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
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-20">
              <ImageIcon className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30">Keine Medien gefunden</p>
              <p className="text-white/20 text-sm mt-1">Bilder per Drag & Drop hierher ziehen</p>
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
                      : "border-white/[0.06] hover:border-white/20"
                  }`}
                >
                  {m.mimeType.startsWith("image/") ? (
                    <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-dark-800">
                      <ImageIcon className="w-6 h-6 text-white/20" />
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
          <div className="flex items-center justify-center gap-2 p-3 border-t border-white/[0.04]">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-lg text-xs text-white/40 hover:bg-white/5 disabled:opacity-20">
              Zurück
            </button>
            <span className="text-white/40 text-xs">Seite {page} von {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-lg text-xs text-white/40 hover:bg-white/5 disabled:opacity-20">
              Weiter
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">
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
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    fetch(`/api/admin/media?${params}`, { headers: { Authorization: `Bearer ${token}` }, credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setMedia(d.media || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [token, page, search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(files: FileList | File[]) {
    if (!files.length) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    try {
      await fetch("/api/admin/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        body: formData,
      });
      load();
    } catch { /* ignore */ }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Datei wirklich löschen?")) return;
    await fetch(`/api/admin/media?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    load();
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Medienbibliothek</h2>
          <p className="text-white/40 text-sm mt-1">{total} Dateien</p>
        </div>
        <div>
          <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,video/*" className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Hochladen
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Dateiname suchen..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-white text-sm"
        >
          <option value="">Alle Typen</option>
          <option value="image">Bilder</option>
          <option value="pdf">PDFs</option>
          <option value="video">Videos</option>
        </select>
      </div>

      {/* Drag & Drop Zone + Grid */}
      <div
        className={`min-h-[200px] rounded-2xl border-2 border-dashed transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-white/[0.06] bg-transparent"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-20">
            <Upload className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30">Keine Dateien</p>
            <p className="text-white/20 text-sm mt-1">Dateien per Drag & Drop hierher ziehen oder den Upload Button nutzen</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 p-4">
            {media.map((m) => (
              <div key={m.id} className="group relative rounded-xl overflow-hidden bg-dark-800 border border-white/[0.06] hover:border-white/20 transition-all">
                <div className="aspect-square">
                  {m.mimeType.startsWith("image/") ? (
                    <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <ImageIcon className="w-8 h-8 text-white/20" />
                      <span className="text-white/30 text-xs uppercase">{m.mimeType.split("/")[1]}</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-white/70 text-xs truncate">{m.filename}</p>
                  <p className="text-white/30 text-[10px]">{formatSize(m.size)}</p>
                </div>
                {/* Actions overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyUrl(m.url)}
                    className="p-1.5 rounded-lg bg-dark-900/90 border border-white/10 text-white/60 hover:text-white"
                    title="URL kopieren"
                  >
                    {copied === m.url ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-lg bg-dark-900/90 border border-white/10 text-white/60 hover:text-red-400"
                    title="Löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm text-white/40 hover:bg-white/5 disabled:opacity-20">
            Zurück
          </button>
          <span className="text-white/40 text-sm">Seite {page} von {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-sm text-white/40 hover:bg-white/5 disabled:opacity-20">
            Weiter
          </button>
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
      <label className="block text-xs text-white/40 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/[0.06] shrink-0">
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
          className="flex-1 px-4 py-3 rounded-xl bg-dark-950 border border-white/10 text-white/40 text-sm hover:border-primary/30 hover:text-white/60 transition-colors flex items-center gap-2"
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
