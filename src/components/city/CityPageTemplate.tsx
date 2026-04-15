'use client';

import { Component, type ReactNode } from 'react';
import { CityHero, CityStatsBar, CitySteps, CityBenefits, CityServices, CityCTA } from './CityComponents';
import AuthorityCard from './AuthorityCard';
import NearbyCities from './NearbyCities';
import CityFAQ from './CityFAQ';
import CityDocuments from './CityDocuments';
import CityIntro from './CityIntro';
import CityLocal from './CityLocal';
import type { CitySection } from '@/lib/cityContentEngine';

// ── Error Boundary ───────────────────────────────────────────────
// Catches render errors per section so one broken section doesn't crash the page.

interface SectionErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends Component<{ children: ReactNode }, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[CitySection] Render error:', error.message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ── Template ─────────────────────────────────────────────────────

interface CityPageTemplateProps {
  sections: CitySection[];
  cityName: string;
}

export default function CityPageTemplate({ sections, cityName }: CityPageTemplateProps) {
  return (
    <>
      {sections.map((section, i) => (
        <SectionErrorBoundary key={`${section.type}-${i}`}>
          <SectionRenderer section={section} cityName={cityName} />
        </SectionErrorBoundary>
      ))}
    </>
  );
}

function SectionRenderer({ section, cityName }: { section: CitySection; cityName: string }) {
  const { type, data } = section;

  switch (type) {
    case 'hero':
      return (
        <CityHero
          badge={data.badge as string}
          h1Parts={data.h1Parts as [string, string]}
          subtitle={data.subtitle as string}
        />
      );

    case 'intro':
      return (
        <CityIntro
          title={data.title as string}
          paragraphs={data.paragraphs as string[]}
        />
      );

    case 'process':
      return (
        <CitySteps
          title={data.title as string}
          subtitle={data.subtitle as string}
          steps={data.steps as { num: string; title: string; desc: string }[]}
        />
      );

    case 'documents':
      return (
        <CityDocuments
          title={data.title as string}
          intro={data.intro as string}
          items={data.items as string[]}
        />
      );

    case 'benefits':
      return (
        <CityBenefits
          title={data.title as string}
          items={data.items as { icon: string; title: string; desc: string }[]}
        />
      );

    case 'faq':
      return (
        <CityFAQ
          title={data.title as string}
          items={data.items as { question: string; answer: string }[]}
        />
      );

    case 'local':
      return (
        <CityLocal
          title={data.title as string}
          text={data.text as string}
          authority={data.authority as { name: string; address: string; phone: string; hours: string; website: string } | null}
        />
      );

    case 'authority':
      return (
        <AuthorityCard
          authority={data.authority as { name: string; street: string; zip: string; city: string; phone: string; hours: string; website: string } | null}
          cityName={data.cityName as string}
        />
      );

    case 'nearby':
      return (
        <NearbyCities
          title={data.title as string}
          cities={data.cities as { name: string; slug: string; href: string }[]}
        />
      );

    case 'cta':
      return (
        <CityCTA
          title={data.title as string}
          highlight={data.highlight as string}
          subtitle={data.subtitle as string}
          secondaryCta={{ label: 'eVB-Nummer anfordern', href: '/evb/' }}
        />
      );

    default:
      return null;
  }
}
