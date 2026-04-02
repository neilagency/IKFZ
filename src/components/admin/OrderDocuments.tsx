'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Upload, Trash2, Download, Mail, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/admin/Toast';

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}

interface OrderDocumentsProps {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function OrderDocuments({
  orderId,
  orderNumber,
  customerEmail,
  customerName,
}: OrderDocumentsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/documents`);
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFile = async (file: File) => {
    // Validate PDF
    if (file.type !== 'application/pdf') {
      toast('Nur PDF-Dateien sind erlaubt.', 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast('Datei zu groß (max. 10 MB).', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sendEmail', 'true');

      const res = await fetch(`/api/admin/orders/${orderId}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        toast(`Dokument "${file.name}" hochgeladen`, 'success');
        fetchDocuments();
      } else {
        toast(data.error || 'Upload fehlgeschlagen', 'error');
      }
    } catch {
      toast('Netzwerkfehler beim Upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      uploadFile(files[i]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDelete = async (docId: string, fileName: string) => {
    if (!confirm(`Dokument "${fileName}" wirklich löschen?`)) return;

    setDeletingId(docId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/documents/${docId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast('Dokument gelöscht', 'success');
        fetchDocuments();
      } else {
        const data = await res.json();
        toast(data.error || 'Löschen fehlgeschlagen', 'error');
      }
    } catch {
      toast('Netzwerkfehler', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResend = async (docId: string) => {
    setResendingId(docId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/documents/${docId}/resend`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok) {
        toast(`E-Mail an ${customerEmail} gesendet`, 'success');
      } else {
        toast(data.error || 'Erneutes Senden fehlgeschlagen', 'error');
      }
    } catch {
      toast('Netzwerkfehler', 'error');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-600" />
        Dokumente
      </h2>

      {/* Upload Zone (Drag & Drop) */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4
          ${isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Wird hochgeladen…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              PDF hierher ziehen oder klicken
            </p>
            <p className="text-xs text-gray-400">Max. 10 MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {/* Download */}
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition"
                  title="Herunterladen"
                >
                  <Download className="w-4 h-4" />
                </a>

                {/* Resend Email */}
                <button
                  onClick={() => handleResend(doc.id)}
                  disabled={resendingId === doc.id}
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition disabled:opacity-50"
                  title="E-Mail erneut senden"
                >
                  {resendingId === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(doc.id, doc.fileName)}
                  disabled={deletingId === doc.id}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                  title="Löschen"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">Keine Dokumente vorhanden.</p>
      )}
    </div>
  );
}
