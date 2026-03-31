'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { homepageContent } from '@/lib/content';

export default function Steps() {
  const { steps } = homepageContent;
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });

  return (
    <section className="py-14 md:py-20 bg-gradient-to-br from-gray-50/80 via-white to-primary-50/20 relative overflow-hidden" id="so-funktioniert-es">
      {/* Decorative noise texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      <div className="container-main" ref={containerRef}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-14"
        >
          <span className="section-label mb-5 inline-flex">So funktioniert es</span>
          <h2 className="text-section-mobile md:text-section text-dark-900 mb-4 text-balance">
            {steps.title}
          </h2>
          <p className="text-lg text-dark-400 max-w-2xl mx-auto">
            {steps.subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.items.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="group relative"
            >
              <div className="relative bg-white rounded-3xl p-7 border border-dark-100/60 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 h-full">
                {/* Step number badge */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative">
                    <div className="w-12 h-12 bg-primary/8 rounded-2xl flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <span className="text-xl font-black text-primary">{step.number}</span>
                    </div>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                </div>

                <h3 className="text-lg font-bold text-dark-900 mb-2.5">
                  {step.title}
                </h3>
                <p className="text-dark-400 leading-relaxed text-[0.95rem]">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
