'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';
import { ArrowRight, MapPin, Phone, Shield, FileCheck, Clock, type LucideIcon } from 'lucide-react';
import { siteConfig } from '@/lib/config';

/* ═══════════════════════════════════════════════════════════
   CityHero – Dark hero with badge, H1, subtitle, CTAs
   ═══════════════════════════════════════════════════════════ */
export function CityHero({
  badge,
  h1Parts,
  subtitle,
  ctaPrimary = { label: 'Jetzt online starten', href: '/kfz-service/kfz-online-service/' },
  ctaSecondary,
}: {
  badge: string;
  h1Parts: [string, string];
  subtitle: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string } | null;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
      {/* Ambient glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="pt-32 pb-20 md:pt-44 md:pb-28 relative">
        <div className="container-main relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-sm font-medium text-primary border border-primary/20 mb-8">
                <MapPin className="w-4 h-4" />
                <span>{badge}</span>
              </div>

              {/* H1 — text stays exactly the same */}
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-white mb-6 leading-[1.08] tracking-tight">
                {h1Parts[0]}<br />
                <span className="text-primary">{h1Parts[1]}</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-white/55 max-w-2xl mb-10 leading-relaxed">
                {subtitle}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <Link href={ctaPrimary.href} className="btn-primary text-lg">
                  {ctaPrimary.label} <ArrowRight className="w-5 h-5" />
                </Link>
                {ctaSecondary !== null && (
                  <a
                    href={ctaSecondary?.href ?? siteConfig.links.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline-white"
                  >
                    <Phone className="w-5 h-5" /> {ctaSecondary?.label ?? 'WhatsApp Support'}
                  </a>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CityStatsBar – 4 trust signal cards
   ═══════════════════════════════════════════════════════════ */
export function CityStatsBar({
  items,
}: {
  items: { icon: LucideIcon; label: string; desc: string }[];
}) {
  return (
    <section className="py-8 md:py-10 bg-gray-50/80 border-b border-dark-100/50">
      <div className="container-main">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {items.map((item, i) => (
            <ScrollReveal key={item.label} delay={i * 0.06}>
              <div className="flex items-start gap-3 p-4 md:p-5 rounded-2xl bg-white border border-dark-100/60 shadow-sm hover:shadow-card transition-shadow duration-300 h-full">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-dark-900 text-sm leading-tight">{item.label}</div>
                  <div className="text-xs text-dark-400 mt-0.5">{item.desc}</div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CitySteps – 3-step process as visual stepper
   ═══════════════════════════════════════════════════════════ */
export function CitySteps({
  badge = 'So funktioniert es',
  title,
  subtitle,
  steps,
}: {
  badge?: string;
  title: string;
  subtitle: string;
  steps: { num: string; title: string; desc: string }[];
}) {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50/60 to-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,168,90,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,168,90,0.015)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
      <div className="container-main relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">{badge}</span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-dark-900 mb-4">{title}</h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">{subtitle}</p>
          </div>
        </ScrollReveal>

        {/* Desktop: horizontal stepper with connector */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-[3.25rem] left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-[2px] bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 z-0" />

            {steps.map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 0.12}>
                <div className="relative flex flex-col items-center text-center md:px-6 h-full">
                  {/* Number circle */}
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-primary/20 shadow-sm flex items-center justify-center mb-5 relative z-10">
                    <span className="text-xl font-black text-primary">{step.num}</span>
                  </div>

                  {/* Content card */}
                  <div className="bg-white rounded-2xl p-6 border border-dark-100/50 shadow-sm hover:shadow-card transition-all duration-300 flex-1 w-full">
                    <h3 className="text-[1.05rem] font-bold text-dark-900 mb-2">{step.title}</h3>
                    <p className="text-dark-400 leading-relaxed text-sm">{step.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CityServices – Service link grid
   ═══════════════════════════════════════════════════════════ */
export function CityServices({
  badge = 'Unsere Services',
  title,
  services,
  columns = 3,
}: {
  badge?: string;
  title: string;
  services: { label: string; href: string; desc: string }[];
  columns?: 2 | 3;
}) {
  const gridCols = columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="bg-gray-50/80 py-16 md:py-24">
      <div className="container-main">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">{badge}</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-dark-900">{title}</h2>
          </div>
        </ScrollReveal>
        <div className={`grid grid-cols-1 ${gridCols} gap-4 max-w-5xl mx-auto`}>
          {services.map((svc, i) => (
            <ScrollReveal key={i} delay={i * 0.05}>
              <Link
                href={svc.href}
                className="group flex items-center gap-4 rounded-2xl bg-white border border-dark-100/60 p-5 hover:shadow-card hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 h-full"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-dark-900 text-sm group-hover:text-primary transition-colors">{svc.label}</div>
                  <div className="text-xs text-dark-400 mt-0.5">{svc.desc}</div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CityCTA – Dark call-to-action section
   ═══════════════════════════════════════════════════════════ */
export function CityCTA({
  title,
  highlight,
  subtitle,
  primaryCta = { label: 'Jetzt Fahrzeug anmelden', href: '/kfz-service/kfz-online-service/' },
  secondaryCta,
}: {
  title: string;
  highlight: string;
  subtitle: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}) {
  return (
    <section className="relative bg-dark-950 py-20 md:py-24 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="container-main relative z-10 text-center">
        <ScrollReveal>
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            {title} <span className="text-primary">{highlight}</span>
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">{subtitle}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href={primaryCta.href} className="btn-primary text-lg">
              {primaryCta.label} <ArrowRight className="w-5 h-5" />
            </Link>
            {secondaryCta && (
              <Link href={secondaryCta.href} className="btn-outline-white">
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CityBenefits – 4-column benefits grid
   ═══════════════════════════════════════════════════════════ */
export function CityBenefits({
  badge = 'Vorteile',
  title,
  items,
}: {
  badge?: string;
  title: string;
  items: { icon: LucideIcon; title: string; desc: string }[];
}) {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container-main">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">{badge}</span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-dark-900">{title}</h2>
          </div>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 max-w-6xl mx-auto">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <ScrollReveal key={i} delay={i * 0.07}>
                <div className="group text-center rounded-2xl bg-gray-50/80 border border-dark-100/50 p-7 md:p-8 hover:shadow-card hover:border-primary/20 transition-all duration-300 h-full">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mx-auto group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-dark-900 mb-2">{item.title}</h3>
                  <p className="text-dark-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CityContent – WP Content section with featured image
   ═══════════════════════════════════════════════════════════ */
export function CityContent({
  title,
  content,
  featuredImage,
  ContentRenderer,
}: {
  title: string;
  content: string;
  featuredImage?: string | null;
  ContentRenderer: React.ComponentType<{ html: string; variant?: 'dark' | 'light'; className?: string }>;
}) {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white via-gray-50/30 to-white relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,168,90,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,168,90,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
      <div className="container-main relative z-10">
        <div className="max-w-4xl mx-auto">
          {featuredImage && (
            <ScrollReveal>
              <div className="mb-12 rounded-2xl overflow-hidden border border-dark-100 shadow-sm">
                <img src={featuredImage} alt={title} className="w-full h-auto" loading="lazy" />
              </div>
            </ScrollReveal>
          )}
          <ScrollReveal>
            <ContentRenderer html={content} variant="light" />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
