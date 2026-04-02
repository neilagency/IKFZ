'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield,
  Lock,
  CheckCircle2,
  Clock,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import type { PaymentMethodDef } from '@/components/PaymentMethodSelector';

// ── Checkout form schema with Klarna conditional validation ──
const checkoutSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().min(5, 'Telefonnummer ist erforderlich'),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  postcode: z.string().optional().default(''),
  paymentMethod: z.string().min(1, 'Bitte wählen Sie eine Zahlungsmethode'),
  agbAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Sie müssen die AGB akzeptieren' }),
  }),
  customerNote: z.string().optional().default(''),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'klarna') {
    if (!data.address || data.address.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Straße ist für Klarna erforderlich', path: ['address'] });
    }
    if (!data.postcode || data.postcode.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PLZ ist für Klarna erforderlich', path: ['postcode'] });
    } else if (!/^\d{5}$/.test(data.postcode.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PLZ muss 5 Ziffern haben', path: ['postcode'] });
    }
    if (!data.city || data.city.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Stadt ist für Klarna erforderlich', path: ['city'] });
    }
  }
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

interface CouponData {
  code: string;
  discountAmount: number;
  discountType: string;
  discountValue: number;
}

/* ── Trust features shown below hero ─────────────────────────────── */
const TRUST_FEATURES = [
  { icon: Lock, title: 'SSL-Verschlüsselung', desc: '256-Bit gesicherte Datenübertragung' },
  { icon: Shield, title: 'DSGVO-konform', desc: 'Ihre Daten sind sicher & geschützt' },
  { icon: CheckCircle2, title: 'Offizielle Bearbeitung', desc: 'Sicher und korrekt übermittelt' },
  { icon: Clock, title: 'Sofort-Prüfung', desc: 'Direkte Bearbeitung Ihres Auftrags' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [dbMethods, setDbMethods] = useState<PaymentMethodDef[]>([]);
  const [coupon, setCoupon] = useState<CouponData | null>(null);

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

  // Fetch enabled payment methods from DB
  useEffect(() => {
    fetch('/api/payment/methods/')
      .then((r) => r.json())
      .then((data) => setDbMethods(data.methods || []))
      .catch(() => {
        setDbMethods([
          { id: 'paypal', label: 'PayPal', description: '', fee: 0, icon: '' },
          { id: 'creditcard', label: 'Kreditkarte', description: '', fee: 0.50, icon: '' },
          { id: 'sepa', label: 'SEPA-Überweisung', description: '', fee: 0, icon: '' },
        ]);
      });
  }, []);

  // Apple Pay availability detection
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'ApplePaySession' in window) {
        const session = (window as unknown as { ApplePaySession: { canMakePayments(): boolean } }).ApplePaySession;
        if (session.canMakePayments()) {
          setApplePayAvailable(true);
        }
      }
    } catch {
      // Not available
    }
  }, []);

  const PAYMENT_METHODS = useMemo(
    () => dbMethods.filter((m) => m.id !== 'applepay' || applePayAvailable),
    [dbMethods, applePayAvailable],
  );

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

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === watchPayment);
  const paymentFee = selectedMethod?.fee ?? 0;
  const discountAmount = coupon?.discountAmount ?? 0;

  const grandTotal = useMemo(() => {
    if (!orderData) return 0;
    return Math.max(orderData.total - discountAmount + paymentFee, 0);
  }, [orderData, paymentFee, discountAmount]);

  /* ── Coupon handlers ── */
  const handleApplyCoupon = useCallback(async (code: string): Promise<string | null> => {
    if (!orderData) return 'Keine Bestellung vorhanden.';
    try {
      const res = await fetch('/api/apply-coupon/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          email: watch('email') || '',
          productSlug: orderData.serviceType || orderData.productSlug || '',
          subtotal: orderData.total,
        }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Ungültiger Gutscheincode.';
      setCoupon({
        code: data.code,
        discountAmount: data.discountAmount,
        discountType: data.discountType,
        discountValue: data.discountValue,
      });
      return null;
    } catch {
      return 'Serverfehler. Bitte versuchen Sie es erneut.';
    }
  }, [orderData, watch]);

  const handleRemoveCoupon = useCallback(() => {
    setCoupon(null);
  }, []);

  /* ── Submit ── */
  const onSubmit = async (data: CheckoutFormData) => {
    if (!orderData) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/payment/checkout/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          street: data.address || '',
          city: data.city || '',
          postcode: data.postcode || '',
          paymentMethod: data.paymentMethod,
          customerNote: data.customerNote || '',
          productId: orderData.serviceType || 'abmeldung',
          productName: orderData.selectedService || orderData.productName,
          serviceData: orderData.formData || {},
          addons: orderData.addons?.map((a) => ({ label: a.label, price: a.price })) || [],
          couponCode: coupon?.code || '',
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'Bestellung fehlgeschlagen. Bitte versuchen Sie es erneut.');
        setIsSubmitting(false);
        return;
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

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

  /* ── Loading state ── */
  if (!orderData) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-b from-dark-950 via-primary-900/20 to-dark-950 pt-24 pb-16 md:pt-32 md:pb-20 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        </div>
        <div className="container-main py-20 text-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Dark Hero Band ── */}
      <div className="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="container-main relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-white/50 mb-6">
            <a href="/" className="hover:text-white/80 transition-colors">Startseite</a>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white/80">Kasse</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            SICHERE BEZAHLUNG
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3">
            Kasse
          </h1>
          <p className="text-lg text-white/60 max-w-xl">
            Schließen Sie Ihren Auftrag sicher ab. Alle Zahlungen werden verschlüsselt übertragen.
          </p>
        </div>
      </div>

      {/* ── Trust Features Bar ── */}
      <div className="container-main -mt-6 relative z-20 mb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TRUST_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl border border-dark-100 shadow-sm p-4 flex items-center gap-3"
            >
              <feature.icon className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-dark-800">{feature.title}</p>
                <p className="text-xs text-dark-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="container-main pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* ── Left Column (3/5): Payment Method Selector ── */}
            <div className="lg:col-span-3">
              <PaymentMethodSelector
                methods={PAYMENT_METHODS}
                register={register}
                errors={errors}
                selectedMethod={watchPayment}
                error={errors.paymentMethod?.message}
              />
            </div>

            {/* ── Right Column (2/5): Order Summary ── */}
            <div className="lg:col-span-2">
              <OrderSummary
                orderData={orderData}
                paymentFee={paymentFee}
                paymentMethodLabel={selectedMethod?.label}
                paymentMethodId={watchPayment || 'creditcard'}
                grandTotal={grandTotal}
                isSubmitting={isSubmitting}
                error={error}
                agbError={errors.agbAccepted?.message}
                agbRegister={register('agbAccepted')}
                onSubmit={handleSubmit(onSubmit)}
                coupon={coupon}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Support Bar ── */}
      <div className="bg-white border-t border-dark-100">
        <div className="container-main py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-dark-800">
                  Brauchen Sie Hilfe bei der Bestellung?
                </p>
                <p className="text-sm text-dark-500">
                  Unser Support-Team ist für Sie per Telefon, WhatsApp und E-Mail erreichbar.
                </p>
              </div>
            </div>
            <a
              href="tel:+4920147389573"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              Jetzt anrufen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
