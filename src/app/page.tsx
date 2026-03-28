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

export default function HomePage() {
  return (
    <>
      <Hero />
      <IntroSection />
      <Steps />
      <Requirements />
      <PricingBox />
      <TrustBadges />
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
