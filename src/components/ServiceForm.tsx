'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Phone,
  Info,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  Car,
  Shield,
  CreditCard,
  FileText,
  Banknote,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Zod schema (all original fields preserved) ──
const serviceFormSchema = z.object({
  serviceType: z.enum(['anmelden', 'abmelden', 'ummelden'], {
    required_error: 'Bitte wählen Sie einen Service aus',
  }),
  tuevValid: z.enum(['ja', 'nein'], {
    required_error: 'Bitte wählen Sie eine Option',
  }),
  hasEvb: z.boolean().default(false),
  evbNumber: z.string().optional(),
  kennzeichenType: z.enum(['auto', 'reserved'], {
    required_error: 'Bitte wählen Sie eine Option',
  }),
  kennzeichenDelivery: z.enum(['order', 'own'], {
    required_error: 'Bitte wählen Sie eine Option',
  }),
  kennzeichenNummer: z.string().optional(),
  fahrgestellnummer: z.string().min(1, 'Fahrgestellnummer ist erforderlich'),
  fahrzeugscheinCode: z.string().min(1, 'Fahrzeugschein CODE ist erforderlich'),
  fahrzeugbriefCode: z.string().optional(),
  kontoinhaber: z.string().min(1, 'Kontoinhaber ist erforderlich'),
  iban: z.string().min(15, 'Bitte geben Sie eine gültige IBAN ein'),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

const STEPS = [
  { id: 1, label: 'Service', icon: Car },
  { id: 2, label: 'Versicherung', icon: Shield },
  { id: 3, label: 'Kennzeichen', icon: FileText },
  { id: 4, label: 'Fahrzeug', icon: CreditCard },
  { id: 5, label: 'Bankdaten', icon: Banknote },
  { id: 6, label: 'Übersicht', icon: ClipboardCheck },
];

const STEP_FIELDS: Record<number, (keyof ServiceFormData)[]> = {
  1: ['serviceType', 'tuevValid'],
  2: [],
  3: ['kennzeichenType', 'kennzeichenDelivery'],
  4: ['fahrgestellnummer', 'fahrzeugscheinCode'],
  5: ['kontoinhaber', 'iban'],
  6: [],
};

const SERVICE_LABELS: Record<string, string> = {
  anmelden: 'Fahrzeug Anmelden',
  abmelden: 'Fahrzeug Abmelden',
  ummelden: 'Fahrzeug Ummelden',
};

export default function ServiceForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceType: 'anmelden',
      tuevValid: 'ja',
      hasEvb: false,
      kennzeichenType: 'auto',
      kennzeichenDelivery: 'order',
    },
  });

  const watchServiceType = watch('serviceType');
  const watchTuevValid = watch('tuevValid');
  const watchKennzeichenType = watch('kennzeichenType');
  const watchKennzeichenDelivery = watch('kennzeichenDelivery');

  const totalPrice = useMemo(() => {
    let price = 119.70;
    if (watchServiceType === 'abmelden') price = 19.70;
    if (watchServiceType === 'ummelden') price = 124.70;
    if (watchKennzeichenType === 'reserved') price += 24.95;
    if (watchKennzeichenDelivery === 'order') price += 29.95;
    return price;
  }, [watchServiceType, watchKennzeichenType, watchKennzeichenDelivery]);

  const nextStep = async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, 6));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const onSubmit = (data: ServiceFormData) => {
    console.log('Form submitted:', data);
    setSubmitted(true);
  };

  /* ── Success Screen ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        </div>
        <div className="container-main py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-dark-900 mb-4">Antrag erfolgreich eingereicht!</h2>
            <p className="text-dark-500 text-lg">Wir prüfen Ihre Unterlagen und melden uns schnellstmöglich bei Ihnen.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Dark Hero Band (visual only, no text) ── */}
      <div className="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* ── Light Mode Form Area ── */}
      <div className="container-main py-10 md:py-16">
        <div className="max-w-3xl mx-auto">
          {/* Help Banner */}
          <div className="flex items-center gap-3 rounded-2xl p-4 mb-8 bg-primary/[0.04] border border-primary/10">
            <Phone className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm text-dark-600">
              Benötigen Sie Hilfe? Rufen Sie uns an:{' '}
              <a href="tel:015224999190" className="font-bold text-primary hover:underline">
                ℡ 01522 4999190
              </a>
            </span>
          </div>

          {/* ── Stepper ── */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;
                return (
                  <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 text-sm font-bold',
                          isCompleted
                            ? 'bg-primary text-white shadow-[0_4px_12px_rgba(0,168,90,0.3)]'
                            : isActive
                            ? 'bg-primary text-white shadow-[0_4px_16px_rgba(0,168,90,0.35)] ring-4 ring-primary/20'
                            : 'bg-dark-50 text-dark-400 border border-dark-200'
                        )}
                      >
                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span
                        className={cn(
                          'text-[10px] md:text-xs font-medium mt-2 transition-colors',
                          isActive ? 'text-primary' : isCompleted ? 'text-dark-600' : 'text-dark-400'
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 mx-2 md:mx-3 h-0.5 rounded-full mt-[-18px] md:mt-[-20px]">
                        <div className={cn('h-full rounded-full transition-all duration-500', isCompleted ? 'bg-primary' : 'bg-dark-100')} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Step Content ── */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* ── STEP 1: Service auswählen ── */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="mb-2">
                      <h2 className="text-2xl font-bold text-dark-900">Service auswählen</h2>
                      <p className="text-dark-500 text-sm mt-1">Wählen Sie den gewünschten KFZ-Service und TÜV-Status.</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                      <label className="block text-sm font-semibold text-dark-800 mb-3">
                        Was möchten Sie tun? <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-3">
                        {[
                          { value: 'anmelden', label: 'Fahrzeug Anmelden', desc: 'Neues oder gebrauchtes Fahrzeug anmelden', price: 'ab 119,70 €' },
                          { value: 'abmelden', label: 'Fahrzeug Abmelden', desc: 'Fahrzeug stilllegen oder abmelden', price: '19,70 €' },
                          { value: 'ummelden', label: 'Fahrzeug Ummelden', desc: 'Halterwechsel oder Adressänderung', price: 'ab 124,70 €' },
                        ].map((opt) => (
                          <label
                            key={opt.value}
                            className={cn(
                              'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                              watchServiceType === opt.value
                                ? 'border-primary bg-primary/[0.04] shadow-sm'
                                : 'border-dark-100 hover:border-dark-200 hover:bg-dark-50/50'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <input type="radio" value={opt.value} {...register('serviceType')} className="accent-primary w-4 h-4" />
                              <div>
                                <span className="font-semibold text-dark-800 text-sm">{opt.label}</span>
                                <p className="text-xs text-dark-400 mt-0.5">{opt.desc}</p>
                              </div>
                            </div>
                            <span className="text-primary font-bold text-sm whitespace-nowrap ml-3">{opt.price}</span>
                          </label>
                        ))}
                      </div>
                      {errors.serviceType && <p className="text-red-500 text-sm mt-2">{errors.serviceType.message}</p>}
                    </div>

                    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                      <label className="block text-sm font-semibold text-dark-800 mb-3">
                        TÜV noch gültig? <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-4">
                        {[
                          { value: 'ja', label: 'Ja' },
                          { value: 'nein', label: 'Nein' },
                        ].map((opt) => (
                          <label
                            key={opt.value}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 text-center',
                              watchTuevValid === opt.value ? 'border-primary bg-primary/[0.04]' : 'border-dark-100 hover:border-dark-200'
                            )}
                          >
                            <input type="radio" value={opt.value} {...register('tuevValid')} className="accent-primary w-4 h-4" />
                            <span className="font-medium text-dark-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Versicherung / eVB ── */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="mb-2">
                      <h2 className="text-2xl font-bold text-dark-900">Versicherung</h2>
                      <p className="text-dark-500 text-sm mt-1">Geben Sie Ihre eVB-Nummer ein, falls vorhanden.</p>
                    </div>

                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Wichtiger Hinweis zur eVB</p>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                          Für die Anmeldung benötigen Sie eine gültige eVB-Nummer (elektronische Versicherungsbestätigung).
                          Diese erhalten Sie von Ihrer Kfz-Versicherung.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                      <label className="block text-sm font-semibold text-dark-800 mb-2">eVB-Nummer (optional)</label>
                      <input type="text" {...register('evbNumber')} placeholder="eVB-Nummer eingeben" className="input-field" />
                      <p className="text-xs text-dark-400 mt-2">Falls Sie noch keine eVB haben, können Sie diese auch nachreichen.</p>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Kennzeichen ── */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="mb-2">
                      <h2 className="text-2xl font-bold text-dark-900">Kennzeichen</h2>
                      <p className="text-dark-500 text-sm mt-1">Wählen Sie die Art und Zustellung der Kennzeichen.</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                      <label className="block text-sm font-semibold text-dark-800 mb-3">
                        Welches Kennzeichen möchten Sie? <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-3">
                        <label className={cn(
                          'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                          watchKennzeichenType === 'auto' ? 'border-primary bg-primary/[0.04]' : 'border-dark-100 hover:border-dark-200'
                        )}>
                          <div className="flex items-center gap-3">
                            <input type="radio" value="auto" {...register('kennzeichenType')} className="accent-primary w-4 h-4" />
                            <span className="font-medium text-dark-700">Automatische Zuteilung</span>
                          </div>
                          <span className="text-dark-400 text-sm">Inklusive</span>
                        </label>
                        <label className={cn(
                          'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                          watchKennzeichenType === 'reserved' ? 'border-primary bg-primary/[0.04]' : 'border-dark-100 hover:border-dark-200'
                        )}>
                          <div className="flex items-center gap-3">
                            <input type="radio" value="reserved" {...register('kennzeichenType')} className="accent-primary w-4 h-4" />
                            <span className="font-medium text-dark-700">Reserviertes Kennzeichen</span>
                          </div>
                          <span className="text-primary font-bold text-sm">+ 24,95 €</span>
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                      <label className="block text-sm font-semibold text-dark-800 mb-3">
                        Wie möchten Sie die Kennzeichen erhalten? <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-3">
                        <label className={cn(
                          'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                          watchKennzeichenDelivery === 'order' ? 'border-primary bg-primary/[0.04]' : 'border-dark-100 hover:border-dark-200'
                        )}>
                          <div className="flex items-center gap-3">
                            <input type="radio" value="order" {...register('kennzeichenDelivery')} className="accent-primary w-4 h-4" />
                            <span className="font-medium text-dark-700">Von uns bestellen</span>
                          </div>
                          <span className="text-primary font-bold text-sm">+ 29,95 €</span>
                        </label>
                        <label className={cn(
                          'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                          watchKennzeichenDelivery === 'own' ? 'border-primary bg-primary/[0.04]' : 'border-dark-100 hover:border-dark-200'
                        )}>
                          <div className="flex items-center gap-3">
                            <input type="radio" value="own" {...register('kennzeichenDelivery')} className="accent-primary w-4 h-4" />
                            <span className="font-medium text-dark-700">Eigene Kennzeichen besorgen</span>
                          </div>
                          <span className="text-dark-400 text-sm">Inklusive</span>
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                      <label className="block text-sm font-semibold text-dark-800 mb-2">Kennzeichen Nummer (optional)</label>
                      <input type="text" {...register('kennzeichenNummer')} placeholder="z.B. E-AB 1234" className="input-field" />
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Fahrzeugdaten ── */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="mb-2">
                      <h2 className="text-2xl font-bold text-dark-900">Fahrzeugdaten</h2>
                      <p className="text-dark-500 text-sm mt-1">Geben Sie die Daten aus Ihrem Fahrzeugschein ein.</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6 space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-2">
                          Fahrgestellnummer (FIN) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('fahrgestellnummer')}
                          placeholder="17-stellige Fahrgestellnummer"
                          className={cn('input-field', errors.fahrgestellnummer && 'border-red-400 focus:ring-red-400 focus:border-red-400')}
                        />
                        {errors.fahrgestellnummer && <p className="text-red-500 text-sm mt-1">{errors.fahrgestellnummer.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-2">
                          Fahrzeugschein CODE (Rückseite) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('fahrzeugscheinCode')}
                          placeholder="Sicherheitscode eingeben"
                          className={cn('input-field', errors.fahrzeugscheinCode && 'border-red-400 focus:ring-red-400 focus:border-red-400')}
                        />
                        {errors.fahrzeugscheinCode && <p className="text-red-500 text-sm mt-1">{errors.fahrzeugscheinCode.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-2">Fahrzeugbrief CODE (ZB Teil 2)</label>
                        <input type="text" {...register('fahrzeugbriefCode')} placeholder="Code eingeben (optional)" className="input-field" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 5: Bankdaten ── */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="mb-2">
                      <h2 className="text-2xl font-bold text-dark-900">Bankdaten</h2>
                      <p className="text-dark-500 text-sm mt-1">Für die KFZ-Steuer wird ein SEPA-Lastschriftmandat benötigt.</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6 space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-2">
                          Kontoinhaber <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('kontoinhaber')}
                          placeholder="Vor- und Nachname"
                          className={cn('input-field', errors.kontoinhaber && 'border-red-400 focus:ring-red-400 focus:border-red-400')}
                        />
                        {errors.kontoinhaber && <p className="text-red-500 text-sm mt-1">{errors.kontoinhaber.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-2">
                          IBAN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('iban')}
                          placeholder="DE00 0000 0000 0000 0000 00"
                          className={cn('input-field', errors.iban && 'border-red-400 focus:ring-red-400 focus:border-red-400')}
                        />
                        {errors.iban && <p className="text-red-500 text-sm mt-1">{errors.iban.message}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 6: Übersicht & Checkout ── */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <div className="mb-2">
                      <h2 className="text-2xl font-bold text-dark-900">Übersicht & Checkout</h2>
                      <p className="text-dark-500 text-sm mt-1">Überprüfen Sie Ihre Angaben vor dem Absenden.</p>
                    </div>

                    {/* Summary card */}
                    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm divide-y divide-dark-100">
                      <div className="p-5 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-dark-400">Service</p>
                          <p className="text-dark-800 font-medium mt-0.5">{SERVICE_LABELS[getValues('serviceType')]}</p>
                        </div>
                        <button type="button" onClick={() => setCurrentStep(1)} className="text-primary text-xs font-semibold hover:underline">Ändern</button>
                      </div>
                      <div className="p-5 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-dark-400">TÜV gültig</p>
                          <p className="text-dark-800 font-medium mt-0.5">{getValues('tuevValid') === 'ja' ? 'Ja' : 'Nein'}</p>
                        </div>
                        <button type="button" onClick={() => setCurrentStep(1)} className="text-primary text-xs font-semibold hover:underline">Ändern</button>
                      </div>
                      {getValues('evbNumber') && (
                        <div className="p-5 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-dark-400">eVB-Nummer</p>
                            <p className="text-dark-800 font-medium mt-0.5">{getValues('evbNumber')}</p>
                          </div>
                          <button type="button" onClick={() => setCurrentStep(2)} className="text-primary text-xs font-semibold hover:underline">Ändern</button>
                        </div>
                      )}
                      <div className="p-5 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-dark-400">Kennzeichen</p>
                          <p className="text-dark-800 font-medium mt-0.5">{watchKennzeichenType === 'auto' ? 'Automatische Zuteilung' : 'Reserviertes Kennzeichen'}</p>
                          <p className="text-dark-500 text-xs mt-0.5">{watchKennzeichenDelivery === 'order' ? 'Von uns bestellen' : 'Eigene Kennzeichen'}</p>
                        </div>
                        <button type="button" onClick={() => setCurrentStep(3)} className="text-primary text-xs font-semibold hover:underline">Ändern</button>
                      </div>
                      <div className="p-5 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-dark-400">Fahrzeugdaten</p>
                          <p className="text-dark-800 font-medium mt-0.5 text-sm">FIN: {getValues('fahrgestellnummer')}</p>
                          <p className="text-dark-500 text-xs mt-0.5">Code: {getValues('fahrzeugscheinCode')}</p>
                        </div>
                        <button type="button" onClick={() => setCurrentStep(4)} className="text-primary text-xs font-semibold hover:underline">Ändern</button>
                      </div>
                      <div className="p-5 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-dark-400">Bankdaten</p>
                          <p className="text-dark-800 font-medium mt-0.5">{getValues('kontoinhaber')}</p>
                          <p className="text-dark-500 text-xs mt-0.5">IBAN: {getValues('iban')}</p>
                        </div>
                        <button type="button" onClick={() => setCurrentStep(5)} className="text-primary text-xs font-semibold hover:underline">Ändern</button>
                      </div>
                    </div>

                    {/* Price summary */}
                    <div className="rounded-2xl bg-primary/[0.04] border-2 border-primary/20 p-6">
                      <h3 className="font-bold text-dark-800 mb-4">Kostenübersicht</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-dark-600">{SERVICE_LABELS[watchServiceType]}</span>
                          <span className="text-dark-800 font-medium">
                            {(watchServiceType === 'abmelden' ? 19.70 : watchServiceType === 'ummelden' ? 124.70 : 119.70).toFixed(2).replace('.', ',')} €
                          </span>
                        </div>
                        {watchKennzeichenType === 'reserved' && (
                          <div className="flex justify-between">
                            <span className="text-dark-600">Reserviertes Kennzeichen</span>
                            <span className="text-dark-800 font-medium">24,95 €</span>
                          </div>
                        )}
                        {watchKennzeichenDelivery === 'order' && (
                          <div className="flex justify-between">
                            <span className="text-dark-600">Kennzeichen Bestellung</span>
                            <span className="text-dark-800 font-medium">29,95 €</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/20">
                        <span className="text-lg font-bold text-dark-900">Gesamtpreis</span>
                        <span className="text-2xl font-black text-primary">{totalPrice.toFixed(2).replace('.', ',')} €</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ── Navigation Buttons ── */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-100">
              {currentStep > 1 ? (
                <button type="button" onClick={prevStep} className="btn-secondary py-3 px-6">
                  <ArrowLeft className="w-4 h-4" /> Zurück
                </button>
              ) : (
                <div />
              )}

              {currentStep < 6 && (
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <span className="text-dark-400">Aktueller Preis:</span>
                  <span className="font-bold text-primary text-lg">{totalPrice.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}

              {currentStep < 6 ? (
                <button type="button" onClick={nextStep} className="btn-primary py-3 px-8">
                  Weiter <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" className="btn-primary py-3 px-8">
                  <ShoppingCart className="w-5 h-5" /> Jetzt kostenpflichtig bestellen
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
