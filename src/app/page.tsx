import Hero from '@/components/Hero';
import Steps from '@/components/Steps';
import Requirements from '@/components/Requirements';
import PricingBox from '@/components/PricingBox';
import TrustBadges from '@/components/TrustBadges';
import Support from '@/components/Support';
import FAQ from '@/components/FAQ';
import VehicleTypes from '@/components/VehicleTypes';
import IntroSection from '@/components/IntroSection';
import InfoCards from '@/components/InfoCards';
import { homepageContent } from '@/lib/content';
import { siteConfig } from '@/lib/config';

export default function HomePage() {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    publisher: {
      '@type': 'Organization',
      name: siteConfig.company.name,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <Hero />
      <IntroSection />
      <Steps />
      <Requirements />
      <PricingBox />
      
      {/* Dark/Light transition gradient */}
      <div className="h-16 bg-gradient-to-b from-white to-dark-950" />
      <TrustBadges />
      <div className="h-16 bg-gradient-to-b from-dark-950 to-white" />
      
      <InfoCards />
      <Support />
      
      <FAQ
        title={homepageContent.faq.title}
        items={homepageContent.faq.items}
        singleSection
      />

      <VehicleTypes />
    </>
  );
}
