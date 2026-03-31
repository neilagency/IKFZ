'use client';

import { motion } from 'framer-motion';
import { homepageContent } from '@/lib/content';

export default function IntroSection() {
  const { intro } = homepageContent;

  return (
    <section className="py-14 md:py-20 bg-gradient-to-b from-white via-white to-gray-50/80 relative">
      {/* Subtle top separator from hero */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-section-mobile md:text-section text-dark-900 mb-4 text-balance">
            {intro.title}
          </h2>
          <p className="text-lg text-dark-400 mb-6 leading-relaxed">
            {intro.description}
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {intro.badges.map((badge) => (
              <span key={badge} className="badge">
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
