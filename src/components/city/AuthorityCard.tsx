'use client';

import ScrollReveal from '@/components/ScrollReveal';
import { MapPin, Phone, Clock, ExternalLink, Mail } from 'lucide-react';

interface AuthorityCardProps {
  authority: {
    name: string;
    street: string;
    zip: string;
    city: string;
    phone: string;
    email?: string;
    hours: string;
    website: string;
  } | null;
  cityName: string;
}

export default function AuthorityCard({ authority, cityName }: AuthorityCardProps) {
  if (!authority) return null;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container-main">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Lokale Behörde
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-dark-900">
              Zulassungsstelle {cityName}
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="max-w-2xl mx-auto bg-gray-50/80 border border-dark-100/50 rounded-2xl p-6 md:p-8">
            <h3 className="text-lg font-bold text-dark-900 mb-6">{authority.name}</h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-dark-400">Adresse</div>
                  <div className="text-dark-900">{authority.street}, {authority.zip} {authority.city}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-dark-400">Telefon</div>
                  <div className="text-dark-900">{authority.phone}</div>
                </div>
              </div>

              {authority.email && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-dark-400">E-Mail</div>
                    <a href={`mailto:${authority.email}`} className="text-primary hover:underline">
                      {authority.email}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-dark-400">Öffnungszeiten</div>
                  <div className="text-dark-900">{authority.hours}</div>
                </div>
              </div>

              {authority.website && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-dark-400">Website</div>
                    <a
                      href={authority.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {authority.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-dark-100/50">
              <p className="text-sm text-dark-400">
                💡 <strong>Tipp:</strong> Sparen Sie sich den Besuch und nutzen Sie unseren Online-Zulassungsservice –
                rund um die Uhr verfügbar, ohne Termin und ohne Wartezeit.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
