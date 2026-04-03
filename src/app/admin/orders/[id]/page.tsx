'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, User, CreditCard, FileText, RefreshCw,
  CheckCircle, Clock, XCircle, AlertTriangle, Send, Loader2,
  ChevronDown, ChevronUp, Download, ExternalLink, Trash2, Mail,
} from 'lucide-react';
import OrderDocuments from '@/components/admin/OrderDocuments';
import OrderCommunication from '@/components/admin/OrderCommunication';
import AdminShell from '@/components/admin/AdminShell';

/* ── Types ───────────────────────────────────── */
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Payment {
  id: string;
  method: string;
  methodTitle?: string;
  transactionId?: string;
  status: string;
  amount: number;
  currency: string;
  gateway?: string;
  captureId?: string;
  paidAt?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number;
}

interface OrderNote {
  id: string;
  note: string;
  author: string;
  createdAt: string;
}

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Order {
  id: string;
  orderNumber?: string;
  status: string;
  total: number;
  subtotal: number;
  paymentFee: number;
  discountAmount: number;
  couponCode: string;
  currency: string;
  paymentMethod?: string;
  paymentMethodTitle?: string;
  transactionId?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingFirstName?: string;
  billingLastName?: string;
  billingAddress1?: string;
  billingCity?: string;
  billingPostcode?: string;
  billingCountry?: string;
  billingCompany?: string;
  serviceData?: string;
  productName?: string;
  completionEmailSent: boolean;
  datePaid?: string;
  dateCompleted?: string;
  createdAt: string;
  items: OrderItem[];
  payment?: Payment | null;
  invoice?: Invoice | null;
  notes?: OrderNote[];
  customer?: Customer | null;
}

interface RefundHistoryItem {
  id: string;
  status: string;
  amount: { value: string; currency: string };
  createdAt: string;
}

/* ── Status Config ────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  processing: { label: 'In Bearbeitung', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  'on-hold': { label: 'Zurückgestellt', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  completed: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Storniert', color: 'bg-red-100 text-red-700', icon: XCircle },
  refunded: { label: 'Erstattet', color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
};

const STATUS_OPTIONS = ['pending', 'processing', 'on-hold', 'completed', 'cancelled'] as const;

/* ── Helper: file label mapping ───────────────── */
const FILE_LABEL: Record<string, string> = {
  fahrzeugscheinVorne: 'Fahrzeugschein (Vorderseite)',
  fahrzeugscheinHinten: 'Fahrzeugschein (Rückseite)',
  fahrzeugbriefVorne: 'Fahrzeugbrief (Vorderseite)',
};

/* ── Helper: format ───────────────────────────── */
function formatDate(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) + ' Uhr';
}

function formatCurrency(val: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(val);
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ── Toast ────────────────────────────────────── */
type ToastType = 'success' | 'warning' | 'error';
interface Toast { message: string; type: ToastType }

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500 text-yellow-900',
  error: 'bg-red-500',
};

/* ══════════════════════════════════════════════════════
   PAGE COMPONENT
   ══════════════════════════════════════════════════════ */
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  // ── State ──
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');

  // Refund
  const [refundAmount, setRefundAmount] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundResult, setRefundResult] = useState<{ success: boolean; message: string } | null>(null);
  const [refundHistory, setRefundHistory] = useState<RefundHistoryItem[]>([]);
  const [showRefundForm, setShowRefundForm] = useState(false);

  // Invoice
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  }, []);

  // ── Fetch Order ──
  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setOrder(data.order);
    } catch {
      showToast('Bestellung nicht gefunden', 'error');
    } finally {
      setLoading(false);
    }
  }, [orderId, showToast]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // ── Fetch Refund History ──
  const fetchRefundHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`);
      const data = await res.json();
      if (data.refunds) setRefundHistory(data.refunds);
    } catch { /* silent */ }
  }, [orderId]);

  useEffect(() => { fetchRefundHistory(); }, [fetchRefundHistory]);

  // ── Update Status ──
  const updateStatus = async (status: string) => {
    if (updating) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();

      if (res.ok) {
        setOrder(data.order);

        // Handle completion email result
        if (status === 'completed' && data.emailResult) {
          if (data.emailResult.success && !data.emailResult.skipped) {
            showToast('Status aktualisiert & E-Mail gesendet ✅', 'success');
          } else if (data.emailResult.skipped) {
            showToast('Status aktualisiert — E-Mail wurde bereits zuvor gesendet', 'warning');
          } else {
            showToast(`Status aktualisiert — E-Mail fehlgeschlagen: ${data.emailResult.error}`, 'error');
          }
        } else {
          showToast(`Status geändert: ${STATUS_CONFIG[status]?.label || status}`, 'success');
        }

        fetchOrder(); // refresh notes etc.
      } else {
        showToast(data.error || 'Fehler beim Aktualisieren', 'error');
      }
    } catch {
      showToast('Netzwerkfehler', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // ── Add Note ──
  const addNote = async () => {
    if (!note.trim()) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      if (res.ok) {
        setNote('');
        fetchOrder();
        showToast('Notiz hinzugefügt', 'success');
      }
    } catch {
      showToast('Fehler beim Speichern', 'error');
    }
  };

  // ── Refund ──
  const handleRefund = async () => {
    setRefundLoading(true);
    setRefundResult(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: refundAmount || undefined }),
      });
      const data = await res.json();

      if (res.ok) {
        setRefundResult({
          success: true,
          message: `Erstattung erfolgreich: €${data.amount} (${data.provider}) – ID: ${data.refundId}`,
        });
        setRefundAmount('');
        fetchOrder();
        fetchRefundHistory();
      } else {
        setRefundResult({ success: false, message: data.error || 'Erstattung fehlgeschlagen' });
      }
    } catch {
      setRefundResult({ success: false, message: 'Netzwerkfehler' });
    } finally {
      setRefundLoading(false);
    }
  };

  // ── Resend Invoice ──
  const resendInvoice = async () => {
    setResending(true);
    setResendResult(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/resend-invoice`, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setResendResult({ success: true, message: `✅ E-Mail an ${order?.billingEmail} gesendet` });
        showToast('Rechnung erneut gesendet', 'success');
      } else {
        setResendResult({ success: false, message: `❌ ${data.error}` });
      }
    } catch {
      setResendResult({ success: false, message: '❌ Netzwerkfehler' });
    } finally {
      setResending(false);
    }
  };

  // ── Parse Service Data ──
  const serviceData = order?.serviceData ? (() => {
    try { return JSON.parse(order.serviceData!); } catch { return null; }
  })() : null;

  const isAbmeldung =
    order?.productName?.toLowerCase().includes('abmeld') ||
    serviceData?.formType === 'abmeldung';

  // ── Loading ──
  if (loading) {
    return (
      <AdminShell activeTab="orders" title="Bestellung laden…">
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-48 bg-gray-200 rounded-xl" />
                <div className="h-64 bg-gray-200 rounded-xl" />
              </div>
              <div className="space-y-6">
                <div className="h-32 bg-gray-200 rounded-xl" />
                <div className="h-48 bg-gray-200 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (!order) {
    return (
      <AdminShell activeTab="orders" title="Nicht gefunden">
        <div className="max-w-7xl mx-auto p-6 text-center">
          <p className="text-gray-500 text-lg">Bestellung nicht gefunden.</p>
          <button onClick={() => router.push('/admin?tab=orders')} className="mt-4 text-blue-600 hover:underline">
            ← Zurück zur Übersicht
          </button>
        </div>
      </AdminShell>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const customerName = [order.billingFirstName, order.billingLastName].filter(Boolean).join(' ') || 'Kunde';

  return (
    <AdminShell activeTab="orders" title={`Bestellung ${order.orderNumber || order.id}`}>
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg text-white text-sm font-medium ${TOAST_COLORS[toast.type]}`}>
          {toast.message}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin?tab=orders')}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bestellung #{order.orderNumber || order.id.substring(0, 8)}
            </h1>
            <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusCfg.color}`}>
          <StatusIcon className="w-4 h-4" />
          {statusCfg.label}
        </span>
      </div>

      {/* ── Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ════ LEFT: Main Content (col-span-2) ════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── 1. Customer Data ── */}
          <section className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              Kundendaten
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium text-gray-900">{customerName}</span>
              </div>
              {order.billingCompany && (
                <div>
                  <span className="text-gray-500">Firma:</span>
                  <span className="ml-2 font-medium text-gray-900">{order.billingCompany}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">E-Mail:</span>
                <a href={`mailto:${order.billingEmail}`} className="ml-2 text-blue-600 hover:underline">{order.billingEmail}</a>
              </div>
              {order.billingPhone && (
                <div>
                  <span className="text-gray-500">Telefon:</span>
                  <a href={`tel:${order.billingPhone}`} className="ml-2 text-blue-600 hover:underline">{order.billingPhone}</a>
                </div>
              )}
              {order.billingAddress1 && (
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Adresse:</span>
                  <span className="ml-2 text-gray-900">
                    {order.billingAddress1}, {order.billingPostcode} {order.billingCity}
                    {order.billingCountry && order.billingCountry !== 'DE' && ` (${order.billingCountry})`}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* ── 2. Order Items ── */}
          <section className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-blue-600" />
              Positionen
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 text-gray-500 font-medium">Produkt</th>
                  <th className="text-center pb-2 text-gray-500 font-medium">Menge</th>
                  <th className="text-right pb-2 text-gray-500 font-medium">Preis</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-3 text-gray-900">{item.name}</td>
                    <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Zwischensumme</span>
                <span>{formatCurrency(order.subtotal || order.items.reduce((s, i) => s + i.total, 0))}</span>
              </div>
              {order.paymentFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Zahlungsgebühr</span>
                  <span>{formatCurrency(order.paymentFee)}</span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Rabatt{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Gesamt</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </section>

          {/* ── 3. Service Data ── */}
          {serviceData && (
            <section className="bg-white rounded-xl p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                {isAbmeldung ? 'Abmeldung – Fahrzeugdaten' : 'Anmeldung – Formulardaten'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {serviceData.formType && (
                  <div>
                    <span className="text-gray-500">Formular:</span>
                    <span className="ml-2 font-medium text-gray-900 capitalize">{serviceData.formType}</span>
                  </div>
                )}
                {serviceData.kennzeichen && (
                  <div>
                    <span className="text-gray-500">Kennzeichen:</span>
                    <span className="ml-2 font-mono font-medium text-gray-900">{serviceData.kennzeichen}</span>
                  </div>
                )}
                {serviceData.fin && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">FIN:</span>
                    <span className="ml-2 font-mono text-xs font-medium text-gray-900">{serviceData.fin}</span>
                  </div>
                )}
                {serviceData.sicherheitscode && (
                  <div>
                    <span className="text-gray-500">Sicherheitscode:</span>
                    <span className="ml-2 font-mono font-medium text-gray-900">{serviceData.sicherheitscode}</span>
                  </div>
                )}
                {serviceData.stadt && (
                  <div>
                    <span className="text-gray-500">Stadt/Kreis:</span>
                    <span className="ml-2 font-medium text-gray-900">{serviceData.stadt}</span>
                  </div>
                )}
                {serviceData.codeVorne && (
                  <div>
                    <span className="text-gray-500">Code vorne:</span>
                    <span className="ml-2 font-mono font-medium text-gray-900">{serviceData.codeVorne}</span>
                  </div>
                )}
                {serviceData.codeHinten && (
                  <div>
                    <span className="text-gray-500">Code hinten:</span>
                    <span className="ml-2 font-mono font-medium text-gray-900">{serviceData.codeHinten}</span>
                  </div>
                )}
                {serviceData.reservierung !== undefined && (
                  <div>
                    <span className="text-gray-500">Reservierung:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {serviceData.reservierung ? 'Ja (1 Jahr)' : 'Keine'}
                    </span>
                  </div>
                )}

                {/* Anmeldung-specific fields */}
                {serviceData.serviceType && (
                  <div>
                    <span className="text-gray-500">Service:</span>
                    <span className="ml-2 font-medium text-gray-900 capitalize">{serviceData.serviceType}</span>
                  </div>
                )}
                {serviceData.ausweisTyp && (
                  <div>
                    <span className="text-gray-500">Ausweis:</span>
                    <span className="ml-2 font-medium text-gray-900 capitalize">{serviceData.ausweisTyp}</span>
                  </div>
                )}
                {serviceData.evbNummer && (
                  <div>
                    <span className="text-gray-500">eVB-Nummer:</span>
                    <span className="ml-2 font-mono font-medium text-gray-900">{serviceData.evbNummer}</span>
                  </div>
                )}
                {serviceData.kennzeichenWahl && (
                  <div>
                    <span className="text-gray-500">Kennzeichen-Wahl:</span>
                    <span className="ml-2 font-medium text-gray-900 capitalize">{serviceData.kennzeichenWahl}</span>
                  </div>
                )}
                {serviceData.wunschkennzeichen && (
                  <div>
                    <span className="text-gray-500">Wunschkennzeichen:</span>
                    <span className="ml-2 font-mono font-medium text-gray-900">{serviceData.wunschkennzeichen}</span>
                  </div>
                )}
                {serviceData.kennzeichenBestellen !== undefined && (
                  <div>
                    <span className="text-gray-500">Kennzeichen bestellen:</span>
                    <span className="ml-2 font-medium text-gray-900">{serviceData.kennzeichenBestellen ? 'Ja' : 'Nein'}</span>
                  </div>
                )}
                {serviceData.kontoinhaber && (
                  <div>
                    <span className="text-gray-500">Kontoinhaber:</span>
                    <span className="ml-2 font-medium text-gray-900">{serviceData.kontoinhaber}</span>
                  </div>
                )}
                {serviceData.iban && (
                  <div>
                    <span className="text-gray-500">IBAN:</span>
                    <span className="ml-2 font-mono text-xs font-medium text-gray-900">{serviceData.iban}</span>
                  </div>
                )}
              </div>

              {/* Uploaded Documents */}
              {serviceData.uploadedFiles && Object.keys(serviceData.uploadedFiles).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Hochgeladene Dokumente:</h3>
                  <div className="space-y-2">
                    {Object.entries(serviceData.uploadedFiles).map(([key, file]: [string, any]) => {
                      // Handle both formats: plain string URL or object { url, name, size }
                      const fileUrl = typeof file === 'string' ? file : file?.url;
                      const fileName = typeof file === 'string' ? key : (file?.name || key);
                      const fileSize = typeof file === 'object' && file?.size ? ` (${Math.round(file.size / 1024)} KB)` : '';
                      return (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{FILE_LABEL[key] || key}</p>
                            <p className="text-xs text-gray-500">
                              {fileName}{fileSize}
                            </p>
                          </div>
                        </div>
                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Herunterladen
                          </a>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── 4. Documents ── */}
          <OrderDocuments
            orderId={order.id}
            orderNumber={order.orderNumber || ''}
            customerEmail={order.billingEmail || ''}
            customerName={customerName}
          />

          {/* ── 5. Communication ── */}
          <OrderCommunication
            orderId={order.id}
            orderNumber={order.orderNumber || ''}
            customerEmail={order.billingEmail || ''}
            customerName={customerName}
          />

          {/* ── 6. Notes ── */}
          <section className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notizen</h2>

            {/* Add Note */}
            <div className="flex gap-2 mb-4">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notiz hinzufügen..."
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
              />
              <button
                onClick={addNote}
                disabled={!note.trim()}
                className="self-end px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Speichern
              </button>
            </div>

            {/* Notes List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(order.notes || []).map((n) => (
                <div key={n.id} className="border-l-2 border-gray-200 pl-3 py-1">
                  <p className="text-sm text-gray-700">{n.note}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {n.author} · {formatShortDate(n.createdAt)}
                  </p>
                </div>
              ))}
              {(!order.notes || order.notes.length === 0) && (
                <p className="text-sm text-gray-400">Keine Notizen vorhanden.</p>
              )}
            </div>
          </section>
        </div>

        {/* ════ RIGHT: Sidebar ════ */}
        <div className="space-y-6">

          {/* ── Status Change ── */}
          <section className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Status ändern</h3>
            <div className="grid grid-cols-1 gap-2">
              {STATUS_OPTIONS.map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={updating || order.status === s}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition
                      ${order.status === s
                        ? `${cfg.color} ring-2 ring-offset-1 ring-current cursor-default`
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }
                      disabled:opacity-50`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            {updating && (
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Wird aktualisiert…
              </div>
            )}
          </section>

          {/* ── Payment Info ── */}
          <section className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Zahlungsinformationen
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Methode:</span>
                <span className="font-medium text-gray-900">
                  {order.paymentMethodTitle || order.paymentMethod || '–'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-medium text-gray-900">
                  {order.payment?.status || '–'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Betrag:</span>
                <span className="font-medium text-gray-900">{formatCurrency(order.total)}</span>
              </div>
              {(order.transactionId || order.payment?.transactionId) && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Transaction:</span>
                  <span className="font-mono text-xs text-gray-600 break-all">
                    {order.transactionId || order.payment?.transactionId}
                  </span>
                </div>
              )}
              {order.datePaid && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Bezahlt am:</span>
                  <span className="text-gray-900">{formatShortDate(order.datePaid)}</span>
                </div>
              )}
            </div>
          </section>

          {/* ── Invoice ── */}
          <section className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Rechnung
            </h3>
            {order.invoice ? (
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-500">Nr.:</span>
                  <span className="ml-2 font-medium text-gray-900">{order.invoice.invoiceNumber}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={`/api/admin/invoices/${order.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Download className="w-4 h-4" />
                    PDF herunterladen
                  </a>
                  <button
                    onClick={resendInvoice}
                    disabled={resending}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                  >
                    {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Rechnung erneut senden
                  </button>
                </div>
                {resendResult && (
                  <p className={`text-xs mt-1 ${resendResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {resendResult.message}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Keine Rechnung vorhanden.</p>
            )}
          </section>

          {/* ── Refund ── */}
          <section className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Erstattung
            </h3>

            <button
              onClick={() => setShowRefundForm(!showRefundForm)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              {showRefundForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showRefundForm ? 'Ausblenden' : 'Erstattung durchführen'}
            </button>

            {showRefundForm && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Betrag (leer = Vollerstattung: {formatCurrency(order.total)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={order.total}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder={order.total.toFixed(2)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={handleRefund}
                  disabled={refundLoading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {refundLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird verarbeitet…
                    </>
                  ) : (
                    'Erstattung bestätigen'
                  )}
                </button>
              </div>
            )}

            {refundResult && (
              <div className={`mt-3 p-3 rounded-lg text-xs ${refundResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {refundResult.message}
              </div>
            )}

            {/* Refund History */}
            {refundHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Erstattungsverlauf</h4>
                <div className="space-y-2">
                  {refundHistory.map((r) => (
                    <div key={r.id} className="flex justify-between items-center text-xs bg-gray-50 rounded px-2 py-1.5">
                      <div>
                        <span className="font-medium text-gray-900">€{r.amount.value}</span>
                        <span className={`ml-2 ${r.status === 'refunded' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {r.status}
                        </span>
                      </div>
                      <span className="text-gray-400">{formatShortDate(r.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
    </AdminShell>
  );
}
