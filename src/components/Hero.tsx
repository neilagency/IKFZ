'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Zap, Clock, Euro, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { homepageContent } from '@/lib/content';

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Zap,
  Clock,
  Euro,
  Shield,
};

export default function Hero() {
  const { hero } = homepageContent;

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      
      {/* Gradient accent orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div className="relative container-main w-full">
        <div className="flex flex-col lg:flex-row items-center gap-16 py-28 md:py-32">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 text-center lg:text-left max-w-2xl"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-sm font-medium text-primary border border-primary/20 mb-8"
            >
              <Shield className="w-4 h-4" />
              <span>{hero.kbaText}</span>
            </motion.div>

            <h1 className="text-hero-mobile md:text-hero text-white mb-5 text-balance">
              {hero.title.split(' ').map((word, i) => (
                <span key={i}>
                  {word === 'online' ? (
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">{word}</span>
                  ) : (
                    word
                  )}{' '}
                </span>
              ))}
            </h1>

            <p className="text-xl md:text-2xl text-white/70 font-medium mb-3 tracking-[-0.01em]">
              {hero.subtitle}
            </p>

            <p className="text-base text-white/40 font-medium mb-10">
              {hero.badge}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href={hero.cta.href}
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-button hover:shadow-button-hover transition-all duration-300 hover:-translate-y-0.5 text-[1.05rem]"
              >
                {hero.cta.text}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/kfz-services/"
                className="btn-outline-white"
              >
                Alle Services ansehen
              </Link>
            </div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-10 justify-center lg:justify-start"
            >
              {['Persönlicher-Support', '100% Geld-zurück', '24/7 Support'].map((text) => (
                <span key={text} className="flex items-center gap-2 text-sm text-white/50">
                  <CheckCircle2 className="w-4 h-4 text-primary-400" />
                  {text}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right side - Floating feature cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0 hidden lg:block"
          >
            <div className="relative w-[340px] h-[340px]">
              {/* Central KBA badge */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-[180px] h-[180px] bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 flex items-center justify-center animate-glow">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🦅</div>
                    <div className="text-2xl font-black text-white tracking-wider">KBA</div>
                    <div className="text-[9px] text-white/50 mt-1 leading-tight px-4">
                      Registriert gemäß §14 FZV
                    </div>
                  </div>
                </div>
              </div>

              {/* Orbiting cards */}
              {[
                { label: 'Ab 119,70 €', pos: 'top-0 left-0', delay: 0.4 },
                { label: '24/7 Verfügbar', pos: 'top-0 right-0', delay: 0.5 },
                { label: 'Sofort fahren', pos: 'bottom-0 left-0', delay: 0.6 },
                { label: 'PDF Bestätigung', pos: 'bottom-0 right-0', delay: 0.7 },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: item.delay, duration: 0.5 }}
                  className={`absolute ${item.pos} px-4 py-2.5 bg-white/8 backdrop-blur-lg rounded-xl border border-white/10 text-white text-sm font-medium`}
                >
                  {item.label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Feature Cards Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-16 relative z-10"
        >
          {hero.features.map((feature, index) => {
            const Icon = iconMap[feature.icon] || FileText;
            return (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                className="group bg-white/[0.05] backdrop-blur-xl rounded-2xl p-5 text-center border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary-400" />
                </div>
                <div className="text-lg font-bold text-white">{feature.label}</div>
                <div className="text-sm text-white/40 mt-1">{feature.desc}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
