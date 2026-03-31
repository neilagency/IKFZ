'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Phone, Mail, ArrowRight, Headphones } from 'lucide-react';
import Link from 'next/link';
import { homepageContent } from '@/lib/content';

const iconMap: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
};

const colorMap: Record<string, { bg: string; icon: string; hover: string }> = {
  whatsapp: { bg: 'bg-[#25D366]/8', icon: 'text-[#25D366]', hover: 'hover:border-[#25D366]/30' },
  phone: { bg: 'bg-primary/8', icon: 'text-primary', hover: 'hover:border-primary/30' },
  email: { bg: 'bg-blue-500/8', icon: 'text-blue-500', hover: 'hover:border-blue-500/30' },
};

export default function Support() {
  const { support } = homepageContent;

  return (
    <section className="py-14 md:py-20 bg-gradient-to-br from-gray-50/80 via-white to-primary-50/20 relative overflow-hidden" id="support">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.02] rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />
      
      <div className="container-main relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="section-label mb-5 inline-flex">
              <Headphones className="w-3.5 h-3.5" />
              Persönlicher Support
            </span>

            <h2 className="text-section-mobile md:text-section text-dark-900 mb-5 text-balance">
              {support.title}
            </h2>
            <p className="text-lg text-dark-400 mb-6 leading-relaxed">
              {support.description}
            </p>
            <Link
              href="/kfz-service/kfz-online-service/"
              className="btn-primary cta-glow"
            >
              Zulassung jetzt starten
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

          <div className="space-y-3">
            {support.channels.map((channel, index) => {
              const Icon = iconMap[channel.type] || MessageCircle;
              const colors = colorMap[channel.type] || colorMap.phone;

              return (
                <motion.a
                  key={channel.type}
                  href={channel.href}
                  target={channel.type === 'whatsapp' ? '_blank' : undefined}
                  rel={channel.type === 'whatsapp' ? 'noopener noreferrer' : undefined}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={`group flex items-center gap-5 bg-white rounded-2xl p-5 border border-dark-100/60 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${colors.hover}`}
                >
                  <div className={`w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-dark-900 text-[0.95rem]">{channel.label}</div>
                    <div className="text-dark-400 text-sm">{channel.sublabel}</div>
                  </div>
                  <ArrowRight className="w-4.5 h-4.5 text-dark-300 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
