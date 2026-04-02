import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { verifyInvoiceToken } from '@/lib/invoice-token';
import { eur } from '@/lib/invoice-template';
import type { InvoiceData } from '@/lib/invoice-template';
import PrintButton from './print-button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { invoiceNumber: string };
  searchParams: { token?: string; order?: string };
}

export default async function InvoicePage({ params, searchParams }: PageProps) {
  const { invoiceNumber } = params;
  const { token, order } = searchParams;

  // Verify token for security
  if (!token || !verifyInvoiceToken(decodeURIComponent(invoiceNumber), token)) {
    notFound();
  }

  // Find the invoice
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: decodeURIComponent(invoiceNumber) },
  });

  if (!invoice) {
    notFound();
  }

  // Find associated order
  const dbOrder = await prisma.order.findUnique({
    where: { id: invoice.orderId },
    include: {
      items: true,
    },
  });

  if (!dbOrder) {
    notFound();
  }

  // Parse invoice items
  let invoiceItems: Array<{ name: string; quantity: number; price: number; total: number }> = [];
  try {
    invoiceItems = JSON.parse(invoice.items || '[]');
  } catch {
    invoiceItems = dbOrder.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    }));
  }

  // Parse service data
  let serviceData: Record<string, any> = {};
  try {
    serviceData = JSON.parse(dbOrder.serviceData || '{}');
  } catch {
    serviceData = {};
  }

  const subtotal = dbOrder.subtotal || dbOrder.total;
  const taxRate = 19;
  const netAmount = subtotal / (1 + taxRate / 100);
  const taxAmount = subtotal - netAmount;

  const invoiceData: InvoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: new Date(invoice.issuedAt).toLocaleDateString('de-DE'),
    orderNumber: dbOrder.orderNumber || '',
    orderDate: new Date(dbOrder.createdAt).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    paymentMethod: dbOrder.paymentMethodTitle || dbOrder.paymentMethod || '',
    paymentStatus: invoice.status || 'pending',
    transactionId: dbOrder.transactionId || '',
    customerName: invoice.billingName || `${dbOrder.billingFirstName || ''} ${dbOrder.billingLastName || ''}`.trim(),
    customerEmail: invoice.billingEmail || dbOrder.billingEmail || '',
    customerPhone: dbOrder.billingPhone || '',
    customerStreet: dbOrder.billingAddress1 || '',
    customerPostcode: dbOrder.billingPostcode || '',
    customerCity: dbOrder.billingCity || '',
    productName: dbOrder.productName || '',
    serviceData,
    items: invoiceItems,
    subtotal,
    taxRate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: dbOrder.total,
    paymentFee: dbOrder.paymentFee || 0,
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 md:py-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Print button */}
        <div className="flex justify-end mb-4 print:hidden">
          <PrintButton />
        </div>

        {/* Invoice card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 print:shadow-none print:rounded-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-bold text-dark-900">Rechnung</h1>
              <p className="text-sm text-dark-500 mt-1">
                Nr. {invoiceData.invoiceNumber}
              </p>
            </div>
            <div className="text-right text-sm text-dark-500">
              <p className="font-semibold text-dark-800">iKFZ Digital Zulassung</p>
              <p>Rechnungsdatum: {invoiceData.invoiceDate}</p>
              <p>Bestellung: #{invoiceData.orderNumber}</p>
            </div>
          </div>

          {/* Customer info */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-2">
              Rechnungsempfänger
            </h2>
            <p className="text-dark-800 font-medium">{invoiceData.customerName}</p>
            {invoiceData.customerStreet && (
              <p className="text-dark-600 text-sm">{invoiceData.customerStreet}</p>
            )}
            {(invoiceData.customerPostcode || invoiceData.customerCity) && (
              <p className="text-dark-600 text-sm">
                {invoiceData.customerPostcode} {invoiceData.customerCity}
              </p>
            )}
            <p className="text-dark-600 text-sm">{invoiceData.customerEmail}</p>
          </div>

          {/* Payment info bar */}
          <div className="bg-gray-50 rounded-xl p-4 mb-8 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-dark-400">Zahlungsmethode</p>
              <p className="font-medium text-dark-800">{invoiceData.paymentMethod || '—'}</p>
            </div>
            <div>
              <p className="text-dark-400">Status</p>
              <p className={`font-medium ${invoiceData.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                {invoiceData.paymentStatus === 'paid' ? 'Bezahlt' : 'Ausstehend'}
              </p>
            </div>
            <div>
              <p className="text-dark-400">Transaktions-ID</p>
              <p className="font-medium text-dark-800 text-xs break-all">
                {invoiceData.transactionId || '—'}
              </p>
            </div>
          </div>

          {/* Line items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-dark-200">
                <th className="text-left text-sm font-semibold text-dark-600 pb-3">Beschreibung</th>
                <th className="text-center text-sm font-semibold text-dark-600 pb-3 w-16">Menge</th>
                <th className="text-right text-sm font-semibold text-dark-600 pb-3 w-24">Preis</th>
                <th className="text-right text-sm font-semibold text-dark-600 pb-3 w-24">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-dark-800">{item.name}</td>
                  <td className="py-3 text-sm text-dark-600 text-center">{item.quantity}</td>
                  <td className="py-3 text-sm text-dark-600 text-right">{eur(item.price)}</td>
                  <td className="py-3 text-sm text-dark-800 font-medium text-right">{eur(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t-2 border-dark-200 pt-4 space-y-2 ml-auto max-w-xs">
            <div className="flex justify-between text-sm">
              <span className="text-dark-500">Nettobetrag</span>
              <span className="text-dark-800">{eur(invoiceData.subtotal - invoiceData.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-500">MwSt. ({invoiceData.taxRate}%)</span>
              <span className="text-dark-800">{eur(invoiceData.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-dark-200">
              <span className="text-dark-900">Gesamtbetrag</span>
              <span className="text-primary">{eur(invoiceData.total)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-dark-400 text-center">
            <p>iKFZ Digital Zulassung — Alle Angaben ohne Gewähr</p>
            <p className="mt-1">
              Bei Fragen wenden Sie sich bitte an{' '}
              <a href="mailto:info@ikfzdigitalzulassung.de" className="text-primary hover:underline">
                info@ikfzdigitalzulassung.de
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
