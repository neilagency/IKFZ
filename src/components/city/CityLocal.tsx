'use client';

import ScrollReveal from '@/components/ScrollReveal';
import { MapPin, Phone, Clock, Info } from 'lucide-react';

interface CityLocalProps {
  title: string;
  text: string;
  authority: {
    name: string;
    address: string;
    phone: string;
    hours: string;
    website: string;
  } | null;
}

export default function CityLocal({ title, text, authority }: CityLocalProps) {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white to-gray-50/60">
      <div className="container-main">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Lokale Info
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-dark-900">{title}</h2>
          </div>
        </ScrollReveal>

        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="bg-white rounded-2xl border border-dark-100/50 shadow-sm p-6 md:p-8">
              <div className="flex items-start gap-3 mb-6">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <p className="text-dark-500 leading-relaxed">{text}</p>
              </div>

              {authority && (
                <div className="grid sm:grid-cols-3 gap-4 pt-6 border-t border-dark-100/50">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <div className="text-xs font-medium text-dark-400 mb-0.5">Adresse</div>
                      <div className="text-sm text-dark-700">{authority.address}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <div className="text-xs font-medium text-dark-400 mb-0.5">Telefon</div>
                      <div className="text-sm text-dark-700">{authority.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <div className="text-xs font-medium text-dark-400 mb-0.5">Öffnungszeiten</div>
                      <div className="text-sm text-dark-700">{authority.hours}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
