import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { verifyInvoiceToken } from '@/lib/invoice-token';
import PrintButton from './print-button';
import {
  FileText,
  Building2,
  CreditCard,
  Clock,
  CheckCircle,
  Phone,
  ArrowLeft,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export const metadata = {
  robots: { index: false, follow: false },
};

const BANK_DETAILS = {
  accountHolder: 'ikfz Digital-Zulassung UG (haftungsbeschränkt)',
  iban: 'DE70 3002 0900 5320 8804 65',
  bic: 'CMCIDEDD',
  bankName: 'Targobank',
};

function eur(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

interface PageProps {
  params: Promise<{ invoiceNumber: string }>;
  searchParams: Promise<{ token?: string; order?: string }>;
}

export default async function InvoicePage({ params, searchParams }: PageProps) {
  const { invoiceNumber } = await params;
  const { token, order: orderParam } = await searchParams;

  if (!token || !verifyInvoiceToken(decodeURIComponent(invoiceNumber), token)) {
    notFound();
  }

  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: decodeURIComponent(invoiceNumber) },
    include: {
      order: {
        select: {
          orderNumber: true,
          billingFirstName: true,
          billingLastName: true,
          billingEmail: true,
          billingAddress1: true,
          billingCity: true,
          billingPostcode: true,
          billingPhone: true,
          productName: true,
          total: true,
          subtotal: true,
          paymentFee: true,
          paymentMethod: true,
          paymentMethodTitle: true,
          createdAt: true,
        },
      },
    },
  });

  if (!invoice || !invoice.order) {
    notFound();
  }

  const dbOrder = invoice.order;
  const orderNumber = dbOrder.orderNumber || '';

  // Parse invoice items
  let items: Array<{ name: string; quantity: number; price: number; total: number }> = [];
  try {
    items = JSON.parse(invoice.items || '[]');
  } catch {
    items = [];
  }

  // Financials
  const total = invoice.amount > 0 ? invoice.amount : dbOrder.total;
  const taxRate = 19;
  const netAmount = total / (1 + taxRate / 100);
  const taxAmount = total - netAmount;

  const customerName = invoice.billingName || `${dbOrder.billingFirstName || ''} ${dbOrder.billingLastName || ''}`.trim() || 'Kunde';
  const transferReference = `${orderNumber} - ${dbOrder.billingLastName || invoiceNumber}`;
  const paymentMethod = dbOrder.paymentMethodTitle || dbOrder.paymentMethod || '';
  const paymentStatus = invoice.status || 'pending';
  const invoiceDate = new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const isSepa = (dbOrder.paymentMethod || '').toLowerCase().includes('sepa') || (dbOrder.paymentMethodTitle || '').toLowerCase().includes('berweisung');

  const helpPhone = process.env.CONTACT_PHONE || '+4915224999190';
  const helpPhoneFormatted = process.env.CONTACT_PHONE_DISPLAY || '01522 4999190';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-dark-950 via-primary-900 to-dark-950 pt-28 md:pt-32 pb-14 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gradient-radial from-primary/12 to-transparent rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="mx-auto w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Rechnung {invoiceNumber}
          </h1>
          {isSepa && (
            <p className="text-white/70 mt-2 max-w-md mx-auto text-sm md:text-base">
              Vielen Dank für Ihre Bestellung! Bitte überweisen Sie den Gesamtbetrag auf unser Bankkonto.
            </p>
          )}
          <p className="mt-3">
            <span className="text-accent font-bold text-lg">Bestellnummer: #{orderNumber}</span>
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 -mt-6 space-y-6 relative z-10">

        {/* ── Bank Details Card (only for SEPA) ── */}
        {isSepa && (
          <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-lg p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-dark-900">Bankverbindung</h2>
                <p className="text-sm text-dark-500">SEPA-Überweisung</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 space-y-4">
              <div>
                <p className="text-xs text-dark-400 uppercase tracking-wider">Kontoinhaber</p>
                <p className="text-sm font-semibold text-dark-800 mt-0.5">{BANK_DETAILS.accountHolder}</p>
              </div>
              <div className="border-t border-gray-200" />
              <div>
                <p className="text-xs text-dark-400 uppercase tracking-wider">IBAN</p>
                <p className="text-sm font-mono tracking-wider font-semibold text-dark-800 mt-0.5">{BANK_DETAILS.iban}</p>
              </div>
              <div className="border-t border-gray-200" />
              <div>
                <p className="text-xs text-dark-400 uppercase tracking-wider">BIC / SWIFT</p>
                <p className="text-sm font-mono tracking-wider font-semibold text-dark-800 mt-0.5">{BANK_DETAILS.bic}</p>
              </div>
              <div className="border-t border-gray-200" />
              <div>
                <p className="text-xs text-dark-400 uppercase tracking-wider">Bank</p>
                <p className="text-sm font-semibold text-dark-800 mt-0.5">{BANK_DETAILS.bankName}</p>
              </div>
              <div className="border-t border-gray-200" />
              <div>
                <p className="text-xs text-dark-400 uppercase tracking-wider">Verwendungszweck</p>
                <p className="text-sm font-mono font-bold text-primary mt-0.5">{transferReference}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mt-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-700">Zu überweisender Betrag</p>
                <p className="text-xs text-dark-400">inkl. 19% MwSt.</p>
              </div>
              <p className="text-3xl font-extrabold text-primary">{eur(total)}</p>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-5 flex gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Wichtiger Hinweis:</p>
                <p className="mt-1">
                  Bitte geben Sie im Verwendungszweck unbedingt &bdquo;<strong>{transferReference}</strong>&ldquo; an, damit wir Ihre Zahlung zuordnen können.
                  Die Bearbeitung beginnt unmittelbar nach Zahlungseingang.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Invoice Details Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-dark-400" />
            <h2 className="text-lg font-bold text-dark-900">Rechnungsdetails</h2>
          </div>

          {/* Customer Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-dark-400">Rechnungsnummer</p>
              <p className="font-semibold text-dark-800">{invoiceNumber}</p>
            </div>
            <div>
              <p className="text-dark-400">Datum</p>
              <p className="font-semibold text-dark-800">{invoiceDate}</p>
            </div>
            <div>
              <p className="text-dark-400">Kunde</p>
              <p className="font-semibold text-dark-800">{customerName}</p>
              {dbOrder.billingAddress1 && <p className="text-dark-500 text-xs">{dbOrder.billingAddress1}</p>}
              {(dbOrder.billingPostcode || dbOrder.billingCity) && (
                <p className="text-dark-500 text-xs">{dbOrder.billingPostcode} {dbOrder.billingCity}</p>
              )}
            </div>
            <div>
              <p className="text-dark-400">E-Mail</p>
              <p className="font-semibold text-dark-800 break-all">{dbOrder.billingEmail || ''}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-dark-200">
                <th className="text-left text-xs font-semibold text-dark-500 uppercase tracking-wider pb-3">Beschreibung</th>
                <th className="text-center text-xs font-semibold text-dark-500 uppercase tracking-wider pb-3 w-16">Menge</th>
                <th className="text-right text-xs font-semibold text-dark-500 uppercase tracking-wider pb-3 w-24">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-dark-800">{item.name}</td>
                  <td className="py-3 text-sm text-dark-600 text-center">{item.quantity}</td>
                  <td className="py-3 text-sm text-dark-800 font-medium text-right">{eur(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t-2 border-dark-200 pt-4 space-y-2 ml-auto max-w-xs">
            <div className="flex justify-between text-sm">
              <span className="text-dark-500">Nettobetrag</span>
              <span className="text-dark-800">{eur(Math.round(netAmount * 100) / 100)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-500">MwSt. ({taxRate}%)</span>
              <span className="text-dark-800">{eur(Math.round(taxAmount * 100) / 100)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-dark-200">
              <span className="text-dark-900">Gesamtbetrag</span>
              <span className="text-primary">{eur(total)}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-sm text-dark-500">
            <span>Zahlungsmethode: <strong>{paymentMethod || '—'}</strong></span>
            <span>•</span>
            <span>Zahlungsstatus: <strong className={paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}>{paymentStatus === 'paid' ? 'Bezahlt' : 'Ausstehend'}</strong></span>
          </div>
        </div>

        {/* ── Next Steps (only for SEPA) ── */}
        {isSepa && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <CheckCircle className="w-6 h-6 text-accent" />
              <h2 className="text-lg font-bold text-dark-900">Wie geht es weiter?</h2>
            </div>
            <ol className="space-y-4">
              {[
                `Überweisen Sie ${eur(total)} an die oben genannte Bankverbindung mit dem Verwendungszweck „${transferReference}".`,
                'Sobald Ihre Zahlung bei uns eingegangen ist (in der Regel 1–2 Werktage), erhalten Sie eine Bestätigung per E-Mail.',
                `Unser Team beginnt dann sofort mit der Bearbeitung Ihrer ${dbOrder.productName || 'Bestellung'}.`,
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-dark-700 pt-1">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <PrintButton invoiceNumber={decodeURIComponent(invoiceNumber)} token={token} />
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-4 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Zurück zur Startseite
          </Link>
        </div>

        {/* ── Support Card ── */}
        <div className="bg-gradient-to-r from-primary/[0.04] to-accent/[0.04] rounded-2xl p-6 md:p-8 text-center">
          <Phone className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold text-dark-900">Fragen zur Überweisung?</h3>
          <p className="text-sm text-dark-500 mt-1">Unser Support-Team hilft Ihnen gerne weiter.</p>
          <a
            href={`tel:${helpPhone}`}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-xl mt-4 transition-colors"
          >
            <Phone className="w-4 h-4" />
            {helpPhoneFormatted}
          </a>
        </div>
      </div>
    </div>
  );
}
