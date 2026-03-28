'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  Car,
  FileText,
  CreditCard,
  Upload,
  X,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Service options ──
const SERVICE_OPTIONS = [
  { key: 'wiederzulassung', label: 'Wiederzulassung', price: 99.70 },
  { key: 'neuwagen', label: 'Neuwagen Zulassung', price: 99.70 },
  { key: 'ummeldung', label: 'Ummeldung (Halterwechsel)', price: 119.70 },
  { key: 'neuzulassung', label: 'Neuzulassung (Gebrauchtwagen)', price: 124.70 },
];

const AUSWEIS_OPTIONS = [
  { key: 'personalausweis', label: 'Personalausweis (eID)' },
  { key: 'aufenthaltstitel', label: 'Aufenthaltstitel (eAT)' },
];

// ── Zod Schema ──
const anmeldungSchema = z.object({
  service: z.string().min(1, 'Bitte wählen Sie einen Service'),
  ausweis: z.string().min(1, 'Bitte wählen Sie den Ausweistyp'),
  evbNummer: z.string().min(1, 'eVB-Nummer ist erforderlich'),
  kennzeichenWahl: z.enum(['zufaellig', 'reserviert']),
  wunschkennzeichen: z.string().optional(),
  kennzeichenPin: z.string().optional(),
  kennzeichenBestellen: z.enum(['ja', 'nein']),
  kontoinhaber: z.string().min(1, 'Kontoinhaber ist erforderlich'),
  iban: z.string().min(15, 'Bitte geben Sie eine gültige IBAN ein'),
});

type AnmeldungFormData = z.infer<typeof anmeldungSchema>;

const STEPS = [
  { id: 1, label: 'Service & Ausweis', icon: Car },
  { id: 2, label: 'Kennzeichen', icon: FileText },
  { id: 3, label: 'Bankdaten & Upload', icon: CreditCard },
];

const STEP_FIELDS: Record<number, (keyof AnmeldungFormData)[]> = {
  1: ['service', 'ausweis', 'evbNummer'],
  2: ['kennzeichenWahl', 'kennzeichenBestellen'],
  3: ['kontoinhaber', 'iban'],
};

interface DocumentFile {
  file: File;
  preview: string;
}

interface RegistrationFormProps {
  productName: string;
  options: {
    services: { key: string; label: string; price: number }[];
    kennzeichen_reserviert: { label: string; price: number };
    kennzeichen_bestellen: { label: string; price: number };
  };
}

export default function RegistrationForm({
  productName = 'Auto Online Anmelden / Ummelden',
  options,
}: RegistrationFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document uploads
  const [documents, setDocuments] = useState<{
    fahrzeugschein: DocumentFile | null;
    fahrzeugbrief: DocumentFile | null;
    ausweis: DocumentFile | null;
  }>({
    fahrzeugschein: null,
    fahrzeugbrief: null,
    ausweis: null,
  });
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [exampleModal, setExampleModal] = useState<string | null>(null);

  const fileInputRefs = {
    fahrzeugschein: useRef<HTMLInputElement>(null),
    fahrzeugbrief: useRef<HTMLInputElement>(null),
    ausweis: useRef<HTMLInputElement>(null),
  };

  const services = options?.services ?? SERVICE_OPTIONS;
  const reserviertPrice = options?.kennzeichen_reserviert?.price ?? 24.70;
  const bestellenPrice = options?.kennzeichen_bestellen?.price ?? 29.70;

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<AnmeldungFormData>({
    resolver: zodResolver(anmeldungSchema),
    defaultValues: {
      service: '',
      ausweis: '',
      kennzeichenWahl: 'zufaellig',
      kennzeichenBestellen: 'nein',
    },
  });

  const watchService = watch('service');
  const watchKennzeichenWahl = watch('kennzeichenWahl');
  const watchKennzeichenBestellen = watch('kennzeichenBestellen');

  const selectedServicePrice = useMemo(() => {
    const found = services.find((s) => s.key === watchService);
    return found?.price ?? 0;
  }, [services, watchService]);

  const totalPrice = useMemo(() => {
    let price = selectedServicePrice;
    if (watchKennzeichenWahl === 'reserviert') price += reserviertPrice;
    if (watchKennzeichenBestellen === 'ja') price += bestellenPrice;
    return price;
  }, [selectedServicePrice, watchKennzeichenWahl, watchKennzeichenBestellen, reserviertPrice, bestellenPrice]);

  // ── File handling ──
  const handleFileChange = useCallback(
    (key: 'fahrzeugschein' | 'fahrzeugbrief' | 'ausweis', e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type and size (max 10MB)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setUploadErrors((prev) => ({
          ...prev,
          [key]: 'Nur JPG, PNG, WebP oder PDF erlaubt',
        }));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadErrors((prev) => ({
          ...prev,
          [key]: 'Datei darf maximal 10 MB sein',
        }));
        return;
      }

      setUploadErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });

      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : '';

      setDocuments((prev) => ({ ...prev, [key]: { file, preview } }));
    },
    []
  );

  const removeFile = useCallback(
    (key: 'fahrzeugschein' | 'fahrzeugbrief' | 'ausweis') => {
      if (documents[key]?.preview) {
        URL.revokeObjectURL(documents[key]!.preview);
      }
      setDocuments((prev) => ({ ...prev, [key]: null }));
    },
    [documents]
  );

  const nextStep = useCallback(async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, 3));
  }, [currentStep, trigger]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const onSubmit = useCallback(
    async (data: AnmeldungFormData) => {
      // Validate documents
      const missingDocs: string[] = [];
      if (!documents.fahrzeugschein) missingDocs.push('Fahrzeugschein');
      if (!documents.fahrzeugbrief) missingDocs.push('Fahrzeugbrief');
      if (!documents.ausweis) missingDocs.push('Ausweisdokument');

      if (missingDocs.length > 0) {
        const newErrors: Record<string, string> = {};
        missingDocs.forEach((doc) => {
          const key = doc === 'Fahrzeugschein' ? 'fahrzeugschein' : doc === 'Fahrzeugbrief' ? 'fahrzeugbrief' : 'ausweis';
          newErrors[key] = `${doc} ist erforderlich`;
        });
        setUploadErrors(newErrors);
        return;
      }

      setIsSubmitting(true);

      try {
        // Upload documents
        const formData = new FormData();
        formData.append('fahrzeugschein', documents.fahrzeugschein!.file);
        formData.append('fahrzeugbrief', documents.fahrzeugbrief!.file);
        formData.append('ausweis', documents.ausweis!.file);

        const uploadRes = await fetch('/api/upload/documents/', {
          method: 'POST',
          body: formData,
        });

        let uploadedFiles: Record<string, string> = {};
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedFiles = uploadData.files ?? {};
        }

        // Build addons
        const addons: { key: string; label: string; price: number }[] = [];
        if (data.kennzeichenWahl === 'reserviert') {
          addons.push({
            key: 'kennzeichen_reserviert',
            label: options?.kennzeichen_reserviert?.label ?? 'Reserviertes Wunschkennzeichen',
            price: reserviertPrice,
          });
        }
        if (data.kennzeichenBestellen === 'ja') {
          addons.push({
            key: 'kennzeichen_bestellen',
            label: options?.kennzeichen_bestellen?.label ?? 'Kennzeichen bestellen & liefern',
            price: bestellenPrice,
          });
        }

        const selectedService = services.find((s) => s.key === data.service);

        const orderData = {
          productName,
          productSlug: 'auto-online-anmelden',
          serviceType: 'anmeldung',
          formData: {
            ...data,
            uploadedFiles,
          },
          selectedService: selectedService?.label,
          basePrice: selectedServicePrice,
          addons,
          total: totalPrice,
        };
        sessionStorage.setItem('checkout_order', JSON.stringify(orderData));
        router.push('/rechnung/');
      } catch {
        setIsSubmitting(false);
      }
    },
    [documents, services, productName, selectedServicePrice, totalPrice, router, options, reserviertPrice, bestellenPrice]
  );

  // ── Document upload card component ──
  const DocumentUpload = ({
    label,
    docKey,
    exampleImage,
  }: {
    label: string;
    docKey: 'fahrzeugschein' | 'fahrzeugbrief' | 'ausweis';
    exampleImage?: string;
  }) => (
    <div className="rounded-xl border border-dark-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-dark-800">
          {label} <span className="text-red-500">*</span>
        </label>
        {exampleImage && (
          <button
            type="button"
            onClick={() => setExampleModal(exampleImage)}
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            <Eye className="w-3 h-3" /> Beispiel
          </button>
        )}
      </div>

      {documents[docKey] ? (
        <div className="flex items-center gap-3 p-3 bg-primary/[0.04] rounded-xl border border-primary/10">
          {documents[docKey]!.preview ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-dark-200">
              <Image
                src={documents[docKey]!.preview}
                alt={label}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-dark-800 font-medium truncate">
              {documents[docKey]!.file.name}
            </p>
            <p className="text-xs text-dark-400">
              {(documents[docKey]!.file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeFile(docKey)}
            className="p-1.5 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRefs[docKey].current?.click()}
          className="w-full p-6 border-2 border-dashed border-dark-200 rounded-xl hover:border-primary/40 hover:bg-primary/[0.02] transition-all flex flex-col items-center gap-2"
        >
          <Upload className="w-6 h-6 text-dark-400" />
          <span className="text-sm text-dark-500">
            Klicken um hochzuladen
          </span>
          <span className="text-xs text-dark-400">
            JPG, PNG, WebP oder PDF (max. 10 MB)
          </span>
        </button>
      )}
      <input
        ref={fileInputRefs[docKey]}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => handleFileChange(docKey, e)}
        className="hidden"
      />
      {uploadErrors[docKey] && (
        <p className="text-red-500 text-xs mt-1">{uploadErrors[docKey]}</p>
      )}
    </div>
  );

  return (
    <div className="bg-white">
      {/* Help Banner */}
      <div className="flex items-center gap-3 rounded-2xl p-4 mb-8 bg-primary/[0.04] border border-primary/10">
        <Phone className="w-5 h-5 text-primary flex-shrink-0" />
        <span className="text-sm text-dark-600">
          Benötigen Sie Hilfe? Rufen Sie uns an:{' '}
          <a
            href="tel:015224999190"
            className="font-bold text-primary hover:underline"
          >
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
              <div
                key={step.id}
                className="flex items-center flex-1 last:flex-initial"
              >
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
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] md:text-xs font-medium mt-2 transition-colors',
                      isActive
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-dark-600'
                        : 'text-dark-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 md:mx-3 h-0.5 rounded-full mt-[-18px] md:mt-[-20px]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isCompleted ? 'bg-primary' : 'bg-dark-100'
                      )}
                    />
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
            {/* ── STEP 1: Service & Ausweis ── */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-dark-900">
                    Service & Ausweistyp
                  </h2>
                  <p className="text-dark-500 text-sm mt-1">
                    Wählen Sie den gewünschten Service und Ihren Ausweistyp.
                  </p>
                </div>

                {/* Service selection */}
                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                  <label className="block text-sm font-semibold text-dark-800 mb-3">
                    Gewünschter Service{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {services.map((opt) => (
                      <label
                        key={opt.key}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                          watchService === opt.key
                            ? 'border-primary bg-primary/[0.04] shadow-sm'
                            : 'border-dark-100 hover:border-dark-200 hover:bg-dark-50/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            value={opt.key}
                            {...register('service')}
                            className="accent-primary w-4 h-4"
                          />
                          <span className="font-semibold text-dark-800 text-sm">
                            {opt.label}
                          </span>
                        </div>
                        <span className="text-primary font-bold text-sm whitespace-nowrap ml-3">
                          {opt.price.toFixed(2).replace('.', ',')} €
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.service && (
                    <p className="text-red-500 text-sm mt-2">
                      {errors.service.message}
                    </p>
                  )}
                </div>

                {/* Ausweis selection */}
                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                  <label className="block text-sm font-semibold text-dark-800 mb-3">
                    Ausweistyp{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {AUSWEIS_OPTIONS.map((opt) => (
                      <label
                        key={opt.key}
                        className={cn(
                          'flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                          watch('ausweis') === opt.key
                            ? 'border-primary bg-primary/[0.04] shadow-sm'
                            : 'border-dark-100 hover:border-dark-200 hover:bg-dark-50/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            value={opt.key}
                            {...register('ausweis')}
                            className="accent-primary w-4 h-4"
                          />
                          <span className="font-medium text-dark-700 text-sm">
                            {opt.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.ausweis && (
                    <p className="text-red-500 text-sm mt-2">
                      {errors.ausweis.message}
                    </p>
                  )}
                </div>

                {/* eVB-Nummer */}
                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                  <label className="block text-sm font-semibold text-dark-800 mb-2">
                    eVB-Nummer{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('evbNummer')}
                    placeholder="z.B. A123B456C"
                    className={cn(
                      'input-field uppercase',
                      errors.evbNummer &&
                        'border-red-400 focus:ring-red-400 focus:border-red-400'
                    )}
                  />
                  {errors.evbNummer && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.evbNummer.message}
                    </p>
                  )}
                  <p className="text-xs text-dark-400 mt-2">
                    Die elektronische Versicherungsbestätigung erhalten Sie von
                    Ihrer Kfz-Versicherung.{' '}
                    <a
                      href="/evb/"
                      className="text-primary hover:underline"
                    >
                      Noch keine eVB?
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 2: Kennzeichen ── */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-dark-900">
                    Kennzeichen
                  </h2>
                  <p className="text-dark-500 text-sm mt-1">
                    Wählen Sie aus, ob Sie ein zufälliges oder reserviertes
                    Kennzeichen möchten.
                  </p>
                </div>

                {/* Kennzeichen Wahl */}
                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                  <label className="block text-sm font-semibold text-dark-800 mb-3">
                    Kennzeichenwahl{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                        watchKennzeichenWahl === 'zufaellig'
                          ? 'border-primary bg-primary/[0.04]'
                          : 'border-dark-100 hover:border-dark-200'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          value="zufaellig"
                          {...register('kennzeichenWahl')}
                          className="accent-primary w-4 h-4"
                        />
                        <div>
                          <span className="font-medium text-dark-700">
                            Zufälliges Kennzeichen
                          </span>
                          <p className="text-xs text-dark-400 mt-0.5">
                            Die Zulassungsstelle teilt Ihnen ein Kennzeichen zu
                          </p>
                        </div>
                      </div>
                      <span className="text-dark-400 text-sm">Inklusive</span>
                    </label>
                    <label
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                        watchKennzeichenWahl === 'reserviert'
                          ? 'border-primary bg-primary/[0.04]'
                          : 'border-dark-100 hover:border-dark-200'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          value="reserviert"
                          {...register('kennzeichenWahl')}
                          className="accent-primary w-4 h-4"
                        />
                        <div>
                          <span className="font-medium text-dark-700">
                            Reserviertes Wunschkennzeichen
                          </span>
                          <p className="text-xs text-dark-400 mt-0.5">
                            Verwenden Sie ein bereits reserviertes Kennzeichen
                          </p>
                        </div>
                      </div>
                      <span className="text-primary font-bold text-sm">
                        + {reserviertPrice.toFixed(2).replace('.', ',')} €
                      </span>
                    </label>
                  </div>
                </div>

                {/* Conditional: Wunschkennzeichen fields */}
                {watchKennzeichenWahl === 'reserviert' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6 space-y-5"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-dark-800 mb-2">
                        Wunschkennzeichen
                      </label>
                      <input
                        type="text"
                        {...register('wunschkennzeichen')}
                        placeholder="z.B. E-AB 1234"
                        className="input-field uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-dark-800 mb-2">
                        Reservierungs-PIN
                      </label>
                      <input
                        type="text"
                        {...register('kennzeichenPin')}
                        placeholder="PIN von der Reservierung"
                        className="input-field"
                      />
                      <p className="text-xs text-dark-400 mt-2">
                        Den PIN erhalten Sie bei der Reservierung über die
                        Website Ihrer Zulassungsstelle.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Kennzeichen bestellen */}
                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                  <label className="block text-sm font-semibold text-dark-800 mb-3">
                    Kennzeichen bestellen & liefern lassen?
                  </label>
                  <div className="space-y-3">
                    <label
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                        watchKennzeichenBestellen === 'nein'
                          ? 'border-primary bg-primary/[0.04]'
                          : 'border-dark-100 hover:border-dark-200'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          value="nein"
                          {...register('kennzeichenBestellen')}
                          className="accent-primary w-4 h-4"
                        />
                        <div>
                          <span className="font-medium text-dark-700">
                            Nein, ich besorge selbst Kennzeichen
                          </span>
                        </div>
                      </div>
                      <span className="text-dark-400 text-sm">Inklusive</span>
                    </label>
                    <label
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                        watchKennzeichenBestellen === 'ja'
                          ? 'border-primary bg-primary/[0.04]'
                          : 'border-dark-100 hover:border-dark-200'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          value="ja"
                          {...register('kennzeichenBestellen')}
                          className="accent-primary w-4 h-4"
                        />
                        <div>
                          <span className="font-medium text-dark-700">
                            Ja, Kennzeichen bestellen & liefern
                          </span>
                          <p className="text-xs text-dark-400 mt-0.5">
                            Wir bestellen geprägte Kennzeichen bei einem
                            zertifizierten Hersteller
                          </p>
                        </div>
                      </div>
                      <span className="text-primary font-bold text-sm">
                        + {bestellenPrice.toFixed(2).replace('.', ',')} €
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Bankdaten & Upload ── */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-dark-900">
                    Bankdaten & Dokumente
                  </h2>
                  <p className="text-dark-500 text-sm mt-1">
                    SEPA-Lastschrift für die KFZ-Steuer und erforderliche
                    Dokumente hochladen.
                  </p>
                </div>

                {/* Bankdaten */}
                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6 space-y-5">
                  <h3 className="text-sm font-bold text-dark-800 uppercase tracking-wider">
                    SEPA-Lastschriftmandat
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Kontoinhaber{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('kontoinhaber')}
                      placeholder="Vor- und Nachname"
                      className={cn(
                        'input-field',
                        errors.kontoinhaber &&
                          'border-red-400 focus:ring-red-400 focus:border-red-400'
                      )}
                    />
                    {errors.kontoinhaber && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.kontoinhaber.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      IBAN{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('iban')}
                      placeholder="DE00 0000 0000 0000 0000 00"
                      className={cn(
                        'input-field',
                        errors.iban &&
                          'border-red-400 focus:ring-red-400 focus:border-red-400'
                      )}
                    />
                    {errors.iban && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.iban.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Document Uploads */}
                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-dark-800 uppercase tracking-wider">
                    Erforderliche Dokumente
                  </h3>
                  <p className="text-xs text-dark-500">
                    Bitte laden Sie gut lesbare Fotos oder Scans der folgenden
                    Dokumente hoch.
                  </p>

                  <DocumentUpload
                    label="Fahrzeugschein (ZB Teil I)"
                    docKey="fahrzeugschein"
                    exampleImage="/uploads/2025/02/fahrzeugschein-800x800.webp"
                  />
                  <DocumentUpload
                    label="Fahrzeugbrief (ZB Teil II)"
                    docKey="fahrzeugbrief"
                    exampleImage="/uploads/2025/02/Fahrzeugbrief-800x800.webp"
                  />
                  <DocumentUpload
                    label="Ausweisdokument (Vorder- & Rückseite)"
                    docKey="ausweis"
                  />
                </div>

                {/* Price summary */}
                <div className="rounded-2xl bg-primary/[0.04] border-2 border-primary/20 p-6">
                  <h3 className="font-bold text-dark-800 mb-4">
                    Kostenübersicht
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-600">
                        {services.find((s) => s.key === watchService)?.label ?? 'Service'}
                      </span>
                      <span className="text-dark-800 font-medium">
                        {selectedServicePrice.toFixed(2).replace('.', ',')} €
                      </span>
                    </div>
                    {watchKennzeichenWahl === 'reserviert' && (
                      <div className="flex justify-between">
                        <span className="text-dark-600">
                          Reserviertes Wunschkennzeichen
                        </span>
                        <span className="text-dark-800 font-medium">
                          {reserviertPrice.toFixed(2).replace('.', ',')} €
                        </span>
                      </div>
                    )}
                    {watchKennzeichenBestellen === 'ja' && (
                      <div className="flex justify-between">
                        <span className="text-dark-600">
                          Kennzeichen bestellen & liefern
                        </span>
                        <span className="text-dark-800 font-medium">
                          {bestellenPrice.toFixed(2).replace('.', ',')} €
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/20">
                    <span className="text-lg font-bold text-dark-900">
                      Gesamtpreis
                    </span>
                    <span className="text-2xl font-black text-primary">
                      {totalPrice.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation Buttons ── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-100">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="btn-secondary py-3 px-6"
            >
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-dark-400">Aktueller Preis:</span>
              <span className="font-bold text-primary text-lg">
                {totalPrice.toFixed(2).replace('.', ',')} €
              </span>
            </div>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary py-3 px-8"
            >
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'btn-primary py-3 px-8',
                isSubmitting && 'opacity-60 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Wird verarbeitet...
                </>
              ) : (
                <>
                  Weiter zur Kasse <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* ── Example Image Modal ── */}
      <AnimatePresence>
        {exampleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setExampleModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setExampleModal(null)}
                className="absolute top-3 right-3 z-10 p-2 bg-white/90 rounded-full shadow-md hover:bg-white"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative w-full aspect-square">
                <Image
                  src={exampleModal}
                  alt="Beispielbild"
                  fill
                  className="object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
