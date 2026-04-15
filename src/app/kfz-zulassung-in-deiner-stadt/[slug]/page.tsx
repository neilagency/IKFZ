import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCityBySlug, getCitySlugs, resolveAlias } from '@/data/cities';
import { buildCityPage } from '@/lib/cityContentEngine';
import CityPageTemplate from '@/components/city/CityPageTemplate';

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = 'https://ikfzdigitalzulassung.de';

// ── Static generation ────────────────────────────────────────────

export function generateStaticParams() {
  return getCitySlugs().map(slug => ({ slug }));
}

// ── Metadata ─────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Check alias → redirect handled in page, just return basic meta
  const aliasTarget = resolveAlias(slug);
  if (aliasTarget) {
    return { title: 'Weiterleitung...' };
  }

  const pageData = buildCityPage(slug);
  if (!pageData) {
    return { title: 'Stadt nicht gefunden' };
  }

  return {
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/kfz-zulassung-in-deiner-stadt/${pageData.canonicalSlug}/`,
    },
    openGraph: {
      title: pageData.metaTitle,
      description: pageData.metaDescription,
      url: `${SITE_URL}/kfz-zulassung-in-deiner-stadt/${pageData.canonicalSlug}/`,
      type: 'website',
    },
  };
}

// ── Page Component ───────────────────────────────────────────────

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Handle alias redirects (301)
  const aliasTarget = resolveAlias(slug);
  if (aliasTarget) {
    redirect(`/kfz-zulassung-in-deiner-stadt/${aliasTarget}/`);
  }

  // Validate city exists
  const city = getCityBySlug(slug);
  if (!city) {
    notFound();
  }

  // Build page content from engine
  const pageData = buildCityPage(slug);
  if (!pageData) {
    notFound();
  }

  // Schema.org JSON-LD — only include schemas that exist (FAQ is conditional)
  const schemas = [
    pageData.schema.breadcrumb,
    pageData.schema.service,
    pageData.schema.localBusiness,
    pageData.schema.faq,
  ].filter(Boolean);

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <CityPageTemplate
        sections={pageData.sections}
        cityName={pageData.cityName}
      />
    </>
  );
}
