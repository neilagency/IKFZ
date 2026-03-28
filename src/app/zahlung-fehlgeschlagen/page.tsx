'use client';

import Link from 'next/link';
import { XCircle, Phone, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { siteConfig } from '@/lib/config';

export default function ZahlungFehlgeschlagenPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Dark Hero Band ── */}
      <div className="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      </div>

      <div className="container-main py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>

          <h1 className="text-3xl font-bold text-dark-900 mb-4">
            Zahlung fehlgeschlagen
          </h1>

          <p className="text-dark-500 text-lg mb-8">
            Die Zahlung konnte leider nicht abgeschlossen werden. Bitte
            versuchen Sie es erneut oder wählen Sie eine andere
            Zahlungsmethode.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/rechnung/" className="btn-primary py-3 px-8">
              <RefreshCw className="w-4 h-4" /> Erneut versuchen
            </Link>
            <Link href="/" className="btn-secondary py-3 px-8">
              <ArrowLeft className="w-4 h-4" /> Zur Startseite
            </Link>
          </div>

          <p className="text-sm text-dark-400">
            Brauchen Sie Hilfe? Rufen Sie uns an:{' '}
            <a
              href={`tel:${siteConfig.company.phone.replace(/\s/g, '')}`}
              className="text-primary font-semibold hover:underline"
            >
              <Phone className="w-3 h-3 inline" /> {siteConfig.company.phone}
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
