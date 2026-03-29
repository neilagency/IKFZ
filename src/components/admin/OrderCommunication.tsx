'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Send, Paperclip, Trash2, FileText, Mail, X, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/components/admin/Toast';

interface Attachment {
  filename: string;
  url: string;
}

interface Message {
  id: string;
  orderId: string;
  message: string;
  attachments: string; // JSON string
  sentBy: string;
  createdAt: string;
}

interface PendingFile {
  file: File;
  id: string;
}

interface OrderCommunicationProps {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
}

const QUICK_TEMPLATES = [
  {
    label: 'Bestellung erhalten',
    text: 'Vielen Dank für Ihre Bestellung! Wir haben Ihren Auftrag erhalten und werden diesen schnellstmöglich bearbeiten. Sie erhalten eine Benachrichtigung, sobald es Neuigkeiten gibt.',
  },
  {
    label: 'In Bearbeitung',
    text: 'Ihr Auftrag wird derzeit bearbeitet. Wir kümmern uns um alle notwendigen Schritte und halten Sie auf dem Laufenden.',
  },
  {
    label: 'Fertiggestellt',
    text: 'Ihr Auftrag wurde erfolgreich abgeschlossen. Alle Dokumente stehen Ihnen zum Download bereit. Bei Fragen stehen wir Ihnen gerne zur Verfügung.',
  },
  {
    label: 'Dokument angehängt',
    text: 'Im Anhang finden Sie das gewünschte Dokument. Bitte prüfen Sie die Unterlagen und melden Sie sich bei Rückfragen.',
  },
  {
    label: 'Frage zum Auftrag',
    text: 'Bezüglich Ihres Auftrags haben wir eine Rückfrage. Bitte senden Sie uns folgende Informationen:\n\n- \n\nVielen Dank für Ihre Mithilfe!',
  },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];

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

function parseAttachments(raw: string): Attachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function OrderCommunication({
  orderId,
  orderNumber,
  customerEmail,
  customerName,
}: OrderCommunicationProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sendingCompletion, setSendingCompletion] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/messages`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: PendingFile[] = [];
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast(`„${file.name}" — Dateityp nicht erlaubt.`, 'error');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast(`„${file.name}" — Datei zu groß (max. 10 MB).`, 'error');
        continue;
      }
      newFiles.push({ file, id: crypto.randomUUID() });
    }

    const total = pendingFiles.length + newFiles.length;
    if (total > MAX_FILES) {
      toast(`Maximal ${MAX_FILES} Dateien erlaubt.`, 'error');
      return;
    }

    setPendingFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSend = async () => {
    if (!messageText.trim()) {
      toast('Bitte geben Sie eine Nachricht ein.', 'error');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('message', messageText.trim());
      for (const pf of pendingFiles) {
        formData.append('files', pf.file);
      }

      const res = await fetch(`/api/admin/orders/${orderId}/messages`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast('Nachricht erfolgreich gesendet', 'success');
        setMessageText('');
        setPendingFiles([]);
        fetchMessages();
      } else {
        toast(data.error || 'Fehler beim Senden der Nachricht.', 'error');
      }
    } catch {
      toast('Netzwerkfehler beim Senden.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSendCompletionEmail = async () => {
    setSendingCompletion(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/send-completion-email`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok) {
        toast('Abschluss-E-Mail erfolgreich gesendet', 'success');
      } else {
        toast(data.error || 'Fehler beim Senden der Abschluss-E-Mail.', 'error');
      }
    } catch {
      toast('Netzwerkfehler beim Senden der E-Mail.', 'error');
    } finally {
      setSendingCompletion(false);
    }
  };

  const insertTemplate = (text: string) => {
    setMessageText(text);
    setShowTemplates(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Kundenkommunikation
          </h2>
          <div className="text-sm text-gray-500">
            {customerName} · {customerEmail}
          </div>
        </div>
      </div>

      {/* Compose Area */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Send className="w-4 h-4" />
          Neue Nachricht
        </h3>

        {/* Quick Templates */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 transition"
          >
            <FileText className="w-4 h-4" />
            Schnellvorlagen
            <svg
              className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showTemplates && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => insertTemplate(t.text)}
                  className="text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-sm text-gray-700 transition"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Nachricht an den Kunden schreiben..."
          rows={5}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
        />

        {/* File Upload */}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition"
          >
            <Paperclip className="w-4 h-4" />
            Dateien anhängen
          </button>
          <span className="text-xs text-gray-400">
            PDF, JPG, PNG, WEBP, DOC · max. 10 MB · max. {MAX_FILES} Dateien
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Pending Files */}
        {pendingFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {pendingFiles.map((pf) => (
              <div
                key={pf.id}
                className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm"
              >
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="flex-1 truncate text-gray-700">{pf.file.name}</span>
                <span className="text-xs text-gray-400">{formatFileSize(pf.file.size)}</span>
                <button
                  onClick={() => removeFile(pf.id)}
                  className="text-red-400 hover:text-red-600 shrink-0 transition"
                  title="Entfernen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Send Button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !messageText.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird gesendet…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                An Kunden senden
              </>
            )}
          </button>

          <button
            onClick={handleSendCompletionEmail}
            disabled={sendingCompletion}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {sendingCompletion ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sende…
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Abschluss-E-Mail senden
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message History */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Nachrichtenverlauf
          {messages.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Noch keine Nachrichten gesendet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {messages.map((msg) => {
              const attachments = parseAttachments(msg.attachments);

              return (
                <div
                  key={msg.id}
                  className="bg-blue-50 border border-blue-100 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {msg.sentBy === 'admin' ? 'Admin' : msg.sentBy}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </p>

                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline bg-white rounded px-2.5 py-1.5 border border-blue-100 transition"
                        >
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                          {att.filename}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
