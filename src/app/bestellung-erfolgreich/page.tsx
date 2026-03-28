'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Mail, Phone, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/config';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');

  return (
    <div className="min-h-screen bg-white">
      {/* ── Dark Hero Band ── */}
      <div className="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="container-main py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-3xl font-bold text-dark-900 mb-4">
            Bestellung erfolgreich!
          </h1>

          <p className="text-dark-500 text-lg mb-2">
            Vielen Dank für Ihre Bestellung. Wir bearbeiten Ihren Antrag
            schnellstmöglich.
          </p>

          {orderId && (
            <p className="text-sm text-dark-400 mb-8">
              Bestellnummer:{' '}
              <span className="font-mono font-semibold text-dark-600">
                {orderId}
              </span>
            </p>
          )}

          <div className="rounded-2xl bg-dark-50 border border-dark-100 p-6 text-left mb-8">
            <h2 className="font-bold text-dark-800 mb-3">
              Was passiert als Nächstes?
            </h2>
            <ol className="space-y-3 text-sm text-dark-600">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </span>
                <span>
                  Sie erhalten eine Bestätigungs-E-Mail mit allen Details.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </span>
                <span>
                  Wir prüfen Ihre Unterlagen und bearbeiten Ihren Antrag.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </span>
                <span>
                  Sie erhalten eine Benachrichtigung, sobald Ihr Antrag
                  abgeschlossen ist.
                </span>
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/" className="btn-primary py-3 px-8">
              Zur Startseite <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-dark-400">
            <a
              href={`mailto:${siteConfig.company.email}`}
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" /> E-Mail
            </a>
            <a
              href={`tel:${siteConfig.company.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" /> {siteConfig.company.phone}
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function BestellungErfolgreichPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <div className="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12" />
        <div className="container-main py-20 text-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
