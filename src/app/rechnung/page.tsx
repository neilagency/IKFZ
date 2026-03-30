'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  Shield,
  Lock,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Payment methods ──
const PAYMENT_METHODS = [
  { key: 'paypal', label: 'PayPal', icon: Smartphone, fee: 0 },
  { key: 'applepay', label: 'Apple Pay', icon: Smartphone, fee: 0 },
  { key: 'creditcard', label: 'Kreditkarte', icon: CreditCard, fee: 0.50 },
  { key: 'klarna', label: 'Klarna', icon: CreditCard, fee: 0 },
  { key: 'sepa', label: 'SEPA-Lastschrift', icon: Banknote, fee: 0 },
];

// ── Checkout form schema ──
const checkoutSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().min(5, 'Telefonnummer ist erforderlich'),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  paymentMethod: z.string().min(1, 'Bitte wählen Sie eine Zahlungsmethode'),
  agbAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Sie müssen die AGB akzeptieren' }),
  }),
  customerNote: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface OrderData {
  productName: string;
  productSlug: string;
  serviceType: string;
  formData: Record<string, unknown>;
  selectedService?: string;
  basePrice: number;
  addons: { key: string; label: string; price: number }[];
  total: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('checkout_order');
    if (!stored) {
      router.replace('/kfz-services/');
      return;
    }
    try {
      setOrderData(JSON.parse(stored));
    } catch {
      router.replace('/kfz-services/');
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: 'paypal',
      agbAccepted: undefined,
    },
  });

  const watchPayment = watch('paymentMethod');

  const selectedMethod = PAYMENT_METHODS.find((m) => m.key === watchPayment);
  const paymentFee = selectedMethod?.fee ?? 0;

  const grandTotal = useMemo(() => {
    if (!orderData) return 0;
    return orderData.total + paymentFee;
  }, [orderData, paymentFee]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (!orderData) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout/direct/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          orderItems: orderData,
          paymentFee,
          grandTotal,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'Bestellung fehlgeschlagen. Bitte versuchen Sie es erneut.');
        setIsSubmitting(false);
        return;
      }

      // Gateway redirect (Mollie / PayPal)
      if (result.checkoutUrl) {
        // Keep sessionStorage until payment is confirmed on success page
        window.location.href = result.checkoutUrl;
        return;
      }

      // No checkout URL (e.g. bank transfer — instructions sent by email)
      sessionStorage.removeItem('checkout_order');
      if (result.pendingPayment) {
        router.push(`/bestellung-erfolgreich/?order=${result.orderId}&pending=1`);
      } else {
        router.push(`/bestellung-erfolgreich/?order=${result.orderId}`);
      }
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      setIsSubmitting(false);
    }
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        </div>
        <div className="container-main py-20 text-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Dark Hero Band ── */}
      <div className="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="container-main py-10 md:py-16">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-dark-500 hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück zum Formular
          </button>

          <h1 className="text-3xl font-bold text-dark-900 mb-8">
            Bestellung abschließen
          </h1>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* ── Left Column: Checkout Form ── */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="lg:col-span-3 space-y-6"
            >
              {/* Billing / Contact */}
              <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6 space-y-5">
                <h2 className="text-lg font-bold text-dark-900">
                  Rechnungsadresse & Kontakt
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Vorname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('firstName')}
                      placeholder="Max"
                      className={cn(
                        'input-field',
                        errors.firstName && 'border-red-400'
                      )}
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Nachname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('lastName')}
                      placeholder="Mustermann"
                      className={cn(
                        'input-field',
                        errors.lastName && 'border-red-400'
                      )}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-800 mb-2">
                    E-Mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="max@beispiel.de"
                    className={cn(
                      'input-field',
                      errors.email && 'border-red-400'
                    )}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-800 mb-2">
                    Telefonnummer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    {...register('phone')}
                    placeholder="+49 152 1234567"
                    className={cn(
                      'input-field',
                      errors.phone && 'border-red-400'
                    )}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-800 mb-2">
                    Straße & Hausnummer
                  </label>
                  <input
                    type="text"
                    {...register('address')}
                    placeholder="Musterstraße 1"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      PLZ
                    </label>
                    <input
                      type="text"
                      {...register('postcode')}
                      placeholder="45141"
                      maxLength={5}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Stadt
                    </label>
                    <input
                      type="text"
                      {...register('city')}
                      placeholder="Essen"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-800 mb-2">
                    Anmerkungen (optional)
                  </label>
                  <textarea
                    {...register('customerNote')}
                    placeholder="Besondere Hinweise zu Ihrer Bestellung..."
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-dark-900 mb-4">
                  Zahlungsmethode
                </h2>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <label
                        key={method.key}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                          watchPayment === method.key
                            ? 'border-primary bg-primary/[0.04]'
                            : 'border-dark-100 hover:border-dark-200'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            value={method.key}
                            {...register('paymentMethod')}
                            className="accent-primary w-4 h-4"
                          />
                          <Icon className="w-5 h-5 text-dark-500" />
                          <span className="font-medium text-dark-700">
                            {method.label}
                          </span>
                        </div>
                        {method.fee > 0 ? (
                          <span className="text-xs text-dark-400">
                            + {method.fee.toFixed(2).replace('.', ',')} €
                          </span>
                        ) : (
                          <span className="text-xs text-primary font-medium">
                            Kostenlos
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {errors.paymentMethod && (
                  <p className="text-red-500 text-sm mt-2">
                    {errors.paymentMethod.message}
                  </p>
                )}
              </div>

              {/* AGB Checkbox */}
              <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('agbAccepted')}
                    className="accent-primary w-4 h-4 mt-0.5"
                  />
                  <span className="text-sm text-dark-600">
                    Ich habe die{' '}
                    <a
                      href="/agb/"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      Allgemeinen Geschäftsbedingungen
                    </a>{' '}
                    und die{' '}
                    <a
                      href="/datenschutzerklarung/"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      Datenschutzerklärung
                    </a>{' '}
                    gelesen und akzeptiere diese.{' '}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                {errors.agbAccepted && (
                  <p className="text-red-500 text-sm mt-2 ml-7">
                    {errors.agbAccepted.message}
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit (mobile) */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'w-full btn-primary py-4 text-lg lg:hidden',
                  isSubmitting && 'opacity-60 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wird verarbeitet...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" /> Jetzt kostenpflichtig bestellen
                  </>
                )}
              </button>
            </form>

            {/* ── Right Column: Order Summary (sticky) ── */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-28 space-y-6">
                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-dark-900 mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Bestellübersicht
                  </h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-600">
                        {orderData.selectedService ?? orderData.productName}
                      </span>
                      <span className="text-dark-800 font-medium">
                        {orderData.basePrice.toFixed(2).replace('.', ',')} €
                      </span>
                    </div>

                    {orderData.addons.map((addon) => (
                      <div key={addon.key} className="flex justify-between">
                        <span className="text-dark-600">{addon.label}</span>
                        <span className="text-dark-800 font-medium">
                          {addon.price.toFixed(2).replace('.', ',')} €
                        </span>
                      </div>
                    ))}

                    {paymentFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-dark-600">
                          Zahlungsgebühr ({selectedMethod?.label})
                        </span>
                        <span className="text-dark-800 font-medium">
                          {paymentFee.toFixed(2).replace('.', ',')} €
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-100">
                    <span className="text-lg font-bold text-dark-900">
                      Gesamt
                    </span>
                    <span className="text-2xl font-black text-primary">
                      {grandTotal.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>

                  <p className="text-xs text-dark-400 mt-2">
                    inkl. MwSt. (soweit anwendbar)
                  </p>
                </div>

                {/* Submit (desktop) */}
                <button
                  type="submit"
                  form="checkout-form-fallback"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                  className={cn(
                    'w-full btn-primary py-4 text-lg hidden lg:flex',
                    isSubmitting && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Wird verarbeitet...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" /> Jetzt kostenpflichtig
                      bestellen
                    </>
                  )}
                </button>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 text-xs text-dark-400">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>SSL-verschlüsselt</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>Sichere Zahlung</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
