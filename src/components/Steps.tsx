'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { homepageContent } from '@/lib/content';

export default function Steps() {
  const { steps } = homepageContent;
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });

  return (
    <section className="py-10 md:py-16 bg-cool relative overflow-hidden section-divider-top" id="so-funktioniert-es">
      {/* Design layer: dot pattern bg */}
      <div className="absolute inset-0 dot-pattern pointer-events-none" />
      {/* Decorative blurred shape */}
      <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[80px] pointer-events-none" />
      <div className="container-main relative" ref={containerRef}>
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
              <div className="relative bg-white rounded-3xl p-7 border border-dark-100/60 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 h-full">
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
