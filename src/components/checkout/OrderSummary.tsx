'use client';

import { useState } from 'react';
import { Shield, Lock, CheckCircle2, X, AlertTriangle, Tag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────── */
interface OrderData {
  productName: string;
  selectedService?: string;
  basePrice: number;
  addons: { key: string; label: string; price: number }[];
  total: number;
  serviceType: string;
}

interface CouponData {
  code: string;
  discountAmount: number;
  discountType: string;
  discountValue: number;
}

interface OrderSummaryProps {
  orderData: OrderData;
  paymentFee: number;
  paymentMethodLabel?: string;
  paymentMethodId: string;
  grandTotal: number;
  isSubmitting: boolean;
  error: string | null;
  agbError?: string;
  agbRegister: any;
  onSubmit: () => void;
  /** Coupon callbacks */
  coupon: CouponData | null;
  onApplyCoupon: (code: string) => Promise<string | null>;
  onRemoveCoupon: () => void;
}

/* ── Per-method Submit Button ────────────────────────────────────── */
function SubmitButton({
  methodId,
  isSubmitting,
  onClick,
}: {
  methodId: string;
  isSubmitting: boolean;
  onClick: () => void;
}) {
  if (methodId === 'paypal') {
    return (
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onClick}
        className={cn(
          'w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all',
          'bg-[#FFC439] text-[#003087] hover:bg-[#f0b829]',
          isSubmitting && 'opacity-70 cursor-not-allowed',
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Wird weitergeleitet…
          </>
        ) : (
          <>
            <span className="font-bold">
              <span className="text-[#003087]">Pay</span>
              <span className="text-[#009cde]">Pal</span>
            </span>{' '}
            Jetzt kaufen
          </>
        )}
      </button>
    );
  }

  if (methodId === 'applepay') {
    return (
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onClick}
        className={cn(
          'w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all',
          'bg-black text-white hover:bg-black/90',
          isSubmitting && 'opacity-70 cursor-not-allowed',
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Wird weitergeleitet…
          </>
        ) : (
          <>Mit  Pay bezahlen</>
        )}
      </button>
    );
  }

  // Default: green gradient
  return (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={onClick}
      className={cn(
        'w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all',
        'bg-gradient-to-r from-accent to-green-500 text-white hover:shadow-lg hover:shadow-accent/20',
        isSubmitting && 'opacity-70 cursor-not-allowed',
      )}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Bestellung wird erstellt…
        </>
      ) : (
        <>
          <Lock className="w-5 h-5" />
          Zahlungspflichtig bestellen ›
        </>
      )}
    </button>
  );
}

/* ── OrderSummary Component ──────────────────────────────────────── */
export function OrderSummary({
  orderData,
  paymentFee,
  paymentMethodLabel,
  paymentMethodId,
  grandTotal,
  isSubmitting,
  error,
  agbError,
  agbRegister,
  onSubmit,
  coupon,
  onApplyCoupon,
  onRemoveCoupon,
}: OrderSummaryProps) {
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    const err = await onApplyCoupon(couponInput.trim());
    if (err) setCouponError(err);
    setCouponLoading(false);
    if (!err) setCouponInput('');
  };

  const discountAmount = coupon?.discountAmount ?? 0;

  return (
    <div className="lg:sticky lg:top-28 space-y-5">
      {/* Order Summary Card */}
      <div className="rounded-2xl bg-white border border-dark-100 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-dark-900 to-dark-800 px-6 py-4">
          <h2 className="text-lg font-bold text-white">
            Ihre Bestellung
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Product line */}
          <div className="flex justify-between text-sm">
            <span className="text-dark-600">
              {orderData.selectedService ?? orderData.productName}
              <span className="text-dark-400 ml-2">×1</span>
            </span>
            <span className="text-dark-800 font-medium whitespace-nowrap">
              {orderData.basePrice.toFixed(2).replace('.', ',')} €
            </span>
          </div>

          {/* Addons */}
          {orderData.addons.map((addon) => (
            <div key={addon.key} className="flex justify-between text-sm">
              <span className="text-dark-600">
                {addon.label}
                <span className="text-dark-400 ml-2">×1</span>
              </span>
              <span className="text-dark-800 font-medium whitespace-nowrap">
                {addon.price.toFixed(2).replace('.', ',')} €
              </span>
            </div>
          ))}

          {/* Divider */}
          <div className="border-t border-dark-100" />

          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-dark-600">Zwischensumme</span>
            <span className="text-dark-800 font-medium">
              {orderData.total.toFixed(2).replace('.', ',')} €
            </span>
          </div>

          {/* Payment fee */}
          <div className="flex justify-between text-sm">
            <span className="text-dark-600">Zahlungsgebühr</span>
            <span className={cn('font-medium', paymentFee > 0 ? 'text-dark-800' : 'text-primary')}>
              {paymentFee > 0
                ? `${paymentFee.toFixed(2).replace('.', ',')} €`
                : 'Kostenlos'}
            </span>
          </div>

          {/* Coupon input / applied */}
          {!coupon ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="Gutscheincode"
                  className="flex-1 px-3 py-2 rounded-lg border border-dark-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="px-4 py-2 rounded-lg bg-dark-100 text-dark-700 text-sm font-medium hover:bg-dark-200 transition-colors disabled:opacity-50"
                >
                  {couponLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Einlösen'
                  )}
                </button>
              </div>
              {couponError && (
                <p className="text-red-500 text-xs">{couponError}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {coupon.code}
                </span>
                <button
                  type="button"
                  onClick={onRemoveCoupon}
                  className="text-dark-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-600 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  Gutschein ({coupon.code})
                </span>
                <span className="text-green-600 font-medium">
                  -{discountAmount.toFixed(2).replace('.', ',')} €
                </span>
              </div>
            </div>
          )}

          {/* Grand total */}
          <div className="border-t-2 border-dark-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-dark-900">Gesamtsumme</span>
              <span className="text-2xl font-black text-primary">
                {grandTotal.toFixed(2).replace('.', ',')} €
              </span>
            </div>
            <p className="text-xs text-dark-400 mt-1">(inkl. MwSt.)</p>
          </div>
        </div>
      </div>

      {/* AGB + Submit */}
      <div className="space-y-4">
        {/* AGB Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...agbRegister}
            className="accent-primary w-4 h-4 mt-0.5"
          />
          <span className="text-sm text-dark-600">
            Ich habe die{' '}
            <a href="/agb/" target="_blank" className="text-primary hover:underline font-medium">
              Allgemeinen Geschäftsbedingungen
            </a>{' '}
            und die{' '}
            <a href="/datenschutzerklarung/" target="_blank" className="text-primary hover:underline font-medium">
              Datenschutzerklärung
            </a>{' '}
            gelesen und akzeptiere diese.{' '}
            <span className="text-red-500">*</span>
          </span>
        </label>
        {agbError && (
          <p className="text-red-500 text-sm ml-7">{agbError}</p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button (varies by method) */}
        <SubmitButton
          methodId={paymentMethodId}
          isSubmitting={isSubmitting}
          onClick={onSubmit}
        />

        {/* SSL Badge */}
        <p className="text-xs text-dark-400 text-center flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          256-Bit SSL-verschlüsselte Verbindung
        </p>
      </div>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-5 text-xs text-dark-400">
        <span className="flex items-center gap-1.5">
          <Lock className="w-4 h-4" />
          SSL-verschlüsselt
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          DSGVO-konform
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="w-4 h-4" />
          Sicher
        </span>
      </div>

      {/* Guarantee */}
      <div className="rounded-xl bg-green-50/50 border border-green-100 p-4">
        <p className="text-sm font-semibold text-dark-700 mb-1">
          Faire und transparente Prüfung
        </p>
        <p className="text-xs text-dark-500">
          Sollte es bei der Bearbeitung Probleme geben, werden Sie umgehend informiert und erhalten Ihr Geld zurück.
        </p>
      </div>
    </div>
  );
}
