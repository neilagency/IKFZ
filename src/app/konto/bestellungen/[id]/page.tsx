'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, FileText, CreditCard, Package, Download,
  AlertCircle, RefreshCw, MapPin, Car, ShieldCheck, Calendar,
  CheckCircle, Clock, FolderOpen,
} from 'lucide-react';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  paymentFee: number;
  discountAmount: number;
  couponCode: string;
  currency: string;
  productName: string;
  paymentMethod: string;
  paymentMethodTitle: string;
  billingFirstName: string;
  billingLastName: string;
  billingEmail: string;
  billingPhone: string;
  billingAddress1: string;
  billingCity: string;
  billingPostcode: string;
  serviceData: string;
  createdAt: string;
  datePaid: string | null;
  dateCompleted: string | null;
  items: { id: string; name: string; quantity: number; price: number; total: number }[];
  payment: { id: string; status: string; method: string; amount: number; paidAt: string | null } | null;
  invoice: { id: string; invoiceNumber: string; amount: number; status: string; issuedAt: string; pdfToken?: string } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; dot: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Ausstehend', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400', icon: Clock },
  processing: { label: 'In Bearbeitung', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400', icon: Clock },
  completed: { label: 'Abgeschlossen', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-400', icon: CheckCircle },
  cancelled: { label: 'Storniert', color: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-400', icon: AlertCircle },
  failed: { label: 'Fehlgeschlagen', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400', icon: AlertCircle },
  refunded: { label: 'Erstattet', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-400', icon: RefreshCw },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPrice(amount: number) {
  return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-5 h-5 rounded" />
        <div className="space-y-1.5"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-32" /></div>
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2"><Skeleton className="w-4 h-4 rounded" /><Skeleton className="h-4 w-28" /></div>
          <div className="space-y-3">{[...Array(3)].map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}</div>
        </div>
      ))}
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function CustomerOrderDocuments({ orderId }: { orderId: string }) {
  const [docs, setDocs] = useState<{ id: string; fileName: string; fileSize: number; token: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customer/orders/${orderId}/documents`)
      .then((r) => r.json())
      .then((data) => setDocs(data.documents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-700">Ihre Unterlagen</h3>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  if (docs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-700">Ihre Unterlagen</h3>
      </div>
      <div className="space-y-2">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                <p className="text-xs text-gray-400">
                  {formatSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/documents/${doc.id}/download?token=${encodeURIComponent(doc.token)}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-gray-200 text-sm text-gray-600 hover:text-primary hover:border-primary/30 hover:shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Herunterladen</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/customer/orders/${id}`);
      if (!r.ok) throw new Error('Bestellung nicht gefunden.');
      const data = await r.json();
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  if (loading) return <DetailSkeleton />;

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/konto/bestellungen" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition">
          <ChevronLeft className="w-4 h-4" /> Zurück
        </Link>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-800 mb-4">{error || 'Bestellung nicht gefunden.'}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={loadOrder}
              className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-600 font-medium px-5 py-2 rounded-xl hover:bg-red-50 transition text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Erneut versuchen
            </button>
            <Link href="/konto/bestellungen" className="text-sm text-gray-500 hover:text-gray-700 transition">
              Zurück zur Liste
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const StatusIcon = st.icon;
  let serviceInfo: Record<string, string> = {};
  try { serviceInfo = JSON.parse(order.serviceData); } catch {}

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/konto/bestellungen"
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Bestellung #{order.orderNumber}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium border ${st.color}`}>
                <StatusIcon className="w-3 h-3" />
                {st.label}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(order.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick invoice download */}
        {order.invoice && order.invoice.pdfToken && (
          <a
            href={`/api/invoice/${order.invoice.invoiceNumber}/pdf?token=${encodeURIComponent(order.invoice.pdfToken)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-white font-medium px-4 py-2 rounded-xl hover:bg-primary-700 transition text-sm sm:self-start"
          >
            <Download className="w-4 h-4" />
            Rechnung PDF
          </a>
        )}
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-700">Bestellübersicht</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Produkt</span>
            <span className="text-gray-900 font-medium">{order.productName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Zwischensumme</span>
            <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
          </div>
          {order.paymentFee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Zahlungsgebühr ({order.paymentMethodTitle})</span>
              <span className="text-gray-900">{formatPrice(order.paymentFee)}</span>
            </div>
          )}
          {order.discountAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-green-600 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                Rabatt {order.couponCode ? `(${order.couponCode})` : ''}
              </span>
              <span className="text-green-600 font-medium">-{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="border-t pt-3 flex justify-between">
            <span className="text-gray-900 font-semibold">Gesamt</span>
            <span className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
          </div>
          {order.discountAmount > 0 && order.total <= 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 text-center font-medium mt-1">
              Vollständig per Gutschein bezahlt (100% Rabatt)
            </div>
          )}
          {order.discountAmount > 0 && order.total > 0 && (
            <p className="text-xs text-green-600 mt-1">Sie haben einen Rabatt mit dem Code <span className="font-semibold">{order.couponCode}</span> erhalten.</p>
          )}
        </div>
      </div>

      {/* Service Data (vehicle info) */}
      {Object.keys(serviceInfo).length > 0 && serviceInfo.licensePlate && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-700">Fahrzeugdaten</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {serviceInfo.licensePlate && (
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Kennzeichen</p>
                  <p className="text-sm text-gray-900 font-semibold">{String(serviceInfo.licensePlate)}</p>
                </div>
              </div>
            )}
            {serviceInfo.vehicleId && (
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <Car className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">FIN</p>
                  <p className="text-sm text-gray-900 font-semibold">{String(serviceInfo.vehicleId)}</p>
                </div>
              </div>
            )}
            {serviceInfo.securityCode && (
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Sicherheitscode</p>
                  <p className="text-sm text-gray-900 font-semibold">{String(serviceInfo.securityCode)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      {order.items.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-700">Positionen</h3>
          </div>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400">Menge: {item.quantity}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatPrice(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment + Billing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Payment Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-700">Zahlung</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Zahlungsart</span>
              <span className="text-gray-900 font-medium">{order.paymentMethodTitle}</span>
            </div>
            {order.datePaid && (
              <div className="flex justify-between">
                <span className="text-gray-500">Bezahlt am</span>
                <span className="text-gray-900">{formatDate(order.datePaid)}</span>
              </div>
            )}
            {order.payment && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Betrag</span>
                  <span className="text-gray-900">{formatPrice(order.payment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`inline-flex items-center gap-1 font-medium ${order.payment.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                    {order.payment.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {order.payment.status === 'paid' ? 'Bezahlt' : 'Ausstehend'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-700">Rechnungsadresse</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-900">{order.billingFirstName} {order.billingLastName}</p>
            <p>{order.billingAddress1}</p>
            <p>{order.billingPostcode} {order.billingCity}</p>
            <p className="text-gray-400 mt-2">{order.billingEmail}</p>
            {order.billingPhone && <p className="text-gray-400">{order.billingPhone}</p>}
          </div>
        </div>
      </div>

      {/* Invoice */}
      {order.invoice && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-700">Rechnung</h3>
          </div>
          <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{order.invoice.invoiceNumber}</p>
                <p className="text-xs text-gray-400">{formatDate(order.invoice.issuedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{formatPrice(order.invoice.amount)}</p>
                <p className={`text-xs font-medium ${order.invoice.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                  {order.invoice.status === 'paid' ? 'Bezahlt' : 'Ausstehend'}
                </p>
              </div>
              {order.invoice.pdfToken && (
                <a
                  href={`/api/invoice/${order.invoice.invoiceNumber}/pdf?token=${encodeURIComponent(order.invoice.pdfToken)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-white rounded-xl border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 hover:shadow-sm transition"
                  title="PDF herunterladen"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents */}
      <CustomerOrderDocuments orderId={order.id} />
    </div>
  );
}
