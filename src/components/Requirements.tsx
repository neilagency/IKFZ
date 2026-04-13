'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ClipboardList, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { homepageContent } from '@/lib/content';

export default function Requirements() {
  const { requirements } = homepageContent;

  return (
    <section className="py-10 md:py-16 bg-warm relative overflow-hidden section-divider-top">
      {/* Decorative bg */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-primary/[0.02] to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gold/[0.02] rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="container-main relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="section-label mb-5 inline-flex">
              <ClipboardList className="w-3.5 h-3.5" />
              Unterlagen Checkliste
            </span>

            <h2 className="text-section-mobile md:text-section text-dark-900 mb-5 text-balance">
              {requirements.title}
            </h2>
            <p className="text-lg text-dark-400 mb-6 leading-relaxed">
              {requirements.subtitle}
            </p>

            <Link href="/kfz-service/kfz-online-service/" className="btn-primary cta-glow">
              Jetzt Auto online anmelden
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="space-y-3">
              {requirements.items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-4 bg-dark-50/70 rounded-2xl p-5 border border-dark-100/40 hover:border-primary/20 hover:bg-primary/[0.03] transition-all duration-300"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <span className="text-dark-600 font-medium text-[0.95rem] leading-relaxed">{item}</span>
                </motion.div>
              ))}
            </div>

            <p className="text-dark-400 italic text-sm mt-6 ml-1">
              {requirements.note}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
