import Link from 'next/link';
import { siteConfig } from '@/lib/config';
import { Phone, MessageCircle, Mail, ArrowRight } from 'lucide-react';

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
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-white font-black text-sm">iK</span>
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
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

          {/* Contact */}
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
                  Tel: 015224999190
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
                  Rund um die Uhr Live-Support
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
          </div>
        </div>
      </div>
    </footer>
  );
}
