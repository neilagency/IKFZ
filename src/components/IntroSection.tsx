'use client';

import { motion } from 'framer-motion';
import { homepageContent } from '@/lib/content';

export default function IntroSection() {
  const { intro } = homepageContent;

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-section-mobile md:text-section text-dark-900 mb-5 text-balance">
            {intro.title}
          </h2>
          <p className="text-lg text-dark-400 mb-8 leading-relaxed">
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
