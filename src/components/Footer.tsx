import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '@/lib/config';
import { Phone, MessageCircle, Mail, ArrowRight, CreditCard, Building2, CheckCircle2 } from 'lucide-react';
import CookieSettingsButton from '@/components/CookieSettingsButton';

export default function Footer() {
  return (
    <footer className="bg-dark-950 text-white relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* CTA Section */}
      <div className="border-b border-white/[0.06]">
        <div className="container-main py-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <Image
                src="/logo-ikfz-white.svg"
                alt="IKFZ Digital Zulassung"
                width={160}
                height={44}
                sizes="160px"
                loading="lazy"
                className="flex-shrink-0"
              />
              <div>
                <p className="text-lg font-semibold">Fahrzeugzulassung online – schnell & bequem!</p>
                <p className="text-white/40 text-sm mt-0.5">
                  An-, Um- oder Abmeldung direkt von zu Hause erledigen.
                </p>
                <p className="text-white/25 text-xs mt-1.5">
                  Mit unseren Partnern{' '}
                  <a href="https://www.onlineautoabmelden.com/" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary transition-colors">
                    onlineautoabmelden.com
                  </a>{' '}
                  und{' '}
                  <a href="https://www.meldino.de/" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary transition-colors">
                    meldino.de
                  </a>
                </p>
              </div>
            </div>
            <Link
              href="/kfz-service/kfz-online-service/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-700 transition-all duration-300 shadow-button hover:shadow-button-hover text-sm flex-shrink-0"
            >
              Jetzt starten
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Links Grid */}
      <div className="container-main py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Services */}
          <div>
            <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-5">
              Unsere Services
            </h4>
            <ul className="space-y-3">
              {siteConfig.footerLinks.services.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-5">
              Rechtliches
            </h4>
            <ul className="space-y-3">
              {siteConfig.footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Social */}
          <div>
            <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-5">
              Kontakt
            </h4>
            <ul className="space-y-3.5">
              <li>
                <a
                  href="tel:015224999190"
                  className="flex items-center gap-3 text-white/50 hover:text-white transition-colors text-sm group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  01522 4999190
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/4915224999190"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-white/50 hover:text-white transition-colors text-sm group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </div>
                  WhatsApp Live-Chat
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@ikfzdigitalzulassung.de"
                  className="flex items-center gap-3 text-white/50 hover:text-white transition-colors text-sm group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  info@ikfzdigitalzulassung.de
                </a>
              </li>
            </ul>

            {/* Social Media */}
            <div className="flex items-center gap-3 mt-6">
              <a href="https://www.facebook.com/ikfzdigitalzulassung" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/[0.07] flex items-center justify-center hover:bg-white/[0.15] transition-colors" aria-label="Facebook">
                <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://www.instagram.com/ikfzdigitalzulassung" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/[0.07] flex items-center justify-center hover:bg-white/[0.15] transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://www.youtube.com/@ikfzdigitalzulassung" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/[0.07] flex items-center justify-center hover:bg-white/[0.15] transition-colors" aria-label="YouTube">
                <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@ikfzdigitalzulassung" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/[0.07] flex items-center justify-center hover:bg-white/[0.15] transition-colors" aria-label="TikTok">
                <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
            </div>
          </div>

          {/* Sicher bezahlen + Trust */}
          <div>
            <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-5">
              Sicher bezahlen
            </h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { icon: '💳', label: 'PayPal' },
                { icon: '🍎', label: 'Apple Pay' },
                { icon: null, label: 'Kredit- / Debitkarte', lucide: 'credit' },
                { icon: '🏦', label: 'SEPA-Überweisung' },
                { icon: '💳', label: 'Klarna' },
              ].map((pm) => (
                <span
                  key={pm.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.07] text-white/60 text-xs font-medium"
                >
                  {pm.lucide === 'credit' ? (
                    <CreditCard className="w-3.5 h-3.5" />
                  ) : pm.icon === '🏦' ? (
                    <Building2 className="w-3.5 h-3.5" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5" />
                  )}
                  {pm.label}
                </span>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="space-y-2.5">
              {[
                'Offiziell & Rechtssicher',
                'KBA §34 FZV registriert',
                '100% Geld-zurück-Garantie',
              ].map((badge) => (
                <div key={badge} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold text-white/80">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.06]">
        <div className="container-main py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-sm">
            © {new Date().getFullYear()} ikfzdigitalzulassung. Alle Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/impressum" className="text-white/30 hover:text-white/60 text-xs transition-colors">
              Impressum
            </Link>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <Link href="/datenschutzerklarung" className="text-white/30 hover:text-white/60 text-xs transition-colors">
              Datenschutz
            </Link>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <Link href="/agb" className="text-white/30 hover:text-white/60 text-xs transition-colors">
              AGB
            </Link>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
